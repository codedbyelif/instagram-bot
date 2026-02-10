# 📱 Instagram Account Monitor Bot

> **Developed by [@codedbyelif](https://github.com/codedbyelif)**

Telegram botu ile Instagram hesaplarını otomatik olarak izleyin. Hesapların aktif, banlı veya kısıtlı olup olmadığını kontrol edin ve günlük raporlar alın.

## ✨ Özellikler

- 🔍 **Anlık Kontrol**: İstediğiniz kullanıcıyı anında kontrol edin
- 📊 **Otomatik İzleme**: Arka planda her 30 dakikada bir kullanıcı kontrol edilir
- 📈 **Günlük Raporlar**: Her gün saat 21:00'da detaylı rapor
- ⏱️ **Rate Limit Koruması**: 5 dakikalık cooldown ile Instagram rate limit'inden korunma
- 🎯 **Akıllı Tespit**: OG meta tags ve JSON analizi ile doğru sonuçlar
- 💾 **Kalıcı Veri**: JSON dosyasında kullanıcı durumları saklanır

## 🚀 Kurulum

### Gereksinimler

- Node.js v14 veya üzeri
- npm veya yarn
- Telegram Bot Token ([BotFather](https://t.me/botfather)'dan alın)
- PM2 (opsiyonel, arka plan çalıştırma için)

### Adım Adım Kurulum

1. **Repoyu klonlayın:**
```bash
git clone https://github.com/codedbyelif/instagram-bot.git
cd instagram-bot
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Yapılandırma dosyasını oluşturun:**
```bash
cp config.env.example config.env
```

4. **`config.env` dosyasını düzenleyin:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
CHAT_ID=your_chat_id_here
CHECK_TIME=21:00
```

**Not:** Chat ID'nizi öğrenmek için [@userinfobot](https://t.me/userinfobot) kullanabilirsiniz.

5. **Botu başlatın:**

**Normal Mod:**
```bash
node index.js
```

**PM2 ile (Önerilen):**
```bash
pm2 start index.js --name instagram-bot
pm2 save
pm2 startup
```

## 📖 Kullanım

### Komutlar

| Komut | Açıklama | Örnek |
|-------|----------|-------|
| `/start` | Yardım mesajını gösterir | `/start` |
| `/adduser <username>` | Listeye kullanıcı ekler | `/adduser cristiano` |
| `/check <username>` | Anlık kontrol yapar (5dk cooldown) | `/check instagram` |
| `/listusers` | Tüm kullanıcıları listeler | `/listusers` |
| `/clearusers` | Listeyi temizler | `/clearusers` |

### Durum Kodları

- ✅ **AKTIF** - Hesap aktif ve erişilebilir
- 🚫 **BANLI** - Hesap silinmiş veya bulunamadı
- ⚠️ **KISITLI** - Hesap kısıtlanmış
- ⏸️ **RATE_LIMIT** - Instagram rate limit algılandı
- ❔ **BELIRSIZ** - Durum belirlenemedi
- ❌ **HATA** - Kontrol hatası
- ⏳ **pending** - Henüz kontrol edilmedi

### Örnek Kullanım Senaryosu

```
1. Botu başlatın: /start
2. Kullanıcı ekleyin: /adduser riseinweb3
3. Anlık kontrol: /check riseinweb3
4. Listeyi görün: /listusers
5. Arka plan otomatik çalışır (her 30dk'da 1 kullanıcı)
6. Günlük rapor: 21:00'da otomatik gelir
```

## ⚙️ Nasıl Çalışır?

### Tespit Mekanizması

Bot, Instagram profil sayfalarını analiz ederek hesap durumunu tespit eder:

1. **HTTP Durum Kodu**: 404, 403 gibi kodları kontrol eder
2. **OG Meta Tags**: `og:title` ve `og:description` varlığını kontrol eder
3. **JSON İçeriği**: Sayfada `"username":"..."` varlığını arar
4. **Sayfa Başlığı**: Generic "Instagram" mı yoksa kullanıcı bilgisi içeriyor mu kontrol eder

### Arka Plan İşleme

- Her 30 dakikada bir çalışır
- En eski kontrol edilen kullanıcıyı seçer (round-robin)
- Sadece 1 kullanıcı kontrol eder
- Sorunlu hesaplar için anında bildirim gönderir

### Rate Limit Koruması

- `/check` komutu için kullanıcı başına 5 dakika cooldown
- Arka plan kontrollerinde her seferinde sadece 1 istek
- Gelişmiş HTTP headers ile gerçekçi tarayıcı simülasyonu

## 📁 Proje Yapısı

```
instagram-bot/
├── index.js              # Ana bot mantığı
├── instagramChecker.js   # Instagram kontrol modülü
├── scheduler.js          # Zamanlama ve arka plan işleri
├── config.env            # Yapılandırma dosyası
├── users.json            # Kullanıcı veritabanı
├── package.json          # Proje bağımlılıkları
└── README.md             # Dokümantasyon
```

## 🔧 Gelişmiş Ayarlar

### PM2 Komutları

```bash
# Botu başlat
pm2 start instagram-bot

# Logları izle
pm2 logs instagram-bot

# Yeniden başlat
pm2 restart instagram-bot

# Durdur
pm2 stop instagram-bot

# Sil
pm2 delete instagram-bot

# Durum kontrol
pm2 status
```

### Günlük Rapor Saatini Değiştirme

`config.env` dosyasında `CHECK_TIME` değerini düzenleyin:

```env
CHECK_TIME=09:00  # Sabah 9'da rapor
CHECK_TIME=21:00  # Akşam 9'da rapor (varsayılan)
```

## ⚠️ Bilinen Sınırlamalar

1. **Instagram Rate Limiting**: Instagram çok sık istek yapılmasını engelliyor
   - Çözüm: Arka plan kontrolü her 30dk'da sadece 1 kullanıcı
   - `/check` komutu 5 dakika cooldown ile sınırlı

2. **Public Bilgiler**: Sadece public profil bilgileri kontrol edilebilir
   - Private hesaplar için sınırlı bilgi

3. **Değişken Yanıtlar**: Instagram bazen farklı yanıtlar verebilir
   - `RATE_LIMIT` durumu bu durumları işaret eder

## 🛠️ Sorun Giderme

### Bot çalışmıyor

1. `config.env` dosyasını kontrol edin
2. Token ve Chat ID'nin doğru olduğundan emin olun
3. PM2 loglarını kontrol edin: `pm2 logs instagram-bot`

### Rate limit alıyorum

1. Daha az kullanıcı ekleyin (max 10-15)
2. `/check` komutunu sık kullanmayın (5dk cooldown)
3. Arka plan kontrolünün otomatik çalışmasını bekleyin

### Yanlış sonuçlar

1. Instagram bazen generic sayfa döndürüyor (`RATE_LIMIT`)
2. Birkaç saat sonra tekrar kontrol edin
3. Arka plan kontrolü otomatik olarak tekrar deneyecek

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'feat: add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 👨‍💻 Geliştirici

**Elif** - [@codedbyelif](https://github.com/codedbyelif)

## 🙏 Teşekkürler

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) - Telegram Bot API
- [axios](https://github.com/axios/axios) - HTTP client
- [cheerio](https://github.com/cheeriojs/cheerio) - HTML parsing
- [node-cron](https://github.com/node-cron/node-cron) - Cron jobs

---

<div align="center">
  <strong>Made with ❤️ by @codedbyelif</strong>
</div>
