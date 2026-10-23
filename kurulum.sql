-- MemoryQR veritabanı kurulumu (tek dosya): etkinlikler (düğün, nişan, kına, mezuniyet), misafir yüklemeleri, yönetim.
-- Supabase > SQL Editor'da çalıştırın. Tekrar çalıştırmak güvenlidir; mevcut verilere dokunmaz.
-- Tüm tablo ve fonksiyonlar "memory_" ile başlar: Tasma QR ve Araç QR ile aynı Supabase projesinde çakışmadan çalışır.
--
-- Dosyalar (fotoğraf, video) burada değil Cloudflare R2'de durur (worker/). Veritabanı yalnızca kayıtları tutar ve
-- Worker'ın kabul edeceği imzalı yükleme / silme izinlerini üretir. İmza anahtarı (upload_secret) ilk kurulumda
-- rastgele üretilir; Worker'a vermek için: select upload_secret from memory_config;
--
-- ADMIN ŞİFRESİ: aşağıdaki v_sifre satırına kendi şifrenizi yazın (en az 10 karakter) ve çalıştırın.
-- Şifreyi değiştirmek için yalnızca o satırı değiştirip dosyayı yeniden çalıştırın. 'BURAYA-SIFRE' kalırsa şifre değişmez.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- ayarlar
create table if not exists public.memory_config (
  id integer primary key default 1 check (id = 1),
  admin_salt text not null,
  admin_hash text not null,
  upload_secret text not null
);
alter table public.memory_config enable row level security;  -- politika yok: doğrudan erişim kapalı
revoke all on public.memory_config from anon, authenticated;

do $$
declare
  v_sifre text := 'BURAYA-SIFRE';  -- <<< admin şifrenizi buraya yazın
  v_salt text := replace(gen_random_uuid()::text, '-', '');
begin
  if v_sifre = 'BURAYA-SIFRE' then
    if not exists (select 1 from public.memory_config) then
      raise exception 'Admin şifresi ayarlanmadı: dosyanın başındaki v_sifre satırına şifrenizi yazıp tekrar çalıştırın.';
    end if;
    return;
  end if;
  if length(v_sifre) < 10 then raise exception 'Admin şifresi en az 10 karakter olmalı.'; end if;
  insert into public.memory_config (id, admin_salt, admin_hash, upload_secret)
    values (1, v_salt, encode(sha256(convert_to(v_salt || v_sifre, 'UTF8')), 'hex'),
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
    on conflict (id) do update set admin_salt = excluded.admin_salt, admin_hash = excluded.admin_hash;  -- imza anahtarı korunur
end $$;

-- Şifre hatalıysa hata verir (HTTP 403); yönetim fonksiyonları bunu çağırır.
create or replace function public.memory_admin_check(p_key text)
returns void
language plpgsql security definer set search_path = public
as $$
declare c memory_config;
begin
  select * into c from memory_config where id = 1;
  if not found or encode(sha256(convert_to(c.admin_salt || coalesce(p_key, ''), 'UTF8')), 'hex') <> c.admin_hash then
    perform pg_sleep(.5);  -- deneme-yanılmayı yavaşlatır
    raise exception 'Yetkisiz' using errcode = '28000';
  end if;
end $$;
revoke all on function public.memory_admin_check(text) from public, anon, authenticated;  -- yalnızca içeriden

-- Worker'ın doğruladığı imza: hex(HMAC-SHA256(upload_secret, mesaj)). Mesaj biçimleri worker/worker.js'tekiyle aynı:
--   PUT|<anahtar>|<en çok bayt>|<son geçerlilik (unix sn)>   DEL|<anahtar>|<son>   DELP|<önek>|<son>
create or replace function public.memory_sign(p_msg text)
returns text
language sql stable security definer set search_path = public, extensions
as $$
  select encode(hmac(convert_to(p_msg, 'UTF8'), convert_to(upload_secret, 'UTF8'), 'sha256'), 'hex') from memory_config where id = 1;
$$;
revoke all on function public.memory_sign(text) from public, anon, authenticated;  -- yalnızca içeriden

-- ---------------------------------------------------------------- etkinlikler
create table if not exists public.memory_events (
  code text primary key,
  pin text not null,
  title text not null,                      -- "Ayşe & Mehmet"
  kind text not null default 'dugun' check (kind in ('dugun', 'nisan', 'kina', 'soz', 'mezuniyet', 'dogum_gunu', 'diger')),
  event_date date not null,
  expires_at timestamptz not null,          -- yükleme ve görüntüleme bu ana kadar; dosyalar R2'de yaşam döngüsü kuralıyla silinir
  guest_gallery boolean not null default false, -- true: misafirler başkalarının yüklediklerini de görür
  owner_name text,
  owner_phone text,
  note text,                                -- yalnızca yönetimde görünür (paket, ödeme, baskı notu)
  max_files integer not null default 5000,
  max_bytes bigint not null default 40000000000,  -- 40 GB
  files_purged boolean not null default false,
  created_at timestamptz not null default now(),
  fail_count integer not null default 0,
  locked_until timestamptz
);
alter table public.memory_events enable row level security;
revoke all on public.memory_events from anon, authenticated;

create table if not exists public.memory_files (
  id uuid primary key default gen_random_uuid(),
  event_code text not null references public.memory_events (code) on delete cascade on update cascade,
  key text not null unique,
  thumb_key text,
  guest text not null,
  kind text not null check (kind in ('photo', 'video')),
  mime text not null,
  bytes bigint not null,
  ready boolean not null default false,     -- Worker'a yükleme bitince true
  hidden boolean not null default false,    -- etkinlik sahibi gizledi: misafirler ve slayt görmez
  created_at timestamptz not null default now()
);
-- sürüm 2: masa kartı tasarımı; misafirler varsayılan olarak yalnızca kendi yüklediklerini görür
alter table public.memory_events add column if not exists card_design text;
alter table public.memory_events add column if not exists card_text text;
alter table public.memory_events alter column guest_gallery set default false;
do $$ begin
  if to_regprocedure('public.memory_version()') is not null and public.memory_version() < 2 then
    update public.memory_events set guest_gallery = false;
  end if;
end $$;

create index if not exists memory_files_event_idx on public.memory_files (event_code, created_at desc);
alter table public.memory_files enable row level security;
revoke all on public.memory_files from anon, authenticated;

create or replace function public.memory_norm(p_code text) returns text language sql immutable
as $$ select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- Sahip PIN'i: doğruysa null, değilse hata kodu. 5 yanlış denemede 15 dakika kilit.
create or replace function public.memory_check_pin(p_code text, p_pin text)
returns text
language plpgsql security definer set search_path = public
as $$
declare e memory_events;
begin
  select * into e from memory_events where code = memory_norm(p_code) for update;
  if not found then return 'not_found'; end if;
  if e.locked_until > now() then return 'locked'; end if;
  if e.pin <> trim(coalesce(p_pin, '')) then
    update memory_events set
      fail_count = case when e.fail_count + 1 >= 5 then 0 else e.fail_count + 1 end,
      locked_until = case when e.fail_count + 1 >= 5 then now() + interval '15 minutes' else null end
      where code = e.code;
    return 'bad_pin';
  end if;
  update memory_events set fail_count = 0, locked_until = null where code = e.code and fail_count <> 0;
  return null;
end $$;
revoke all on function public.memory_check_pin(text, text) from public, anon, authenticated;

create or replace function public.memory_pin_error(p_code text, p_err text)
returns json
language sql stable security definer set search_path = public
as $$
  select case when p_err = 'locked' then json_build_object('ok', false, 'error', 'locked',
      'minutes', (select ceil(extract(epoch from locked_until - now()) / 60) from memory_events where code = memory_norm(p_code)))
    else json_build_object('ok', false, 'error', p_err) end;
$$;
revoke all on function public.memory_pin_error(text, text) from public, anon, authenticated;

create or replace function public.memory_event_json(e memory_events, p_owner boolean)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object('code', e.code, 'title', e.title, 'kind', e.kind, 'event_date', e.event_date,
    'expires_at', e.expires_at, 'active', now() < e.expires_at and not e.files_purged, 'guest_gallery', e.guest_gallery,
    'files', (select count(*) from memory_files f where f.event_code = e.code and f.ready and (p_owner or not f.hidden)),
    'guests', (select count(distinct lower(f.guest)) from memory_files f where f.event_code = e.code and f.ready),
    'card_design', e.card_design, 'card_text', e.card_text,
    'owner_name', case when p_owner then e.owner_name end,
    'bytes', case when p_owner then (select coalesce(sum(bytes), 0) from memory_files f where f.event_code = e.code and f.ready) end);
$$;
revoke all on function public.memory_event_json(memory_events, boolean) from public, anon, authenticated;

-- Misafir sayfası: QR okutulunca etkinliğin adı, tarihi ve durumu.
create or replace function public.memory_event(p_code text)
returns json
language sql stable security definer set search_path = public
as $$ select memory_event_json(e, false) from memory_events e where code = memory_norm(p_code); $$;
grant execute on function public.memory_event(text) to anon, authenticated;

-- ---------------------------------------------------------------- yükleme
-- Misafir dosya başına yükleme izni ister. Dönen imzalarla dosyayı (ve varsa küçük resmini) doğrudan Worker'a PUT eder,
-- bitince memory_upload_done çağırır.
create or replace function public.memory_upload_begin(p_code text, p_guest text, p_kind text, p_mime text,
  p_bytes bigint, p_thumb boolean default false)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  e memory_events;
  v_guest text := left(regexp_replace(trim(coalesce(p_guest, '')), '\s+', ' ', 'g'), 40);
  v_mime text := lower(coalesce(p_mime, ''));
  v_ext text;
  v_max bigint;
  v_id uuid := gen_random_uuid();
  v_key text;
  v_thumb text;
  v_exp bigint := extract(epoch from now())::bigint + 3 * 3600;
  v_count integer;
  v_sum bigint;
begin
  select * into e from memory_events where code = memory_norm(p_code);
  if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  if now() >= e.expires_at or e.files_purged then return json_build_object('ok', false, 'error', 'expired'); end if;
  if v_guest = '' then return json_build_object('ok', false, 'error', 'no_name'); end if;

  if p_kind = 'photo' then
    v_ext := case v_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp'
      when 'image/heic' then 'heic' when 'image/heif' then 'heif' when 'image/gif' then 'gif' end;
    v_max := 40000000;
  elsif p_kind = 'video' then
    v_ext := case v_mime when 'video/mp4' then 'mp4' when 'video/quicktime' then 'mov' when 'video/webm' then 'webm'
      when 'video/3gpp' then '3gp' end;
    v_max := 300000000;
  end if;
  if v_ext is null then return json_build_object('ok', false, 'error', 'bad_type'); end if;
  if coalesce(p_bytes, 0) <= 0 or p_bytes > v_max then return json_build_object('ok', false, 'error', 'too_big', 'max', v_max); end if;

  select count(*), coalesce(sum(bytes), 0) into v_count, v_sum from memory_files where event_code = e.code;
  if v_count >= e.max_files or v_sum + p_bytes > e.max_bytes then return json_build_object('ok', false, 'error', 'full'); end if;
  -- yarım kalmış yüklemeler sınırsız birikmesin
  if (select count(*) from memory_files where event_code = e.code and not ready and created_at > now() - interval '1 hour') >= 300 then
    return json_build_object('ok', false, 'error', 'busy');
  end if;

  v_key := 'e/' || e.code || '/' || v_id || '.' || v_ext;
  if p_thumb then v_thumb := 'e/' || e.code || '/' || v_id || '_t.jpg'; end if;
  insert into memory_files (id, event_code, key, thumb_key, guest, kind, mime, bytes)
    values (v_id, e.code, v_key, v_thumb, v_guest, p_kind, v_mime, p_bytes);

  return json_build_object('ok', true, 'id', v_id, 'exp', v_exp,
    'key', v_key, 'max', p_bytes, 'sig', memory_sign('PUT|' || v_key || '|' || p_bytes || '|' || v_exp),
    'thumb_key', v_thumb, 'thumb_max', 600000,
    'thumb_sig', case when v_thumb is not null then memory_sign('PUT|' || v_thumb || '|600000|' || v_exp) end);
end $$;
grant execute on function public.memory_upload_begin(text, text, text, text, bigint, boolean) to anon, authenticated;

create or replace function public.memory_upload_done(p_code text, p_id uuid, p_thumb boolean default true)
returns json
language plpgsql security definer set search_path = public
as $$
begin
  update memory_files set ready = true, thumb_key = case when p_thumb then thumb_key end
    where id = p_id and event_code = memory_norm(p_code) and not ready;
  return json_build_object('ok', found);
end $$;
grant execute on function public.memory_upload_done(text, uuid, boolean) to anon, authenticated;

-- ---------------------------------------------------------------- galeri
create or replace function public.memory_files_json(p_code text, p_owner boolean, p_before timestamptz, p_limit integer)
returns json
language sql stable security definer set search_path = public
as $$
  select coalesce(json_agg(json_build_object('id', id, 'key', key, 'thumb_key', thumb_key, 'guest', guest, 'kind', kind,
      'bytes', bytes, 'hidden', hidden, 'created_at', created_at) order by created_at desc), '[]'::json)
  from (select * from memory_files
    where event_code = memory_norm(p_code) and ready and (p_owner or not hidden)
      and (p_before is null or created_at < p_before)
    order by created_at desc limit least(greatest(coalesce(p_limit, 200), 1), 1000)) f;
$$;
revoke all on function public.memory_files_json(text, boolean, timestamptz, integer) from public, anon, authenticated;

-- Misafir galerisi: etkinlik sahibi kapatmadıysa herkes görür (gizlenenler hariç).
create or replace function public.memory_files(p_code text, p_before timestamptz default null, p_limit integer default 200)
returns json
language sql stable security definer set search_path = public
as $$
  select case when e.guest_gallery and now() < e.expires_at and not e.files_purged
    then memory_files_json(e.code, false, p_before, p_limit) else '[]'::json end
  from memory_events e where code = memory_norm(p_code);
$$;
grant execute on function public.memory_files(text, timestamptz, integer) to anon, authenticated;

-- Misafirin kendi yükledikleri (kimlikler misafirin telefonunda saklanır; tahmin edilemez uuid'ler).
create or replace function public.memory_files_mine(p_code text, p_ids uuid[])
returns json
language sql stable security definer set search_path = public
as $$
  select coalesce(json_agg(json_build_object('id', f.id, 'key', f.key, 'thumb_key', f.thumb_key, 'guest', f.guest, 'kind', f.kind,
      'bytes', f.bytes, 'hidden', false, 'created_at', f.created_at) order by f.created_at desc), '[]'::json)
  from memory_files f join memory_events e on e.code = f.event_code
  where f.event_code = memory_norm(p_code) and f.ready and f.id = any(p_ids[1:1000])
    and now() < e.expires_at and not e.files_purged;
$$;
grant execute on function public.memory_files_mine(text, uuid[]) to anon, authenticated;

-- ---------------------------------------------------------------- etkinlik sahibi (PIN ile)
create or replace function public.memory_owner(p_code text, p_pin text)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_err text := memory_check_pin(p_code, p_pin); e memory_events;
begin
  if v_err is not null then return memory_pin_error(p_code, v_err); end if;
  select * into e from memory_events where code = memory_norm(p_code);
  return json_build_object('ok', true, 'event', memory_event_json(e, true));
end $$;
grant execute on function public.memory_owner(text, text) to anon, authenticated;

create or replace function public.memory_owner_files(p_code text, p_pin text, p_before timestamptz default null, p_limit integer default 500)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_err text := memory_check_pin(p_code, p_pin);
begin
  if v_err is not null then return memory_pin_error(p_code, v_err); end if;
  return json_build_object('ok', true, 'files', memory_files_json(p_code, true, p_before, p_limit));
end $$;
grant execute on function public.memory_owner_files(text, text, timestamptz, integer) to anon, authenticated;

create or replace function public.memory_owner_hide(p_code text, p_pin text, p_ids uuid[], p_hidden boolean)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_err text := memory_check_pin(p_code, p_pin);
begin
  if v_err is not null then return memory_pin_error(p_code, v_err); end if;
  update memory_files set hidden = coalesce(p_hidden, true) where event_code = memory_norm(p_code) and id = any(p_ids);
  return json_build_object('ok', true);
end $$;
grant execute on function public.memory_owner_hide(text, text, uuid[], boolean) to anon, authenticated;

-- Kayıtları siler, R2'deki dosyalar için Worker'a gönderilecek silme imzalarını döndürür.
create or replace function public.memory_owner_delete(p_code text, p_pin text, p_ids uuid[])
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_err text := memory_check_pin(p_code, p_pin);
  v_exp bigint := extract(epoch from now())::bigint + 3600;
  v_out json;
begin
  if v_err is not null then return memory_pin_error(p_code, v_err); end if;
  with d as (delete from memory_files where event_code = memory_norm(p_code) and id = any(p_ids) returning key, thumb_key),
    k as (select key from d union all select thumb_key from d where thumb_key is not null)
  select coalesce(json_agg(json_build_object('key', key, 'exp', v_exp, 'sig', memory_sign('DEL|' || key || '|' || v_exp))), '[]'::json)
    into v_out from k;
  return json_build_object('ok', true, 'delete', v_out);
end $$;
grant execute on function public.memory_owner_delete(text, text, uuid[]) to anon, authenticated;

create or replace function public.memory_owner_settings(p_code text, p_pin text, p_guest_gallery boolean)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_err text := memory_check_pin(p_code, p_pin);
begin
  if v_err is not null then return memory_pin_error(p_code, v_err); end if;
  update memory_events set guest_gallery = coalesce(p_guest_gallery, guest_gallery) where code = memory_norm(p_code);
  return json_build_object('ok', true);
end $$;
grant execute on function public.memory_owner_settings(text, text, boolean) to anon, authenticated;

create or replace function public.memory_owner_card(p_code text, p_pin text, p_design text, p_text text)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_err text := memory_check_pin(p_code, p_pin);
begin
  if v_err is not null then return memory_pin_error(p_code, v_err); end if;
  update memory_events set card_design = left(p_design, 20), card_text = nullif(left(trim(coalesce(p_text, '')), 120), '')
    where code = memory_norm(p_code);
  return json_build_object('ok', true);
end $$;
grant execute on function public.memory_owner_card(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------- yönetim
create or replace function public.memory_admin_events(p_key text)
returns json
language plpgsql security definer set search_path = public
as $$
begin
  perform memory_admin_check(p_key);
  return (select coalesce(json_agg(json_build_object('code', e.code, 'pin', e.pin, 'title', e.title, 'kind', e.kind,
      'event_date', e.event_date, 'expires_at', e.expires_at, 'guest_gallery', e.guest_gallery,
      'owner_name', e.owner_name, 'owner_phone', e.owner_phone, 'note', e.note, 'files_purged', e.files_purged,
      'card_design', e.card_design, 'card_text', e.card_text,
      'created_at', e.created_at, 'files', s.n, 'bytes', s.b, 'guests', s.g, 'last_upload', s.last)
      order by e.event_date desc, e.created_at desc), '[]'::json)
    from memory_events e
    left join lateral (select count(*) filter (where ready) n, coalesce(sum(bytes) filter (where ready), 0) b,
        count(distinct lower(guest)) filter (where ready) g, max(created_at) last
      from memory_files f where f.event_code = e.code) s on true);
end $$;
grant execute on function public.memory_admin_events(text) to anon, authenticated;

-- Yeni etkinlik (p_code boşsa) ya da mevcut etkinliği günceller. Süre: etkinlik gününden sonra p_days gün (varsayılan 30).
create or replace function public.memory_admin_save(p_key text, p_code text, p_title text, p_kind text, p_event_date date,
  p_days integer default 30, p_owner_name text default null, p_owner_phone text default null, p_note text default null)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := nullif(memory_norm(p_code), '');
  v_title text := left(trim(coalesce(p_title, '')), 60);
  v_exp timestamptz := ((p_event_date + greatest(coalesce(p_days, 30), 1) + 1)::timestamp at time zone 'Europe/Istanbul');
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i integer;
begin
  perform memory_admin_check(p_key);
  if v_title = '' or p_event_date is null then return json_build_object('ok', false, 'error', 'missing'); end if;
  if v_code is null then
    loop
      v_code := '';
      for i in 1..6 loop v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1); end loop;
      exit when not exists (select 1 from memory_events where code = v_code);
    end loop;
    insert into memory_events (code, pin, title, kind, event_date, expires_at, owner_name, owner_phone, note)
      values (v_code, lpad(floor(random() * 1000000)::int::text, 6, '0'), v_title, coalesce(p_kind, 'dugun'), p_event_date, v_exp,
        nullif(trim(p_owner_name), ''), nullif(trim(p_owner_phone), ''), nullif(trim(p_note), ''));
  else
    update memory_events set title = v_title, kind = coalesce(p_kind, kind), event_date = p_event_date, expires_at = v_exp,
        owner_name = nullif(trim(p_owner_name), ''), owner_phone = nullif(trim(p_owner_phone), ''), note = nullif(trim(p_note), '')
      where code = v_code;
    if not found then return json_build_object('ok', false, 'error', 'not_found'); end if;
  end if;
  return json_build_object('ok', true, 'code', v_code, 'pin', (select pin from memory_events where code = v_code));
end $$;
grant execute on function public.memory_admin_save(text, text, text, text, date, integer, text, text, text) to anon, authenticated;

create or replace function public.memory_admin_card(p_key text, p_code text, p_design text, p_text text)
returns json
language plpgsql security definer set search_path = public
as $$
begin
  perform memory_admin_check(p_key);
  update memory_events set card_design = left(p_design, 20), card_text = nullif(left(trim(coalesce(p_text, '')), 120), '')
    where code = memory_norm(p_code);
  return json_build_object('ok', found);
end $$;
grant execute on function public.memory_admin_card(text, text, text, text) to anon, authenticated;

-- Etkinliğin tüm dosyalarını siler (kayıtlar + Worker'a gönderilecek önek silme imzası). p_drop: etkinliği de sil.
create or replace function public.memory_admin_purge(p_key text, p_code text, p_drop boolean default false)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_code text := memory_norm(p_code);
  v_exp bigint := extract(epoch from now())::bigint + 3600;
begin
  perform memory_admin_check(p_key);
  if not exists (select 1 from memory_events where code = v_code) then return json_build_object('ok', false, 'error', 'not_found'); end if;
  delete from memory_files where event_code = v_code;
  if p_drop then delete from memory_events where code = v_code;
  else update memory_events set files_purged = true where code = v_code; end if;
  return json_build_object('ok', true, 'prefix', 'e/' || v_code || '/', 'exp', v_exp,
    'sig', memory_sign('DELP|e/' || v_code || '/|' || v_exp));
end $$;
grant execute on function public.memory_admin_purge(text, text, boolean) to anon, authenticated;

create or replace function public.memory_version() returns integer language sql immutable as 'select 2';
