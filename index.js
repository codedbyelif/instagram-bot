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

// /checknow
bot.onText(/\/checknow/, async (msg) => {
    if (users.length === 0) {
        return bot.sendMessage(msg.chat.id, '📭 Kontrol edilecek kullanıcı yok.');
    }

    bot.sendMessage(msg.chat.id, `🔍 ${users.length} kullanıcı kontrol ediliyor...`);

    for (const user of users) {
        const result = await checkInstagramUser(user.username);

        // Update user status
        const index = users.findIndex(u => u.username === user.username);
        if (index !== -1) {
            users[index].status = result.status;
            users[index].lastChecked = new Date().toISOString();
        }

        // Wait 3 seconds between checks
        await new Promise(r => setTimeout(r, 3000));
    }

    saveUsers();
    sendReport(msg.chat.id);
});

// --- Core Logic ---

async function runBackgroundBatch() {
    console.log('[BATCH] Arka plan kontrolü başladı...');

    if (users.length === 0) {
        console.log('[BATCH] Kullanıcı listesi boş.');
        return;
    }

    const today = new Date().toDateString();
    const candidates = users.filter(u =>
        !u.lastChecked || new Date(u.lastChecked).toDateString() !== today
    );

    if (candidates.length === 0) {
        console.log('[BATCH] Bugün için tüm kullanıcılar kontrol edilmiş.');
        return;
    }

    const batchSize = 5;
    const batch = candidates.slice(0, batchSize);

    console.log(`[BATCH] ${batch.length} kullanıcı kontrol edilecek.`);

    for (const user of batch) {
        const result = await checkInstagramUser(user.username);

        const index = users.findIndex(u => u.username === user.username);
        if (index !== -1) {
            users[index].status = result.status;
            users[index].lastChecked = new Date().toISOString();
        }

        console.log(`[BATCH] ${user.username}: ${result.status}`);

        // Wait 3 seconds
        await new Promise(r => setTimeout(r, 3000));
    }

    saveUsers();

    // Alert if issues found
    const issues = batch.filter(u => {
        const updated = users.find(dbUser => dbUser.username === u.username);
        return updated && (updated.status === 'BANLI' || updated.status === 'KISITLI');
    });

    if (issues.length > 0 && chatId) {
        const alertMsg = `⚠️ Dikkat! Sorunlu hesaplar tespit edildi:\n\n${issues.map(u => `- ${u.username}`).join('\n')}`;
        bot.sendMessage(chatId, alertMsg);
    }
}

function sendReport(targetChatId = chatId) {
    if (!users.length) return;
    if (!targetChatId) return console.log('[REPORT] CHAT_ID tanımlı değil.');

    const aktif = users.filter(u => u.status === 'AKTIF');
    const banli = users.filter(u => u.status === 'BANLI');
    const kisitli = users.filter(u => u.status === 'KISITLI');
    const bekleyen = users.filter(u => u.status === 'pending');
    const hata = users.filter(u => u.status === 'HATA');

    let message = `📊 Kontrol Raporu\n\n`;

    if (aktif.length) message += `✅ Aktif (${aktif.length}):\n${aktif.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (banli.length) message += `🚫 Banlı/Silinmiş (${banli.length}):\n${banli.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (kisitli.length) message += `⚠️ Kısıtlı (${kisitli.length}):\n${kisitli.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (bekleyen.length) message += `⏳ Bekleyen (${bekleyen.length}):\n${bekleyen.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (hata.length) message += `❓ Hata (${hata.length}):\n${hata.map(u => `- ${u.username}`).join('\n')}\n\n`;

    message += `🕒 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`;

    bot.sendMessage(targetChatId, message);
}

// Start Schedulers
scheduleDistributedChecks(runBackgroundBatch);
scheduleDailyReport(checkTime, sendReport);

console.log(`✅ Bot çalışıyor... Günlük rapor: ${checkTime} (Türkiye saati)`);
