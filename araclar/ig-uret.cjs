// MemoryQR Instagram içeriğini üretir: pazarlama/ig/gunler.js → pazarlama/ig/
//   ekran/*.png          sitenin telefon ekranı görüntüleri (örnek verilerle)
//   gun-NN-K.jpg         karusel/gönderi (1080×1350) ve hikâye (1080×1920) görselleri
//   gun-NN.mp4, gun-NN-kapak.jpg   Reels videosu (müziksiz, 1080×1920) ve kapağı
// Gerekenler: Playwright (Chromium) ve ffmpeg.   Çalıştırma: node araclar/ig-uret.cjs [gün numarası…]  (EKRANSIZ=1: ekran görüntülerini yeniden alma)
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const {execFileSync} = require("child_process");
const {chromium} = require(process.env.PW || "playwright");
const ROOT = path.join(__dirname, ".."), OUT = path.join(ROOT, "pazarlama", "ig");
const {IG_PLAN} = require(path.join(OUT, "gunler.js"));
const only = process.argv.slice(2).map(Number).filter(Boolean);
const days = IG_PLAN.flatMap(w => w.d).map((d, i) => ({...d, n: i + 1}));
const nn = n => String(n).padStart(2, "0");

// küçük statik sunucu (yazı tipleri ve görseller dosyadan değil, http'den yüklensin)
const TYPES = {".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".json": "application/json"};
const server = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {"Content-Type": TYPES[path.extname(f)] || "application/octet-stream"}); fs.createReadStream(f).pipe(r);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const BASE = `http://localhost:${server.address().port}/`;
  const b = await chromium.launch();
  fs.mkdirSync(path.join(OUT, "ekran"), {recursive: true});

  // ---------------------------------------------------------------- 1) telefon ekranları
  if (!only.length && !process.env.EKRANSIZ) {
    // galeri için örnek fotoğraflar: ürün fotoğraflarından farklı kırpımlar
    const crop = await b.newPage();
    await crop.goto(BASE + "pazarlama/ig/sablon.html");
    const photos = await crop.evaluate(async () => {
      const out = [];
      for (const n of ["pleksi-stand", "sovale-pano", "tabak-kartvizit"]) {
        const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = `kart/foto/${n}.webp`; });
        for (const [x, y, z] of [[0, 0, 1], [.15, .1, .62], [.45, .3, .55]]) {
          const c = document.createElement("canvas"); c.width = 900; c.height = 900;
          const s = Math.min(im.width, im.height) * z;
          c.getContext("2d").drawImage(im, im.width * x * (1 - z), im.height * y * (1 - z), s, s, 0, 0, 900, 900);
          out.push(c.toDataURL("image/jpeg", .85).split(",")[1]);
        }
      }
      return out;
    });
    await crop.close();
    const imgs = photos.map(p => Buffer.from(p, "base64"));
    const files = imgs.map((_, i) => ({id: `00000000-0000-0000-0000-0000000000${nn(i)}`, key: `e/ORNEK1/00000000-0000-0000-0000-0000000000${nn(i)}.jpg`, thumb_key: null,
      guest: ["Zeynep", "Ali", "Elif", "Can", "Ayşe"][i % 5], kind: "photo", bytes: 2.4e6, hidden: false, favorite: [1, 4, 6].includes(i), created_at: new Date(Date.now() - i * 9e5).toISOString()}));
    const ev = {code: "ORNEK1", title: "Seda & Yusuf", kind: "dugun", event_date: "2026-06-14", expires_at: "2026-07-15T21:00:00Z", active: true, guest_gallery: false,
      files: files.length, guests: 5, bytes: 2.1e7, package: "standart", card_design: "bordo"};
    const ctx = await b.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 3});
    await ctx.route(/supabase\.co\/rest\/v1\/rpc\//, r => {
      const fn = r.request().url().split("/").pop();
      const res = {memory_event: ev, memory_owner: {ok: true, event: ev}, memory_owner_files: {ok: true, files}, memory_files_mine: files.slice(0, 3),
        memory_upload_begin: {ok: true, id: files[0].id, key: files[0].key, max: 1, exp: 1, sig: "x"}, memory_upload_done: {ok: true}}[fn] ?? [];
      r.fulfill({json: res});
    });
    await ctx.route(/workers\.dev/, r => {
      const m = r.request().url().match(/0000000000(\d\d)\.jpg/);
      r.fulfill({body: imgs[m ? +m[1] % imgs.length : 0], contentType: "image/jpeg", headers: {"Access-Control-Allow-Origin": "*"}});
    });
    const shot = async (name, url, prep) => {
      const p = await ctx.newPage(); await p.goto(BASE + url); if (prep) await prep(p); await p.waitForTimeout(900);
      await p.screenshot({path: path.join(OUT, "ekran", name + ".png")}); await p.close(); console.log("ekran", name);
    };
    await shot("isim", "?e=ORNEK1", p => p.waitForSelector("#gcard:not([hidden])"));
    await shot("misafir", "?e=ORNEK1", async p => { await p.evaluate(() => localStorage.setItem("mqr_name", JSON.stringify("Zeynep"))); await p.reload(); await p.waitForSelector("#gcard:not([hidden])"); });
    await shot("yuklendi", "?e=ORNEK1", async p => {
      await p.evaluate(() => { localStorage.setItem("mqr_name", JSON.stringify("Zeynep")); localStorage.setItem("mqr_mine_ORNEK1", JSON.stringify(["x"])); });
      await p.reload(); await p.waitForSelector("#pick", {state: "attached"});
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ig-")); const fs3 = [0, 3, 6].map(i => { const f = path.join(tmp, `foto-${i}.jpg`); fs.writeFileSync(f, imgs[i]); return f; });
      await p.setInputFiles("#pick", fs3); await p.waitForFunction(() => /Teşekkürler/.test(document.querySelector("#sum")?.textContent || ""), null, {timeout: 20000});
      await p.waitForTimeout(1800); await p.evaluate(() => document.querySelector("#upCard").scrollIntoView());
    });
    const owner = async p => { await p.evaluate(() => sessionStorage.setItem("mqr_pin_ORNEK1", "1")); await p.reload(); await p.waitForSelector("#gal .gi"); };
    await shot("sahip", "?e=ORNEK1&sahip", async p => { await owner(p); await p.evaluate(() => document.querySelector(".toolbar").scrollIntoView()); });
    await shot("favori", "?e=ORNEK1&sahip", async p => { await owner(p); await p.click("#gal .gi[data-i='1']"); await p.waitForSelector(".lb [data-a='fav']"); });
    await shot("favoriler", "?e=ORNEK1&sahip", async p => { await owner(p); await p.selectOption("#gf", "__fav"); await p.evaluate(() => scrollTo(0, document.querySelector("#zip").getBoundingClientRect().top + scrollY - 20)); });
    await shot("tasarimlar", "?tasarimlar", async p => { await p.fill("#dzT", "Seda & Yusuf"); await p.waitForTimeout(600); await p.evaluate(() => document.querySelector("#dzC").scrollIntoView()); await p.waitForSelector("#dzG img.ready"); await p.waitForTimeout(1200); });
    await ctx.close();
  }

  // ---------------------------------------------------------------- 2) görseller ve Reels
  const page = await b.newPage({viewport: {width: 1200, height: 2000}});
  page.on("pageerror", e => console.log("HATA", e.message));
  await page.goto(BASE + "pazarlama/ig/sablon.html"); await page.evaluate(() => document.fonts.ready);
  const draw = async (spec, dikey, file, type = "jpeg") => {
    const h = await page.evaluateHandle(([s, d]) => render(s, d), [spec, dikey]);
    await h.asElement().screenshot({path: file, type, ...(type === "jpeg" ? {quality: 88} : {})});
    await page.evaluate(el => el.remove(), h);
  };
  for (const d of days) {
    if (only.length && !only.includes(d.n)) continue;
    for (const old of fs.readdirSync(OUT).filter(f => f.startsWith(`gun-${nn(d.n)}`))) fs.unlinkSync(path.join(OUT, old));
    if (d.slides) for (let i = 0; i < d.slides.length; i++) {
      await draw(d.slides[i], d.t === "hikaye", path.join(OUT, `gun-${nn(d.n)}-${i + 1}.jpg`));
      console.log(`gün ${d.n}: görsel ${i + 1}/${d.slides.length}`);
    }
    if (d.reels) {
      await draw(d.reels.kapak, true, path.join(OUT, `gun-${nn(d.n)}-kapak.jpg`));
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reels-")), sc = d.reels.sahneler, X = .25;
      for (let i = 0; i < sc.length; i++) await draw(sc[i], true, path.join(tmp, `s${i}.png`), "png");
      // her sahne hafifçe yakınlaşır, sahneler arası yumuşak geçiş
      const args = ["-y"], f = [];
      sc.forEach((s, i) => { args.push("-loop", "1", "-framerate", "30", "-t", String(s.sure + X), "-i", path.join(tmp, `s${i}.png`));
        f.push(`[${i}:v]zoompan=z='min(zoom+0.0007,1.05)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,setsar=1,format=yuv420p[v${i}]`); });
      let last = "v0", off = 0;
      for (let i = 1; i < sc.length; i++) { off += sc[i - 1].sure; f.push(`[${last}][v${i}]xfade=transition=fade:duration=${X}:offset=${off.toFixed(2)}[x${i}]`); last = `x${i}`; }
      args.push("-filter_complex", f.join(";"), "-map", `[${last}]`, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(OUT, `gun-${nn(d.n)}.mp4`));
      execFileSync("ffmpeg", args, {stdio: "ignore"});
      fs.rmSync(tmp, {recursive: true});
      console.log(`gün ${d.n}: Reels (${sc.reduce((a, s) => a + s.sure, 0).toFixed(1)} sn)`);
    }
  }
  await b.close(); server.close();
})();
