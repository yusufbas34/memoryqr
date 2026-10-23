// MemoryQR dosya sunucusu (Cloudflare Worker + R2). Kurulum: ../README.md.
// Yükleme ve silme izinlerini Supabase üretir (kurulum.sql > memory_sign); Worker yalnızca imzayı doğrular.
// İmza: hex(HMAC-SHA256(UPLOAD_SECRET, mesaj))
//   PUT  /u/<anahtar>?max=&exp=&sig=   mesaj: PUT|<anahtar>|<max>|<exp>   (gövde en çok <max> bayt)
//   POST /del   [{key, exp, sig}]       mesaj: DEL|<anahtar>|<exp>
//   POST /delp  {prefix, exp, sig}      mesaj: DELP|<önek>|<exp>          (etkinliğin tüm dosyaları)
//   GET  /f/<anahtar>[?dl=dosya-adı]    dosyayı verir (video için Range destekli); dl varsa indirme olarak
//   GET  /durum                         kurulum kontrolü (R2 bağlantısı ve UPLOAD_SECRET var mı; gizli değer gösterilmez)
// Ortam: BUCKET (R2 bağlantısı), UPLOAD_SECRET (gizli), ALLOWED_ORIGINS (virgüllü; boşsa her yer)

// e/: misafir yüklemeleri (R2 kuralıyla 31 günde silinir), t/: etkinlik sahibinin yüklediği kart tasarımı (kurala girmez)
const KEY_RE = /^[et]\/[A-Z0-9]{4,12}\/[0-9a-f-]{36}(_t)?\.[a-z0-9]{2,5}$/;
const PREFIX_RE = /^[et]\/[A-Z0-9]{4,12}\/$/;
const enc = new TextEncoder();

function cors(req, env) {
  const origin = req.headers.get("Origin") || "";
  const list = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim().replace(/\/+$/, "")).filter(Boolean);
  const allow = !list.length ? "*" : list.includes(origin) ? origin : list[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, ETag",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verify(env, msg, exp, sig) {
  if (!env.UPLOAD_SECRET || !sig || !(Number(exp) > Date.now() / 1000)) return false;
  const want = await hmacHex(env.UPLOAD_SECRET, msg);
  if (want.length !== String(sig).length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ String(sig).charCodeAt(i);
  return diff === 0;
}

const CONTENT_TYPES = {jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif",
  gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", "3gp": "video/3gpp"};

export default {
  async fetch(req, env) {
    // beklenmeyen hata da CORS başlıklı JSON dönsün: tarayıcı "ulaşılamadı" yerine nedeni görsün
    try { return await handle(req, env); } catch (e) {
      return new Response(JSON.stringify({error: "worker_error", detail: String(e?.message || e)}),
        {status: 500, headers: {...cors(req, env), "Content-Type": "application/json"}});
    }
  },
};

async function handle(req, env) {
  {
    const h = cors(req, env);
    const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {...h, "Content-Type": "application/json"}});
    if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: h});

    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);

    if (req.method === "PUT" && path.startsWith("/u/")) {
      const key = path.slice(3);
      const max = Number(url.searchParams.get("max"));
      const exp = url.searchParams.get("exp");
      if (!KEY_RE.test(key) || !(max > 0)) return json({error: "bad_key"}, 400);
      if (!await verify(env, `PUT|${key}|${max}|${exp}`, exp, url.searchParams.get("sig"))) return json({error: "bad_sig"}, 403);
      const len = Number(req.headers.get("Content-Length"));
      if (!(len > 0) || len > max) return json({error: "too_big"}, 413);
      const ext = key.split(".").pop();
      await env.BUCKET.put(key, req.body, {httpMetadata: {contentType: CONTENT_TYPES[ext] || "application/octet-stream"}});
      return json({ok: true});
    }

    if (req.method === "POST" && path === "/del") {
      const items = await req.json().catch(() => null);
      if (!Array.isArray(items) || items.length > 1000) return json({error: "bad_body"}, 400);
      const keys = [];
      for (const it of items) {
        if (KEY_RE.test(it?.key) && await verify(env, `DEL|${it.key}|${it.exp}`, it.exp, it.sig)) keys.push(it.key);
      }
      if (keys.length) await env.BUCKET.delete(keys);
      return json({ok: true, deleted: keys.length});
    }

    if (req.method === "POST" && path === "/delp") {
      const b = await req.json().catch(() => null);
      if (!PREFIX_RE.test(b?.prefix || "")) return json({error: "bad_prefix"}, 400);
      if (!await verify(env, `DELP|${b.prefix}|${b.exp}`, b.exp, b.sig)) return json({error: "bad_sig"}, 403);
      let cursor, n = 0;
      do {
        const list = await env.BUCKET.list({prefix: b.prefix, cursor, limit: 1000});
        if (list.objects.length) { await env.BUCKET.delete(list.objects.map(o => o.key)); n += list.objects.length; }
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor);
      return json({ok: true, deleted: n});
    }

    if ((req.method === "GET" || req.method === "HEAD") && path.startsWith("/f/")) {
      const key = path.slice(3);
      if (!KEY_RE.test(key)) return new Response("Bulunamadı", {status: 404, headers: h});
      const obj = await env.BUCKET.get(key, {range: req.headers, onlyIf: req.headers});
      if (!obj) return new Response("Bulunamadı", {status: 404, headers: h});
      const headers = new Headers(h);
      obj.writeHttpMetadata(headers);
      headers.set("ETag", obj.httpEtag);
      headers.set("Accept-Ranges", "bytes");
      // anahtarlar tahmin edilemez ve değişmez; dosya 30 gün sonra silinir
      headers.set("Cache-Control", "public, max-age=604800, immutable");
      const dl = url.searchParams.get("dl");
      if (dl) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(dl.replace(/[\\/"]/g, "_"))}`);
      if (!("body" in obj)) return new Response(null, {status: 304, headers});  // onlyIf karşılandı
      let status = 200;
      if (obj.range && req.headers.has("Range")) {
        const {offset = 0, length = obj.size - offset} = obj.range;
        headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
        headers.set("Content-Length", String(length));
        status = 206;
      } else headers.set("Content-Length", String(obj.size));
      return new Response(req.method === "HEAD" ? null : obj.body, {status, headers});
    }

    if (path === "/durum") {
      let bucket = !!env.BUCKET, write = false;
      if (bucket) { try { await env.BUCKET.head("durum-kontrol"); write = true; } catch (e) {} }
      const origins = (env.ALLOWED_ORIGINS || "").trim();
      return json({bucket, bucket_ok: write, secret: !!env.UPLOAD_SECRET, secret_length: (env.UPLOAD_SECRET || "").length,
        allowed_origins: origins || "(boş: her yer)", origin: req.headers.get("Origin") || null});
    }

    if (path === "/") return new Response("MemoryQR dosya sunucusu çalışıyor.", {headers: {...h, "Content-Type": "text/plain; charset=utf-8"}});
    return new Response("Bulunamadı", {status: 404, headers: h});
  }
}
