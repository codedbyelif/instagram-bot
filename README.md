# 📸 Instagram Durum Kontrol Botu (Akıllı Mod + 7/24)

Instagram kullanıcı durumlarını **dağıtık zamanlı kontrollerle** izleyen, **banlanma riskini minimize eden** ve **7/24 çalışabilen** Telegram botu.

## 🌟 Öne Çıkan Özellikler

1.  **Dağıtık Kontroller (Anti-Ban Sistemi)**:
    - Bot, tüm kullanıcıları gün içine yayarak **30 dakikada bir** küçük gruplar halinde kontrol eder.
    - Kontroller sırasında rastgele beklemeler (2-10 saniye) yapılır.

2.  **Anlık Uyarılar**:
    - Arka plan kontrolü sırasında **banlanan** veya **kısıtlanan** hesap tespit edilirse **anında** mesaj atar.

3.  **Günlük Toplu Rapor**:
    - Her gün **21:00'de** (veya ayarlanan saatte) günün özetini tek bir mesajla bildirir.

4.  **7/24 Arka Plan Servisi**:
    - Bilgisayarınız açık olduğu sürece arka planda sessizce çalışır.

## 🚀 Kurulum

1.  **Gerekli Paketleri Yükleyin**:
    ```bash
    npm install
    ```

2.  **Arka Plan Yöneticisini (PM2) Yükleyin**:
    - Botun sürekli çalışması için `pm2` aracını kullanıyoruz.
    ```bash
    npm install pm2 -g
    ```

3.  **Ayarlar**:
    - `config.env` dosyasını düzenleyin (`CHECK_TIME`, `TELEGRAM_BOT_TOKEN`).

## 🤖 Kullanım

### Botu Başlatma (Arka Planda)
Botu bir kez başlattıktan sonra terminali kapatabilirsiniz.

```bash
pm2 start index.js --name instagram-bot
pm2 save
```

### Yönetim Komutları
- **Durumu Gör**: `pm2 status`
- **Logları İzle**: `pm2 logs instagram-bot`
- **Durdur**: `pm2 stop instagram-bot`
- **Yeniden Başlat**: `pm2 restart instagram-bot`

### Telegram Komutları

- **`/start`**: Botu başlatır.
- **`/addusers`**: Takip listesine kullanıcı ekler.
- **`/listusers`**: Takip edilenleri listeler.
- **`/checknow`**: Mevcut durum raporunu anında gösterir.
- **`/clearusers`**: Listeyi temizler.

## 🧠 Nasıl Çalışır?

1.  **Veri Kaydı**: Kullanıcılar veritabanına eklenir.
2.  **Arka Plan**: Her 30 dakikada bir 5 kullanıcı kontrol edilir.
3.  **Raporlama**: Saat 21:00'de toplu rapor sunulur.

## ⚠️ Önemli Not
Botun çalışması için bilgisayarınızın açık olması ve internete bağlı olması gerekir. Bilgisayarı kapatırsanız bot durur, açtığınızda otomatik (veya `pm2 resurrect` ile) devam eder.
