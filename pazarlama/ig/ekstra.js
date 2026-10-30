// MemoryQR Instagram içerik bankası (marka seti, m-* şablonları): 30 günlük planın dışında, istenen gün paylaşılır.
// araclar/ig-uret.cjs bunları pazarlama/ig/ek-NN-K.jpg (karusel 1080×1350) ve ek-NN.mp4 + ek-NN-kapak.jpg (Reels) olarak üretir.
//   h: başlık  t: karusel | reels  ne: ne zaman/neden  cap: açıklama  tags: o içeriğe özel etiketler
//   b: başlık satırları (tek sıradakiler koyu, çift sıradakiler bordo)  bant: alt banttaki kısa söz ("|" satır böler)
const KAPAK_TANITIM = {tpl: "m-kapak", b: ["MemoryQR", "nedir?"], metin: "Düğününde misafirlerin çektiği **fotoğraf ve videoları** tek QR ile **tek albümde** toplayan servis. Uygulama yok, kayıt yok.",
  chips: ["📸 Fotoğraf", "🎥 Video", "💌 Tek albüm"], bant: "Misafirlerin çektiği | her an, tek albümde."};
const ADIM_MISAFIR = {tpl: "m-adim", etiket: "Nasıl çalışır", b: ["Okut,", "adını yaz,", "yükle."], ekran: "misafir",
  metin: "Misafir telefon kamerasıyla QR'ı okutur; sayfa **tarayıcıda** açılır.",
  adimlar: [["QR'ı okut", "Masadaki karttan, kamerayla"], ["Adını yaz", "Kim yüklediği belli olsun"], ["Yükle", "Orijinal kalitede, videolar dahil"]],
  bant: "Uygulama indirmek yok, | üye olmak yok."};
const LISTE_OZELLIK = {tpl: "m-liste", etiket: "MemoryQR'da ne var", b: ["Dört şey,", "tek QR."], maddeler: [
  ["foto", "Orijinal kalite", "Fotoğraflar sıkıştırılmadan, olduğu gibi gelir."],
  ["video", "Videolar da", "Video başına 300 MB'a kadar; dans, konuşma, ilk dans."],
  ["indir", "Tek tıkla indirme", "Hepsini tek seferde bilgisayarına ya da telefonuna al."],
  ["palet", "60 kart tasarımı", "Masa kartı, kartvizit, giriş panosu; isminle hazır."]],
  bant: "Hepsi tek albümde, | hepsi senin."};
const CTA = (b, alt) => ({tpl: "m-cta", b, ...(alt ? {alt} : {})});

const IG_EKSTRA = [
  {t: "karusel", h: "MemoryQR nedir? (marka tanıtımı)",
    ne: "Profilin en üstüne sabitle. Yeni gelen herkes önce bunu görsün.",
    cap: "MemoryQR nedir? 📸\n\nDüğününde misafirlerin çektiği fotoğraf ve videolar telefonlarda kalmasın. Masaya tek QR koy; misafirler okutur, adını yazar, yükler. Hepsi tek albümde.\n\n✓ Uygulama yok\n✓ Orijinal kalite, videolar dahil\n✓ Tek tıkla hepsini indir\n\n👉 Kartını kendi isminle gör: link profilde",
    tags: ["#qrkod", "#düğünfotoğrafları", "#misafirfotoğrafları", "#anıalbümü"],
    slides: [KAPAK_TANITIM, ADIM_MISAFIR, LISTE_OZELLIK,
      {tpl: "m-foto", etiket: "Her yerde", b: ["Masada, girişte,", "tabakta."], foto: "sovale-pano", metin: "Masa kartı, kartvizit ya da **giriş panosu**: hepsinde aynı QR, aynı albüm.", bant: "Kartın hazır, | QR'ın hazır."},
      CTA(["Tasarımını seç,", "siparişi başlat."])]},

  {t: "reels", h: "MemoryQR 15 saniyede",
    ne: "Tanıtım karuselinin video hâli. Trend bir sesle paylaş, kapak olarak ilk kareyi seç.",
    cap: "15 saniyede MemoryQR ⏱️\n\nQR'ı okut → adını yaz → yükle. Düğünün bütün fotoğrafları tek albümde.\n\n👉 Link profilde",
    tags: ["#reels", "#düğünhazırlığı", "#qrkod", "#gelinadayı"],
    reels: {kapak: {...KAPAK_TANITIM, kaydir: false},
      sahneler: [{...KAPAK_TANITIM, kaydir: false, sure: 2.6}, {...ADIM_MISAFIR, sure: 3.2}, {...LISTE_OZELLIK, sure: 3.4},
        {...CTA(["Tasarımını seç,", "siparişi başlat."]), sure: 2.6}]}},

  {t: "karusel", h: "Eskiden / MemoryQR ile",
    ne: "Karşılaştırma içerikleri çok kaydedilir. Hafta içi akşam paylaş.",
    cap: "Hangisi tanıdık geliyor? 😅\n\nWhatsApp grubunda kaybolan, kalitesi bozulan fotoğraflar yerine tek albüm.\n\nYorumlara 'eskiden' ya da 'şimdi' yaz 👇",
    tags: ["#düğün", "#whatsappgrubu", "#düğünfotoğrafları", "#qrkod"],
    slides: [
      {tpl: "m-kapak", b: ["Düğün fotoğrafları", "nerede kaldı?"], metin: "\"Bana da atar mısın?\" mesajlarının **bittiği** yer.", chips: ["💬 Grup mesajları", "📉 Bozulan kalite", "😔 Kayıp videolar"], kaydir: "Kaydır, karşılaştır", bant: "Eskiden dağınıktı, | şimdi tek albüm."},
      {tpl: "m-karsi", etiket: "Eskiden / Şimdi", b: ["Aynı düğün,", "iki farklı son."],
        sol: ["Eskiden", ["Fotoğraflar 30 kişinin telefonunda", "WhatsApp kaliteyi bozar", "Videolar hiç gelmez", "Haftalarca \"atar mısın?\""]],
        sag: ["MemoryQR ile", ["Hepsi tek albümde", "Orijinal kalite", "Videolar da gelir", "Ertesi sabah hepsi hazır"]], bant: "Tek QR, | tek albüm."},
      CTA(["Bu sefer", "hepsi sende kalsın."])]},

  {t: "karusel", h: "Misafir ne görür?",
    ne: "\"Misafirler zorlanır mı?\" sorusunun cevabı. Yaşça büyük misafir kaygısına iyi gelir.",
    cap: "Misafirin gözünden MemoryQR 👀\n\nUygulama yok, üyelik yok. Kamerayla okut, adını yaz, yükle. Teyzeler bile 10 saniyede yüklüyor 😄\n\n🔒 Misafir yalnızca kendi yüklediklerini görür.",
    tags: ["#düğünmisafiri", "#qrkod", "#kolay", "#düğünhazırlığı"],
    slides: [
      {tpl: "m-kapak", b: ["Misafir", "ne görür?"], metin: "Her yaştan misafir için **10 saniyelik** bir iş.", chips: ["📷 Kamera", "✍️ İsim", "⬆️ Yükle"], bant: "Kolay olsun ki | herkes yüklesin."},
      {tpl: "m-adim", etiket: "Misafir ekranı", b: ["Sadece", "adını yazar."], ekran: "isim", metin: "Şifre yok, e-posta yok. **Adı** yeter.",
        adimlar: [["Sayfa açılır", "Tarayıcıda, saniyesinde"], ["Adını yazar", "Bir kere, sonra hatırlanır"], ["Seçer, yükler", "Birden çok fotoğraf birden"]], bant: "Uygulama yok, | üyelik yok."},
      {tpl: "m-liste", etiket: "Gizlilik", b: ["Herkes kendi", "yüklediğini görür."], maddeler: [
        ["kilit", "Kendi yüklediklerini görür", "Başkasının fotoğrafını göremez."],
        ["goz", "Albüm çiftindir", "Hepsini yalnızca siz görürsünüz."],
        ["kisi", "Kim yükledi, belli", "Her fotoğrafın altında misafirin adı."]], bant: "Anılar sizin, | albüm sizin."},
      CTA(["Misafirlerin", "zorlanmasın."])]},

  {t: "karusel", h: "Çift ne görür? (albüm paneli)",
    ne: "Düğünden sonraki günü anlatır: tam ekran izleme, favoriler, tek tıkla indirme.",
    cap: "Düğünden sonraki sabah 🤍\n\nKahveni al, albümünü aç: misafirlerinin çektiği her şey orada. Tam ekran izle, favorilere ekle, tek tıkla hepsini indir.",
    tags: ["#düğündensonra", "#evlilik", "#anılar", "#yenievli"],
    slides: [
      {tpl: "m-kapak", b: ["Düğünden", "sonraki sabah."], metin: "Kahve, battaniye ve **yüzlerce yeni fotoğraf.**", chips: ["☕ Sabah", "🖼️ Albüm", "⭐ Favoriler"], bant: "Her an orada, | sizi bekliyor."},
      {tpl: "m-adim", etiket: "Albüm paneli", b: ["Hepsi", "tek yerde."], ekran: "sahip", metin: "Misafir adına göre süz, **favorilere** ekle.",
        adimlar: [["Tam ekran izle", "Tek tek, slayt gibi"], ["Favorilere ekle", "En güzelleri ayrı dursun"], ["Tek tıkla indir", "Hepsi ya da seçtiklerin"]], bant: "Albüm sizin, | süre 30 gün."},
      {tpl: "m-liste", etiket: "Albümünde", b: ["Kontrol", "sizde."], maddeler: [
        ["yildiz", "Favoriler", "Beğendiklerini işaretle, ayrı listede gör."],
        ["goz", "Gizle ya da sil", "İstemediğin fotoğraf tek dokunuşla kalkar."],
        ["saat", "30 gün saklama", "İstersen 1 yıl saklama eki: Google Drive arşivi."]], bant: "Anılar sizin, | albüm sizin."},
      CTA(["Düğünün", "bitmesin."])]},

  {t: "karusel", h: "Paketler (marka seti)",
    ne: "Fiyat soran DM'lere bu gönderinin linkini at.",
    cap: "Paketler ve fiyatlar 💌\n\nTek seferlik ödeme, abonelik yok.\n\n• Dijital 499 TL\n• Standart 899 TL\n• Standart + Şövale 1.499 TL\n• Aile paketi (kına + düğün) 1.999 TL\n\n+ 1 yıl saklama eki 299 TL\n\nDetaylar ve sipariş: link profilde",
    tags: ["#düğünbütçesi", "#düğünhazırlığı", "#qrkod", "#masakartı"],
    slides: [
      {tpl: "m-kapak", b: ["Tek seferlik ödeme,", "abonelik yok."], metin: "Dijitalden **aile paketine** kadar dört seçenek.", chips: ["💌 Dijital", "🃏 Basılı kart", "🪧 Şövale"], kaydir: "Kaydır, paketleri gör", bant: "Bütçene uygun | bir paket var."},
      {tpl: "m-paket", etiket: "Paketler", b: ["Hangisi", "size uygun?"], paketler: [
        ["Dijital", "499 TL", "Albüm + QR kart PDF'i, kendiniz basın"],
        ["Standart", "899 TL", "10 masa kartı ya da 100 kartvizit basılı", true],
        ["Standart + Şövale", "1.499 TL", "Standart + giriş panosu ve ahşap şövale"],
        ["Aile paketi", "1.999 TL", "Kına + düğün, 2 albüm, pano ve şövale, 60 gün"]],
        metin: "Hepsinde sınırsız fotoğraf ve video, tek tıkla indirme. **Ek:** 1 yıl saklama +299 TL.", bant: "Tek seferlik ödeme, | abonelik yok."},
      CTA(["Paketini seç,", "siparişi başlat."])]},

  {t: "karusel", h: "Kına gecesi kartları",
    ne: "Kına sezonunda (hafta sonu öncesi) paylaş.",
    cap: "Kına gecesi için QR kart 💃\n\nKınada en güzel videolar misafirlerin telefonunda kalır. Bu sefer hepsi tek albümde olsun.\n\nHangisi? Yorumlara yaz 👇",
    tags: ["#kınagecesi", "#kına", "#kınaorganizasyonu", "#gelinadayı"],
    slides: [
      {tpl: "m-kapak", b: ["Kına gecesinin", "videoları nerede?"], metin: "Halaylar, türküler, kına yakılırken çekilen o videolar… **Hepsi tek albümde.**", chips: ["💃 Halay", "🎶 Türkü", "🔴 Kına"], bant: "Kına gecesi | bir kere yaşanır."},
      {tpl: "m-kartlar", etiket: "Kına kartları", b: ["Hangisi", "senin kınan?"], ev: {title: "Seda'nın Kına Gecesi", kind: "kina"}, tasarimlar: ["cicek", "bordo_gul", "kirmizi_cicek", "pembe_cicek"], bant: "Kartını kendi isminle | sitede gör."},
      CTA(["Kınan da,", "düğünün de tek QR'da."], "Aile paketi: kına + düğün, 2 ayrı albüm · 1.999 TL")]},

  {t: "karusel", h: "Doğum günü kartları",
    ne: "Çocuk doğum günü anneleri için; hafta içi öğlen de denenebilir.",
    cap: "Doğum günü partisinin fotoğrafları da tek albümde 🎈\n\nVelilerin çektiği her kareyi QR ile topla. Unicorn'dan dinozora, çocuğunun ismiyle hazır kartlar.",
    tags: ["#doğumgünüpartisi", "#çocukdoğumgünü", "#partisüsleri", "#annelik"],
    slides: [
      {tpl: "m-kapak", b: ["Parti bitti,", "fotoğraflar nerede?"], metin: "Velilerin çektiği yüzlerce kare, **tek QR ile** tek albüme.", chips: ["🦄 Unicorn", "🦖 Dinozor", "🎂 Pasta"], bant: "Doğum günü de | tek albümde."},
      {tpl: "m-kartlar", etiket: "Doğum günü kartları", b: ["Çocuğunun ismiyle", "hazır."], ev: {title: "Uras'ın Doğum Günü Partisi", kind: "dogum_gunu"}, tasarimlar: ["unicorn", "dinozor", "kirmizi_fiyonk", "uzay"], bant: "Kız ve erkek için | 10 tasarım."},
      CTA(["Partinin her anı", "albümünde olsun."])]},

  {t: "karusel", h: "Mezuniyet balosu",
    ne: "Mayıs–haziran döneminde öne çıkar; okul ve sınıf temsilcilerine DM ile gönder.",
    cap: "Mezuniyet balosu için tek albüm 🎓\n\nBütün sınıfın fotoğrafları tek QR ile tek yerde. Sınıf temsilcisi misin? Bize yaz.",
    tags: ["#mezuniyet", "#mezuniyetbalosu", "#mezuniyettöreni", "#üniversite"],
    slides: [
      {tpl: "m-kapak", b: ["Bütün sınıfın", "fotoğrafları tek yerde."], metin: "Balo gecesi herkes çekiyor; **kimse paylaşmıyor.** Bu sefer değil.", chips: ["🎓 Kep", "🕺 Balo", "📸 Sınıf"], bant: "Mezuniyet bir kere, | anılar ömürlük."},
      {tpl: "m-kartlar", etiket: "Mezuniyet kartları", b: ["Okulunun adıyla", "hazır."], ev: {title: "Hukuk Fakültesi Mezuniyet Balosu", kind: "mezuniyet"}, tasarimlar: ["mezun_lacivert", "mezun_bordo", "mezun_beyaz", "love_bordo"], bant: "Sınıf temsilcileri, | bize yazın."},
      CTA(["Balonun her karesi", "albümde."])]},

  {t: "karusel", h: "Sık sorulanlar (marka seti)",
    ne: "Öne çıkanlara \"SSS\" olarak da ekle.",
    cap: "En çok sorulan 3 soru 🙋\n\nBaşka sorun varsa yorumlara yaz, bir sonraki gönderide cevaplayalım.",
    tags: ["#sorucevap", "#düğünhazırlığı", "#qrkod", "#gelinadayı"],
    slides: [
      {tpl: "m-kapak", b: ["En çok", "sorulanlar."], metin: "Uygulama, kalite, gizlilik: **kısa cevaplar.**", chips: ["📱 Uygulama", "🖼️ Kalite", "🔒 Gizlilik"], kaydir: "Kaydır, cevaplar burada", bant: "Sorunuz mu var? | DM'den yazın."},
      {tpl: "m-soru", soru: "Misafirler uygulama indirmeli mi?", cevap: "**Hayır.** Telefon kamerasıyla QR okutulur, sayfa tarayıcıda açılır. Adını yazar ve yükler.", bant: "Uygulama yok, | üyelik yok."},
      {tpl: "m-soru", soru: "Fotoğrafların kalitesi bozulur mu?", cevap: "**Hayır.** Fotoğraflar orijinal hâliyle yüklenir. Videolar da (300 MB'a kadar).", bant: "Orijinal kalite, | videolar dahil."},
      {tpl: "m-soru", soru: "Fotoğraflar ne kadar saklanıyor?", cevap: "Etkinlikten sonra **30 gün.** Bu sürede tek tıkla hepsini indirirsiniz. İsterseniz 1 yıl saklama eki var.", bant: "30 gün saklama, | 1 yıl seçeneği."},
      CTA(["Başka sorun", "mu var?"], "DM'den ya da WhatsApp'tan yazın: 0531 677 59 97")]},

  {t: "reels", h: "Eskiden / MemoryQR ile (video)",
    ne: "Karşılaştırma karuselinin video hâli; komik bir sesle iyi gider.",
    cap: "Eskiden vs şimdi 😅📸\n\nLink profilde.",
    tags: ["#reels", "#düğün", "#düğünfotoğrafları", "#qrkod"],
    reels: {kapak: {tpl: "m-kapak", b: ["Düğün fotoğrafları", "nerede kaldı?"], kaydir: false, bant: "Eskiden dağınıktı, | şimdi tek albüm."},
      sahneler: [
        {tpl: "mesaj", sure: 2.4, mesajlar: ["Fotoğrafları atar mısın? 🙏", "Bende videosu vardı ama bulamadım", "Kalitesi bozuk geldi 😕"]},
        {tpl: "m-karsi", sure: 3.6, etiket: "Eskiden / Şimdi", b: ["Aynı düğün,", "iki farklı son."],
          sol: ["Eskiden", ["30 telefonda dağınık", "Kalite bozuk", "Videolar kayıp"]], sag: ["MemoryQR ile", ["Tek albümde", "Orijinal kalite", "Videolar da gelir"]], bant: "Tek QR, | tek albüm."},
        {tpl: "kamera", sure: 2, baslik: "Kamerayla okut"},
        {...CTA(["Bu sefer", "hepsi sende kalsın."]), sure: 2.6}]}},

  {t: "reels", h: "Yeni tasarımlar vitrini",
    ne: "Yeni kart eklendikçe tekrar çek; \"hangisi?\" sorusu yorum getirir.",
    cap: "Yeni kart tasarımları geldi ✨\n\nLove, Lacivert Barok, Bordo Güller, Sevgiyle… Hangisi senin düğününe yakışır? Numarasını yaz 👇",
    tags: ["#reels", "#düğünkartı", "#davetiye", "#masakartı"],
    reels: {kapak: {tpl: "m-kartlar", etiket: "Yeni tasarımlar", b: ["Hangisi", "sizin?"], tasarimlar: ["love_kirmizi", "lacivert_barok", "bordo_gul", "sevgiyle"]},
      sahneler: [
        {tpl: "m-kapak", sure: 2, b: ["Yeni", "tasarımlar."], metin: "Kendi isminizle görün, **beğendiğinizi seçin.**", kaydir: false},
        ...["love_kirmizi", "love_bordo", "lacivert_barok", "beyaz_gul_yuzuk", "bordo_gul", "kirmizi_cicek", "sevgiyle", "pudra_yuzuk", "kalpli_dal", "altin_zambak"].map((id, i) =>
          ({tpl: "tekkart", sure: .6, tasarim: id, no: i + 1})),
        {...CTA(["Tasarımını seç,", "siparişi başlat."]), sure: 2.4}]}},
];
if (typeof module !== "undefined") module.exports = {IG_EKSTRA};
