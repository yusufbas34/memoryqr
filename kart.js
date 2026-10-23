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
function cardKit(g, pxmm, W = CARD_W, H = CARD_H) {
  const mm = v => v * pxmm, X = v => mm(v + CARD_BL);
  const k = {
    mm, X,
    font: (f, s) => f.replace("{s}", mm(s)),
    text(str, x, y, f, size, color, {align = "center", upper = false, sp = 0, max = W - 20} = {}) {
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
      for (let i = 0; i < n; i++) { g.beginPath(); g.arc(X(r() * W), X(r() * H), mm(.12 + r() * .35), 0, 7); g.fill(); }
      g.globalAlpha = 1;
    },
    bg(color) { g.fillStyle = color; g.fillRect(0, 0, mm(W + 2 * CARD_BL), mm(H + 2 * CARD_BL)); },
    // Twemoji çizimi (kart/emoji/<kod>.svg), merkezden; flip: yatay ayna
    emoji(code, x, y, size, rot = 0, flip = false) {
      const im = CARD_IMAGES[`kart/emoji/${code}.svg`];
      if (!im) return;
      g.save(); g.translate(X(x), X(y)); g.rotate(rot); if (flip) g.scale(-1, 1);
      g.drawImage(im, -mm(size) / 2, -mm(size) / 2, mm(size), mm(size)); g.restore();
    },
    bunting(y, colors, n) {
      g.strokeStyle = "#8a7a9a"; g.lineWidth = mm(.25);
      g.beginPath(); g.moveTo(X(-2), X(y)); g.quadraticCurveTo(X(52.5), X(y + 8), X(107), X(y)); g.stroke();
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, x = -2 + 109 * t, yy = y + 16 * t * (1 - t);  // eğrinin üstündeki nokta
        g.fillStyle = colors[i % colors.length]; g.beginPath(); g.moveTo(X(x - 4.5), X(yy)); g.lineTo(X(x + 4.5), X(yy)); g.lineTo(X(x), X(yy + 8)); g.closePath(); g.fill();
      }
    },
    confetti(n, colors, seed) {
      const r = rng(seed);
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * H;
        g.fillStyle = colors[i % colors.length];
        if (r() < .5) { g.beginPath(); g.arc(X(x), X(y), mm(.5 + r() * .7), 0, 7); g.fill(); }
        else { g.save(); g.translate(X(x), X(y)); g.rotate(r() * 6); g.fillRect(-mm(.9), -mm(.35), mm(1.8), mm(.7)); g.restore(); }
      }
    },
    sparkles(n, color, seed) {
      const r = rng(seed); g.fillStyle = color;
      for (let i = 0; i < n; i++) {
        const x = X(r() * W), y = X(r() * H), s = mm(.4 + r() * 1.1);
        g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill();
      }
    },
    vines(color, n) {
      g.strokeStyle = color; g.lineWidth = mm(.5);
      for (let i = 0; i < n; i++) {
        const x0 = 8 + i * 22;
        g.beginPath(); g.moveTo(X(x0), X(-3)); g.bezierCurveTo(X(x0 + 6), X(6), X(x0 - 4), X(10 + i % 2 * 4), X(x0 + 3), X(14 + i % 3 * 3)); g.stroke();
        for (let j = 0; j < 3; j++) k.leaf(x0 + (j % 2 ? 2 : -1), 3 + j * 4, j % 2 ? .6 : 2.4, 3, 1, color, .9);
      }
    },
    rays(cx, cy, colors, n) {
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
        g.fillStyle = colors[i % colors.length]; g.beginPath(); g.moveTo(X(cx), X(cy));
        g.lineTo(X(cx) + Math.cos(a0) * mm(200), X(cy) + Math.sin(a0) * mm(200)); g.lineTo(X(cx) + Math.cos(a1) * mm(200), X(cy) + Math.sin(a1) * mm(200)); g.closePath(); g.fill();
      }
    },
    waves(colors, band) {
      const WW = W + 2 * CARD_BL;
      for (let i = -2, j = 0; i * band < H + 10; i++, j++) {
        g.fillStyle = colors[j % colors.length]; g.beginPath(); g.moveTo(0, X(i * band));
        for (let x = 0; x <= WW; x += 1) g.lineTo(mm(x), X(i * band + Math.sin(x / 9 + i * .7) * 4));
        g.lineTo(mm(WW), X(H + 10)); g.lineTo(0, X(H + 10)); g.closePath(); g.fill();
      }
    },
    halftone(color, step) {
      g.fillStyle = color;
      for (let y = -2; y < H + 3; y += step) for (let x = -2; x < W + 3; x += step) {
        const d = Math.hypot(x - W / 2, y - H / 2) / 90;
        g.beginPath(); g.arc(X(x + (Math.round(y / step) % 2) * step / 2), X(y), mm(step * .42 * Math.min(1, d)), 0, 7); g.fill();
      }
    },
    burst(cx, cy, r1, r2, n, fill, stroke) {
      g.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; g.lineTo(X(cx + Math.cos(a) * r), X(cy + Math.sin(a) * r * .8)); }
      g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = mm(.6); g.stroke();
    },
    blob(cx, cy, r, color, seed) {
      const q = rng(seed), pts = [];
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = r * (.75 + q() * .5); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      g.fillStyle = color; g.beginPath();
      pts.forEach((p, i) => { const n = pts[(i + 1) % 8], mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2; i ? g.quadraticCurveTo(X(p[0]), X(p[1]), X(mx), X(my)) : g.moveTo(X(mx), X(my)); });
      const p = pts[0], n = pts[1]; g.quadraticCurveTo(X(p[0]), X(p[1]), X((p[0] + n[0]) / 2), X((p[1] + n[1]) / 2)); g.fill();
    },
    polaroid(x, y, w, ang, color) {
      g.save(); g.translate(X(x), X(y)); g.rotate(ang);
      g.shadowColor = "rgba(0,0,0,.18)"; g.shadowBlur = mm(1); g.fillStyle = "#ffffff"; g.fillRect(-mm(w / 2), -mm(w * .6), mm(w), mm(w * 1.2));
      g.shadowBlur = 0; g.fillStyle = color; g.fillRect(-mm(w / 2 - 1.2), -mm(w * .6 - 1.2), mm(w - 2.4), mm(w - 2.4)); g.restore();
    },
    decoPattern(color) {
      g.strokeStyle = color; g.lineWidth = mm(.3);
      for (let y = -6; y < H + 6; y += 9) for (let x = -6 + (Math.round(y / 9) % 2) * 6; x < W + 6; x += 12)
        for (const r of [2, 4, 6]) { g.beginPath(); g.arc(X(x), X(y), mm(r), Math.PI, 2 * Math.PI); g.stroke(); }
    },
  };
  return k;
}

const BRAND = (k, ev, y, color, x = CARD_W / 2, align = "center") => k.text(`MemoryQR · Albüm kodu ${ev.code}`, x, y, '600 {s}px "Barlow"', 2.1, color, {sp: .1, align});

// ---------------------------------------------------------------- tasarımlar
const CARD_DESIGNS = [
  {id: "yaprak", cat: "dugun", theme: {bg: "#ffffff", ink: "#2b2b2b", accent: "#577a52", font: '400 {s}px "Great Vibes"'}, name: "Yeşil Yapraklar",
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
  {id: "bordo", cat: "dugun", theme: {bg: "#f7f1ec", ink: "#7a1a24", accent: "#7a1a24", font: '400 {s}px "Bodoni Moda"'}, name: "Bordo Monogram",
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
  {id: "yakala", cat: "dugun", theme: {bg: "#ffffff", ink: "#2a2a2a", accent: "#b23a3a", font: '400 {s}px "Great Vibes"'}, name: "Aşkı Yakala",
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
  {id: "halka", cat: "dugun", theme: {bg: "#faf8f3", ink: "#1d1d1d", accent: "#a8832f", font: '400 {s}px "Bodoni Moda"'}, name: "Altın Halka",
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
  {id: "cini", cat: "dugun", theme: {bg: "#f8f5ee", ink: "#2f4f9a", accent: "#2f4f9a", font: '400 {s}px "Great Vibes"'}, name: "Mavi Çini",
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
  {id: "cicek", cat: "dugun", theme: {bg: "#fdf7e7", ink: "#b8325a", accent: "#b8325a", font: '400 {s}px "Great Vibes"'}, name: "Çiçek Bahçesi", img: "kart/cicek.webp",
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

// ---------------------------------------------------------------- afiş tasarımları (ortak yerleşim, süsleme tasarıma özel)
const CARD_CATS = {dugun: "Düğün · Nişan · Kına", dogum_kiz: "Doğum günü · kız", dogum_erkek: "Doğum günü · erkek",
  mezuniyet: "Mezuniyet", retro: "Retro & eğlenceli", modern: "Modern & renkli"};
const POSTER_TEXT = "Bu güzel günden kalan fotoğraf ve videoları QR kodu okutarak bizimle paylaşır mısınız?";
const KIDS_TEXT = "Doğum günü anılarını QR kodu okutarak bizimle paylaşır mısınız?";
const GRAD_TEXT = "Bu güzel günün fotoğraf ve videolarını QR kodu okutarak bizimle paylaşın!";
const F = {play: '400 {s}px "Playfair Display"', mont: '400 {s}px "Montserrat"', montB: '600 {s}px "Montserrat"', vibes: '400 {s}px "Great Vibes"',
  kid: '600 {s}px "Fredoka"', bungee: '400 {s}px "Bungee"', corm: '600 {s}px "Cormorant Garamond"', bod: '400 {s}px "Bodoni Moda"'};
const KIDS = {hf: F.kid, h: ["Doğum Günü"], hs: [12], L: {h: [36]}, mf: F.montB, ms: 2.9, nf: F.kid, ns: 8.5};

// renk açıklığı (0 koyu … 1 açık): koyu zeminde yazı rengi, misafir sayfası vurgu rengi için
function lum(hex) {
  const n = parseInt(String(hex).replace("#", "").slice(0, 6), 16);
  return isNaN(n) ? 1 : (.299 * (n >> 16) + .587 * (n >> 8 & 255) + .114 * (n & 255)) / 255;
}

// o: bg, deco(k, g, ev), h (başlık satırları), hf/hs/hc, mf/ms/mc (mesaj), qc (QR rengi), box (QR'a beyaz zemin),
//    nf/ns/nc (isimler; name: false gizler), bc (alt yazı rengi), L (yerleşim: h[], msg, qrY, qr, name, brand), after(k, g, ev)
function poster(o) {
  const dark = c => lum(c) < .45;
  const accent = [o.nc, o.hc, o.bg].find(c => c && c.startsWith("#") && dark(c)) || "#8c2f52";
  return {id: o.id, name: o.name, cat: o.cat, emojis: o.emojis || [], text: () => o.text || POSTER_TEXT,
    theme: {bg: o.bg, ink: o.hc || "#222222", accent, font: o.nf || F.vibes, emojis: (o.emojis || []).slice(0, 2)},
    draw(k, g, ev, text) {
      const L = {h: [31, 43], msg: 54, qrY: 69, qr: 31, name: 117, brand: 141.5, ...o.L};
      k.bg(o.bg);
      o.deco?.(k, g, ev);
      const lines = typeof o.h === "function" ? o.h(ev) : (o.h || ["ANI", "PAYLAŞ!"]);
      lines.forEach((t, i) => k.text(t, 52.5, L.h[i], o.hf || F.play, (o.hs || [])[i] || 11.5, o.hc || "#222222", {upper: o.hUpper, sp: o.hsp || 0, max: 80}));
      k.wrap(text, 52.5, L.msg, o.mw || 70, o.mf || F.mont, o.ms || 3, o.mc || o.hc || "#333333", (o.ms || 3) * 1.42, {upper: o.mUpper});
      if (o.box !== false) { g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(k.X(52.5 - L.qr / 2 - 3), k.X(L.qrY - 3), k.mm(L.qr + 6), k.mm(L.qr + 6), k.mm(2)); g.fill(); }
      k.qr(guestLink(ev.code), 52.5 - L.qr / 2, L.qrY, L.qr, o.qc || "#111111", {bg: o.box === false ? o.bg : "#ffffff"});
      if (o.name !== false) k.text(ev.title, 52.5, L.name, o.nf || F.vibes, o.ns || 9, o.nc || o.hc || "#222222", {max: 76});
      o.after?.(k, g, ev);
      BRAND(k, ev, L.brand, o.bc || "rgba(0,0,0,.45)");
    }};
}

const POSTERS = [
  // ---- doğum günü (kız)
  poster({id: "safari_pembe", name: "Pembe Safari", cat: "dogum_kiz", ...KIDS, text: KIDS_TEXT, emojis: ["1f338", "1f33a", "1f992", "1f418", "1f33c"],
    bg: "#fdeef3", hc: "#7a2a55", mc: "#5a3a4a",
    deco(k) { [8, 20, 33, 72, 86, 98].forEach((x, i) => k.emoji(i % 2 ? "1f33a" : "1f338", x, 7 + (i % 3) * 2, 11, i * .4));
      k.emoji("1f418", 16, 134, 22); k.emoji("1f992", 90, 133, 24); }}),
  poster({id: "unicorn", name: "Unicorn", cat: "dogum_kiz", ...KIDS, text: KIDS_TEXT, emojis: ["1f984", "2b50"],
    bg: "#efe6fa", hc: "#5b3b8c", mc: "#4a3a66",
    deco(k) { k.bunting(4, ["#f7a8c8", "#c7a8f0", "#ffd36e", "#9fd8f0"], 9); k.sparkles(30, "#ffffff", 4);
      k.emoji("1f984", 17, 132, 24); k.emoji("1f984", 88, 132, 24, 0, true); k.emoji("2b50", 52.5, 141, 6); }}),
  poster({id: "peri", name: "Peri Bahçesi", cat: "dogum_kiz", ...KIDS, text: KIDS_TEXT, emojis: ["1f9da", "1f98b", "1f338"],
    bg: "#fff2f7", hc: "#a2386c", mc: "#5a3a4a",
    deco(k) { k.confetti(70, ["#f7a8c8", "#ffd36e", "#c7a8f0"], 9); k.emoji("1f98b", 14, 14, 12, -.3); k.emoji("1f98b", 92, 18, 9, .4);
      k.emoji("1f9da", 15, 130, 24); k.emoji("1f338", 90, 136, 14); }}),
  poster({id: "balon", name: "Balon ve Pasta", cat: "dogum_kiz", ...KIDS, text: KIDS_TEXT, emojis: ["1f388", "1f9c1", "1f382", "1f389"],
    bg: "#fff6ec", hc: "#c2416b", mc: "#5a4040",
    deco(k) { k.confetti(60, ["#ff8fab", "#ffc857", "#7bd3ea", "#b8e0a0"], 13); k.emoji("1f388", 88, 14, 16, .2); k.emoji("1f388", 78, 22, 12, -.2);
      k.emoji("1f389", 15, 14, 12); k.emoji("1f9c1", 16, 134, 18); k.emoji("1f382", 89, 133, 20); }}),
  // ---- doğum günü (erkek)
  poster({id: "dinozor", name: "Dinozorlar", cat: "dogum_erkek", ...KIDS, text: KIDS_TEXT, emojis: ["1f996", "1f995", "1f334", "1f33f"],
    bg: "#d9f0d0", hc: "#2f5d2a", mc: "#2f4a2a",
    deco(k, g) { const gr = g.createLinearGradient(0, 0, 0, k.mm(CARD_H)); gr.addColorStop(0, "#d6efff"); gr.addColorStop(.62, "#e8f7df"); gr.addColorStop(.63, "#a8d48a"); gr.addColorStop(1, "#7fbf62");
      g.fillStyle = gr; g.fillRect(0, 0, k.mm(CARD_W + 6), k.mm(CARD_H + 6));
      k.emoji("1f334", 10, 18, 18, -.1); k.emoji("1f334", 95, 14, 16, .1); k.emoji("1f996", 18, 130, 26); k.emoji("1f995", 88, 128, 26, 0, true); k.emoji("1f33f", 52, 142, 8); }}),
  poster({id: "uzay", name: "Uzay", cat: "dogum_erkek", ...KIDS, text: KIDS_TEXT, emojis: ["1f680", "1fa90", "1f6f8", "2b50"],
    bg: "#14214a", hc: "#ffffff", mc: "#dfe6ff", nc: "#ffd36e", bc: "rgba(255,255,255,.55)",
    deco(k) { k.sparkles(80, "#ffffff", 8); k.emoji("1f680", 90, 16, 16, .5); k.emoji("1fa90", 14, 18, 14); k.emoji("1f6f8", 88, 132, 18, -.2); k.emoji("2b50", 16, 134, 10); }}),
  poster({id: "safari_mavi", name: "Mavi Safari", cat: "dogum_erkek", ...KIDS, text: KIDS_TEXT, emojis: ["1f981", "1f412", "1f418", "1f33f"],
    bg: "#e3f2fb", hc: "#1f4e79", mc: "#2a4058",
    deco(k) { k.vines("#5c9b4a", 5); k.emoji("1f412", 16, 16, 14, -.2); k.emoji("1f412", 90, 18, 12, .2, true); k.emoji("1f981", 18, 132, 24); k.emoji("1f418", 88, 133, 22, 0, true); }}),
  poster({id: "arabalar", name: "Arabalar", cat: "dogum_erkek", ...KIDS, text: KIDS_TEXT, emojis: ["1f697", "1f680", "1f9f8", "1f9e9"],
    bg: "#ffffff", hc: "#1f5fa8", mc: "#2a3a50",
    deco(k, g) { g.fillStyle = "#2b6cb0"; g.fillRect(0, 0, k.mm(CARD_W + 6), k.mm(CARD_H + 6)); g.fillStyle = "#eaf3fc"; g.fillRect(k.X(6), k.X(6), k.mm(CARD_W - 12), k.mm(CARD_H - 12));
      k.emoji("1f680", 92, 13, 12, .6); k.emoji("1f9f8", 15, 134, 16); k.emoji("1f697", 86, 136, 16); k.emoji("1f9e9", 14, 14, 10); }}),
  // ---- mezuniyet
  poster({id: "mezun_beyaz", name: "Mezuniyet Klasik", cat: "mezuniyet", emojis: ["1f393", "1f4dc"], text: GRAD_TEXT,
    bg: "#ffffff", h: ["MEZUNİYET", "ANILARINI", "PAYLAŞ!"], hs: [8.5, 8.5, 8.5], L: {h: [34, 44, 54], msg: 64, qrY: 78, qr: 28, name: 121}, hc: "#1d1d1d",
    deco(k) { k.emoji("1f393", 52.5, 16, 15); }}),
  poster({id: "mezun_lacivert", name: "Lacivert Mezuniyet", cat: "mezuniyet", emojis: ["1f393"], text: GRAD_TEXT,
    bg: "#16244a", h: ["MEZUNİYET", "ANILARINI", "PAYLAŞ!"], hs: [8.5, 8.5, 8.5], L: {h: [34, 44, 54], msg: 64, qrY: 78, qr: 28, name: 121},
    hc: "#d9b65c", mc: "#e6e9f2", nc: "#d9b65c", bc: "rgba(255,255,255,.5)",
    deco(k, g) { g.strokeStyle = "#d9b65c"; g.lineWidth = k.mm(.4); g.strokeRect(k.X(6), k.X(6), k.mm(CARD_W - 12), k.mm(CARD_H - 12)); k.emoji("1f393", 52.5, 16, 14); }}),
  poster({id: "mezun_bordo", name: "Bordo Mezuniyet", cat: "mezuniyet", emojis: ["1f393", "1f38a"], text: GRAD_TEXT,
    bg: "#6e1f2e", h: ["MEZUNİYET", "ANILARINI", "PAYLAŞ!"], hs: [8.5, 8.5, 8.5], L: {h: [34, 44, 54], msg: 64, qrY: 78, qr: 28, name: 121},
    hc: "#ffffff", mc: "#f3dfe2", nc: "#f1c96b", bc: "rgba(255,255,255,.5)",
    deco(k) { k.confetti(45, ["#f1c96b", "#ffffff"], 21); k.emoji("1f393", 52.5, 16, 14); }}),
  // ---- retro & eğlenceli
  poster({id: "kaset", name: "Kaset", cat: "retro", emojis: ["1f4fc"], bg: "#e3a72f", hc: "#2b2118", mc: "#2b2118",
    deco(k) { [[14, 14, -.3], [91, 18, .25], [12, 132, .2], [92, 130, -.3], [93, 74, .5], [12, 76, -.4]].forEach(([x, y, r]) => k.emoji("1f4fc", x, y, 15, r)); }}),
  poster({id: "radyo", name: "Radyo", cat: "retro", emojis: ["1f4fb"], bg: "#2f7f86", hc: "#ffffff", mc: "#eaf6f6", nc: "#ffffff", bc: "rgba(255,255,255,.55)",
    h: ["ANI PAYLAŞ!"], hs: [10], L: {h: [40], msg: 50, qrY: 66, name: 115}, deco(k) { k.emoji("1f4fb", 52.5, 20, 22); }}),
  poster({id: "film", name: "Film Rulosu", cat: "retro", emojis: ["1f39e"], bg: "#b04a5a", hc: "#ffffff", mc: "#f6e3e6", nc: "#ffffff", bc: "rgba(255,255,255,.55)",
    h: ["ANI PAYLAŞ!"], hs: [10], L: {h: [40], msg: 50, qrY: 66, name: 115}, deco(k) { k.emoji("1f39e", 52.5, 20, 22); }}),
  poster({id: "tv80", name: "80'ler", cat: "retro", emojis: ["1f4fa"], hf: F.bungee, h: ["ANI PAYLAŞ!"], hs: [8], L: {h: [43], msg: 52, qrY: 68, name: 116},
    bg: "#d9d9d9", hc: "#222222",
    deco(k, g) { const gr = g.createLinearGradient(0, 0, 0, k.mm(CARD_H)); gr.addColorStop(0, "#f2f2f2"); gr.addColorStop(1, "#b9b9b9"); g.fillStyle = gr; g.fillRect(0, 0, k.mm(CARD_W + 6), k.mm(CARD_H + 6));
      k.emoji("1f4fa", 52.5, 20, 26); k.text("80'S", 52.5, 23, F.bungee, 4.5, "#ffde59"); }}),
  poster({id: "popart", name: "Pop Art", cat: "retro", hf: F.bungee, hs: [10, 10], hc: "#ffe14d", mc: "#111111", nc: "#111111", bg: "#29c4e8", L: {h: [32, 45], msg: 67, qrY: 79, qr: 28, name: 122},
    deco(k, g) { k.halftone("#1a8fb0", 2.6); k.burst(52.5, 37, 30, 23, 18, "#e8336b", "#111111"); k.burst(88, 128, 12, 7, 10, "#ffe14d", "#111111"); k.burst(16, 126, 9, 5, 9, "#ffffff", "#111111"); }}),
  poster({id: "gunes", name: "Güneş Işınları", cat: "retro", hf: F.bungee, hs: [9, 9], hc: "#c2412d", bg: "#f6efe2", L: {h: [33, 45]},
    deco(k, g) { k.rays(52.5, 74, ["#e94e3c", "#f6a623", "#f7d046", "#3fb8af", "#2d6fb7", "#f6efe2"], 36); g.fillStyle = "#fbf6ec"; g.beginPath(); g.roundRect(k.X(10), k.X(20), k.mm(85), k.mm(108), k.mm(6)); g.fill(); }}),
  poster({id: "dalga", name: "Retro Dalga", cat: "retro", hf: F.bungee, h: ["RETRO"], hs: [11], L: {h: [38], msg: 50, qrY: 66, name: 116}, hc: "#d6452f", bg: "#fdf3e1",
    deco(k, g) { k.waves(["#d6452f", "#f39a2b", "#f6cf3f", "#3aa6a0", "#7b3fa0"], 7); g.fillStyle = "#fdf3e1"; g.beginPath(); g.roundRect(k.X(12), k.X(24), k.mm(81), k.mm(102), k.mm(5)); g.fill(); }}),
  // ---- modern & renkli
  poster({id: "gece", name: "Gece Mavisi", cat: "modern", bg: "#1f2a44", hc: "#ffffff", mc: "#d7dbe6", nc: "#ffffff", bc: "rgba(255,255,255,.5)"}),
  poster({id: "gulkurusu", name: "Gül Kurusu", cat: "modern", bg: "#b4626f", hc: "#ffffff", mc: "#fbe9ec", nc: "#ffffff", bc: "rgba(255,255,255,.55)"}),
  poster({id: "fistik", name: "Fıstık Yeşili", cat: "modern", bg: "#cbd83c", hc: "#1d1d1d", mc: "#1d1d1d",
    deco(k) { k.text("“", 14, 28, F.play, 26, "#1d1d1d", {align: "left"}); k.text("”", 92, 136, F.play, 26, "#1d1d1d", {align: "right"}); }}),
  poster({id: "lila", name: "Lila Çerçeve", cat: "modern", bg: "#9a86c4", hc: "#3d2e63", mc: "#3d2e63", nc: "#3d2e63",
    deco(k, g) { g.fillStyle = "#e9e2f5"; g.fillRect(k.X(8), k.X(8), k.mm(CARD_W - 16), k.mm(CARD_H - 16)); }}),
  poster({id: "soyut", name: "Soyut Şekiller", cat: "modern", bg: "#f6efe4", hc: "#2b2b2b", h: [], nf: F.play, ns: 9, L: {name: 30, msg: 44, qrY: 66, qr: 32},
    deco(k) { k.blob(4, 6, 20, "#c96f53", 1); k.blob(100, 30, 14, "#86a39a", 2); k.blob(98, 140, 22, "#2d3a5c", 3); k.blob(6, 136, 16, "#e2b04a", 4); k.blob(18, 98, 6, "#86a39a", 5); }}),
  poster({id: "neon", name: "Neon Kamera", cat: "modern", bg: "#1b1530", h: ["PAYLAŞ!"], hs: [11], L: {h: [47], msg: 56, qrY: 70, name: 117},
    hc: "#ffffff", mc: "#d9d3ee", nc: "#ff6ec7", bc: "rgba(255,255,255,.5)",
    deco(k, g) { g.save(); g.shadowColor = "#ff3fb4"; g.shadowBlur = k.mm(3); k.camera(36, 12, 33, "#ff6ec7", .7, "rgba(0,0,0,0)"); g.shadowColor = "#3fd2ff"; k.camera(36, 12, 33, "#7fe3ff", .25, "rgba(0,0,0,0)"); g.restore(); }}),
  poster({id: "polaroid", name: "Polaroidler", cat: "modern", bg: "#f4efe6", hc: "#2b2b2b",
    deco(k) { const r = rng(8), cols = ["#7fb7d6", "#e8a87c", "#9ccf9c", "#d98fa8", "#c9b2e0", "#f0d27a"];
      for (const [x, y] of [[6, 6], [30, 2], [64, 3], [92, 8], [2, 34], [99, 40], [3, 70], [100, 76], [2, 104], [99, 108], [8, 138], [36, 142], [68, 141], [96, 136]])
        k.polaroid(x, y, 17, (r() - .5) * .7, cols[Math.floor(r() * cols.length)]); }}),
  poster({id: "bauhaus", name: "Bauhaus", cat: "modern", bg: "#ffffff", hc: "#1d1d1d",
    deco(k, g) { g.fillStyle = "#23395d"; g.fillRect(k.X(0), k.X(0), k.mm(14), k.mm(20)); g.fillStyle = "#e4b363"; g.beginPath(); g.arc(k.X(98), k.X(14), k.mm(9), 0, 7); g.fill();
      g.fillStyle = "#d1495b"; g.beginPath(); g.arc(k.X(10), k.X(140), k.mm(12), 0, 7); g.fill(); g.fillStyle = "#8aa6a3"; g.fillRect(k.X(84), k.X(126), k.mm(21), k.mm(22));
      g.fillStyle = "#1d1d1d"; [[78, 8], [83, 8], [88, 8]].forEach(([x, y]) => { g.beginPath(); g.arc(k.X(x), k.X(y), k.mm(.9), 0, 7); g.fill(); }); }}),
  poster({id: "deco_oval", name: "Altın Oval", cat: "dugun", bg: "#151515", hc: "#2b2b2b", mc: "#333333", nc: "#2b2b2b", box: false, bc: "rgba(255,255,255,.5)", L: {h: [36, 48], msg: 58, qrY: 72, qr: 28, name: 113}, 
    deco(k, g) { k.decoPattern("#c9a54c"); g.fillStyle = "#fdfbf6"; g.beginPath(); g.ellipse(k.X(52.5), k.X(74), k.mm(41), k.mm(62), 0, 0, 7); g.fill(); g.strokeStyle = "#c9a54c"; g.lineWidth = k.mm(.8); g.stroke(); }}),
  poster({id: "kemer", name: "Gül Kemer", cat: "dugun", bg: "#b56a6e", hc: "#3a2a2a", mc: "#4a3a3a", box: false, L: {h: [36, 48], msg: 58, qrY: 75, qr: 30, name: 120},
    deco(k, g) { g.fillStyle = "#fbf3ee"; g.beginPath(); g.moveTo(k.X(10), k.X(140)); g.lineTo(k.X(10), k.X(52)); g.arc(k.X(52.5), k.X(52), k.mm(42.5), Math.PI, 0); g.lineTo(k.X(95), k.X(140)); g.closePath(); g.fill(); }}),
  poster({id: "altin_geo", name: "Altın Geometrik", cat: "dugun", bg: "#f6dcdc", hc: "#3a2a2a", box: false, L: {h: [38, 50], msg: 60, qrY: 74, qr: 28, name: 117},
    deco(k, g) { g.strokeStyle = "#c4a052"; g.lineWidth = k.mm(.4); for (const s of [0, 2.2]) { g.beginPath(); [[52.5, 12 + s], [94 - s, 34], [94 - s, 114], [52.5, 136 - s], [11 + s, 114], [11 + s, 34]].forEach(([x, y], i) => i ? g.lineTo(k.X(x), k.X(y)) : g.moveTo(k.X(x), k.X(y))); g.closePath(); g.stroke(); } }}),
  poster({id: "konfeti", name: "Konfeti", cat: "dugun", bg: "#ffffff", hc: "#2b2b2b", deco(k) { k.confetti(110, ["#e94e77", "#f6c445", "#3fb8af", "#5b7bd5", "#f08a4b"], 17); }}),
  poster({id: "tropik", name: "Tropik", cat: "dugun", emojis: ["1f33a", "1f334", "1f33f"], bg: "#14382c", hc: "#ffffff", mc: "#e3efe8", nc: "#ffffff", bc: "rgba(255,255,255,.5)",
    deco(k) { const r = rng(4); for (let i = 0; i < 26; i++) { const t = i / 26, side = i % 4; const x = side === 0 ? t * 105 : side === 1 ? 105 - t * 105 : side === 2 ? 2 + r() * 8 : 103 - r() * 8;
      const y = side === 0 ? 3 + r() * 7 : side === 1 ? 145 - r() * 7 : t * 148; k.emoji(["1f33a", "1f334", "1f33f"][i % 3], x, y, 9 + r() * 6, r() * 6); } }}),
  poster({id: "kircicek", name: "Kır Çiçekleri", cat: "dugun", emojis: ["1f338", "1f33c", "1f337", "1f33f"], bg: "#fbf8f1", hc: "#4a3b2c", nf: F.play, ns: 8, h: [], L: {name: 34, msg: 46, qrY: 66, qr: 32},
    deco(k) { const r = rng(12); for (let i = 0; i < 22; i++) { const x = 6 + r() * 93, y = r() < .5 ? 118 + r() * 26 : 4 + r() * 14; k.emoji(["1f338", "1f33c", "1f337", "1f33f"][i % 4], x, y, 6 + r() * 5, r() - .5); } }}),
];
CARD_DESIGNS.push(...POSTERS);
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
      '400 20px "Great Vibes"', '400 20px "Montserrat"', '600 20px "Montserrat"', '400 20px "Courier Prime"', '400 20px "Bodoni Moda"',
      '600 20px "Fredoka"', '400 20px "Bungee"', '600 20px "Barlow"', '700 20px "Barlow"'];
    const srcs = new Set();
    for (const d of CARD_DESIGNS) { if (d.img) srcs.add(d.img); for (const e of d.emojis || []) srcs.add(`kart/emoji/${e}.svg`); }
    const imgs = [...srcs].map(src => new Promise(res => {
      const im = new Image();
      im.onload = () => { CARD_IMAGES[src] = im; res(); }; im.onerror = res; im.src = src;
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

// ---------------------------------------------------------------- ürünler: masa kartı, kartvizit, ayaklı pano
// sel = {design, text, custom: null | {img, pos, size}}: hazır tasarım ya da etkinlik sahibinin yüklediği görsel
const CARD_PRODUCTS = {
  kart: {name: "Masa kartı", note: "A6 · 10,5 × 14,8 cm"},
  kartvizit: {name: "Kartvizit", note: "8,5 × 5,5 cm"},
  pano: {name: "Ayaklı pano", note: "Düğün girişi · 50 × 70 cm"},
};
const PANO_SIZES = {"50x70": [500, 700], "35x50": [350, 500]};
const QR_SIZES = {kucuk: 26, orta: 32, buyuk: 40};
const cardTheme = sel => sel.custom ? {bg: "#ffffff", ink: "#222222", accent: "#8c2f52", font: '400 {s}px "Great Vibes"'} : cardDesign(sel.design).theme;

function coverImage(g, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k;
  g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

// kendi tasarımı: görsel kartı kaplar, QR beyaz kutuda seçilen yerde
function drawCustomCard(ev, custom, pxmm) {
  const c = document.createElement("canvas");
  c.width = Math.round((CARD_W + 2 * CARD_BL) * pxmm); c.height = Math.round((CARD_H + 2 * CARD_BL) * pxmm);
  const g = c.getContext("2d"), k = cardKit(g, pxmm);
  k.bg("#ffffff");
  if (custom.img) coverImage(g, custom.img, 0, 0, c.width, c.height);
  const q = QR_SIZES[custom.size] || QR_SIZES.orta, pad = 3, bw = q + 2 * pad, bh = q + 2 * pad + 4.5;
  const pos = {orta: [(CARD_W - bw) / 2, (CARD_H - bh) / 2], alt: [(CARD_W - bw) / 2, CARD_H - bh - 12],
    sag_alt: [CARD_W - bw - 9, CARD_H - bh - 10], sol_alt: [9, CARD_H - bh - 10]}[custom.pos] || [(CARD_W - bw) / 2, CARD_H - bh - 12];
  g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(k.X(pos[0]), k.X(pos[1]), k.mm(bw), k.mm(bh), k.mm(2)); g.fill();
  k.qr(guestLink(ev.code), pos[0] + pad, pos[1] + pad, q, "#111111");
  k.text("Okut · fotoğraflarını yükle", pos[0] + bw / 2, pos[1] + bh - 2.2, '600 {s}px "Barlow"', 2.4, "#444444", {max: bw - 2});
  return c;
}

function drawKart(ev, sel, pxmm) { return sel.custom ? drawCustomCard(ev, sel.custom, pxmm) : drawCard(ev, sel.design, sel.text, pxmm); }

// kartvizit (yatay): solda isimler ve yönlendirme, sağda QR
function drawBiz(ev, sel, pxmm) {
  const W = 85, H = 55, BL = CARD_BL;
  const c = document.createElement("canvas");
  c.width = Math.round((W + 2 * BL) * pxmm); c.height = Math.round((H + 2 * BL) * pxmm);
  const g = c.getContext("2d"), k = cardKit(g, pxmm, W, H), t = cardTheme(sel);
  k.bg(t.bg);
  if (sel.custom?.img) { coverImage(g, sel.custom.img, 0, 0, k.X(46), c.height); g.fillStyle = "#ffffff"; g.fillRect(k.X(46), 0, c.width, c.height); }
  else {
    const d = cardDesign(sel.design);
    if (d.img && CARD_IMAGES[d.img]) { const im = CARD_IMAGES[d.img]; g.drawImage(im, k.X(31), k.X(3), k.mm(14), k.mm(14 * im.height / im.width)); }
    (t.emojis || []).forEach((e, i) => k.emoji(e, 7 + i * 9, 49, 8, (i - .5) * .3));
    g.fillStyle = t.accent; g.fillRect(k.X(6), k.X(9), k.mm(10), k.mm(.6));
  }
  const ink = sel.custom ? "#ffffff" : t.ink, x0 = 6, colW = 38;
  if (!sel.custom) {
    k.text("Anılarımızı paylaşın", x0, 15, '600 {s}px "Montserrat"', 2.1, t.accent, {align: "left", upper: true, sp: .25, max: colW});
    k.text(ev.title, x0, 26, t.font, 7.5, ink, {align: "left", max: colW});
    k.text(`${KINDS[ev.kind] || ""} · ${dateDots(ev.event_date)}`, x0, 32, '400 {s}px "Montserrat"', 2.4, ink, {align: "left", max: colW});
    k.wrap("QR kodu okutun, fotoğraf ve videolarınızı albümümüze yükleyin.", x0, 39, colW, '400 {s}px "Montserrat"', 2.1, ink, 3, {align: "left"});
  }
  g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(k.X(50), k.X(9), k.mm(29), k.mm(36), k.mm(2)); g.fill();
  if (!sel.custom && lum(t.bg) > .85) { g.strokeStyle = "rgba(0,0,0,.12)"; g.lineWidth = k.mm(.2); g.stroke(); }
  k.qr(guestLink(ev.code), 52, 11, 25, "#111111");
  k.text(`Albüm kodu ${ev.code}`, 64.5, 41.5, '600 {s}px "Barlow"', 2.2, "#555555", {max: 27});
  k.text("MemoryQR", 64.5, 50, '600 {s}px "Barlow"', 2, sel.custom ? "#999999" : (lum(t.bg) < .45 ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.4)"));
  return c;
}

const pdfName = (ev, s) => `${slug(ev.title)}-${s}.pdf`;
function cutMarks(pdf, xs, ys, pageW, pageH) {
  pdf.setDrawColor(150); pdf.setLineWidth(.15);
  const x0 = xs[0], x1 = xs[xs.length - 1], y0 = ys[0], y1 = ys[ys.length - 1];
  for (const x of xs) { pdf.line(x, 0, x, y0 - 1); pdf.line(x, y1 + 1, x, pageH); }
  for (const y of ys) { pdf.line(0, y, x0 - 1, y); pdf.line(x1 + 1, y, pageW, y); }
}
// tek ürün (taşma paylı) + A4'e çoklu dizilim
function gridPdf(img, w, h, cols, rows) {
  const {jsPDF} = window.jspdf, BL = CARD_BL;
  const a4 = new jsPDF({unit: "mm", format: "a4", orientation: "portrait"});
  const ox = (210 - cols * w) / 2, oy = (297 - rows * h) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) a4.addImage(img, "JPEG", ox + c * w - BL, oy + r * h - BL, w + 2 * BL, h + 2 * BL);
  a4.setFillColor(255, 255, 255);
  a4.rect(0, 0, 210, oy, "F"); a4.rect(0, oy + rows * h, 210, 297, "F"); a4.rect(0, 0, ox, 297, "F"); a4.rect(ox + cols * w, 0, 210, 297, "F");
  cutMarks(a4, [...Array(cols + 1)].map((_, i) => ox + i * w), [...Array(rows + 1)].map((_, i) => oy + i * h), 210, 297);
  return a4;
}

async function productPdf(product, ev, sel, panoSize = "50x70") {
  await Promise.all([loadScript("vendor/jspdf.umd.min.js"), cardFontsReady()]);
  const {jsPDF} = window.jspdf, BL = CARD_BL;
  if (product === "kart") {
    const img = drawKart(ev, sel, 12).toDataURL("image/jpeg", .95);
    const one = new jsPDF({unit: "mm", format: [CARD_W + 2 * BL, CARD_H + 2 * BL], orientation: "portrait"});
    one.addImage(img, "JPEG", 0, 0, CARD_W + 2 * BL, CARD_H + 2 * BL);
    one.save(pdfName(ev, "masa-karti-A6-tasmali"));
    gridPdf(img, CARD_W, CARD_H, 2, 2).save(pdfName(ev, "masa-karti-A4-4lu"));
  } else if (product === "kartvizit") {
    const img = drawBiz(ev, sel, 14).toDataURL("image/jpeg", .95);
    const one = new jsPDF({unit: "mm", format: [85 + 2 * BL, 55 + 2 * BL], orientation: "landscape"});
    one.addImage(img, "JPEG", 0, 0, 85 + 2 * BL, 55 + 2 * BL);
    one.save(pdfName(ev, "kartvizit-tasmali"));
    gridPdf(img, 85, 55, 2, 5).save(pdfName(ev, "kartvizit-A4-10lu"));
  } else {
    // pano: masa kartı tasarımı büyütülür (oranlar neredeyse aynı); 5 mm taşma, ~150 dpi (geniş format baskı)
    const [W, H] = PANO_SIZES[panoSize] || PANO_SIZES["50x70"], PB = 5, s = Math.max((W + 2 * PB) / CARD_W, (H + 2 * PB) / CARD_H);
    const cv = drawKart(ev, sel, Math.min(5.9 * s, 30));
    const pdf = new jsPDF({unit: "mm", format: [W + 2 * PB, H + 2 * PB], orientation: "portrait"});
    const iw = (CARD_W + 2 * BL) * s, ih = (CARD_H + 2 * BL) * s;
    pdf.addImage(cv.toDataURL("image/jpeg", .92), "JPEG", (W + 2 * PB - iw) / 2, (H + 2 * PB - ih) / 2, iw, ih);
    pdf.save(pdfName(ev, `ayakli-pano-${panoSize}-5mm-tasmali`));
  }
}

// önizleme: ürün tuvali (taşma payı dahil)
function drawProduct(product, ev, sel, pxmm) {
  if (product === "kartvizit") return drawBiz(ev, sel, pxmm);
  return drawKart(ev, sel, pxmm);
}
