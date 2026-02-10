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
    console.error('Hata: TELEGRAM_BOT_TOKEN config.env dosyasinda tanimlanmamis.');
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
        users = rawUsers.map(u => ({
            username: u.username,
            status: u.status || 'pending',
            lastChecked: u.lastChecked || null
        }));
    } else {
        fs.writeFileSync(usersFile, '[]', 'utf8');
    }
} catch (err) {
    console.error('users.json yuklenirken hata:', err);
    users = [];
}

function saveUsers() {
    try {
        fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
        console.log('[SAVE] ' + users.length + ' kullanici kaydedildi.');
    } catch (err) {
        console.error('users.json kaydedilirken hata:', err);
    }
}

// --- Bot Commands ---

bot.onText(/\/start/, (msg) => {
    const lines = [
        '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557',
        '\u2551  \uD83D\uDC96 INSTAGRAM BOT \uD83D\uDC96  \u2551',
        '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D',
        '',
        '\u2728 Komutlar:',
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
        '\u2795 /adduser kullanici_adi',
        '   \u2192 Listeye kullanici ekle',
        '',
        '\uD83D\uDD0D /check kullanici_adi',
        '   \u2192 Anlik kontrol (5dk cooldown)',
        '',
        '\uD83D\uDCCB /listusers',
        '   \u2192 Tum kullanicilari listele',
        '',
        '\uD83D\uDDD1\uFE0F /clearusers',
        '   \u2192 Listeyi temizle',
        '',
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
        '\u2699\uFE0F Arka Plan: Her 30dk\'da 1 kullanici',
        '\uD83D\uDCCA Gunluk Rapor: 21:00',
        '',
        '\uD83D\uDCA1 Ornek Kullanim:',
        '/adduser riseinweb3',
        '/check cristiano',
        '',
        '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
        '\uD83D\uDC95 Developed by @codedbyelif'
    ];
    bot.sendMessage(msg.chat.id, lines.join('\n'));
});

bot.onText(/\/adduser (.+)/, (msg, match) => {
    const username = match[1].trim();
    if (!username) {
        return bot.sendMessage(msg.chat.id, '\u274C Kullanim: /adduser kullanici_adi');
    }
    if (users.some(u => u.username === username)) {
        return bot.sendMessage(msg.chat.id, '\u26A0\uFE0F "' + username + '" zaten listede.');
    }
    users.push({ username, status: 'pending', lastChecked: null });
    saveUsers();
    bot.sendMessage(msg.chat.id, '\u2705 Eklendi!\n\n\uD83D\uDC64 Kullanici: ' + username + '\n\uD83D\uDCCA Toplam: ' + users.length + ' kullanici');
});

bot.onText(/\/listusers/, (msg) => {
    if (users.length === 0) {
        return bot.sendMessage(msg.chat.id, '\uD83D\uDCED Liste bos.');
    }
    const statusIcon = {
        'AKTIF': '\u2705', 'BANLI': '\uD83D\uDEAB', 'KISITLI': '\u26A0\uFE0F',
        'RATE_LIMIT': '\u23F8\uFE0F', 'pending': '\u23F3', 'HATA': '\u274C', 'BELIRSIZ': '\u2754'
    };
    let msg_text = '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n';
    msg_text += '\u2551   \uD83D\uDCCB KULLANICI LISTESI   \u2551\n';
    msg_text += '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\n';
    users.forEach((u, i) => {
        const icon = statusIcon[u.status] || '\u2753';
        msg_text += (i + 1) + '. ' + icon + ' ' + u.username + '\n   \u2514\u2500 ' + u.status + '\n\n';
    });
    msg_text += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83D\uDCCA Toplam: ' + users.length + ' kullanici';
    bot.sendMessage(msg.chat.id, msg_text);
});

bot.onText(/\/clearusers/, (msg) => {
    users = [];
    saveUsers();
    bot.sendMessage(msg.chat.id, '\uD83D\uDDD1\uFE0F Liste temizlendi.');
});

// /check <username> - Instant single user check (NO RETRY - instant result)
bot.onText(/\/check (.+)/, async (msg, match) => {
    const username = match[1].trim();
    const userId = msg.from.id;
    if (!username) {
        return bot.sendMessage(msg.chat.id, '\u274C Kullanim: /check kullanici_adi');
    }

    // 5 minute cooldown
    const now = Date.now();
    const cooldownTime = 5 * 60 * 1000;
    const lastCheck = checkCooldowns.get(userId);
    if (lastCheck && (now - lastCheck) < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (now - lastCheck)) / 1000 / 60);
        return bot.sendMessage(msg.chat.id, '\u23F3 Cooldown Aktif\n\n\u23F1\uFE0F Lutfen ' + remaining + ' dakika bekleyin.');
    }

    bot.sendMessage(msg.chat.id, '\uD83D\uDD0D Kontrol Ediliyor...\n\n\uD83D\uDC64 ' + username);

    // NO RETRY for instant check - get result immediately
    const result = await checkInstagramUser(username, 0, false);

    checkCooldowns.set(userId, now);

    // Update in list if exists
    const idx = users.findIndex(u => u.username === username);
    if (idx !== -1) {
        users[idx].status = result.status;
        users[idx].lastChecked = new Date().toISOString();
        saveUsers();
    }

    const statusEmoji = {
        'AKTIF': '\u2705', 'BANLI': '\uD83D\uDEAB', 'KISITLI': '\u26A0\uFE0F',
        'RATE_LIMIT': '\u23F8\uFE0F', 'HATA': '\u274C', 'BELIRSIZ': '\u2754'
    };
    const emoji = statusEmoji[result.status] || '\u2753';
    const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

    let resultMsg = '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n';
    resultMsg += '\u2551     \uD83D\uDCCA KONTROL SONUCU     \u2551\n';
    resultMsg += '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\n';
    resultMsg += '\uD83D\uDC64 Kullanici: ' + username + '\n';
    resultMsg += emoji + ' Durum: ' + result.status + '\n\n';
    resultMsg += '\uD83D\uDCDD Aciklama:\n' + result.description + '\n\n';
    resultMsg += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
    resultMsg += '\uD83D\uDD50 ' + timeStr;

    bot.sendMessage(msg.chat.id, resultMsg);
});

bot.onText(/\/checknow/, (msg) => {
    bot.sendMessage(msg.chat.id, '\u26A0\uFE0F Bu komut artik kullanilmiyor.\n\nAnlik kontrol icin: /check kullanici_adi\nOrnek: /check instagram');
});

// --- Core Logic ---

async function runBackgroundBatch() {
    try {
        console.log('[BACKGROUND] Arka plan kontrolu basladi...');
        if (users.length === 0) {
            console.log('[BACKGROUND] Kullanici listesi bos.');
            return;
        }

        const sortedUsers = [...users].sort((a, b) => {
            const aTime = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
            const bTime = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
            return aTime - bTime;
        });

        const userToCheck = sortedUsers[0];
        console.log('[BACKGROUND] Kontrol ediliyor: ' + userToCheck.username);

        // Background checks DO have retry enabled
        const result = await checkInstagramUser(userToCheck.username, 0, true);

        const index = users.findIndex(u => u.username === userToCheck.username);
        if (index !== -1) {
            users[index].status = result.status;
            users[index].lastChecked = new Date().toISOString();
        }

        console.log('[BACKGROUND] ' + userToCheck.username + ': ' + result.status + ' - ' + result.description);
        saveUsers();

        // Notify for every check
        if (chatId) {
            const statusEmoji = {
                'AKTIF': '\u2705', 'BANLI': '\uD83D\uDEAB', 'KISITLI': '\u26A0\uFE0F',
                'RATE_LIMIT': '\u23F8\uFE0F', 'HATA': '\u274C', 'BELIRSIZ': '\u2754'
            };
            const emoji = statusEmoji[result.status] || '\u2753';
            const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

            let notifMsg = '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n';
            notifMsg += '\u2551  \uD83D\uDD04 ARKA PLAN KONTROL  \u2551\n';
            notifMsg += '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\n';
            notifMsg += '\uD83D\uDC64 Kullanici: ' + userToCheck.username + '\n';
            notifMsg += emoji + ' Durum: ' + result.status + '\n\n';
            notifMsg += '\uD83D\uDCDD ' + result.description + '\n\n';
            notifMsg += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n';
            notifMsg += '\uD83D\uDD50 ' + timeStr;

            bot.sendMessage(chatId, notifMsg).catch(err => console.error('[NOTIFICATION ERROR]', err));
        }

        console.log('[BACKGROUND] Kontrol tamamlandi.');
    } catch (error) {
        console.error('[BACKGROUND ERROR]', error);
        if (chatId) {
            const errorMsg = '\u274C ARKA PLAN HATASI\n\n\uD83D\uDD27 Hata: ' + error.message + '\n\n\u26A0\uFE0F Bot calismaya devam ediyor.\n30 dakika sonra tekrar denenecek.';
            bot.sendMessage(chatId, errorMsg).catch(err => console.error('[NOTIFICATION ERROR]', err));
        }
    }
}

function sendReport(targetChatId = chatId) {
    try {
        if (!users.length) return;
        if (!targetChatId) return console.log('[REPORT] CHAT_ID tanimli degil.');

        const aktif = users.filter(u => u.status === 'AKTIF');
        const banli = users.filter(u => u.status === 'BANLI');
        const kisitli = users.filter(u => u.status === 'KISITLI');
        const rateLimit = users.filter(u => u.status === 'RATE_LIMIT');
        const bekleyen = users.filter(u => u.status === 'pending');
        const hata = users.filter(u => u.status === 'HATA');
        const belirsiz = users.filter(u => u.status === 'BELIRSIZ');

        let message = '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n';
        message += '\u2551   \uD83D\uDC9D GUNLUK RAPOR \uD83D\uDC9D   \u2551\n';
        message += '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\n';

        if (aktif.length) message += '\u2705 Aktif (' + aktif.length + '):\n' + aktif.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';
        if (banli.length) message += '\uD83D\uDEAB Banli/Silinmis (' + banli.length + '):\n' + banli.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';
        if (kisitli.length) message += '\u26A0\uFE0F Kisitli (' + kisitli.length + '):\n' + kisitli.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';
        if (rateLimit.length) message += '\u23F8\uFE0F Rate Limit (' + rateLimit.length + '):\n' + rateLimit.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';
        if (belirsiz.length) message += '\u2754 Belirsiz (' + belirsiz.length + '):\n' + belirsiz.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';
        if (bekleyen.length) message += '\u23F3 Bekleyen (' + bekleyen.length + '):\n' + bekleyen.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';
        if (hata.length) message += '\u274C Hata (' + hata.length + '):\n' + hata.map(u => '  \u2022 ' + u.username).join('\n') + '\n\n';

        const timeStr = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
        message += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83D\uDD50 ' + timeStr + '\n\uD83D\uDC95 @codedbyelif';

        bot.sendMessage(targetChatId, message).catch(err => console.error('[REPORT ERROR]', err));
    } catch (error) {
        console.error('[REPORT GENERATION ERROR]', error);
    }
}

// Start Schedulers
scheduleDistributedChecks(runBackgroundBatch);
scheduleDailyReport(checkTime, sendReport);

console.log('[BOT] Bot calisiyor... Gunluk rapor: ' + checkTime + ' (Turkiye saati)');
