# Instagram Account Monitor Bot

> Developed by [@codedbyelif](https://github.com/codedbyelif)

A Telegram bot that monitors Instagram accounts and reports their status. It checks whether accounts are active, banned, restricted, or rate-limited, and sends notifications directly to your Telegram chat.

---

## Features

- **Instant Account Check** - Check any Instagram account's status on demand via the `/check` command. Results are returned within seconds with no retry delay.
- **Automated Background Monitoring** - Every 30 minutes, the bot automatically checks one account from your list using a round-robin approach (oldest-checked first).
- **Smart Retry with Exponential Backoff** - Background checks automatically retry up to 3 times if Instagram rate limits are detected. Wait times increase exponentially: 1 min, 2 min, 4 min.
- **Real-Time Notifications** - Receive a Telegram message after every background check, not just when something goes wrong.
- **Daily Report** - A full status summary of all tracked accounts is sent at 21:00 (Istanbul time) every day.
- **Rate Limit Protection** - User-Agent rotation, request spacing, and 5-minute cooldown on the `/check` command to minimize Instagram rate limiting.
- **Error Resilience** - If the background checker crashes, the Telegram bot continues running. Errors are logged and reported via Telegram. The bot recovers automatically on the next 30-minute cycle.
- **Cooldown System** - The `/check` command has a 5-minute cooldown per user to prevent excessive requests.

---

## Status Codes

| Status     | Meaning                                                  |
|------------|----------------------------------------------------------|
| AKTIF      | Account is active and accessible                         |
| BANLI      | Account is banned, deleted, or not found (404)           |
| KISITLI    | Account is restricted by Instagram                       |
| RATE_LIMIT | Instagram is rate limiting requests, status is uncertain |
| BELIRSIZ   | Could not determine the account status                   |
| HATA       | An error occurred during the check                       |

---

## Requirements

- Node.js (v16 or higher)
- npm
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- Your Telegram Chat ID

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/codedbyelif/instagram-bot.git
cd instagram-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Edit the `config.env` file in the project root:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
CHAT_ID=your_chat_id_here
CHECK_TIME=21:00
```

- **TELEGRAM_BOT_TOKEN**: Get this from [@BotFather](https://t.me/BotFather) on Telegram.
- **CHAT_ID**: Your Telegram chat or group ID. You can find it by messaging [@raw_data_bot](https://t.me/raw_data_bot) on Telegram. For groups, the ID starts with `-100`.
- **CHECK_TIME**: Time for the daily report in HH:MM format (Istanbul timezone). Default is `21:00`.

### 4. Run the Bot

**For development/testing:**

```bash
node index.js
```

**For production (recommended):**

```bash
npm install -g pm2
pm2 start index.js --name instagram-bot
pm2 save
pm2 startup
```

---

## Commands

| Command                | Description                                    |
|------------------------|------------------------------------------------|
| `/start`               | Show the welcome message and list of commands  |
| `/adduser <username>`  | Add an Instagram username to the tracking list |
| `/check <username>`    | Instantly check an account (5-min cooldown)    |
| `/listusers`           | Show all tracked users and their statuses      |
| `/clearusers`          | Remove all users from the tracking list        |

---

## How It Works

### Account Detection

The bot sends an HTTP GET request to `https://www.instagram.com/<username>/` and analyzes the response:

1. **HTTP 404** - Account does not exist (BANLI).
2. **HTTP 403/429** - Instagram is rate limiting (RATE_LIMIT).
3. **HTML contains OpenGraph data or username in JSON** - Account is active (AKTIF).
4. **HTML contains "page not available" message** - Account is banned (BANLI).
5. **HTML contains "restricted profile" message** - Account is restricted (KISITLI).
6. **Generic Instagram page with no user data** - Rate limit detected (RATE_LIMIT).

### Background Processing

- A cron job runs every 30 minutes.
- It picks the user who was checked the longest time ago (round-robin).
- If Instagram returns a rate limit, the bot retries up to 3 times with exponential backoff (1, 2, 4 minutes).
- After each check, a notification is sent to your Telegram chat.
- If the background process crashes, the bot logs the error, sends you a notification, and continues running normally.

### Instant Check vs Background Check

| Feature          | `/check` Command  | Background Check     |
|------------------|-------------------|----------------------|
| Retry on failure | No (instant)      | Yes (up to 3 times)  |
| Cooldown         | 5 minutes         | 30-minute interval   |
| Notification     | Sent to requester | Sent to CHAT_ID      |
| Trigger          | Manual            | Automatic (cron)     |

---

## Rate Limit Protection

Instagram rate limits automated requests aggressively. The bot uses several strategies to minimize this:

1. **User-Agent Rotation** - Rotates between 4 different browser user-agent strings.
2. **Request Spacing** - Background checks are spaced 30 minutes apart.
3. **Cooldown** - The `/check` command enforces a 5-minute cooldown per user.
4. **Realistic Headers** - Requests include headers that mimic a real browser session.
5. **Exponential Backoff** - If rate limited, waits 1, 2, then 4 minutes before retrying.

Despite these measures, rate limiting may still occur depending on your server's IP reputation and the number of accounts being monitored.

---

## Project Structure

```
instagram-bot/
├── index.js               # Main bot logic, commands, background checker
├── instagramChecker.js     # Instagram profile checker with retry logic
├── scheduler.js            # Cron job scheduler for background checks and daily reports
├── config.env              # Environment variables (not tracked by git)
├── users.json              # Tracked users data (not tracked by git)
├── package.json            # Node.js dependencies
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## PM2 Commands

```bash
pm2 start index.js --name instagram-bot   # Start the bot
pm2 restart instagram-bot                 # Restart the bot
pm2 stop instagram-bot                    # Stop the bot
pm2 logs instagram-bot --lines 50         # View recent logs
pm2 status                                # Check bot status
pm2 delete instagram-bot                  # Remove from PM2
```

---

## Troubleshooting

**Bot is not responding to commands:**
- Check if the bot is running: `pm2 status`
- Verify the bot token in `config.env`
- Check logs for errors: `pm2 logs instagram-bot`

**Not receiving background notifications:**
- Make sure `CHAT_ID` is correctly set in `config.env`
- For group chats, the CHAT_ID must start with `-100`

**All accounts showing RATE_LIMIT:**
- Instagram is blocking your IP. Wait 30-60 minutes.
- Reduce the number of manual `/check` commands.
- Consider using a VPN or proxy.

**Bot crashes and restarts frequently:**
- Check PM2 logs: `pm2 logs instagram-bot --err --lines 50`
- Common cause: invalid bot token or network issues.

**409 Conflict Error:**
- You are trying to run the bot on multiple devices (PC + Laptop) with the same token.
- Solution: Stop the other instance or create a new bot token.

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

Developed by [@codedbyelif](https://github.com/codedbyelif)

---
---

# Instagram Hesap Izleme Botu (Turkce)

> Gelistirici: [@codedbyelif](https://github.com/codedbyelif)

Instagram hesaplarini izleyen ve durumlarini raporlayan bir Telegram botu. Hesaplarin aktif, banli, kisitli veya rate-limited olup olmadigini kontrol eder ve bildirimleri dogrudan Telegram sohbetinize gonderir.

---

## Ozellikler

- **Anlik Hesap Kontrolu** - `/check` komutu ile herhangi bir Instagram hesabinin durumunu aninda kontrol edin. Sonuclar saniyeler icinde doner, bekleme yoktur.
- **Otomatik Arka Plan Izleme** - Bot her 30 dakikada bir listenizdeki bir hesabi otomatik olarak kontrol eder. En uzun sure once kontrol edilen hesap secilir (round-robin yontemi).
- **Akilli Yeniden Deneme** - Arka plan kontrolleri Instagram rate limit algılarsa otomatik olarak 3 kez yeniden dener. Bekleme sureleri artarak devam eder: 1 dk, 2 dk, 4 dk.
- **Gercek Zamanli Bildirimler** - Her arka plan kontrolunden sonra Telegram mesaji alin, sadece sorun oldugunda degil.
- **Gunluk Rapor** - Takip edilen tum hesaplarin durum ozeti her gun saat 21:00'de (Istanbul saati) gonderilir.
- **Rate Limit Korumasi** - User-Agent rotasyonu, istek araliklari ve `/check` komutunda 5 dakikalik bekleme suresi ile Instagram rate limitini en aza indirir.
- **Hata Dayanikliligi** - Arka plan kontrolu cokerse Telegram botu calismaya devam eder. Hatalar loglanir ve Telegram uzerinden bildirilir. Bot bir sonraki 30 dakikalik donguede otomatik olarak toparlanir.
- **Bekleme Suresi Sistemi** - `/check` komutu, asiri istekleri onlemek icin kullanici basina 5 dakika bekleme suresi uygular.

---

## Durum Kodlari

| Durum      | Anlami                                                      |
|------------|-------------------------------------------------------------|
| AKTIF      | Hesap aktif ve erisilebilir                                 |
| BANLI      | Hesap banlanmis, silinmis veya bulunamadi (404)             |
| KISITLI    | Hesap Instagram tarafindan kisitlanmis                      |
| RATE_LIMIT | Instagram istekleri sinirliyor, durum belirsiz              |
| BELIRSIZ   | Hesap durumu belirlenemedi                                  |
| HATA       | Kontrol sirasinda bir hata olustu                           |

---

## Gereksinimler

- Node.js (v16 veya ustu)
- npm
- Bir Telegram bot tokeni ([@BotFather](https://t.me/BotFather) uzerinden)
- Telegram Sohbet ID'niz

---

## Kurulum

### 1. Depoyu Klonlayin

```bash
git clone https://github.com/codedbyelif/instagram-bot.git
cd instagram-bot
```

### 2. Bagimliliklari Yukleyin

```bash
npm install
```

### 3. Ortam Degiskenlerini Yapilandirin

Proje dizinindeki `config.env` dosyasini duzenleyin:

```
TELEGRAM_BOT_TOKEN=bot_tokeniniz_buraya
CHAT_ID=sohbet_id_niz_buraya
CHECK_TIME=21:00
```

- **TELEGRAM_BOT_TOKEN**: Telegram'da [@BotFather](https://t.me/BotFather) uzerinden alin.
- **CHAT_ID**: Telegram sohbet veya grup ID'niz. [@raw_data_bot](https://t.me/raw_data_bot) botuna mesaj atarak ogrenebilirsiniz. Gruplar icin ID `-100` ile baslar.
- **CHECK_TIME**: Gunluk rapor saati, SS:DD formatinda (Istanbul saat dilimi). Varsayilan: `21:00`.

### 4. Botu Calistirin

**Gelistirme/test icin:**

```bash
node index.js
```

**Uretim/surekli calisma icin (onerilen):**

```bash
npm install -g pm2
pm2 start index.js --name instagram-bot
pm2 save
pm2 startup
```

---

## Komutlar

| Komut                  | Aciklama                                          |
|------------------------|---------------------------------------------------|
| `/start`               | Karsilama mesajini ve komut listesini goster       |
| `/adduser <kullanici>` | Takip listesine Instagram kullanici adi ekle       |
| `/check <kullanici>`   | Hesabi aninda kontrol et (5 dk bekleme suresi)     |
| `/listusers`           | Tum takip edilen kullanicilari ve durumlarini goster|
| `/clearusers`          | Takip listesindeki tum kullanicilari kaldir        |

---

## Nasil Calisir

### Hesap Algilama

Bot `https://www.instagram.com/<kullanici_adi>/` adresine HTTP GET istegi gonderir ve yaniti analiz eder:

1. **HTTP 404** - Hesap mevcut degil (BANLI).
2. **HTTP 403/429** - Instagram rate limit uyguluyor (RATE_LIMIT).
3. **HTML icinde OpenGraph verisi veya JSON'da kullanici adi var** - Hesap aktif (AKTIF).
4. **HTML icinde "sayfa bulunamadi" mesaji var** - Hesap banli (BANLI).
5. **HTML icinde "kisitlanmis profil" mesaji var** - Hesap kisitli (KISITLI).
6. **Kullanici verisi olmayan genel Instagram sayfasi** - Rate limit algilandi (RATE_LIMIT).

### Arka Plan Isleme

- Bir cron gorevi her 30 dakikada bir calisir.
- En uzun sure once kontrol edilen kullaniciyi secer (round-robin).
- Instagram rate limit donerse, bot artan bekleme sureleriyle 3 kez yeniden dener (1, 2, 4 dakika).
- Her kontrolden sonra Telegram sohbetinize bildirim gonderilir.
- Arka plan islemi cokerse, bot hatayi loglar, size bildirim gonderir ve normal calismaya devam eder.

### Anlik Kontrol ve Arka Plan Kontrolu Karsilastirmasi

| Ozellik              | `/check` Komutu   | Arka Plan Kontrolu    |
|----------------------|-------------------|-----------------------|
| Basarisizlikta tekrar | Hayir (anlik)     | Evet (3 kez)          |
| Bekleme suresi       | 5 dakika          | 30 dakika aralik      |
| Bildirim             | Istekte bulunana  | CHAT_ID'ye            |
| Tetikleme            | Manuel            | Otomatik (cron)       |

---

## Rate Limit Korumasi

Instagram otomatik istekleri agresif bir sekilde sinirlar. Bot bunu en aza indirmek icin cesitli stratejiler kullanir:

1. **User-Agent Rotasyonu** - 4 farkli tarayici user-agent dizesi arasinda donus yapar.
2. **Istek Araliklari** - Arka plan kontrolleri 30 dakika arayla yapilir.
3. **Bekleme Suresi** - `/check` komutu kullanici basina 5 dakikalik bekleme suresi uygular.
4. **Gercekci Basliklar** - Istekler gercek bir tarayici oturumunu taklit eden basliklar icerir.
5. **Artan Bekleme** - Rate limit durumunda 1, 2, ardindan 4 dakika bekler ve tekrar dener.

Bu onlemlere ragmen, sunucunuzun IP itibarına ve izlenen hesap sayisina bagli olarak rate limiting yine de meydana gelebilir.

---

## Proje Yapisi

```
instagram-bot/
├── index.js               # Ana bot mantigi, komutlar, arka plan kontrolcu
├── instagramChecker.js     # Yeniden deneme mantikli Instagram profil kontrolcu
├── scheduler.js            # Arka plan kontrolleri ve gunluk raporlar icin cron zamanlayici
├── config.env              # Ortam degiskenleri (git tarafindan izlenmez)
├── users.json              # Takip edilen kullanici verileri (git tarafindan izlenmez)
├── package.json            # Node.js bagimliliklari
├── .gitignore              # Git yoksayma kurallari
└── README.md               # Bu dosya
```

---

## PM2 Komutlari

```bash
pm2 start index.js --name instagram-bot   # Botu baslat
pm2 restart instagram-bot                 # Botu yeniden baslat
pm2 stop instagram-bot                    # Botu durdur
pm2 logs instagram-bot --lines 50         # Son loglari goruntule
pm2 status                                # Bot durumunu kontrol et
pm2 delete instagram-bot                  # PM2'den kaldir
```

---

## Sorun Giderme

**Bot komutlara yanit vermiyor:**
- Botun calisip calismadigini kontrol edin: `pm2 status`
- `config.env` dosyasindaki bot tokenini dogrulayin
- Hata icin loglari kontrol edin: `pm2 logs instagram-bot`

**Arka plan bildirimleri gelmiyor:**
- `config.env` dosyasinda `CHAT_ID` degerinin dogru ayarlandigindan emin olun
- Grup sohbetleri icin CHAT_ID `-100` ile baslamalidir

**Tum hesaplar RATE_LIMIT gosteriyor:**
- Instagram IP'nizi engelliyor. 30-60 dakika bekleyin.
- Manuel `/check` komutlarinin sayisini azaltin.
- VPN veya proxy kullanmayi deneyin.

**Bot surekli cokuyor ve yeniden basliyor:**
- PM2 loglarini kontrol edin: `pm2 logs instagram-bot --err --lines 50`
- Yaygin neden: gecersiz bot tokeni veya ag sorunlari.

**409 Conflict Hatasi:**
- Ayni bot tokeni ile birden fazla cihazda (PC + Laptop) calismaya calisiyorsunuz.
- Cozum: Diger cihazi kapatin veya yeni bir bot tokeni kullanin.

---

## Lisans

Bu proje acik kaynaklidir ve [MIT Lisansi](LICENSE) altinda kullanilabilir.

---

Gelistirici: [@codedbyelif](https://github.com/codedbyelif)
