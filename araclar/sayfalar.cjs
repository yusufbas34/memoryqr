// Arama motorları için statik içerik sayfaları: etkinlik türüne göre açılış sayfaları ve rehber yazısı.
// index.html'deki PAKETLER, TELEFON, WHATSAPP, INSTAGRAM, SITE_URL kullanılır; sitemap.xml de buradan yazılır.
// Çalıştırma: node araclar/sayfalar.cjs   (kart örnek görselleri için Playwright gerekir; GORSELSIZ=1 ile atlanır)
const fs = require("fs"), path = require("path"), http = require("http");
const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const grab = name => {
  const m = html.match(new RegExp(`const ${name} = ([\\s\\S]*?);\\n`));
  if (!m) throw new Error(name + " bulunamadı");
  return Function(`return (${m[1]})`)();
};
const SITE = grab("SITE_URL"), TEL = grab("TELEFON"), WA = grab("WHATSAPP"), IG = grab("INSTAGRAM"), PAKETLER = grab("PAKETLER"), EK = grab("EK_ARSIV");
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
const price = s => (String(s).match(/[\d.]+/) || ["0"])[0].replace(/\./g, "");
const BUGUN = new Date().toISOString().slice(0, 10);
const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

const ADIMLAR = [
  ["QR kartı yerleştirin", "Masa kartı masalara, kartvizit tabaklara, giriş panosu kapıya. Hepsinde aynı QR."],
  ["Misafirler okutur ve yükler", "Telefon kamerasıyla okuturlar, adlarını yazarlar, fotoğraf ve videolarını seçip yüklerler. Uygulama gerekmez."],
  ["Siz hepsini indirirsiniz", "Bütün fotoğraf ve videolar tek albümde. Tam ekran izleyin, favorilere ekleyin, tek tıkla indirin."],
];

// ---------------------------------------------------------------- sayfalar
const SAYFALAR = [
  {slug: "dugun-qr-kod", kisa: "Düğün", kind: "dugun", ev: "Seda & Yusuf",
    title: "Düğün QR Kod: Misafir Fotoğraflarını Tek Albümde Toplayın | MemoryQR",
    desc: "Düğününüzde misafirlerin çektiği fotoğraf ve videoları QR kodlu masa kartıyla tek albümde toplayın. Uygulama yok, orijinal kalite. 499 TL'den başlayan paketler.",
    h1: "Düğün QR kodu: misafirlerin çektiği her an tek albümde",
    lead: "Düğününüzde yüzlerce fotoğraf ve video çekilir, ama çoğu misafirlerin telefonunda kalır. MemoryQR ile masalara konan tek bir QR kod sayesinde misafirleriniz çektikleri her şeyi saniyeler içinde ortak albümünüze yükler.",
    foto: "pleksi-stand", tasarimlar: ["lacivert_barok", "love_bordo", "yaprak", "bordo_gul"],
    bolumler: [
      ["Neden düğünde QR kod?", "Fotoğrafçınız düğünün resmî anlarını çeker; ama masalardaki kahkahaları, dans pistindeki kuzenleri, arka sıradaki duygusal anları **misafirleriniz** yakalar. Bu kareler genellikle WhatsApp gruplarında kalitesi bozularak dolaşır ya da hiç gelmez. QR kodlu ortak albüm, hepsini düğün gecesi tek yerde toplar."],
      ["Misafirler için ne kadar kolay?", "Misafirin yapacağı tek şey telefon kamerasını QR koda tutmak. Sayfa tarayıcıda açılır, adını yazar ve fotoğraflarını seçer. **Uygulama indirmek, üye olmak ya da şifre yok.** Her yaştan misafir birkaç saniyede yükler. Fotoğraflar sıkıştırılmadan, orijinal kalitesinde gelir; videolar da yüklenebilir."],
      ["Gizlilik", "Varsayılan olarak her misafir yalnızca kendi yüklediklerini görür; albümün tamamını yalnızca siz görürsünüz. İstemediğiniz bir fotoğrafı panelden tek dokunuşla gizleyebilir ya da silebilirsiniz. Dosyalar etkinlikten 30 gün sonra kalıcı olarak silinir."],
    ],
    sss: [
      ["Düğünde kaç QR kart gerekir?", "Her masaya bir masa kartı yeterlidir. Kartvizit seçerseniz her misafirin tabağına bir tane konur. Girişe bir pano koymak, misafirlerin QR'ı ilk anda görmesini sağlar."],
      ["Düğün QR kodu ne zaman hazırlanır?", "Siparişten sonra albümünüz hemen açılır ve kart tasarımını kendi isminizle seçersiniz. Basılı kartlar kargoyla gelir; düğünden en az bir hafta önce sipariş vermenizi öneririz."],
      ["Fotoğrafçım varken buna gerek var mı?", "Evet; ikisi birbirini tamamlar. Fotoğrafçı planlı kareleri çeker, misafirler ise o anda kendi gözlerinden gördüklerini. Çiftlerin en çok sevdiği kareler çoğu zaman misafirlerden gelir."],
    ]},
  {slug: "kina-gecesi-qr-kod", kisa: "Kına gecesi", kind: "kina", ev: "Seda'nın Kına Gecesi",
    title: "Kına Gecesi QR Kod: Fotoğraf ve Video Toplama | MemoryQR",
    desc: "Kına gecesinde halay, türkü ve kına yakma anlarının fotoğraf ve videolarını QR kodla tek albümde toplayın. Kına + düğün için Aile paketi.",
    h1: "Kına gecesi QR kodu: halayın, türkünün, kınanın her karesi",
    lead: "Kına gecesi bir kere yaşanır ve en güzel videolar misafirlerin telefonuna kaydedilir. MemoryQR ile masalardaki QR kodu okutan her misafir, çektiği fotoğraf ve videoları gecenin ortak albümüne yükler.",
    foto: "sovale-pano", tasarimlar: ["cicek", "bordo_gul", "kirmizi_cicek", "pembe_cicek"],
    bolumler: [
      ["Kına gecesinde neler kaybolur?", "Kına yakılırken söylenen türküler, gelinin ağladığı an, halay başındaki teyzeler… Bunların çoğu **video** olarak çekilir ve büyük dosyalar WhatsApp'ta ya hiç gönderilmez ya da kalitesi düşer. MemoryQR'da videolar da orijinal kalitesinde yüklenir (video başına 300 MB'a kadar)."],
      ["Kına ve düğün için ayrı albüm", "Kına ve düğünü aynı hafta yapıyorsanız **Aile paketi** iki etkinliği ayrı albümlerde toplar: 10 masa kartı ya da 100 kartvizit, giriş panosu ve ahşap şövale, 60 gün saklama. Her albümün kendi QR'ı olur, fotoğraflar karışmaz."],
      ["Kına gecesine uygun tasarımlar", "Kırmızı güller, çiçek bahçesi, bordo tonlar… Kına gecesi kartlarını gelinin ismiyle hazır görebilir, beğendiğinizi seçip siparişi başlatabilirsiniz."],
    ],
    sss: [
      ["Kına gecesinde misafirler video yükleyebilir mi?", "Evet. Video başına 300 MB'a kadar, yani telefonla çekilmiş birkaç dakikalık kayıtlar yüklenebilir."],
      ["Kına ve düğün fotoğrafları karışır mı?", "Aile paketinde iki ayrı albüm ve iki ayrı QR olur; her etkinliğin fotoğrafları kendi albümünde durur."],
      ["Kına gecesi yaşlı misafirler için zor olur mu?", "Hayır. Kamerayı QR'a tutmak ve adını yazmak yeter. Uygulama, üyelik ya da şifre yoktur."],
    ]},
  {slug: "nisan-qr-kod", kisa: "Nişan", kind: "nisan", ev: "Seda & Yusuf",
    title: "Nişan ve Söz QR Kod: Misafir Fotoğraf Albümü | MemoryQR",
    desc: "Nişan ve söz töreninde misafirlerin çektiği fotoğraf ve videoları QR kodla tek albümde toplayın. Sade ve şık QR masa kartı tasarımları.",
    h1: "Nişan ve söz için QR kodlu fotoğraf albümü",
    lead: "Yüzüklerin takıldığı an, ailelerin tanıştığı sofra, ilk aile fotoğrafları… Nişan ve söz törenlerinde misafirlerin çektiği kareleri tek bir QR kod ile ortak albümde toplayın.",
    foto: "tabak-kartvizit", tasarimlar: ["kalpli_dal", "pudra_yuzuk", "sevgiyle", "altin_zambak"],
    bolumler: [
      ["Küçük tören, değerli kareler", "Nişan ve söz genellikle daha küçük bir kalabalıkla yapılır; ama o gün çekilen fotoğraflar, iki ailenin ilk ortak anılarıdır. Misafirlerin telefonundaki fotoğraflar tek tek istenmez, unutulur. QR kodlu albüm bunu tören sırasında çözer."],
      ["Kartvizit mi, masa kartı mı?", "Ev ya da restoran gibi küçük mekânlarda **kartvizit** her misafirin tabağının yanına konur ve çok şık durur. Daha kalabalık nişanlarda masa kartı tercih edilir. Standart pakette 10 masa kartı ya da 100 kartvizitten birini seçersiniz."],
      ["Düğüne kadar saklayın", "Fotoğraflar 30 gün saklanır ve tek tıkla indirilir. İsterseniz 1 yıl saklama ekiyle albümünüz Google Drive'da arşivlenir; düğün hazırlığında ilk anılarınız elinizin altında olur."],
    ],
    sss: [
      ["Nişan için en uygun paket hangisi?", "Kartları kendiniz basmak isterseniz Dijital paket (499 TL), basılı kartvizit ya da masa kartı isterseniz Standart paket (899 TL) uygundur."],
      ["Söz töreni için de kullanılır mı?", "Evet. Etkinlik türünü söz olarak seçersiniz; kartlarda ve albüm sayfasında buna göre yazılar çıkar."],
      ["Misafirler birbirinin fotoğrafını görür mü?", "Varsayılan olarak hayır; herkes yalnızca kendi yüklediklerini görür. İsterseniz panelden herkese açabilirsiniz."],
    ]},
  {slug: "dogum-gunu-qr-kod", kisa: "Doğum günü", kind: "dogum_gunu", ev: "Uras'ın Doğum Günü Partisi",
    title: "Doğum Günü Partisi QR Kod: Fotoğrafları Tek Albümde Toplayın | MemoryQR",
    desc: "Çocuk doğum günü partisinde velilerin ve misafirlerin çektiği fotoğrafları QR kodla tek albümde toplayın. Unicorn, dinozor, uzay temalı QR kartlar.",
    h1: "Doğum günü partisi için QR kodlu fotoğraf albümü",
    lead: "Parti biter, fotoğraflar velilerin telefonunda kalır. MemoryQR ile pastanın yanına koyduğunuz QR kartı okutan herkes, çektiği fotoğraf ve videoları partinin ortak albümüne yükler.",
    foto: "pleksi-stand", tasarimlar: ["unicorn", "dinozor", "kirmizi_fiyonk", "uzay"],
    bolumler: [
      ["Velilerin çektiği yüzlerce kare", "Çocuk doğum günlerinde herkesin elinde telefon vardır: mum üflenirken, hediyeler açılırken, oyun alanında. Bu fotoğrafları tek tek istemek yerine QR kodlu albüm hepsini parti bitmeden toplar."],
      ["Kız ve erkek temalı kartlar", "Unicorn, peri bahçesi, pembe safari, dinozorlar, uzay, arabalar… QR kartlarını çocuğunuzun ismiyle hazır görebilir, parti temasına uyanı seçebilirsiniz. Yetişkin doğum günleri için daha sade ve şık tasarımlar da var."],
      ["Mezuniyet ve okul etkinlikleri", "Aynı sistem okul gösterileri, sünnet düğünleri ve aile yemekleri için de kullanılabilir. Etkinlik türünü seçmeniz yeter."],
    ],
    sss: [
      ["Doğum günü için hangi paket uygun?", "Kartları evde basmak isterseniz Dijital paket (499 TL) yeterlidir; basılı kart isterseniz Standart paket (899 TL)."],
      ["Çocukların fotoğrafları güvende mi?", "Albümün tamamını yalnızca etkinlik sahibi görür; misafirler yalnızca kendi yüklediklerini görür. Dosyalar 30 gün sonra kalıcı olarak silinir."],
      ["Kaç kişi yükleyebilir?", "Misafir sayısı sınırı yoktur; QR'ı okutan herkes yükleyebilir."],
    ]},
  {slug: "mezuniyet-qr-kod", kisa: "Mezuniyet", kind: "mezuniyet", ev: "Hukuk Fakültesi Mezuniyet Balosu",
    title: "Mezuniyet Balosu QR Kod: Sınıfın Fotoğrafları Tek Albümde | MemoryQR",
    desc: "Mezuniyet balosu ve töreninde bütün sınıfın çektiği fotoğraf ve videoları QR kodla tek albümde toplayın. Okul adıyla hazır QR kart tasarımları.",
    h1: "Mezuniyet balosu için QR kodlu ortak albüm",
    lead: "Balo gecesi herkes çeker, kimse paylaşmaz. MemoryQR ile masalardaki QR kodu okutan her mezun, çektiği fotoğraf ve videoları sınıfın ortak albümüne yükler.",
    foto: "sovale-pano", tasarimlar: ["mezun_lacivert", "mezun_bordo", "mezun_beyaz", "love_bordo"],
    bolumler: [
      ["Bütün sınıf, tek albüm", "Mezuniyet balolarında yüzlerce kişi aynı geceyi farklı açılardan çeker. Sınıf grubuna atılan birkaç fotoğraf dışında çoğu kaybolur. Tek QR ile herkesin çektiği her şey ertesi sabah tek albümde olur."],
      ["Sınıf temsilcileri ve organizatörler için", "Albümü siz açarsınız, QR kartlar masalara konur. Balo bittikten sonra bütün fotoğrafları tek tıkla indirip sınıfla paylaşabilirsiniz. Okul ya da bölüm adıyla hazırlanan kart tasarımları baloya resmî bir hava katar."],
      ["Kep atma, kürsü ve dans", "Tören ve balo aynı gün ise tek albüm yeterlidir; farklı günlerdeyse iki albüm açabilirsiniz."],
    ],
    sss: [
      ["Mezuniyet için kaç kart gerekir?", "Her masaya bir masa kartı ve girişe bir pano genellikle yeterlidir."],
      ["Fotoğrafları herkes görebilir mi?", "Varsayılan olarak herkes kendi yüklediğini görür; albüm sahibi isterse paneli herkese açabilir ya da fotoğrafları indirip paylaşabilir."],
      ["Kaç fotoğraf yüklenebilir?", "Etkinlik başına 5.000 dosyaya kadar; videolar dahil."],
    ]},
];

const REHBER = {slug: "rehber/dugunde-misafir-fotograflari-nasil-toplanir", kisa: "Rehber",
  title: "Düğünde Misafir Fotoğrafları Nasıl Toplanır? 4 Yöntem | MemoryQR",
  desc: "Düğünde misafirlerin çektiği fotoğraf ve videoları toplamanın yolları: WhatsApp grubu, Google Drive, uygulamalar ve QR kodlu albüm. Avantajlar, dezavantajlar ve ipuçları.",
  h1: "Düğünde misafir fotoğrafları nasıl toplanır?",
  lead: "Düğünden sonraki haftalarda en çok sorulan soru: \"Fotoğrafları atar mısın?\" Misafirlerin çektiği yüzlerce kareyi toplamanın dört yolunu, artılarını ve eksilerini anlattık.",
  bolumler: [
    ["1. WhatsApp grubu", "En yaygın yöntem. Herkesin telefonunda zaten var. **Eksileri:** WhatsApp fotoğrafları sıkıştırır, kalite düşer. Büyük videolar gönderilmez. Kalabalık grupta mesajlar arasında fotoğraflar kaybolur ve düğünden günler sonra kimse göndermeyi hatırlamaz."],
    ["2. Google Drive ya da paylaşılan klasör", "Kaliteyi korur. **Eksileri:** Misafirlerin bağlantıyı bulması, çoğu zaman Google hesabıyla giriş yapması ve dosyaları tek tek yüklemesi gerekir. Yaşça büyük misafirler için zordur ve düğün gecesi değil, sonradan yapılır; bu yüzden katılım düşük olur."],
    ["3. Fotoğraf paylaşım uygulamaları", "Bazı uygulamalar düğün albümü sunar. **Eksileri:** Misafirin uygulamayı indirmesi ve hesap açması gerekir. Düğün salonunda internet yavaşken birkaç dakikalık kurulum, misafirlerin çoğunun vazgeçmesi demektir."],
    ["4. QR kodlu ortak albüm", "Masalara konan QR kodu telefon kamerasıyla okutan misafir, tarayıcıda açılan sayfaya adını yazar ve fotoğraflarını yükler. **Artıları:** uygulama ve üyelik yok, orijinal kalite, videolar da yüklenir, fotoğraflar düğün gecesi anında toplanır. [MemoryQR](/) bu yöntemi kullanır."],
    ["Katılımı artırmak için 5 ipucu", "**1.** QR kartı her masaya koyun; kartvizit seçtiyseniz her tabağa. **2.** Girişe bir pano koyun, misafir ilk anda görsün. **3.** DJ ya da sunucudan gece boyunca bir iki kez hatırlatma isteyin. **4.** Pasta kesimi ya da ilk dans gibi anlardan hemen sonra \"çektiklerinizi yükleyin\" anonsu yapın. **5.** Ertesi gün yakın arkadaşlarınıza QR bağlantısını tekrar gönderin; geç kalanlar da yüklesin."],
    ["Düğünden sonra ne yapmalı?", "Fotoğrafları ilk hafta içinde indirin ve en az iki yerde (bilgisayar ve bulut) yedekleyin. Favorilerinizi işaretleyerek albüm baskısı için seçim yapın. Uzun süre çevrimiçi kalsın istiyorsanız 1 yıl saklama ekini değerlendirin."],
  ],
  sss: [
    ["Misafirlerden fotoğraf toplamanın en kolay yolu nedir?", "Misafirin hiçbir şey indirmeden yükleyebildiği yöntem en yüksek katılımı sağlar. QR kodlu albümde misafir sadece kamerasını QR'a tutar, adını yazar ve yükler."],
    ["WhatsApp fotoğrafların kalitesini düşürür mü?", "Evet. WhatsApp normal gönderimde fotoğrafları sıkıştırır ve büyük videoları kısıtlar. Orijinal kaliteyi korumak için dosyanın belge olarak gönderilmesi gerekir; misafirlerin çoğu bunu yapmaz."],
  ]};

// ---------------------------------------------------------------- şablon
const NAV = [...SAYFALAR, REHBER];
const ikon = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#8c2f52"/><g fill="none" stroke="#fff" stroke-width="1.8"><rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1"/><rect x="14" y="4.5" width="5.5" height="5.5" rx="1"/><rect x="4.5" y="14" width="5.5" height="5.5" rx="1"/></g><path d="M16.8 14.6c1.3-1.3 3.3.6 2 2l-2 2.1-2-2.1c-1.3-1.4.7-3.3 2-2z" fill="#fff"/></svg>`;

function sayfa(p) {
  const url = SITE + p.slug + "/", up = "../".repeat(p.slug.split("/").length);
  const rehber = p === REHBER;
  const ld = {"@context": "https://schema.org", "@graph": [
    {"@type": "BreadcrumbList", itemListElement: [{"@type": "ListItem", position: 1, name: "MemoryQR", item: SITE}, {"@type": "ListItem", position: 2, name: p.kisa, item: url}]},
    rehber
      ? {"@type": "Article", headline: p.h1, description: p.desc, inLanguage: "tr-TR", mainEntityOfPage: url, image: SITE + "og.jpg",
        datePublished: "2026-11-02", dateModified: BUGUN, author: {"@type": "Organization", name: "MemoryQR", url: SITE}, publisher: {"@id": SITE + "#isletme"}}
      : {"@type": "Service", name: `${p.kisa} için QR kodlu fotoğraf albümü`, serviceType: "QR kodlu ortak fotoğraf ve video albümü", description: p.desc, url,
        provider: {"@id": SITE + "#isletme"}, areaServed: {"@type": "Country", name: "Türkiye"},
        offers: {"@type": "AggregateOffer", priceCurrency: "TRY", lowPrice: price(PAKETLER[0].fiyat), highPrice: price(PAKETLER[PAKETLER.length - 1].fiyat), offerCount: PAKETLER.length}},
    {"@type": "FAQPage", mainEntity: p.sss.map(([q, a]) => ({"@type": "Question", name: q, acceptedAnswer: {"@type": "Answer", text: a}}))},
  ]};
  const kartlar = (p.tasarimlar || []).map(id => `<figure><img src="${up}kart/ornek/${p.kind}-${id}.webp" width="444" height="616" loading="lazy" alt="${esc(p.kisa)} QR kod masa kartı örneği: ${esc(p.ev)}"></figure>`).join("");
  const wa = waLink(`Merhaba, ${p.kisa.toLocaleLowerCase("tr-TR")} için MemoryQR hakkında bilgi almak istiyorum.`);
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#f8f3ec">
<link rel="icon" type="image/svg+xml" href="${up}logo.svg">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<meta property="og:type" content="${rehber ? "article" : "website"}">
<meta property="og:site_name" content="MemoryQR">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="${esc(p.h1)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}og.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="${up}fonts.css">
<link rel="stylesheet" href="${up}kart.css">
<link rel="stylesheet" href="${up}sayfa.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><a class="logo" href="${up}">${ikon}<span>MemoryQR</span></a>
  <nav aria-label="Etkinlikler">${NAV.map(n => `<a href="${up}${n.slug}/"${n === p ? ' aria-current="page"' : ""}>${esc(n.kisa)}</a>`).join("")}</nav></header>
<main>
  <nav class="crumb" aria-label="Konum"><a href="${up}">MemoryQR</a> › <span>${esc(p.kisa)}</span></nav>
  <section class="hero${p.foto ? "" : " tek"}">
    <div><h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p>
      <div class="cta"><a class="btn" href="${up}?tasarimlar">Tasarımları isminizle görün</a><a class="btn ghost" href="${wa}" rel="noopener">WhatsApp'tan sorun</a></div></div>
    ${p.foto ? `<img class="hfoto" src="${up}kart/foto/${p.foto}-k.webp" width="640" height="480" alt="${esc(p.kisa)} için QR kodlu kart örneği">` : ""}
  </section>
  ${rehber ? "" : `<section><h2>Nasıl çalışır?</h2><ol class="adim">${ADIMLAR.map(([b, k]) => `<li><strong>${esc(b)}</strong><span>${esc(k)}</span></li>`).join("")}</ol></section>`}
  ${p.bolumler.map(([h, t]) => `<section><h2>${esc(h)}</h2><p>${md(t)}</p></section>`).join("\n  ")}
  ${kartlar ? `<section><h2>${esc(p.kisa)} için QR kart tasarımları</h2><div class="kartlar">${kartlar}</div>
    <p><a href="${up}?tasarimlar">Bütün tasarımları kendi isminizle görün →</a></p></section>` : ""}
  ${rehber ? "" : `<section><h2>Paketler ve fiyatlar</h2><div class="paket">${PAKETLER.map(k => `<div${k.one ? ' class="on"' : ""}><h3>${esc(k.ad)}</h3><p class="fiyat">${esc(k.fiyat)}</p><ul>${k.ozellik.map(o => `<li>${esc(o)}</li>`).join("")}</ul><a class="btn${k.one ? "" : " ghost"} pbtn" href="${up}?tasarimlar&paket=${esc(k.kod)}">Bu paketi isteyin</a></div>`).join("")}</div>
    <p class="not">Ek: ${esc(EK.ad)} ${esc(EK.fiyat)} (albüm Google Drive'da bir yıl arşivlenir). Tek seferlik ödeme, abonelik yok.</p></section>`}
  <section><h2>Sık sorulan sorular</h2>${p.sss.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}
    <p><a href="${up}#sss">Bütün sorular →</a></p></section>
  <section class="son"><h2>Anılarınız telefonlarda kalmasın</h2><p>Tasarımınızı seçin, siparişi WhatsApp'tan başlatın.</p>
    <div class="cta"><a class="btn" href="${up}?tasarimlar">Tasarımını seç</a><a class="btn ghost light" href="${wa}" rel="noopener">WhatsApp ${esc(TEL)}</a></div></section>
</main>
<footer><nav aria-label="Sayfalar">${NAV.map(n => `<a href="${up}${n.slug}/">${esc(n.kisa === "Rehber" ? "Fotoğraf toplama rehberi" : n.kisa + " QR kod")}</a>`).join("")}</nav>
  <p>MemoryQR · Bul QR · <a href="tel:+90${TEL.replace(/\D/g, "").replace(/^0/, "")}">${esc(TEL)}</a>${IG ? ` · <a href="https://www.instagram.com/${esc(IG)}">@${esc(IG)}</a>` : ""} · <a href="${up}gizlilik.html">Gizlilik</a></p></footer>
</body>
</html>
`;
}

for (const p of NAV) {
  const dir = path.join(ROOT, p.slug);
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, "index.html"), sayfa(p));
}

// site haritası
const urls = [[SITE, "weekly", "1.0"], [SITE + "?tasarimlar", "weekly", "0.8"], ...NAV.map(p => [SITE + p.slug + "/", "monthly", "0.7"]), [SITE + "gizlilik.html", "yearly", "0.2"]];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, f, pr]) => `  <url><loc>${esc(u)}</loc><lastmod>${BUGUN}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join("\n")}
</urlset>
`);
console.log(`${NAV.length} sayfa ve sitemap.xml yazıldı`);

// kart örnek görselleri (kart/ornek/<tür>-<tasarım>.webp)
if (!process.env.GORSELSIZ) (async () => {
  const {chromium} = require(process.env.PW || "playwright");
  const TYPES = {".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2"};
  const server = http.createServer((q, r) => {
    let f = path.join(ROOT, decodeURIComponent(new URL(q.url, "http://x").pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, {"Content-Type": TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r);
  });
  await new Promise(r => server.listen(0, r));
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.goto(`http://localhost:${server.address().port}/?tasarimlar`);
  await pg.waitForFunction(() => typeof drawCard === "function");
  fs.mkdirSync(path.join(ROOT, "kart", "ornek"), {recursive: true});
  for (const p of SAYFALAR) for (const id of p.tasarimlar) {
    const data = await pg.evaluate(async ([id, kind, title]) => {
      await designReady(id);
      return drawCard({code: "ORNEK1", title, kind, event_date: "2026-06-14"}, id, "", 4).toDataURL("image/webp", .86);
    }, [id, p.kind, p.ev]);
    fs.writeFileSync(path.join(ROOT, "kart", "ornek", `${p.kind}-${id}.webp`), Buffer.from(data.split(",")[1], "base64"));
  }
  await b.close(); server.close();
  console.log("kart örnekleri yazıldı");
})();
