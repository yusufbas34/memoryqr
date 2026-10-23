// MemoryQR masa kartı: 10 tasarım, A6 dikey (105×148 mm). index.html'den yüklenir; qrcode, jsPDF ve index.html'deki
// yardımcılar (esc, KINDS, fmtDate, guestLink, slug, loadScript, toast) gerekir. Yazı tipleri kart.css'te.
// Tek kart PDF'i 3 mm taşma paylı (Özalit için), A4 PDF'inde 4 kart ve kesim çizgileri.

const CARD_W = 105, CARD_H = 148, CARD_BL = 3;
const CARD_STEPS = ["QR'ı okut", "İsmini yaz", "Fotoğraf yükle"];
const CARD_DEFAULT_TEXT = "Anılarımızı paylaşın";

// ---------------------------------------------------------------- süsler
function ornaments(g, u) {
  const {mm, X} = u;
  return {
    border(color, inset, w) { g.strokeStyle = color; g.lineWidth = mm(w); g.strokeRect(X(inset), X(inset), mm(CARD_W - 2 * inset), mm(CARD_H - 2 * inset)); },
    brackets(color, inset, len, w) {
      g.strokeStyle = color; g.lineWidth = mm(w); g.lineCap = "square";
      for (const [x, y, dx, dy] of [[inset, inset, 1, 1], [CARD_W - inset, inset, -1, 1], [inset, CARD_H - inset, 1, -1], [CARD_W - inset, CARD_H - inset, -1, -1]]) {
        g.beginPath(); g.moveTo(X(x), X(y + dy * len)); g.lineTo(X(x), X(y)); g.lineTo(X(x + dx * len), X(y)); g.stroke();
        g.beginPath(); g.arc(X(x + dx * 2.2), X(y + dy * 2.2), mm(.6), 0, 7); g.fillStyle = color; g.fill();
      }
    },
    leaf(x, y, ang, len, color) {
      g.save(); g.translate(X(x), X(y)); g.rotate(ang); g.fillStyle = color;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(mm(len * .5), -mm(len * .32), mm(len), 0); g.quadraticCurveTo(mm(len * .5), mm(len * .32), 0, 0); g.fill();
      g.restore();
    },
    sprig(x, y, ang, len, color, flip = 1) {
      g.save(); g.translate(X(x), X(y)); g.rotate(ang);
      g.strokeStyle = color; g.lineWidth = mm(.35);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(mm(len * .5), flip * mm(len * .12), mm(len), 0); g.stroke();
      g.restore();
      const n = 6;
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1), px = x + Math.cos(ang) * len * t, py = y + Math.sin(ang) * len * t, l = 5.2 * (1 - t * .45);
        this.leaf(px, py, ang - .75, l, color);
        this.leaf(px, py, ang + .75, l, color);
      }
      this.leaf(x + Math.cos(ang) * len, y + Math.sin(ang) * len, ang, 4.4, color);
    },
    henna(x, y, dx, dy, color) {
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = mm(.35);
      const a0 = dx > 0 ? (dy > 0 ? 0 : -Math.PI / 2) : (dy > 0 ? Math.PI / 2 : Math.PI);
      for (const r of [7, 10.5, 14]) { g.beginPath(); g.arc(X(x), X(y), mm(r), a0, a0 + Math.PI / 2); g.stroke(); }
      for (let i = 0; i <= 8; i++) {
        const a = a0 + Math.PI / 2 * i / 8;
        g.beginPath(); g.arc(X(x) + Math.cos(a) * mm(17), X(y) + Math.sin(a) * mm(17), mm(.75), 0, 7); g.fill();
        g.beginPath(); g.arc(X(x) + Math.cos(a) * mm(12.2), X(y) + Math.sin(a) * mm(12.2), mm(.4), 0, 7); g.fill();
      }
      g.beginPath(); g.arc(X(x), X(y), mm(3.5), 0, 7); g.fill();
    },
    fan(cx, cy, r, color, up = true) {
      g.strokeStyle = color; g.lineWidth = mm(.35);
      const s = up ? -1 : 1;
      for (const rr of [r, r * .72, r * .44]) { g.beginPath(); g.arc(X(cx), X(cy), mm(rr), up ? Math.PI : 0, up ? 2 * Math.PI : Math.PI); g.stroke(); }
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * i / 12;
        g.beginPath(); g.moveTo(X(cx), X(cy)); g.lineTo(X(cx) + Math.cos(a) * mm(r), X(cy) + s * Math.sin(a) * mm(r)); g.stroke();
      }
    },
    steps(color, inset, w) {
      g.strokeStyle = color; g.lineWidth = mm(w);
      for (const [x, y, dx, dy] of [[inset, inset, 1, 1], [CARD_W - inset, inset, -1, 1], [inset, CARD_H - inset, 1, -1], [CARD_W - inset, CARD_H - inset, -1, -1]]) {
        g.beginPath(); g.moveTo(X(x), X(y + dy * 12));
        g.lineTo(X(x), X(y)); g.lineTo(X(x + dx * 12), X(y));
        g.moveTo(X(x + dx * 3), X(y + dy * 9)); g.lineTo(X(x + dx * 3), X(y + dy * 3)); g.lineTo(X(x + dx * 9), X(y + dy * 3));
        g.stroke();
      }
    },
    heart(x, y, s, color) {
      g.fillStyle = color; g.beginPath();
      const px = X(x), py = X(y), k = mm(s);
      g.moveTo(px, py + k * .35);
      g.bezierCurveTo(px - k * .9, py - k * .35, px - k * .35, py - k * .95, px, py - k * .4);
      g.bezierCurveTo(px + k * .35, py - k * .95, px + k * .9, py - k * .35, px, py + k * .35);
      g.fill();
    },
    scallop(color, inset, r, w) {
      g.strokeStyle = color; g.lineWidth = mm(w);
      const x0 = inset, y0 = inset, x1 = CARD_W - inset, y1 = CARD_H - inset;
      const nx = Math.round((x1 - x0) / (2 * r)), ny = Math.round((y1 - y0) / (2 * r));
      const rx = (x1 - x0) / nx / 2, ry = (y1 - y0) / ny / 2;
      for (let i = 0; i < nx; i++) {
        g.beginPath(); g.arc(X(x0 + rx * (2 * i + 1)), X(y0), mm(rx), Math.PI, 0); g.stroke();
        g.beginPath(); g.arc(X(x0 + rx * (2 * i + 1)), X(y1), mm(rx), 0, Math.PI); g.stroke();
      }
      for (let i = 0; i < ny; i++) {
        g.beginPath(); g.arc(X(x0), X(y0 + ry * (2 * i + 1)), mm(ry), Math.PI / 2, Math.PI * 1.5); g.stroke();
        g.beginPath(); g.arc(X(x1), X(y0 + ry * (2 * i + 1)), mm(ry), -Math.PI / 2, Math.PI / 2); g.stroke();
      }
    },
  };
}

// ---------------------------------------------------------------- tasarımlar
// Renkler: bg zemin, eye üst yazı, title başlık, date tarih, muted kod/alt yazı, step adım dairesi, stepText adım yazısı.
// Yazı tipleri CSS font tanımı olarak (boyut mm cinsinden çizimde eklenir).
const CARD_DESIGNS = [
  {id: "klasik", name: "Klasik Altın",
    c: {bg: "#fffdf8", eye: "#a8832f", title: "#2a2226", date: "#6d6157", muted: "#7a6e64", step: "#a8832f", stepText: "#2a2226"},
    f: {eye: '600 {s}px "Cinzel"', title: '700 {s}px "Cormorant Garamond"', date: 'italic 500 {s}px "Cormorant Garamond"', body: '500 {s}px "Cormorant Garamond"'},
    eyeSize: 3.4, eyeUpper: true, titleSize: 12, dateSize: 4.4, bodySize: 3.8,
    deco(o) { o.border("#a8832f", 6, .55); o.border("#a8832f", 7.6, .2); }},
  {id: "modern", name: "Modern Minimal",
    c: {bg: "#ffffff", eye: "#111111", title: "#111111", date: "#555555", muted: "#777777", step: "#111111", stepText: "#111111"},
    f: {eye: '600 {s}px "Montserrat"', title: '800 {s}px "Montserrat"', date: '400 {s}px "Montserrat"', body: '600 {s}px "Montserrat"'},
    eyeSize: 2.8, eyeUpper: true, eyeSpacing: .35, titleSize: 9.5, titleUpper: true, dateSize: 3.2, bodySize: 2.9, stepStyle: "square",
    deco(o, g, u) { g.fillStyle = "#111"; g.fillRect(u.X(46), u.X(12), u.mm(13), u.mm(1.2)); }},
  {id: "romantik", name: "Romantik Pembe",
    c: {bg: "#fbeef0", eye: "#b0586f", title: "#7d2f45", date: "#8b5a66", muted: "#9b6d78", step: "#c46b84", stepText: "#5e2a38"},
    f: {eye: 'italic 500 {s}px "Cormorant Garamond"', title: '400 {s}px "Great Vibes"', date: '500 {s}px "Cormorant Garamond"', body: '500 {s}px "Cormorant Garamond"'},
    eyeSize: 4.6, titleSize: 15, titleY: 35, dateSize: 4.2, bodySize: 3.8,
    deco(o) { o.scallop("#d99aab", 6, 2.6, .35); o.heart(22, 20.5, 3, "#d99aab"); o.heart(83, 20.5, 3, "#d99aab"); }},
  {id: "zumrut", name: "Zümrüt Gece",
    c: {bg: "#0f3d33", eye: "#d4b36a", title: "#f4ead2", date: "#cdbf9c", muted: "#b9ad8c", step: "#d4b36a", stepText: "#f4ead2", stepNum: "#0f3d33"},
    f: {eye: '600 {s}px "Cinzel"', title: '600 {s}px "Cinzel"', date: 'italic 500 {s}px "Cormorant Garamond"', body: '500 {s}px "Cormorant Garamond"'},
    eyeSize: 3.2, eyeUpper: true, titleSize: 9.5, dateSize: 4.4, bodySize: 3.8,
    deco(o) { o.border("#d4b36a", 6, .5); o.border("#d4b36a", 7.6, .2); }},
  {id: "lacivert", name: "Lacivert Altın",
    c: {bg: "#14223f", eye: "#d8b45c", title: "#ffffff", date: "#c9cfdd", muted: "#aab3c7", step: "#d8b45c", stepText: "#ffffff", stepNum: "#14223f"},
    f: {eye: 'italic 400 {s}px "Playfair Display"', title: '700 {s}px "Playfair Display"', date: 'italic 400 {s}px "Playfair Display"', body: '600 {s}px "Montserrat"'},
    eyeSize: 4, titleSize: 11, dateSize: 3.6, bodySize: 2.9,
    deco(o) { o.brackets("#d8b45c", 7, 14, .45); }},
  {id: "kina", name: "Kına Gecesi",
    c: {bg: "#7a1622", eye: "#e8c77f", title: "#fbe9c6", date: "#e7c99a", muted: "#d9b98c", step: "#e8c77f", stepText: "#fbe9c6", stepNum: "#7a1622"},
    f: {eye: 'italic 500 {s}px "Cormorant Garamond"', title: '400 {s}px "Great Vibes"', date: '500 {s}px "Cormorant Garamond"', body: '500 {s}px "Cormorant Garamond"'},
    eyeSize: 4.6, titleSize: 15, titleY: 35, dateSize: 4.2, bodySize: 3.8,
    deco(o) { o.henna(0, 0, 1, 1, "#e8c77f"); o.henna(CARD_W, 0, -1, 1, "#e8c77f"); o.henna(0, CARD_H, 1, -1, "#e8c77f"); o.henna(CARD_W, CARD_H, -1, -1, "#e8c77f"); }},
  {id: "botanik", name: "Botanik",
    c: {bg: "#f6f7f0", eye: "#4f6b4a", title: "#2f3d2c", date: "#5d6b58", muted: "#6f7a6a", step: "#4f6b4a", stepText: "#2f3d2c"},
    f: {eye: '600 {s}px "Montserrat"', title: 'italic 400 {s}px "Playfair Display"', date: 'italic 500 {s}px "Cormorant Garamond"', body: '500 {s}px "Cormorant Garamond"'},
    eyeSize: 2.7, eyeUpper: true, eyeSpacing: .3, titleSize: 12, dateSize: 4.4, bodySize: 3.8,
    deco(o) {
      const c = "#7c9a73";
      o.sprig(4, 22, -1.0, 20, c); o.sprig(101, 22, Math.PI + 1.0, 20, c, -1);
      o.sprig(3, 146, -.3, 13, c, -1); o.sprig(102, 146, Math.PI + .3, 13, c);
    }},
  {id: "artdeco", name: "Art Deco",
    c: {bg: "#121212", eye: "#c9a54c", title: "#f1e3bd", date: "#cdbb8f", muted: "#a8996f", step: "#c9a54c", stepText: "#f1e3bd", stepNum: "#121212"},
    f: {eye: '600 {s}px "Josefin Sans"', title: '600 {s}px "Josefin Sans"', date: '300 {s}px "Josefin Sans"', body: '600 {s}px "Josefin Sans"'},
    eyeSize: 3, eyeUpper: true, eyeSpacing: .5, titleSize: 10.5, titleUpper: true, titleSpacing: .15, dateSize: 3.6, bodySize: 3.2, stepStyle: "diamond",
    deco(o) { o.steps("#c9a54c", 5, .4); o.fan(52.5, 16, 8, "#c9a54c", true); }},
  {id: "kemer", name: "Pastel Kemer",
    c: {bg: "#eadfd3", eye: "#b8664a", title: "#4a332b", date: "#7b625a", muted: "#8d766c", step: "#b8664a", stepText: "#4a332b"},
    f: {eye: '600 {s}px "Montserrat"', title: '700 {s}px "Cormorant Garamond"', date: 'italic 500 {s}px "Cormorant Garamond"', body: '600 {s}px "Montserrat"'},
    eyeSize: 2.7, eyeUpper: true, eyeSpacing: .3, titleSize: 12, titleMax: 66, titleY: 35, eyeY: 23, dateSize: 4.4, bodySize: 2.7,
    deco(o, g, u) {
      const {X, mm} = u, x0 = 7, x1 = CARD_W - 7, r = (x1 - x0) / 2, top = 7 + r, bot = CARD_H - 7;
      g.fillStyle = "#fbf7f2"; g.beginPath(); g.moveTo(X(x0), X(bot)); g.lineTo(X(x0), X(top));
      g.arc(X(52.5), X(top), mm(r), Math.PI, 0); g.lineTo(X(x1), X(bot)); g.closePath(); g.fill();
      g.strokeStyle = "#d6b8a6"; g.lineWidth = mm(.3); g.stroke();
    }},
  {id: "cesur", name: "Cesur Siyah",
    c: {bg: "#ffffff", eye: "#f5d76e", title: "#ffffff", date: "#d0d0d0", muted: "#666666", step: "#111111", stepText: "#111111"},
    f: {eye: '600 {s}px "Montserrat"', title: '800 {s}px "Montserrat"', date: '400 {s}px "Montserrat"', body: '600 {s}px "Montserrat"'},
    eyeSize: 2.8, eyeUpper: true, eyeSpacing: .35, titleSize: 10, titleUpper: true, dateSize: 3.2, bodySize: 2.9, stepStyle: "square",
    deco(o, g, u) { g.fillStyle = "#111"; g.fillRect(0, 0, u.mm(CARD_W + 2 * CARD_BL), u.X(42)); }},
  {id: "cicek", name: "Çiçek Bahçesi", img: "kart/cicek.webp",
    c: {bg: "#fdf7e7", eye: "#5b7f2e", title: "#b8325a", date: "#7a6a5a", muted: "#8a7a68", step: "#d9466f", stepText: "#4a3a30"},
    f: {eye: 'italic 500 {s}px "Cormorant Garamond"', title: '400 {s}px "Great Vibes"', date: 'italic 500 {s}px "Cormorant Garamond"', body: '500 {s}px "Cormorant Garamond"'},
    eyeSize: 4.2, titleSize: 12, dateSize: 4.1, bodySize: 3.8,
    // motif üstte madalyon: yazılar ve QR aşağı kayar, QR biraz küçülür
    L: {eye: 33.5, title: 46.5, date: 53, qrY: 58.5, qrSize: 46, code: 113.5, steps: 122},
    deco(o, g, u) { const im = CARD_IMAGES["kart/cicek.webp"]; if (im) g.drawImage(im, u.X(52.5 - 12.5), u.X(4), u.mm(25), u.mm(25 * im.height / im.width)); }},
];
const CARD_IMAGES = {};
const cardDesign = id => CARD_DESIGNS.find(d => d.id === id) || CARD_DESIGNS[0];

// ---------------------------------------------------------------- çizim
let cardFontsPromise;
function cardFontsReady() {
  if (!cardFontsPromise) {
    // önce stil dosyası (@font-face tanımları) yüklenmeli, yoksa fonts.load hiçbir şey indirmeden biter
    const css = new Promise(res => {
      if (document.querySelector('link[href="kart.css"]')) return res();
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "kart.css"; l.onload = l.onerror = res;
      document.head.append(l);
    });
    const faces = new Set();
    for (const d of CARD_DESIGNS) for (const f of Object.values(d.f)) faces.add(f.replace("{s}", "20"));
    faces.add('700 20px "Barlow"');
    const imgs = CARD_DESIGNS.filter(d => d.img).map(d => new Promise(res => {
      const im = new Image();
      im.onload = () => { CARD_IMAGES[d.img] = im; res(); }; im.onerror = res; im.src = d.img;
    }));
    cardFontsPromise = css.then(() => Promise.all([...imgs, ...[...faces].map(f => document.fonts.load(f, "ŞİĞÜÇÖşığüçö Aa").catch(() => null))]));
  }
  return cardFontsPromise;
}

// pxmm: mm başına piksel (baskı için 12 ≈ 305 dpi). Kenarlarda CARD_BL taşma payı vardır.
function drawCard(ev, designId, text, pxmm) {
  const d = cardDesign(designId);
  const c = document.createElement("canvas");
  c.width = Math.round((CARD_W + 2 * CARD_BL) * pxmm); c.height = Math.round((CARD_H + 2 * CARD_BL) * pxmm);
  const g = c.getContext("2d");
  const mm = v => v * pxmm, X = v => mm(v + CARD_BL), u = {mm, X};
  const font = (f, s) => f.replace("{s}", mm(s));
  const spacing = em => { if ("letterSpacing" in g) g.letterSpacing = em ? `${mm(em)}px` : "0px"; };
  const line = (str, y, f, size, color, {upper, sp = 0, max} = {}) => {
    max = max || CARD_W - 22;
    str = upper ? String(str).toLocaleUpperCase("tr-TR") : String(str);
    let s = size;
    spacing(sp);
    do { g.font = font(f, s); s -= .25; } while (g.measureText(str).width > mm(max) && s > 3);
    g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.fillText(str, X(CARD_W / 2), X(y));
    spacing(0);
  };

  g.fillStyle = d.c.bg; g.fillRect(0, 0, c.width, c.height);
  d.deco?.(ornaments(g, u), g, u);

  const L = {eye: d.eyeY || 21, title: d.titleY || 33.5, date: 40.5, qrY: 48, qrSize: 56, code: 113.5, steps: 122, ...d.L};
  line(text || CARD_DEFAULT_TEXT, L.eye, d.f.eye, d.eyeSize, d.c.eye, {upper: d.eyeUpper, sp: d.eyeSpacing});
  line(ev.title, L.title, d.f.title, d.titleSize, d.c.title, {upper: d.titleUpper, sp: d.titleSpacing, max: d.titleMax});
  line(`${KINDS[ev.kind] || ""} · ${fmtDate(ev.event_date)}`, L.date, d.f.date, d.dateSize, d.c.date);

  // QR her tasarımda beyaz zemin üstünde: koyu kartlarda da telefon kolay okusun
  const q = qrcode(0, "M"); q.addData(guestLink(ev.code)); q.make();
  const n = q.getModuleCount(), size = L.qrSize, pad = 3.5, x0 = (CARD_W - size) / 2, y0 = L.qrY;
  g.fillStyle = "#ffffff";
  g.beginPath(); g.roundRect ? g.roundRect(X(x0 - pad), X(y0 - pad), mm(size + 2 * pad), mm(size + 2 * pad), mm(2.5)) : g.rect(X(x0 - pad), X(y0 - pad), mm(size + 2 * pad), mm(size + 2 * pad)); g.fill();
  const cell = mm(size) / n;
  g.fillStyle = "#111111";
  // kareler tam piksele oturur: aralarında ince boşluk çizgisi kalmaz
  const px = i => Math.round(X(x0) + i * cell), py = i => Math.round(X(y0) + i * cell);
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (q.isDark(r, col)) g.fillRect(px(col), py(r), px(col + 1) - px(col), py(r + 1) - py(r));

  line(`Albüm kodu: ${ev.code}`, L.code, '600 {s}px "Barlow"', 2.9, d.c.muted);  // kod her tasarımda net okunsun

  CARD_STEPS.forEach((t, i) => {
    const cx = X(20 + i * 32.5), cy = X(L.steps), r = mm(3.3);
    g.fillStyle = d.c.step;
    g.beginPath();
    if (d.stepStyle === "square") g.rect(cx - r, cy - r, 2 * r, 2 * r);
    else if (d.stepStyle === "diamond") { g.moveTo(cx, cy - r * 1.25); g.lineTo(cx + r * 1.25, cy); g.lineTo(cx, cy + r * 1.25); g.lineTo(cx - r * 1.25, cy); g.closePath(); }
    else g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = d.c.stepNum || "#ffffff"; g.font = `700 ${mm(3.6)}px Barlow`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(i + 1), cx, cy + mm(.2));
    g.textBaseline = "alphabetic"; g.fillStyle = d.c.stepText; g.font = font(d.f.body, d.bodySize);
    g.fillText(t, cx, cy + mm(8));
  });
  line("Uygulama gerekmez · telefon kamerasıyla okutun", 137.5, d.f.body, d.bodySize * .78, d.c.muted);
  return c;
}

async function cardPdf(ev, designId, text) {
  await Promise.all([loadScript("vendor/jspdf.umd.min.js"), cardFontsReady()]);
  const img = drawCard(ev, designId, text, 12).toDataURL("image/jpeg", .95);
  const {jsPDF} = window.jspdf, W = CARD_W, H = CARD_H, BL = CARD_BL;
  const one = new jsPDF({unit: "mm", format: [W + 2 * BL, H + 2 * BL], orientation: "portrait"});
  one.addImage(img, "JPEG", 0, 0, W + 2 * BL, H + 2 * BL);
  one.save(`${slug(ev.title)}-masa-karti-A6-tasmali.pdf`);
  const a4 = new jsPDF({unit: "mm", format: "a4", orientation: "portrait"});
  const ox = (210 - 2 * W) / 2, oy = (297 - 2 * H) / 2;
  for (let r = 0; r < 2; r++) for (let col = 0; col < 2; col++) a4.addImage(img, "JPEG", ox + col * W - BL, oy + r * H - BL, W + 2 * BL, H + 2 * BL);
  // dış taşma paylarını beyazla, kesim çizgileri sayfa kenarında
  a4.setFillColor(255, 255, 255);
  a4.rect(0, 0, 210, oy, "F"); a4.rect(0, oy + 2 * H, 210, 297, "F"); a4.rect(0, 0, ox, 297, "F"); a4.rect(ox + 2 * W, 0, 210, 297, "F");
  a4.setDrawColor(150); a4.setLineWidth(.15);
  for (const x of [ox, ox + W, ox + 2 * W]) { a4.line(x, 0, x, oy - 1); a4.line(x, oy + 2 * H + 1, x, 297); }
  for (const y of [oy, oy + H, oy + 2 * H]) { a4.line(0, y, ox - 1, y); a4.line(ox + 2 * W + 1, y, 210, y); }
  a4.save(`${slug(ev.title)}-masa-karti-A4-4lu.pdf`);
}

// ---------------------------------------------------------------- seçim ekranı
// save(design, text): seçimi kaydeder (yönetim ya da etkinlik sahibi); hata verirse PDF yine iner.
async function openCardPicker(ev, save) {
  let design = ev.card_design || "klasik", text = ev.card_text || CARD_DEFAULT_TEXT;
  const m = document.createElement("div");
  m.className = "modal cardpick";
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="Masa kartı tasarımı">
      <div class="row" style="justify-content:space-between"><h2>Masa kartı tasarımı</h2><button class="linkbtn" data-x>Kapat</button></div>
      <div class="cp-body">
        <div class="cp-prev"><img id="cpBig" alt="Seçili tasarımın önizlemesi"></div>
        <div class="stack" style="min-width:0">
          <label for="cpText">Üst yazı</label>
          <input type="text" id="cpText" maxlength="40" value="${esc(text)}">
          <span class="hint">Ör. "Kına gecemize hoş geldiniz", "Anılarımızı paylaşın"</span>
          <div class="cp-grid" id="cpGrid"><p class="hint">Tasarımlar hazırlanıyor…</p></div>
        </div>
      </div>
      <div class="row"><button class="btn" id="cpDl">PDF indir (A6 + A4'e 4'lü)</button></div>
      <p class="hint">A6 kart 3 mm taşma paylıdır; matbaaya bu dosyayı gönderin. A4 dosyası evde basıp kesmek için.</p>
    </div>`;
  document.body.append(m);
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-x]")) m.remove(); });
  await cardFontsReady();
  const big = $("#cpBig", m), grid = $("#cpGrid", m);
  const drawBig = () => { big.src = drawCard(ev, design, text, 5).toDataURL("image/jpeg", .9); };
  const drawGrid = () => {
    grid.innerHTML = CARD_DESIGNS.map(d => `<button class="cp-item${d.id === design ? " on" : ""}" data-d="${d.id}">
      <img src="${drawCard(ev, d.id, text, 1.6).toDataURL("image/jpeg", .85)}" alt=""><span>${esc(d.name)}</span></button>`).join("");
  };
  drawBig(); drawGrid();
  grid.onclick = e => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    design = b.dataset.d;
    grid.querySelectorAll(".cp-item").forEach(x => x.classList.toggle("on", x === b));
    drawBig();
  };
  let t;
  $("#cpText", m).oninput = e => { text = e.target.value.trim() || CARD_DEFAULT_TEXT; clearTimeout(t); t = setTimeout(() => { drawBig(); drawGrid(); }, 250); };
  $("#cpDl", m).onclick = async () => {
    const btn = $("#cpDl", m);
    btn.disabled = true; btn.textContent = "Hazırlanıyor…";
    try {
      await save?.(design, text);
      ev.card_design = design; ev.card_text = text;
      await cardPdf(ev, design, text);
      toast("PDF indirildi");
    } catch (e) { toast("PDF hazırlanamadı: " + e.message, 5000); }
    btn.disabled = false; btn.textContent = "PDF indir (A6 + A4'e 4'lü)";
  };
}
