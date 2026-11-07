// MemoryQR Instagram öne çıkanları: her biri birkaç hikâye (1080×1920) ve yuvarlak kapak (ortada simge).
// araclar/ig-uret.cjs → pazarlama/ig/oc-NN-K.jpg (hikâyeler) ve oc-NN-kapak.jpg (öne çıkan kapağı)
const OC_CTA = (b, alt) => ({tpl: "m-cta", b, ...(alt ? {alt} : {})});
const IG_ONECIKAN = [
  {h: "MemoryQR nedir?", ad: "MemoryQR", kapak: {tpl: "m-oc", ikon: "mark"},
    slides: [
      {tpl: "m-kapak", b: ["MemoryQR", "nedir?"], metin: "Düğün, nişan, kına ve doğum günlerinde misafirlerin çektiği **fotoğraf ve videoları** tek QR ile **tek albümde** toplayan servis.",
        chips: ["📸 Fotoğraf", "🎥 Video", "💌 Tek albüm"], kaydir: "Devam etmek için dokunun", bant: "Misafirlerin çektiği | her an, tek albümde."},
      {tpl: "m-liste", etiket: "Neden MemoryQR?", b: ["Dört şey,", "tek QR."], maddeler: [
        ["foto", "Orijinal kalite", "Fotoğraflar sıkıştırılmadan gelir."],
        ["video", "Videolar da", "Dans, konuşma, ilk dans; hepsi albümde."],
        ["kilit", "Gizlilik", "Albümün tamamını yalnızca siz görürsünüz."],
        ["indir", "Tek tıkla indirme", "Ertesi sabah hepsi bilgisayarınızda."]], bant: "Uygulama yok, | üyelik yok."},
      OC_CTA(["Kartınızı", "isminizle görün."])]},
  {h: "Nasıl çalışır?", ad: "Nasıl?", kapak: {tpl: "m-oc", ikon: "qr"},
    slides: [
      {tpl: "m-adim", etiket: "1. adım · Siz", b: ["Paket ve", "tasarım seçin."], ekran: "tasarimlar",
        metin: "Sitede isimlerinizi yazın, **60'tan fazla tasarımı** kendi kartınız olarak görün.",
        adimlar: [["Paket seçin", "Dijital, Standart, Şövale, Aile"], ["Tasarım seçin", "Masa kartı ya da kartvizit"], ["Siparişi bırakın", "Sizi arayıp onaylıyoruz"]], bant: "Ödeme siparişi | onaylayınca."},
      {tpl: "m-adim", etiket: "2. adım · Misafirler", b: ["Okut,", "adını yaz,", "yükle."], ekran: "misafir",
        metin: "Misafir masadaki QR'ı telefon kamerasıyla okutur; sayfa **tarayıcıda** açılır.",
        adimlar: [["QR'ı okut", "Masadaki karttan"], ["Adını yaz", "Kim yüklediği belli olsun"], ["Yükle", "Fotoğraf ve video, orijinal"]], bant: "Uygulama indirmek | yok."},
      {tpl: "m-adim", etiket: "3. adım · Siz", b: ["Hepsi", "albümünüzde."], ekran: "sahip",
        metin: "Misafir adına göre süzün, **favorilere** ekleyin, tek tıkla indirin.",
        adimlar: [["Tam ekran izleyin", "Slayt gibi, tek tek"], ["Favorileri seçin", "En güzelleri ayrı dursun"], ["Hepsini indirin", "30 gün içinde"]], bant: "Albüm sizin, | süre 30 gün."},
      OC_CTA(["Bu kadar", "kolay."])]},
  {h: "Paketler", ad: "Paketler", kapak: {tpl: "m-oc", ikon: "hediye"},
    slides: [
      {tpl: "m-paket", etiket: "Paketler", b: ["Tek seferlik ödeme,", "abonelik yok."], paketler: [
        ["Dijital", "499 TL", "Albüm + QR kart PDF'i, kendiniz basın"],
        ["Standart", "899 TL", "10 masa kartı ya da 100 kartvizit basılı", true],
        ["Standart + Şövale", "1.499 TL", "Standart + giriş panosu ve ahşap şövale"],
        ["Aile paketi", "1.999 TL", "Kına + düğün, 2 albüm, pano ve şövale, 60 gün"]],
        metin: "**Ek:** 1 yıl saklama (Google Drive arşivi) +299 TL.", bant: "Bütçenize uygun | bir paket var."},
      {tpl: "m-liste", etiket: "Her pakette", b: ["Hepsinde", "bunlar var."], maddeler: [
        ["foto", "Fotoğraf ve video", "Orijinal kalitede, tek albümde."],
        ["palet", "İsminizle tasarım", "60'tan fazla kart tasarımı."],
        ["saat", "30 gün saklama", "Aile paketinde 60 gün."],
        ["indir", "Tek tıkla indirme", "Hepsi ya da seçtikleriniz."]], bant: "Tek QR, | tek albüm."},
      OC_CTA(["Paketinizi seçin,", "siparişi başlatın."])]},
  {h: "Sık sorulan sorular", ad: "SSS", kapak: {tpl: "m-oc", yazi: "?"},
    slides: [
      {tpl: "m-soru", soru: "Misafirler uygulama indirmeli mi?", cevap: "**Hayır.** Telefon kamerasıyla QR okutulur, sayfa tarayıcıda açılır. Adını yazar ve yükler.", bant: "Uygulama yok, | üyelik yok."},
      {tpl: "m-soru", soru: "Fotoğrafların kalitesi bozulur mu?", cevap: "**Hayır.** Fotoğraflar orijinal hâliyle yüklenir. Videolar da (300 MB'a kadar).", bant: "Orijinal kalite, | videolar dahil."},
      {tpl: "m-soru", soru: "Misafirler birbirinin fotoğrafını görür mü?", cevap: "**Hayır.** Herkes yalnızca kendi yüklediğini görür. Albümün tamamını yalnızca siz görürsünüz.", bant: "Anılar sizin, | albüm sizin."},
      {tpl: "m-soru", soru: "Fotoğraflar ne kadar saklanıyor?", cevap: "Etkinlikten sonra **30 gün.** Bu sürede tek tıkla hepsini indirirsiniz. İsterseniz **1 yıl saklama** eki var.", bant: "30 gün saklama, | 1 yıl seçeneği."},
      OC_CTA(["Başka sorunuz", "mu var?"], "DM'den ya da WhatsApp'tan yazın: 0531 677 59 97")]},
];
// hikâyede alt kısmı Instagram'ın mesaj çubuğu örter: alt bant yok, içerik yukarıda
for (const o of IG_ONECIKAN) for (const sl of o.slides) if (sl.tpl !== "m-cta") sl.bant = false;
if (typeof module !== "undefined") module.exports = {IG_ONECIKAN};
