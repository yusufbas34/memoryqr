// MemoryQR masa kartı tasarımları, A6 dikey (105×148 mm). index.html'den yüklenir; qrcode, jsPDF ve index.html'deki
// yardımcılar (esc, KINDS, guestLink, slug, loadScript, toast, $) gerekir. Yazı tipleri kart.css'te.
// Tek kart PDF'i 3 mm taşma paylı (Özalit için), A4 PDF'inde 4 kart ve kesim çizgileri.
// Her tasarımın bir "kart yazısı" vardır; seçici ekranında değiştirilebilir, boş bırakılırsa tasarımın kendi metni kullanılır.

const CARD_W = 105, CARD_H = 148, CARD_BL = 3;
const CARD_IMAGES = {};

// "Düğünümüzde", "Kına gecemizde"…: varsayılan kart yazılarında etkinlik türüne göre
const KIND_IN = {dugun: "Düğünümüzde", nisan: "Nişanımızda", kina: "Kına gecemizde", soz: "Söz törenimizde",
  mezuniyet: "Mezuniyetimizde", dogum_gunu: "Doğum günümüzde", diger: "Bu özel günümüzde"};
const KIND_DAY = {dugun: "Bu mutlu günümüze", nisan: "Nişanımıza", kina: "Kına gecemize", soz: "Söz törenimize",
  mezuniyet: "Mezuniyetimize", dogum_gunu: "Doğum günümüze", diger: "Bu özel günümüze"};

const dateDots = d => { const [y, m, g] = String(d).slice(0, 10).split("-"); return `${g}.${m}.${y}`; };
// "Selin & Berk" → ["S", "B"]; ayrılamayan başlıkta tek harf
function initials(title) {
  const parts = String(title).split(/\s*(?:&|\+|\bve\b|\band\b)\s*/i).map(s => s.trim()).filter(Boolean);
  return parts.slice(0, 2).map(p => p[0].toLocaleUpperCase("tr-TR"));
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- çizim araçları (ölçüler mm)
function cardKit(g, pxmm) {
  const mm = v => v * pxmm, X = v => mm(v + CARD_BL);
  const k = {
    mm, X,
    font: (f, s) => f.replace("{s}", mm(s)),
    text(str, x, y, f, size, color, {align = "center", upper = false, sp = 0, max = CARD_W - 20} = {}) {
      str = upper ? String(str).toLocaleUpperCase("tr-TR") : String(str);
      if ("letterSpacing" in g) g.letterSpacing = sp ? `${mm(sp)}px` : "0px";
      let s = size;
      do { g.font = k.font(f, s); s -= .2; } while (g.measureText(str).width > mm(max) && s > 2);
      g.fillStyle = color; g.textAlign = align; g.textBaseline = "alphabetic";
      g.fillText(str, X(x), X(y));
      if ("letterSpacing" in g) g.letterSpacing = "0px";
    },
    // satırlara böler; son satırın y'sini döndürür
    wrap(str, x, y, width, f, size, color, lh, opts = {}) {
      str = opts.upper ? String(str).toLocaleUpperCase("tr-TR") : String(str);
      if ("letterSpacing" in g) g.letterSpacing = opts.sp ? `${mm(opts.sp)}px` : "0px";
      g.font = k.font(f, size);
      const lines = [];
      for (const word of str.split(/\s+/)) {
        const tryL = lines.length ? lines[lines.length - 1] + " " + word : word;
        if (lines.length && g.measureText(tryL).width <= mm(width)) lines[lines.length - 1] = tryL; else lines.push(word);
      }
      g.fillStyle = color; g.textAlign = opts.align || "center"; g.textBaseline = "alphabetic";
      lines.forEach((l, i) => g.fillText(l, X(x), X(y + i * lh)));
      if ("letterSpacing" in g) g.letterSpacing = "0px";
      return y + (lines.length - 1) * lh;
    },
    // QR: kareler piksel ızgarasına oturur; round: köşe gözleri yuvarlatılmış
    qr(link, x, y, size, color, {round = false, bg = "#ffffff"} = {}) {
      const q = qrcode(0, "M"); q.addData(link); q.make();
      const n = q.getModuleCount(), cell = mm(size) / n;
      const px = i => Math.round(X(x) + i * cell), py = i => Math.round(X(y) + i * cell);
      const eye = (r, c) => round && ((r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7));
      g.fillStyle = color;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c) && !eye(r, c)) g.fillRect(px(c), py(r), px(c + 1) - px(c), py(r + 1) - py(r));
      if (round) for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
        const rr = (o, s, rad, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(px(c + o), py(r + o), px(c + o + s) - px(c + o), py(r + o + s) - py(r + o), cell * rad); g.fill(); };
        rr(0, 7, 2.2, color); rr(1, 5, 1.5, bg); rr(2, 3, 1, color);
      }
    },
    leaf(x, y, ang, len, wid, color, alpha = 1) {
      g.save(); g.globalAlpha = alpha; g.translate(X(x), X(y)); g.rotate(ang); g.fillStyle = color;
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(mm(len * .45), -mm(wid), mm(len), 0); g.quadraticCurveTo(mm(len * .45), mm(wid), 0, 0); g.fill();
      g.globalAlpha = alpha * .5; g.strokeStyle = "#ffffff"; g.lineWidth = mm(.12);
      g.beginPath(); g.moveTo(mm(len * .08), 0); g.lineTo(mm(len * .85), 0); g.stroke();
      g.restore();
    },
    leafLine(x, y, ang, len, wid, color, lw = .25) {
      g.save(); g.translate(X(x), X(y)); g.rotate(ang); g.strokeStyle = color; g.lineWidth = mm(lw);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(mm(len * .45), -mm(wid), mm(len), 0); g.quadraticCurveTo(mm(len * .45), mm(wid), 0, 0); g.stroke();
      g.beginPath(); g.moveTo(0, 0); g.lineTo(mm(len * .8), 0); g.stroke();
      g.restore();
    },
    // dal: sap boyunca karşılıklı yapraklar (dolu ya da çizgi)
    branch(x, y, ang, len, color, {leafLen = 7, wid = 1.6, n = 6, line = false, alpha = 1, bend = .15, lw = .3, palette} = {}) {
      g.strokeStyle = color; g.lineWidth = mm(lw); g.globalAlpha = line ? 1 : alpha;
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      const cx = (x + ex) / 2 - Math.sin(ang) * len * bend, cy = (y + ey) / 2 + Math.cos(ang) * len * bend;
      g.beginPath(); g.moveTo(X(x), X(y)); g.quadraticCurveTo(X(cx), X(cy), X(ex), X(ey)); g.stroke(); g.globalAlpha = 1;
      for (let i = 1; i <= n; i++) {
        const t = i / (n + .6), u = 1 - t;
        const px = u * u * x + 2 * u * t * cx + t * t * ex, py = u * u * y + 2 * u * t * cy + t * t * ey;
        const l = leafLen * (1 - t * .35), col = palette ? palette[i % palette.length] : color;
        for (const s of [-1, 1]) line ? k.leafLine(px, py, ang + s * .7, l, wid, col, lw * .85) : k.leaf(px, py, ang + s * .7, l, wid, col, alpha);
      }
      line ? k.leafLine(ex, ey, ang, leafLen * .8, wid, color, lw * .85) : k.leaf(ex, ey, ang, leafLen * .8, wid, palette ? palette[0] : color, alpha);
    },
    heartPath(x, y, s) {
      const p = X(x), q = X(y), z = mm(s);
      g.beginPath(); g.moveTo(p, q + z * .38);
      g.bezierCurveTo(p - z * .95, q - z * .3, p - z * .4, q - z * .98, p, q - z * .42);
      g.bezierCurveTo(p + z * .4, q - z * .98, p + z * .95, q - z * .3, p, q + z * .38);
    },
    flower(x, y, r, color, lw = .25) {
      g.strokeStyle = color; g.lineWidth = mm(lw);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        g.save(); g.translate(X(x) + Math.cos(a) * mm(r * .55), X(y) + Math.sin(a) * mm(r * .55)); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, mm(r * .5), mm(r * .3), 0, 0, Math.PI * 2); g.stroke(); g.restore();
      }
      g.beginPath(); g.arc(X(x), X(y), mm(r * .18), 0, 7); g.stroke();
    },
    // fotoğraf makinesi + kalp (ince çizgi)
    camera(x, y, w, color, lw = .3, heart = color) {
      const h = w * .66;
      g.strokeStyle = color; g.lineWidth = mm(lw); g.lineJoin = "round";
      g.beginPath(); g.roundRect(X(x), X(y + h * .14), mm(w), mm(h * .86), mm(w * .1)); g.stroke();
      g.beginPath(); g.moveTo(X(x + w * .22), X(y + h * .14)); g.lineTo(X(x + w * .3), X(y)); g.lineTo(X(x + w * .52), X(y)); g.lineTo(X(x + w * .6), X(y + h * .14)); g.stroke();
      g.beginPath(); g.arc(X(x + w / 2), X(y + h * .56), mm(w * .25), 0, 7); g.stroke();
      k.heartPath(x + w / 2, y + h * .58, w * .2); g.fillStyle = heart; g.fill();
    },
    specks(n, color, seed, alpha = .5) {
      const r = rng(seed); g.fillStyle = color; g.globalAlpha = alpha;
      for (let i = 0; i < n; i++) { g.beginPath(); g.arc(X(r() * CARD_W), X(r() * CARD_H), mm(.12 + r() * .35), 0, 7); g.fill(); }
      g.globalAlpha = 1;
    },
    bg(color) { g.fillStyle = color; g.fillRect(0, 0, mm(CARD_W + 2 * CARD_BL), mm(CARD_H + 2 * CARD_BL)); },
  };
  return k;
}

const BRAND = (k, ev, y, color, x = CARD_W / 2, align = "center") => k.text(`MemoryQR · Albüm kodu ${ev.code}`, x, y, '600 {s}px "Barlow"', 2.1, color, {sp: .1, align});

// ---------------------------------------------------------------- tasarımlar
const CARD_DESIGNS = [
  {id: "yaprak", name: "Yeşil Yapraklar",
    text: ev => `${KIND_IN[ev.kind] || KIND_IN.diger} çektiğiniz fotoğraf ve videoları bizimle paylaşmak için karekodu tarayın!`,
    draw(k, g, ev, text) {
      k.bg("#ffffff");
      const greens = ["#8fae7e", "#6f9466", "#a9c39a", "#577a52", "#b7cdb0"];
      const r = rng(7);
      for (let i = 0; i < 9; i++) k.branch(108 - r() * 6, -3 + r() * 8, Math.PI * (.55 + r() * .4), 18 + r() * 14, "#6f9466",
        {leafLen: 6 + r() * 4, wid: 1.4 + r() * 1.2, n: 4 + (i % 3), alpha: .55 + r() * .35, palette: greens});
      for (let i = 0; i < 8; i++) k.branch(-3 + r() * 5, 152 - r() * 5, -Math.PI * (.04 + r() * .3), 12 + r() * 10, "#6f9466",
        {leafLen: 6 + r() * 4, wid: 1.4 + r() * 1.2, n: 4 + (i % 3), alpha: .55 + r() * .35, palette: greens});
      k.text("ANI", 52.5, 34, '400 {s}px "Playfair Display"', 11, "#2b2b2b", {sp: .4});
      k.text("PAYLAŞ!", 52.5, 47, '400 {s}px "Playfair Display"', 11, "#2b2b2b", {sp: .4});
      k.qr(guestLink(ev.code), 34, 56, 32, "#1e1e1e");
      k.camera(71, 68, 9, "#555555", .3);
      const end = k.wrap(text, 52.5, 100, 68, '400 {s}px "Courier Prime"', 3.3, "#333333", 4.6);
      k.text(ev.title, 52.5, Math.max(end + 15, 124), '400 {s}px "Great Vibes"', 10, "#2b2b2b", {max: 70});
      BRAND(k, ev, 143, "#9a9a9a");
    }},
  {id: "bordo", name: "Bordo Monogram",
    text: () => "Lütfen QR kodu tarayarak fotoğraf ve videolarınızı albüme ekleyin.",
    draw(k, g, ev, text) {
      const B = "#7a1a24";
      k.bg("#efe2dc");
      // kenar bandı: bordo kıvrımlar ve çiçekler
      const r = rng(11);
      g.globalAlpha = .55;
      for (let i = 0; i < 70; i++) {
        let x, y; const side = i % 4, t = r();
        if (side === 0) { x = t * CARD_W; y = r() * 8; } else if (side === 1) { x = t * CARD_W; y = CARD_H - r() * 8; }
        else if (side === 2) { x = r() * 8; y = t * CARD_H; } else { x = CARD_W - r() * 8; y = t * CARD_H; }
        if (r() < .5) k.flower(x, y, 1.6 + r() * 1.6, B, .22); else k.leafLine(x, y, r() * 6.3, 3 + r() * 3, .9, B, .22);
      }
      g.globalAlpha = 1;
      g.fillStyle = "#f7f1ec"; g.fillRect(k.X(8), k.X(8), k.mm(CARD_W - 16), k.mm(CARD_H - 16));
      g.strokeStyle = B; g.lineWidth = k.mm(1.3); g.strokeRect(k.X(8.65), k.X(8.65), k.mm(CARD_W - 17.3), k.mm(CARD_H - 17.3));
      g.lineWidth = k.mm(.25); g.strokeRect(k.X(11), k.X(11), k.mm(CARD_W - 22), k.mm(CARD_H - 22));
      const ini = initials(ev.title);
      if (ini.length === 2) {
        k.text(ini[0], 45, 40, '400 {s}px "Bodoni Moda"', 21, B);
        k.text("&", 53.5, 45, '400 {s}px "Great Vibes"', 12, B);
        k.text(ini[1], 61, 52, '400 {s}px "Bodoni Moda"', 21, B);
      } else k.text(ini[0] || "M", 52.5, 48, '400 {s}px "Bodoni Moda"', 24, B);
      k.text(ev.title, 52.5, 59, '600 {s}px "Cormorant Garamond"', 3, B, {upper: true, sp: .35, max: 70});
      k.text(dateDots(ev.event_date), 52.5, 63.5, '500 {s}px "Cormorant Garamond"', 3, B, {sp: .2});
      k.wrap(text, 52.5, 75, 64, '500 {s}px "Cormorant Garamond"', 4.6, "#3a2a2a", 5.6);
      k.qr(guestLink(ev.code), 37.5, 92, 30, B, {bg: "#f7f1ec"});
      k.heartPath(52.5, 129, 7.5); g.strokeStyle = B; g.lineWidth = k.mm(.3); g.stroke();
      k.flower(52.5, 126.8, 1.5, B, .2); k.leafLine(50, 128.3, 2.6, 2.2, .7, B, .2); k.leafLine(55, 128.3, .55, 2.2, .7, B, .2);
      BRAND(k, ev, 135.3, "#9b7d79");
    }},
  {id: "yakala", name: "Aşkı Yakala",
    text: () => "Fotoğraflarınızı bizimle paylaşın!",
    draw(k, g, ev, text) {
      const R = "#b23a3a", INK = "#2a2a2a";
      k.bg("#ffffff");
      // el çizimi fotoğraf makinesi: iki kez hafif kaydırılmış ince çizgi
      g.save(); g.translate(k.mm(.25), k.mm(-.15)); g.globalAlpha = .45; k.camera(22, 10, 42, INK, .28, "rgba(0,0,0,0)"); g.restore();
      k.camera(22, 10, 42, INK, .35, R);
      k.text("Aşkı", 72, 27, '400 {s}px "Great Vibes"', 10, R, {align: "left"});
      k.text("Yakala", 76, 38, '400 {s}px "Great Vibes"', 10, R, {align: "left"});
      k.wrap(text, 52.5, 51, 72, '400 {s}px "Montserrat"', 3.4, INK, 5.6, {upper: true, sp: .75});
      k.qr(guestLink(ev.code), 37.5, 63, 30, R, {round: true});
      k.wrap("QR Kodu Okutarak Fotoğraflarınızı Yükleyebilirsiniz!", 52.5, 102, 66, '400 {s}px "Montserrat"', 3.2, "#444444", 4.8);
      k.text("Teşekkürler!", 52.5, 117, '400 {s}px "Great Vibes"', 6, R);
      k.text(ev.title, 52.5, 126, '400 {s}px "Montserrat"', 3.8, INK, {upper: true, sp: .6, max: 66});
      g.strokeStyle = INK; g.lineWidth = k.mm(.2);
      g.beginPath(); g.moveTo(k.X(8), k.X(124.8)); g.quadraticCurveTo(k.X(14), k.X(123), k.X(17), k.X(124.8)); g.stroke();
      g.beginPath(); g.moveTo(k.X(97), k.X(124.8)); g.quadraticCurveTo(k.X(91), k.X(123), k.X(88), k.X(124.8)); g.stroke();
      k.heartPath(52.5, 136, 4.5); g.lineWidth = k.mm(.25); g.stroke();
      BRAND(k, ev, 143.5, "#a0a0a0");
    }},
  {id: "halka", name: "Altın Halka",
    text: () => "Bize güzel anlar bırakmak için QR kodu okutup bizimle paylaşır mısın?",
    draw(k, g, ev, text) {
      const G = "#c4a052";
      k.bg("#faf8f3");
      k.specks(220, G, 5, .55);
      const ring = (cx, cy, rad) => {
        g.strokeStyle = G; g.lineWidth = k.mm(.55); g.beginPath(); g.arc(k.X(cx), k.X(cy), k.mm(rad), 0, 7); g.stroke();
        g.lineWidth = k.mm(.2); g.beginPath(); g.arc(k.X(cx + .8), k.X(cy - .6), k.mm(rad - 1.4), 0, 7); g.stroke();
      };
      const greens = ["#9db58d", "#7e9c73", "#b9cdaf", "#6a8a62"];
      ring(84, 20, 25); ring(14, 130, 23);
      const r = rng(3);
      for (let i = 0; i < 4; i++) k.branch(66 + i * 3, 2 + r() * 4, Math.PI * (.75 + r() * .3), 13 + r() * 6, "#7e9c73", {leafLen: 4.5, wid: 1.2, n: 5, alpha: .7, palette: greens});
      for (let i = 0; i < 3; i++) k.branch(98, 30 + i * 4, Math.PI * (.55 + r() * .2), 12 + r() * 5, "#7e9c73", {leafLen: 4.2, wid: 1.1, n: 4, alpha: .65, palette: greens});
      for (let i = 0; i < 4; i++) k.branch(2 + i * 2, 118 + r() * 5, -Math.PI * (.1 + r() * .3), 13 + r() * 6, "#7e9c73", {leafLen: 4.5, wid: 1.2, n: 5, alpha: .7, palette: greens});
      for (let i = 0; i < 3; i++) k.branch(22 + i * 4, 150, -Math.PI * (.35 + r() * .2), 11 + r() * 5, "#7e9c73", {leafLen: 4.2, wid: 1.1, n: 4, alpha: .65, palette: greens});
      k.text(ev.title, 52.5, 52, '400 {s}px "Bodoni Moda"', 9.5, "#1d1d1d", {max: 78});
      k.text(dateDots(ev.event_date), 52.5, 58, '500 {s}px "Cormorant Garamond"', 3.6, "#333333", {sp: .2});
      const end = k.wrap(text, 52.5, 67, 74, '600 {s}px "Cormorant Garamond"', 3.5, "#222222", 4.6, {upper: true, sp: .15});
      k.wrap(`${KIND_DAY[ev.kind] || KIND_DAY.diger} eşlik ettiğiniz için teşekkür ederiz.`, 52.5, end + 8, 66, '600 {s}px "Cormorant Garamond"', 2.8, "#333333", 3.8, {upper: true, sp: .12});
      k.qr(guestLink(ev.code), 37.5, 94, 30, "#111111", {bg: "#faf8f3"});
      BRAND(k, ev, 141, "#a39a86", 97, "right");
    }},
  {id: "cini", name: "Mavi Çini",
    text: () => "Bu kodu okutun ve çektiğiniz fotoğraf ve videoları bizimle paylaşın!",
    draw(k, g, ev, text) {
      const BL = "#2f4f9a";
      k.bg("#f8f5ee");
      // kenar boyunca mavi çizgi bitki motifleri
      const r = rng(21);
      const motif = (x, y, a) => {
        const t = r();
        if (t < .4) k.branch(x, y, a, 9, BL, {leafLen: 3.6, wid: 1, n: 3, line: true, lw: .22});
        else if (t < .75) k.flower(x, y, 2.4, BL, .22);
        else { for (let i = 0; i < 3; i++) { g.strokeStyle = BL; g.lineWidth = k.mm(.22); g.beginPath(); g.arc(k.X(x + i * 1.6), k.X(y + (i % 2) * 1.4), k.mm(.9), 0, 7); g.stroke(); } }
      };
      for (let x = 6; x < CARD_W; x += 11) { motif(x, 5 + r() * 3, Math.PI * (.3 + r() * .4)); motif(x + 4, CARD_H - 5 - r() * 3, -Math.PI * (.3 + r() * .4)); }
      for (let y = 16; y < CARD_H - 10; y += 12) { motif(4 + r() * 3, y, r() * .8 - .4); motif(CARD_W - 4 - r() * 3, y + 5, Math.PI + r() * .8 - .4); }
      g.fillStyle = "#f8f5ee"; g.fillRect(k.X(12), k.X(13), k.mm(CARD_W - 24), k.mm(CARD_H - 26));
      k.text("Hoş geldiniz", 52.5, 24, '400 {s}px "Montserrat"', 3, BL, {upper: true, sp: .9});
      // zeytin dalı
      k.branch(36, 44, -.35, 32, BL, {leafLen: 5, wid: 1.2, n: 5, line: true, lw: .25, bend: .1});
      for (const [x, y] of [[46, 44.5], [52, 42.8], [58, 41]]) { g.strokeStyle = BL; g.lineWidth = k.mm(.25); g.beginPath(); g.ellipse(k.X(x), k.X(y + 2.2), k.mm(1.3), k.mm(1.8), .3, 0, 7); g.stroke(); }
      k.text(ev.title, 52.5, 64, '400 {s}px "Great Vibes"', 11, BL, {max: 74});
      k.wrap(text, 52.5, 73, 64, '400 {s}px "Montserrat"', 2.4, BL, 3.4, {upper: true, sp: .2});
      k.text("Anı", 17, 104, '400 {s}px "Playfair Display"', 9, BL, {align: "left", upper: true, sp: .6});
      k.text("Bırak", 17, 115, '400 {s}px "Playfair Display"', 9, BL, {align: "left", upper: true, sp: .6});
      k.qr(guestLink(ev.code), 60, 90, 27, BL, {bg: "#f8f5ee"});
      k.camera(81, 120, 7.5, BL, .25);
      BRAND(k, ev, 131.5, "#7d8bb0");
    }},
  {id: "cicek", name: "Çiçek Bahçesi", img: "kart/cicek.webp",
    text: () => "Anılarımızı paylaşın",
    draw(k, g, ev, text) {
      k.bg("#fdf7e7");
      const im = CARD_IMAGES["kart/cicek.webp"];
      if (im) g.drawImage(im, k.X(52.5 - 12.5), k.X(4), k.mm(25), k.mm(25 * im.height / im.width));
      k.text(text, 52.5, 33.5, '500 {s}px "Cormorant Garamond"', 4.4, "#5b7f2e");
      k.text(ev.title, 52.5, 46.5, '400 {s}px "Great Vibes"', 12, "#b8325a", {max: 83});
      k.text(`${KINDS[ev.kind] || ""} · ${dateDots(ev.event_date)}`, 52.5, 53, '500 {s}px "Cormorant Garamond"', 4, "#7a6a5a");
      g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(k.X(26), k.X(55), k.mm(53), k.mm(53), k.mm(2.5)); g.fill();
      k.qr(guestLink(ev.code), 29.5, 58.5, 46, "#111111");
      ["QR'ı okut", "İsmini yaz", "Fotoğraf yükle"].forEach((t, i) => {
        const cx = 20 + i * 32.5;
        g.fillStyle = "#d9466f"; g.beginPath(); g.arc(k.X(cx), k.X(119), k.mm(3.2), 0, 7); g.fill();
        k.text(String(i + 1), cx, 120.3, '700 {s}px "Barlow"', 3.5, "#ffffff");
        k.text(t, cx, 127.5, '500 {s}px "Cormorant Garamond"', 3.8, "#4a3a30");
      });
      BRAND(k, ev, 139, "#a08f7b");
    }},
];
const cardDesign = id => CARD_DESIGNS.find(d => d.id === id) || CARD_DESIGNS[0];

// ---------------------------------------------------------------- yazı tipi ve görsel yükleme
let cardAssetsPromise;
function cardFontsReady() {
  if (!cardAssetsPromise) {
    // önce stil dosyası (@font-face tanımları) yüklenmeli, yoksa fonts.load hiçbir şey indirmeden biter
    const css = new Promise(res => {
      if (document.querySelector('link[href="kart.css"]')) return res();
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.href = "kart.css"; l.onload = l.onerror = res;
      document.head.append(l);
    });
    const faces = ['400 20px "Playfair Display"', '500 20px "Cormorant Garamond"', '600 20px "Cormorant Garamond"',
      '400 20px "Great Vibes"', '400 20px "Montserrat"', '400 20px "Courier Prime"', '400 20px "Bodoni Moda"', '600 20px "Barlow"', '700 20px "Barlow"'];
    const imgs = CARD_DESIGNS.filter(d => d.img).map(d => new Promise(res => {
      const im = new Image();
      im.onload = () => { CARD_IMAGES[d.img] = im; res(); }; im.onerror = res; im.src = d.img;
    }));
    cardAssetsPromise = css.then(() => Promise.all([...imgs, ...faces.map(f => document.fonts.load(f, "ŞİĞÜÇÖşığüçö Aa").catch(() => null))]));
  }
  return cardAssetsPromise;
}

// pxmm: mm başına piksel (baskı için 12 ≈ 305 dpi). Kenarlarda CARD_BL taşma payı vardır. text boşsa tasarımın kendi yazısı.
function drawCard(ev, designId, text, pxmm) {
  const d = cardDesign(designId);
  const c = document.createElement("canvas");
  c.width = Math.round((CARD_W + 2 * CARD_BL) * pxmm); c.height = Math.round((CARD_H + 2 * CARD_BL) * pxmm);
  const g = c.getContext("2d");
  d.draw(cardKit(g, pxmm), g, ev, text || d.text(ev));
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
// save(design, text): seçimi kaydeder (yönetim ya da etkinlik sahibi); text boşsa tasarımın kendi yazısı kullanılır.
async function openCardPicker(ev, save) {
  let design = cardDesign(ev.card_design).id, custom = ev.card_text || "";
  if (custom === "Anılarımızı paylaşın" && design !== "cicek") custom = "";  // eski sürümün varsayılanı
  const m = document.createElement("div");
  m.className = "modal cardpick";
  m.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-label="Masa kartı tasarımı">
      <div class="row" style="justify-content:space-between"><h2>Masa kartı tasarımı</h2><button class="linkbtn" data-x>Kapat</button></div>
      <div class="cp-body">
        <div class="cp-prev"><img id="cpBig" alt="Seçili tasarımın önizlemesi"></div>
        <div class="stack" style="min-width:0">
          <label for="cpText">Kart yazısı</label>
          <textarea id="cpText" rows="2" maxlength="120"></textarea>
          <span class="hint">Boş bırakırsanız tasarımın kendi yazısı kullanılır. İsimler ve tarih etkinlik bilgilerinden gelir.</span>
          <div class="cp-grid" id="cpGrid"><p class="hint">Tasarımlar hazırlanıyor…</p></div>
        </div>
      </div>
      <div class="row"><button class="btn" id="cpDl">PDF indir (A6 + A4'e 4'lü)</button></div>
      <p class="hint">A6 kart 3 mm taşma paylıdır; matbaaya bu dosyayı gönderin. A4 dosyası evde basıp kesmek için.</p>
    </div>`;
  document.body.append(m);
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-x]")) m.remove(); });
  const ta = $("#cpText", m);
  const syncText = () => { ta.value = custom; ta.placeholder = cardDesign(design).text(ev); };
  syncText();
  await cardFontsReady();
  const big = $("#cpBig", m), grid = $("#cpGrid", m);
  const drawBig = () => { big.src = drawCard(ev, design, custom, 5).toDataURL("image/jpeg", .9); };
  const drawGrid = () => {
    grid.innerHTML = CARD_DESIGNS.map(d => `<button class="cp-item${d.id === design ? " on" : ""}" data-d="${d.id}">
      <img src="${drawCard(ev, d.id, custom, 1.6).toDataURL("image/jpeg", .85)}" alt=""><span>${esc(d.name)}</span></button>`).join("");
  };
  drawBig(); drawGrid();
  grid.onclick = e => {
    const b = e.target.closest("[data-d]");
    if (!b) return;
    design = b.dataset.d;
    grid.querySelectorAll(".cp-item").forEach(x => x.classList.toggle("on", x === b));
    syncText(); drawBig();
  };
  let t;
  ta.oninput = () => { custom = ta.value.trim(); clearTimeout(t); t = setTimeout(() => { drawBig(); drawGrid(); }, 300); };
  $("#cpDl", m).onclick = async () => {
    const btn = $("#cpDl", m);
    btn.disabled = true; btn.textContent = "Hazırlanıyor…";
    try {
      await save?.(design, custom);
      ev.card_design = design; ev.card_text = custom;
      await cardPdf(ev, design, custom);
      toast("PDF indirildi");
    } catch (e) { toast("PDF hazırlanamadı: " + e.message, 5000); }
    btn.disabled = false; btn.textContent = "PDF indir (A6 + A4'e 4'lü)";
  };
}
