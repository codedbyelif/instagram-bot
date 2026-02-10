require('dotenv').config({ path: './config.env' });
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { checkInstagramUser } = require('./instagramChecker');
const { scheduleDistributedChecks, scheduleDailyReport } = require('./scheduler');

// Configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const checkTime = process.env.CHECK_TIME || '21:00';
const usersFile = path.join(__dirname, 'users.json');

if (!token) {
    console.error('Hata: TELEGRAM_BOT_TOKEN config.env dosyasında tanımlanmamış.');
    process.exit(1);
}

// Initialize Bot
const bot = new TelegramBot(token, { polling: true });

// Cooldown tracking for /check command (5 minutes per user)
const checkCooldowns = new Map();

// Load Users
let users = [];
try {
    if (fs.existsSync(usersFile)) {
        const data = fs.readFileSync(usersFile, 'utf8');
        const rawUsers = JSON.parse(data);

        // Migration: Remove directThreadUrl if exists
        users = rawUsers.map(u => ({
            username: u.username,
            status: u.status || 'pending',
            lastChecked: u.lastChecked || null
        }));
    } else {
        fs.writeFileSync(usersFile, '[]', 'utf8');
    }
} catch (err) {
    console.error('users.json yüklenirken hata:', err);
    users = [];
}

function saveUsers() {
    try {
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
        console.log(`[SAVE] ${users.length} kullanıcı kaydedildi.`);
    } catch (err) {
        console.error('users.json kaydedilirken hata:', err);
    }
}

// --- Bot Commands ---

// /start
bot.onText(/\/start/, (msg) => {
    const welcomeMsg = `🤖 Instagram Kontrol Botu

Komutlar:
/adduser kullanıcı_adı - Kullanıcı ekle
/listusers - Listeyi gör
/checknow - Şimdi kontrol et
/clearusers - Listeyi temizle

Örnek:
/adduser riseinweb3`;

    bot.sendMessage(msg.chat.id, welcomeMsg);
});

// /adduser <username>
bot.onText(/\/adduser (.+)/, (msg, match) => {
    const username = match[1].trim();

    if (!username) {
        return bot.sendMessage(msg.chat.id, '❌ Kullanım: /adduser kullanıcı_adı');
    }

    // Check if already exists
    if (users.some(u => u.username === username)) {
        return bot.sendMessage(msg.chat.id, `⚠️ "${username}" zaten listede.`);
    }

    users.push({
        username,
        status: 'pending',
        lastChecked: null
    });

    saveUsers();
    bot.sendMessage(msg.chat.id, `✅ "${username}" eklendi. Toplam: ${users.length}`);
});

// /listusers
bot.onText(/\/listusers/, (msg) => {
    if (users.length === 0) {
        return bot.sendMessage(msg.chat.id, '📭 Liste boş.');
    }

    const userList = users.map((u, i) =>
        `${i + 1}. ${u.username} - ${u.status}`
    ).join('\n');

    bot.sendMessage(msg.chat.id, `📋 Kullanıcı Listesi (${users.length}):\n\n${userList}`);
});

// /clearusers
bot.onText(/\/clearusers/, (msg) => {
    users = [];
    saveUsers();
    bot.sendMessage(msg.chat.id, '🗑️ Liste temizlendi.');
});

// /check <username> - Instant single user check
bot.onText(/\/check (.+)/, async (msg, match) => {
    const username = match[1].trim();

    if (!username) {
        return bot.sendMessage(msg.chat.id, '❌ Kullanım: /check kullanıcı_adı');
    }

    bot.sendMessage(msg.chat.id, `🔍 ${username} kontrol ediliyor...`);

    const result = await checkInstagramUser(username);

    // Update in list if exists
    const index = users.findIndex(u => u.username === username);
    if (index !== -1) {
        users[index].status = result.status;
        users[index].lastChecked = new Date().toISOString();
        saveUsers();
    }

    // Send result
    const statusEmoji = {
        'AKTIF': '✅',
        'BANLI': '🚫',
        'KISITLI': '⚠️',
        'RATE_LIMIT': '⏸️',
        'HATA': '❌',
        'BELIRSIZ': '❔'
    };

    const emoji = statusEmoji[result.status] || '❓';
    bot.sendMessage(msg.chat.id, `${emoji} ${username}: ${result.status}\n${result.description}`);
});

// /checknow - Disabled (use /check instead)
bot.onText(/\/checknow/, (msg) => {
    bot.sendMessage(msg.chat.id, '⚠️ Bu komut artık kullanılmıyor.\n\nAnlık kontrol için: /check kullanıcı_adı\nÖrnek: /check instagram');
});

// --- Core Logic ---

async function runBackgroundBatch() {
    console.log('[BACKGROUND] Arka plan kontrolü başladı...');

    if (users.length === 0) {
        console.log('[BACKGROUND] Kullanıcı listesi boş.');
        return;
    }

    // Find next user to check (round-robin)
    // Sort by lastChecked (oldest first), then take the first one
    const sortedUsers = [...users].sort((a, b) => {
        const aTime = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
        const bTime = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
        return aTime - bTime;
    });

    const userToCheck = sortedUsers[0];

    console.log(`[BACKGROUND] Kontrol ediliyor: ${userToCheck.username}`);

    const result = await checkInstagramUser(userToCheck.username);

    const index = users.findIndex(u => u.username === userToCheck.username);
    if (index !== -1) {
        users[index].status = result.status;
        users[index].lastChecked = new Date().toISOString();
    }

    console.log(`[BACKGROUND] ${userToCheck.username}: ${result.status} - ${result.description}`);

    saveUsers();

    // Alert if issue found
    if ((result.status === 'BANLI' || result.status === 'KISITLI') && chatId) {
        const alertMsg = `⚠️ Dikkat! ${userToCheck.username}: ${result.status}\n${result.description}`;
        bot.sendMessage(chatId, alertMsg);
    }
}

function sendReport(targetChatId = chatId) {
    if (!users.length) return;
    if (!targetChatId) return console.log('[REPORT] CHAT_ID tanımlı değil.');

    const aktif = users.filter(u => u.status === 'AKTIF');
    const banli = users.filter(u => u.status === 'BANLI');
    const kisitli = users.filter(u => u.status === 'KISITLI');
    const rateLimit = users.filter(u => u.status === 'RATE_LIMIT');
    const bekleyen = users.filter(u => u.status === 'pending');
    const hata = users.filter(u => u.status === 'HATA');
    const belirsiz = users.filter(u => u.status === 'BELIRSIZ');

    let message = `📊 Kontrol Raporu\n\n`;

    if (aktif.length) message += `✅ Aktif (${aktif.length}):\n${aktif.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (banli.length) message += `🚫 Banlı/Silinmiş (${banli.length}):\n${banli.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (kisitli.length) message += `⚠️ Kısıtlı (${kisitli.length}):\n${kisitli.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (rateLimit.length) message += `⏸️ Rate Limit (${rateLimit.length}):\n${rateLimit.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (belirsiz.length) message += `❔ Belirsiz (${belirsiz.length}):\n${belirsiz.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (bekleyen.length) message += `⏳ Bekleyen (${bekleyen.length}):\n${bekleyen.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (hata.length) message += `❓ Hata (${hata.length}):\n${hata.map(u => `- ${u.username}`).join('\n')}\n\n`;

    message += `🕒 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`;

    bot.sendMessage(targetChatId, message);
}

// Start Schedulers
scheduleDistributedChecks(runBackgroundBatch);
scheduleDailyReport(checkTime, sendReport);

console.log(`✅ Bot çalışıyor... Günlük rapor: ${checkTime} (Türkiye saati)`);
