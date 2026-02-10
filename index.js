require('dotenv').config({ path: './config.env' });
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { checkUser } = require('./instagramChecker');
const { scheduleDistributedChecks, scheduleDailyReport } = require('./scheduler');

// Configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const checkTime = process.env.CHECK_TIME || '21:00';
const usersFile = path.join(__dirname, 'users.json');

if (!token) {
    console.error('Hata: TELEGRAM_BOT_TOKEN config.env dosyasında tanılanmamış.');
    process.exit(1);
}

// Initialize Bot
const bot = new TelegramBot(token, { polling: true });

// Load Users & Migrate if necessary
let users = [];
try {
    if (fs.existsSync(usersFile)) {
        const data = fs.readFileSync(usersFile, 'utf8');
        const rawUsers = JSON.parse(data);

        // Migration: Convert string array to object array
        if (rawUsers.length > 0 && typeof rawUsers[0] === 'string') {
            users = rawUsers.map(u => ({ username: u, status: 'pending', lastChecked: null }));
            saveUsers();
            console.log('Kullanıcı veritabanı yeni formata güncellendi.');
        } else {
            users = rawUsers;
        }
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
    } catch (err) {
        console.error('users.json kaydedilirken hata:', err);
    }
}

// --- Bot Commands ---

// /start
bot.onText(/\/start/, (msg) => {
    const opts = { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' };
    bot.sendMessage(msg.chat.id, `🤖 *Instagram Kontrol Botu (Akıllı Mod)*\n\nKomutlar:\n/addusers - Kullanıcı ekle\n/listusers - Listeyi gör\n/checknow - Raporu hemen oluştur (mevcut verilerle)\n/clearusers - Listeyi sil`, opts);
});

// /addusers
// Store user addition state per chat to support multiple users
const userAdditionState = {};

// /addusers
bot.onText(/\/addusers/, (msg) => {
    userAdditionState[msg.chat.id] = true;
    bot.sendMessage(msg.chat.id, 'Lütfen eklenecek kullanıcı adlarını gönderin (her satıra bir tane).');
});

bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    // Check if this chat is in "adding users" mode
    if (userAdditionState[msg.chat.id]) {
        console.log(`[DEBUG] Adding users for chat ${msg.chat.id}: ${msg.text}`);

        const newNames = msg.text.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        let addedCount = 0;

        newNames.forEach(username => {
            // Check based on username property since users is an object array now
            if (!users.some(u => u.username === username)) {
                users.push({ username, status: 'pending', lastChecked: null });
                addedCount++;
            }
        });

        saveUsers();
        // Reset state for this chat
        delete userAdditionState[msg.chat.id];

        bot.sendMessage(msg.chat.id, `✅ ${addedCount} yeni kullanıcı eklendi. Toplam: ${users.length}`);
    }
});

// /listusers
bot.onText(/\/listusers/, (msg) => {
    if (users.length === 0) return bot.sendMessage(msg.chat.id, '📭 Liste boş.');

    const userList = users.map((u, i) => `${i + 1}. ${u.username} (${u.status === 'pending' ? 'Bekliyor' : u.status})`).join('\n');
    bot.sendMessage(msg.chat.id, `📋 *Takip Listesi:*\n${userList}`, { parse_mode: 'Markdown' });
});

// /clearusers
bot.onText(/\/clearusers/, (msg) => {
    users = [];
    saveUsers();
    bot.sendMessage(msg.chat.id, '🗑️ Liste temizlendi.');
});

// /checknow (Force Report Generation)
bot.onText(/\/checknow/, async (msg) => {
    bot.sendMessage(msg.chat.id, '📊 Mevcut verilerle rapor oluşturuluyor...');
    sendDailyReport(msg.chat.id);
});

// --- Core Logic ---

// 1. Background Batch Checker
async function runBackgroundBatch() {
    console.log('Arka plan kontrolü başladı...');

    // Get users not checked today
    const today = new Date().toDateString();
    const candidates = users.filter(u => !u.lastChecked || new Date(u.lastChecked).toDateString() !== today);

    if (candidates.length === 0) {
        console.log('Bugün için tüm kullanıcılar zaten kontrol edilmiş.');
        return;
    }

    // Checking only a batch (e.g., 5 users) to avoid spamming
    const batchSize = 5;
    const batch = candidates.slice(0, batchSize);

    console.log(`${batch.length} kullanıcı kontrol edilecek: ${batch.map(u => u.username).join(', ')}`);

    for (const user of batch) {
        // Random delay 2-10 seconds
        const delay = Math.floor(Math.random() * 8000) + 2000;
        await new Promise(r => setTimeout(r, delay));

        const result = await checkUser(user.username);

        // Update user record
        const index = users.findIndex(u => u.username === user.username);
        if (index !== -1) {
            users[index].status = result.status;
            users[index].lastChecked = new Date().toISOString();
        }
    }

    saveUsers();

    // Notify admin if a ban is detected immediately? (User requested: "ayrı saatlerde baktığında bile bana mesaj at")
    const bannedInBatch = batch.filter(u => {
        const updatedUser = users.find(dbUser => dbUser.username === u.username);
        return updatedUser && (updatedUser.status === 'banned' || updatedUser.status === 'restricted');
    });

    if (bannedInBatch.length > 0 && chatId) {
        const alertMsg = `⚠️ *Dikkat!* Arka plan kontrolünde sorunlu hesaplar tespit edildi:\n\n${bannedInBatch.map(u => `- ${u.username}: ${u.status === 'banned' ? '🚫 Banlandı' : '⚠️ Kısıtlandı'}`).join('\n')}`;
        bot.sendMessage(chatId, alertMsg, { parse_mode: 'Markdown' });
    }

    console.log('Batch kontrolü tamamlandı.');
}

// 2. Daily Report Generator
function sendDailyReport(targetChatId = chatId) {
    if (!users.length) return;
    if (!targetChatId) return console.log('Hata: Rapor için CHAT_ID yok.');

    const report = {
        active: users.filter(u => u.status === 'active'),
        banned: users.filter(u => u.status === 'banned'),
        restricted: users.filter(u => u.status === 'restricted'),
        pending: users.filter(u => u.status === 'pending'),
        error: users.filter(u => u.status === 'error')
    };

    let message = `📊 *Günlük Özet Raporu (21:00)*\n\n`;

    if (report.active.length) message += `✅ *Aktif (${report.active.length}):*\n${report.active.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (report.banned.length) message += `🚫 *Banlı/Silinmiş (${report.banned.length}):*\n${report.banned.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (report.restricted.length) message += `⚠️ *Kısıtlı (${report.restricted.length}):*\n${report.restricted.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (report.error.length) message += `❓ *Hata (${report.error.length}):*\n${report.error.map(u => `- ${u.username}`).join('\n')}\n\n`;
    if (report.pending.length) message += `⏳ *Kontrol Bekleyen (${report.pending.length}):*\n${report.pending.map(u => `- ${u.username}`).join('\n')}\n\n`;

    message += `🕒 Rapor Saati: ${new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' })}`;

    bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });
}

// Start Schedulers
scheduleDistributedChecks(runBackgroundBatch);
scheduleDailyReport(checkTime, sendDailyReport);

console.log(`Bot çalışıyor... Dağıtık kontrol ve günlük rapor (${checkTime}) aktif.`);
