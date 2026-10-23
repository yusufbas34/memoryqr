# MemoryQR

Düğün, nişan, kına ve mezuniyet için tek QR'lı ortak albüm. Misafir QR'ı okutur, adını yazar, fotoğraf ve videolarını yükler.
Etkinlik sahibi hepsini tek yerde görür, gizler, siler ve ZIP olarak indirir. Albüm etkinlikten 30 gün sonra kapanır,
dosyalar kalıcı olarak silinir. Bul QR ailesinin ürünüdür (Tasma QR, Araç QR).

İletişim (WhatsApp), paket fiyatları ve 1 yıl saklama eki `index.html` başındaki ayarlardadır (`WHATSAPP`, `INSTAGRAM`, `PAKETLER`, `EK_ARSIV`).

## Sayfalar

| Adres | Ne yapar |
|---|---|
| (adres yalın) | **Tanıtım sayfası**: nasıl çalışır, özellikler, kart tasarımları (canlı çizilir), paketler, yorumlar, SSS, albüm koduyla giriş. Yorumlar veritabanından gelir |
| `?e=KOD` | **Misafir sayfası** (QR bunu açar): ad, çoklu fotoğraf/video yükleme, kameradan çekim, ortak galeri |
| `?e=KOD&sahip` | **Etkinlik sahibi**: PIN ile giriş, istatistik, gizle/sil, misafire göre süzme, ZIP indirme (400 MB'lık parçalar), QR kartı PDF, WhatsApp'a kaydet, "misafirler galeriyi görsün" anahtarı |
| `?e=KOD&kart` | **Kart tasarımı (müşteriye gönderilen link, PIN ile)**: hazır tasarım seçme ya da kendi tasarımını yükleme (QR'ın yeri ve boyutu seçilir), kart yazısı; masa kartı, kartvizit ve ayaklı pano önizlemesi ve PDF'leri. Seçilen tasarım misafir sayfasının başında görünür, vurgu rengi tasarımdan gelir. Yönetimde **Tasarım linkini gönder** ile WhatsApp'tan gönderilir |
| `?tasarimlar` | **Tasarım seçme**: müşteri kendi isimleriyle bütün kartları görür, seçip WhatsApp'tan gönderir |
| `?e=KOD&slayt` | Slayt gösterisi (şimdilik satılmıyor; panelde düğmesi yok, adresle açılır) |
| `?admin` | **Yönetim**: etkinlik oluştur/düzenle (kod + 6 haneli PIN üretilir), masa kartı PDF'i, müşteriye WhatsApp, dosyaları/etkinliği sil |

**Masa kartı:** 38 tasarım, 6 kategori (Düğün · Nişan · Kına, Doğum günü kız/erkek, Mezuniyet, Retro & eğlenceli,
Modern & renkli). Süslemeler kodla çizilir; çocuk ve retro kartlardaki çizimler Twemoji (`kart/emoji/`, CC-BY 4.0),
Çiçek Bahçesi'nin madalyonu `kart/cicek.webp`. Kart yazısı değiştirilebilir; boş bırakılırsa tasarımın kendi metni kullanılır.
İsimler, baş harfler ve tarih etkinlik bilgilerinden gelir. A6 (105×148 mm); iki PDF iner: 3 mm taşma paylı tek kart
(Özalit'e matbaa baskısı için) ve A4'e 4'lü kesim çizgili. Seçilen tasarım etkinliğe kaydedilir.

**Ürünler ve PDF'ler:** masa kartı (A6, 3 mm taşma + A4'e 4'lü), kartvizit (85 × 55 mm, 3 mm taşma + A4'e 10'lu), ayaklı pano
(50 × 70 ya da 35 × 50 cm, 5 mm taşma, ~150 dpi; masa kartı tasarımı büyütülür). Kendi tasarımı yüklenen etkinliklerde görsel
kartı kaplar, QR beyaz kutuda seçilen yere basılır. Yüklenen tasarımlar R2'de `t/KOD/` altında durur (31 gün kuralına girmez,
etkinlik silinince silinir).

**Tasarım seçme sayfası (`?tasarimlar`):** müşteri isimlerini, etkinliği ve tarihi yazar, bütün tasarımları kendi kartı
olarak görür, beğendiğini seçip WhatsApp'tan gönderir (tasarım adı ve kodu mesajda yazar). Müşteriye gönderilecek bağlantı:
`https://memoryqr.bulqr.com.tr/?tasarimlar`

**Yorumlar:** tanıtım sayfasında herkes yorum yazabilir; yönetimde (en altta) **Yayınla** denen yorumlar sayfada görünür.
Etkinlik sahibinin panelinde de yorum bağlantısı var.

**1 yıl saklama eki (+299 TL):** etkinlik bitmeden albümü ZIP olarak indirip kendi Google Drive'ınıza yükleyin, klasörü
"bağlantıya sahip olan herkes görüntüleyebilir" olarak paylaşın ve bağlantıyı yönetimde etkinliğin **Google Drive arşiv
bağlantısı** alanına yazın. Etkinlik sahibi albüm panelinde "Arşivi açın" düğmesini görür.

**Misafir galerisi:** varsayılan olarak her misafir yalnızca kendi telefonundan yüklediklerini görür. Etkinlik sahibi
panelden "Misafirler birbirinin yüklediklerini görebilsin" seçeneğini açarsa herkes tüm (gizlenmemiş) fotoğrafları görür.

**Kalite:** fotoğraflar orijinal haliyle yüklenir (küçültme yok). Yalnızca iPhone'un HEIC/HEIF dosyaları her tarayıcıda
açılabilsin diye aynı çözünürlükte JPEG'e çevrilir.

## Nasıl çalışır

```
Misafir telefonu ── index.html (GitHub Pages)
   │  galeri için 480 px küçük resim üretir (fotoğrafın kendisi orijinal kalitede gider)
   ├─▶ Supabase  memory_upload_begin  → dosya kaydı + imzalı yükleme izni (3 saat geçerli)
   ├─▶ Worker    PUT /u/<anahtar>     → imzayı doğrular, dosyayı R2'ye yazar
   └─▶ Supabase  memory_upload_done   → dosya galeride görünür
Galeri/indirme ── Worker GET /f/<anahtar> (R2'den; indirme trafiği ücretsiz)
```

- Fotoğraf en çok 40 MB, video en çok 300 MB. Etkinlik başına en çok 5.000 dosya ve 40 GB.
- Dosya anahtarları tahmin edilemez (`e/KOD/<uuid>.jpg`). Supabase ile Worker yalnızca ortak imza anahtarını paylaşır.
- Süre dolunca sayfa yükleme ve görüntülemeyi kapatır. R2 yaşam döngüsü kuralı dosyaları kendisi siler (aşağıda 4. adım).

## Kurulum

### 1. Veritabanı (Supabase)
Tasma QR ile aynı projeyi kullanabilirsiniz; tablolar `memory_` ile başlar.
1. Supabase > SQL Editor'da `kurulum.sql` dosyasını açın, en üstteki `v_sifre` satırına yönetim şifrenizi
   (en az 10 karakter) yazın ve **Run**'a basın.
2. Worker için imza anahtarını alın: SQL Editor'da `select upload_secret from memory_config;` çalıştırın ve çıkan değeri kopyalayın.

### 2. Dosya deposu (Cloudflare R2)
1. Cloudflare > **R2** > **Create bucket**, ad: `memoryqr`.
2. Bucket > **Settings** > **Object lifecycle rules** > **Add rule**: önek `e/`, **Delete objects 31 days after upload**.

### 3. Worker
Panelden (kurulum gerekmez):
1. Cloudflare > **Workers & Pages** > **Create** > **Worker**, ad: `memoryqr-dosya`, **Deploy**.
2. **Edit code**: içeriği silin, `worker/worker.js` dosyasını yapıştırın, **Deploy**.
   Worker kodu güncellendiğinde (ör. `t/` öneki için) aynı yolla yeniden yapıştırıp **Deploy** edin.
3. Worker > **Settings** > **Bindings** > **Add** > **R2 bucket**: değişken adı `BUCKET`, bucket `memoryqr`.
4. Worker > **Settings** > **Variables and Secrets** > **Add**: tür **Secret**, ad `UPLOAD_SECRET`, değer 1. adımda kopyaladığınız anahtar.
   İsteğe bağlı: `ALLOWED_ORIGINS` = sitenin adresi (ör. `https://memoryqr.bulqr.com.tr`).
5. Worker adresini (ör. `https://memoryqr-dosya.HESABINIZ.workers.dev`) açın: "MemoryQR dosya sunucusu çalışıyor." yazmalı.

Komut satırından: `cd worker && npx wrangler deploy && npx wrangler secret put UPLOAD_SECRET`.

### 4. Site
1. `index.html` başındaki `FILES_URL` satırına Worker adresini yazın (sonunda `/` olmadan).
2. `SITE_URL` QR kartlara basılan adrestir: `https://memoryqr.bulqr.com.tr/`. **Kartlar basıldıktan sonra değiştirmeyin.**
   Alan adı: kökteki `CNAME` dosyası GitHub Pages'e adresi bildirir. Cloudflare DNS'te `memoryqr` için **CNAME** kaydı
   `yusufbas34.github.io` (bulut gri / DNS only). GitHub > Settings > Pages'te alan adı doğrulanınca **Enforce HTTPS**'i işaretleyin.
   Worker'daki `ALLOWED_ORIGINS` değerine `https://memoryqr.bulqr.com.tr` eklenmeli (virgülle birden fazla adres yazılabilir).
3. `SITE_URL` + `?admin` adresinden giriş yapın, etkinliği oluşturun, **Masa kartı PDF**'ini Özalit'e gönderin.

## Dosyalar
- `index.html`: sitenin tamamı (misafir, sahip, slayt, yönetim)
- `kurulum.sql`: veritabanı (tekrar çalıştırmak güvenli)
- `worker/worker.js`, `worker/wrangler.toml`: Cloudflare Worker
- `kart.js`, `kart.css`, `fonts/kart/`: masa kartı tasarımları ve yazı tipleri (Playfair Display, Cormorant Garamond, Great Vibes, Montserrat, Courier Prime, Bodoni Moda, Fredoka, Bungee; SIL OFL 1.1); `kart/emoji/`: Twemoji çizimleri (CC-BY 4.0)
- `gizlilik.html`: gizlilik ve KVKK aydınlatma metni
- `vendor/`: qrcode-generator 1.4.4, jsPDF 2.5.1, JSZip 3.10.1 (MIT); `fonts/`: Barlow (SIL OFL 1.1)

## Sonraki adımlar
- Sipariş formu ve ödeme (IBAN, Tasma QR'daki akış), süre uzatma satışı
- Albüm silinmeden 7 gün ve 1 gün önce WhatsApp/e-posta hatırlatması
- Aile paketi: kına + nişan + düğün için tek QR'dan ayrı albümler
- Yükleme kuyruğunun sayfa kapanınca da sürmesi (IndexedDB)
