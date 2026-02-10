# Instagram Durum Kontrol Botu (Akıllı Mod + 7/24 + Gizlilik)

Instagram kullanıcı durumlarını dağıtık zamanlı kontrollerle izleyen, banlanma riskini minimize eden, gizlilik önlemleri almış ve 7/24 çalışabilen Telegram botu.

## Öne Çıkan Özellikler

1.  **Dağıtık Kontroller (Anti-Ban Sistemi)**:
    - Bot, tüm kullanıcıları gün içine yayarak **30 dakikada bir** küçük gruplar halinde kontrol eder.
    - Kontroller sırasında insan davranışı taklit edilerek rastgele beklemeler (2-10 saniye) yapılır.

2.  **Gizlilik ve Tespit Edilememe (Stealth Mode)**:
    - **User-Agent Rotasyonu**: Her istekte farklı bir tarayıcı (Chrome, Firefox, Safari, Mobile) gibi davranır.
    - **Akıllı Analiz**: Sadece kodlara bakmaz, Instagram'ın "Sayfa bulunamadı" veya "Kısıtlanmış profil" gibi mesajlarını okuyarak daha doğru sonuç verir.

3.  **Anlık Uyarılar**:
    - Arka plan kontrolü sırasında **banlanan** veya **kısıtlanan** hesap tespit edilirse **anında** mesaj atar.

4.  **Günlük Toplu Rapor**:
    - Her gün **21:00'de** (veya ayarlanan saatte) günün özetini tek bir mesajla bildirir.

## Kurulum (Kendi Bilgisayarınızda veya Sunucuda)

Bu botu bir kez kurup çalıştırdığınızda, siz durdurana kadar sonsuza kadar çalışır. **Her gün tekrar kurmanıza veya çalıştırmanıza gerek yoktur.**

### 1. Gerekli Kurulumlar

Bu adımları sadece **BİR KEZ** yapmanız yeterlidir.

```bash
# 1. Projeyi İndirin (Sunucuda veya bilgisayarda)
git clone https://github.com/codedbyelif/instagram-bot.git
cd instagram-bot

# 2. Gerekli Paketleri Yükleyin
npm install

# 3. Arka Plan Yöneticisini (PM2) Yükleyin
npm install pm2 -g
```

### 2. Ayarlar

`config.env` dosyasını oluşturun ve içine şunları yazın:

```env
TELEGRAM_BOT_TOKEN=8402826158:AAGPDOGKy0adU882MXb1p-6TOB-QzRLoOdg
CHAT_ID=
CHECK_TIME=21:00
```

### 3. Botu Başlatma ve Unutma

Botu arka planda başlatmak için şu komutları uygulayın. Bu işlemden sonra terminali kapatabilirsiniz, bot çalışmaya devam eder.

```bash
# Botu başlat
pm2 start index.js --name instagram-bot

# Botun sunucu/bilgisayar yeniden başlasa bile otomatik açılmasını sağla
pm2 startup
pm2 save
```

**Artık botunuz 7/24 aktif!**

---

## Sunucuda Çalıştırma (Önerilen)

Botun kesintisiz çalışması için kişisel bilgisayar yerine bir **Sanal Sunucu (VPS)** (DigitalOcean, AWS, Google Cloud, Hetzner vb.) kullanmanız önerilir.

1.  Sunucunuza SSH ile bağlanın.
2.  Yukarıdaki "Kurulum" adımlarını aynen uygulayın.
3.  `pm2` ile başlattıktan sonra sunucudan çıkış yapabilirsiniz. Bot orada çalışmaya devam edecektir.

---

## Yönetim Komutları

Bot durumunu kontrol etmek isterseniz:

- **Durumu Gör**: `pm2 status`
- **Logları İzle**: `pm2 logs instagram-bot`
- **Durdur**: `pm2 stop instagram-bot`
- **Yeniden Başlat**: `pm2 restart instagram-bot`

## Telegram Komutları

- **`/start`**: Botu başlatır.
- **`/addusers`**: Takip listesine kullanıcı ekler.
- **`/listusers`**: Takip edilenleri listeler.
- **`/checknow`**: Mevcut durum raporunu anında gösterir.
- **`/clearusers`**: Listeyi temizler.
