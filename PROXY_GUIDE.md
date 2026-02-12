# Instagram Rate Limit ve Proxy Rehberi

## Rate Limit Nedir?

Instagram, sunucularina gelen istekleri takip eder. Ayni IP adresinden kisa surede cok fazla istek gelirse, o IP'yi **gecici veya kalici olarak engeller**. Buna **rate limit** deniyor.

### Bot Neden Rate Limit Yiyor?

Bot, Instagram profil sayfalarina **giris yapmadan** (anonim olarak) HTTP istegi atiyor. Instagram bu tur anonim istekleri cok siki denetliyor:

| Durum | Instagram'in Tepkisi |
|---|---|
| Ayni IP'den 10-15 istek/saat | Genelde sorunsuz |
| Ayni IP'den 20-30+ istek/saat | Rate limit (HTTP 429 veya bos sayfa) |
| Ayni IP'den surekli istek (gunlerce) | IP gecici ban (birkaç saat - birkaç gun) |
| Datacenter IP'sinden istek | Cok daha hizli engelleme (ev IP'sine gore) |

### Ne Kadar Rate Limit Yerim?

Instagram'in resmi bir limiti yok ama genel gozlemler:

- **Giris yapmadan (anonim):** Saatte ~10-15 istek guvenli
- **Ev internet IP'si:** Daha toleransli (normal kullanici gibi gorunur)
- **VPS/Sunucu IP'si:** Cok daha erken engellenir (datacenter IP'leri biliniyor)
- **Proxy ile:** Her istekte farkli IP = sinir yok gibi

> Ornek: 3 kullanici takip ediyorsan, 2 saatte 1 kontrol = gundelik 36 istek. Tek IP ile bu bile riskli olabilir.

---

## Farkli IP (Proxy) Neden Calisir?

Instagram rate limit'i **IP bazli** uygular. Yani:

```
Senin IP: 85.100.xx.xx → 50 istek → ENGELLENDI

Proxy ile:
Istek 1 → 45.32.xx.xx (ABD)     → OK
Istek 2 → 103.21.xx.xx (Almanya) → OK
Istek 3 → 91.108.xx.xx (Fransa)  → OK
... her istek farkli IP = Instagram pattern tespit edemez
```

### Rotating Proxy Nasil Calisir?

```
Bot → Proxy Sunucusu → Instagram
         ↓
   Her istekte farkli
   IP adresi kullaniyor
```

Rotating (donen) proxy servisleri, havuzlarindaki binlerce IP adresini sirayla veya rastgele kullanir. Instagram her istegi farkli bir kullanicidan gelmis gibi gorur.

---

## Nereden Proxy Almalisin?

### Onerilen Servisler

| Servis | Tur | Fiyat | Neden? |
|---|---|---|---|
| **Webshare** | Datacenter | ~$3/ay (10 proxy) | Ucuz, basit, yeni baslayanlar icin ideal |
| **Bright Data** | Residential | ~$15/ay | En guvenilir, gercek ev IP'leri |
| **Oxylabs** | Residential | ~$15/ay | Buyuk IP havuzu |
| **ProxyScrape** | Datacenter | ~$3/ay | Ucuz alternatif |
| **SmartProxy** | Residential | ~$12/ay | Instagram icin optimize |

### Hangi Tur Proxy Secmeliyim?

| Tur | Avantaj | Dezavantaj | Instagram icin |
|---|---|---|---|
| **Residential (Ev IP)** | Gercek kullanici IP'si, tespit edilmesi zor | Daha pahali | En iyi secim |
| **Datacenter** | Ucuz, hizli | Instagram datacenter IP'lerini taniyor | Ise yarar ama riskli |
| **Ucretsiz Proxy** | Bedava | Yavas, guvenilmez, verileriniz calınabilir | KULLANMAYIN |

> **Oneri:** Baslamak icin **Webshare** (ucuz, basit). Ciddi kullanim icin **Bright Data** veya **SmartProxy**.

---

## Neden Proxy Almaliyim?

### Proxy OLMADAN:
- ❌ Ayni IP'den surekli istek → Rate limit
- ❌ IP ban yersen ev internetin etkilenir
- ❌ VPS kullansan bile tek IP = ayni sorun
- ❌ Bot guvenilir calisamaz

### Proxy ILE:
- ✅ Her istek farkli IP → Rate limit yok
- ✅ Kendi IP'n hic aciga cikmiyor
- ✅ Kontrol araligi azaltilabilir (2 saat yerine 30dk bile olur)
- ✅ Bot 7/24 stabil calisir
- ✅ Daha fazla kullanici takip edebilirsin

---

## Proxy Nasil Eklenir? (Teknik)

`config.env` dosyasina su satirlar eklenir:

```env
PROXY_HOST=proxy-sunucu-adresi.com
PROXY_PORT=8080
PROXY_USER=kullanici_adi
PROXY_PASS=sifre
```

Bot bu bilgileri okuyup her istekte proxy uzerinden gider.

---

## Ozet Karar Tablosu

| Senaryo | Proxy Gerekli mi? | Oneri |
|---|---|---|
| 1-3 kullanici, 2 saatte 1 kontrol | Simdilik hayir | Mevcut ayarlarla dene |
| 5+ kullanici veya sik kontrol | Evet | Webshare ($3/ay) |
| 10+ kullanici, gunluk raporlama | Kesinlikle evet | Residential proxy ($12-15/ay) |
| Rate limit surekli devam ediyorsa | Evet | Hemen al |

---

*Bu rehber @codedbyelif tarafindan hazirlanmistir.*
