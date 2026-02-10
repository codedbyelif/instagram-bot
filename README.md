# Instagram Durum Kontrol Botu

Instagram kullanıcı adlarını ve direct thread URL'lerini kontrol ederek hesap durumunu izleyen Telegram botu.

## Özellikler

- **Kombine Kontrol**: Hem kullanıcı adı hem de direct thread URL doğrulaması
- **Otomatik İzleme**: Her 30 dakikada bir arka plan kontrolü
- **Günlük Raporlar**: Belirlenen saatte (varsayılan 21:00) otomatik rapor
- **Gizlilik**: User-Agent rotasyonu ile tespit edilememe
- **7/24 Çalışma**: PM2 ile kesintisiz arka plan servisi

## Durum Kodları

- **AKTIF**: Hesap aktif, kullanıcı adı doğrulandı
- **KULLANICI_ADI_DEGISMIS**: Kullanıcı adı bulunamadı, hesap kapatılmış veya değişmiş olabilir
- **URL_GECERSIZ**: Thread URL geçersiz veya silinmiş
- **ERISIM_KISITLI**: Instagram tarafından erişim engellendi
- **HATA**: Kontrol sırasında hata oluştu

## Kurulum

### 1. Gereksinimler

```bash
git clone https://github.com/codedbyelif/instagram-bot.git
cd instagram-bot
npm install
npm install pm2 -g
```

### 2. Yapılandırma

`config.env` dosyası oluşturun:

```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
CHAT_ID=YOUR_CHAT_ID
CHECK_TIME=21:00
```

### 3. Başlatma

```bash
pm2 start index.js --name instagram-bot
pm2 startup
pm2 save
```

## Kullanım

### Telegram Komutları

**Kullanıcı Ekleme:**
```
/adduser riseinweb3 https://www.instagram.com/direct/t/123456789/
```

**Liste Görüntüleme:**
```
/listusers
```

**Anlık Kontrol:**
```
/checknow
```

**Listeyi Temizleme:**
```
/clearusers
```

### Yönetim Komutları

```bash
# Durum kontrolü
pm2 status

# Logları izleme
pm2 logs instagram-bot

# Yeniden başlatma
pm2 restart instagram-bot

# Durdurma
pm2 stop instagram-bot
```

## Veri Yapısı

Her kullanıcı kaydı şu formatta saklanır:

```json
{
  "username": "kullanici_adi",
  "directThreadUrl": "https://www.instagram.com/direct/t/THREAD_ID/",
  "status": "pending",
  "lastChecked": null
}
```

## Çalışma Mantığı

1. **Direct Thread URL Kontrolü**: Verilen URL'ye GET isteği gönderilir
2. **Redirect Takibi**: Yönlendirmeler otomatik takip edilir
3. **Kullanıcı Adı Doğrulama**: Response içinde beklenen kullanıcı adı aranır
4. **Durum Güncelleme**: Sonuç kaydedilir ve raporlanır

## Güvenlik

- Bot token `.env` dosyasında saklanır
- User-Agent rotasyonu ile tespit önleme
- Rate limiting (her istek arası 3 saniye)
- Timeout koruması (10 saniye)

## Sunucu Kurulumu

Botun kesintisiz çalışması için VPS önerilir:

1. Sunucuya SSH ile bağlanın
2. Yukarıdaki kurulum adımlarını uygulayın
3. `pm2` ile başlatın
4. Bot arka planda çalışmaya devam edecektir

## Teknik Detaylar

- **Node.js** runtime
- **axios** - HTTP istekleri
- **cheerio** - HTML parsing
- **node-cron** - Zamanlama
- **dotenv** - Yapılandırma
- **pm2** - Process yönetimi
