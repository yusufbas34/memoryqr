// MemoryQR arama motoru içeriği: index.html'deki PAKETLER, EK_ARSIV, FAQ, TELEFON, EPOSTA ve SITE_URL'den
//  1) <head> içine yapılandırılmış veri (JSON-LD: işletme, paketler/fiyatlar, SSS, web sitesi)
//  2) <main id="app"> içine JavaScript çalışmadan da okunan sabit tanıtım içeriği
// üretir. Paket, fiyat ya da SSS değişince çalıştırın:  node araclar/seo.cjs
const fs = require("fs"), path = require("path");
const file = path.join(__dirname, "..", "index.html");
let html = fs.readFileSync(file, "utf8");

const grab = name => {
  const m = html.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
  if (!m) throw new Error(name + " bulunamadı");
  return Function(`return (${m[1]})`)();
};
const SITE = grab("SITE_URL"), TEL = grab("TELEFON"), MAIL = grab("EPOSTA"), PAKETLER = grab("PAKETLER"), EK = grab("EK_ARSIV"), FAQ = grab("FAQ");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const price = s => (String(s).match(/[\d.]+/) || ["0"])[0].replace(/\./g, "");
const tel = "+90" + TEL.replace(/\D/g, "").replace(/^0/, "");

const business = {
  "@type": "ProfessionalService", "@id": SITE + "#isletme", name: "MemoryQR", url: SITE, image: SITE + "og.jpg", logo: SITE + "logo.svg",
  description: "Düğün, nişan, kına, doğum günü ve mezuniyet için QR kodlu ortak fotoğraf albümü. Misafirler QR kodu okutur, fotoğraf ve videolarını uygulama indirmeden tek albüme yükler.",
  telephone: tel, ...(MAIL ? {email: MAIL} : {}), priceRange: `₺${price(PAKETLER[0].fiyat)}–₺${price(PAKETLER[PAKETLER.length - 1].fiyat)}`,
  areaServed: {"@type": "Country", name: "Türkiye"}, address: {"@type": "PostalAddress", addressCountry: "TR"},
  makesOffer: [...PAKETLER.map(p => ({"@type": "Offer", name: `${p.ad} paket`, description: p.ozellik.join(", "), price: price(p.fiyat), priceCurrency: "TRY",
    url: SITE + "#paketler", availability: "https://schema.org/InStock"})),
    {"@type": "Offer", name: EK.ad, description: "Albümün Google Drive'da 1 yıl saklanması", price: price(EK.fiyat), priceCurrency: "TRY", url: SITE + "#paketler"}],
};
const ld = {"@context": "https://schema.org", "@graph": [
  business,
  {"@type": "WebSite", "@id": SITE + "#site", url: SITE, name: "MemoryQR", inLanguage: "tr-TR", publisher: {"@id": SITE + "#isletme"}},
  {"@type": "FAQPage", "@id": SITE + "#sss", mainEntity: FAQ.map(([q, a]) => ({"@type": "Question", name: q, acceptedAnswer: {"@type": "Answer", text: a}}))},
]};
const ldBlock = `<!-- SEO:VERI (araclar/seo.cjs üretir, elle değiştirmeyin) -->\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n<!-- /SEO:VERI -->`;

const staticBlock = `<!-- SEO:ICERIK (araclar/seo.cjs üretir; JavaScript açılınca yerine sayfa çizilir) -->
<article class="seo">
<h1>Düğün QR kod ile misafir fotoğraflarını tek albümde toplayın</h1>
<p>MemoryQR; düğün, nişan, kına gecesi, doğum günü ve mezuniyet için QR kodlu ortak fotoğraf albümüdür. Misafirler masadaki QR kodu telefon kamerasıyla okutur, adını yazar, fotoğraf ve videolarını orijinal kalitede yükler. Uygulama indirmek gerekmez; bütün anılar tek albümde toplanır ve tek tıkla indirilir.</p>
<h2>Nasıl çalışır?</h2>
<ol><li>QR kodlu masa kartı, kartvizit ya da giriş panosu masalara ve girişe konur.</li><li>Misafirler QR kodu okutur, adını yazar, galeriden seçer ya da anında çeker.</li><li>Etkinlik sahibi bütün fotoğraf ve videoları görür, favoriler, tek tıkla ZIP olarak indirir.</li></ol>
<h2>Paketler ve fiyatlar</h2>
<ul>${PAKETLER.map(p => `<li><strong>${esc(p.ad)}: ${esc(p.fiyat)}</strong> · ${esc(p.ozellik.join(", "))}</li>`).join("")}<li><strong>Ek: ${esc(EK.ad)} ${esc(EK.fiyat)}</strong></li></ul>
<h2>QR kart tasarımları</h2>
<p>Düğün, nişan ve kına için klasik, modern ve çiçekli; kız ve erkek doğum günü partisi için çocuk temalı; mezuniyet balosu için kepli ve retro olmak üzere 60 tasarım. <a href="?tasarimlar">Tasarımları kendi isminizle görün</a>.</p>
<h2>Sık sorulan sorular</h2>
${FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("\n")}
<h2>İletişim</h2>
<p>Telefon ve WhatsApp: <a href="tel:${tel}">${esc(TEL)}</a>${MAIL ? ` · E-posta: <a href="mailto:${esc(MAIL)}">${esc(MAIL)}</a>` : ""} · Türkiye geneli hizmet.</p>
</article>
<!-- /SEO:ICERIK -->`;

const put = (start, end, block, where) => {
  const re = new RegExp(`<!-- ${start}[\\s\\S]*?<!-- \\/${start} -->`);
  if (re.test(html)) html = html.replace(re, block);
  else { if (!html.includes(where)) throw new Error("yer bulunamadı: " + where); html = html.replace(where, where === "</head>" ? block + "\n</head>" : where + "\n" + block); }
};
put("SEO:VERI", "", ldBlock, "</head>");
put("SEO:ICERIK", "", staticBlock, '<main id="app">');
fs.writeFileSync(file, html);
console.log(`Güncellendi: ${PAKETLER.length} paket, ${FAQ.length} soru, telefon ${tel}`);
