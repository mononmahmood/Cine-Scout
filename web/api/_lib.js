// Shared helpers for the serverless functions. Nothing is stored on the
// visitor's device: data is fetched live and only cached at Vercel's edge.

export function send(res, status, body, maxAge = 3600) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (status === 200) res.setHeader('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}`);
  else res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

// ---- safety net -----------------------------------------------------------------

// Per-IP rate limiting. Serverless instances come and go, so this is a blunt
// per-instance guard — its job is to stop abusive loops and bursts from
// reaching the upstream APIs, not to be a global quota.
const buckets = new Map();
export function rateLimit(req, res, { name = 'api', windowMs = 60000, max = 120 } = {}) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim() || 'unknown';
  const now = Date.now(), key = name + ':' + ip;
  let b = buckets.get(key);
  if (!b || now - b.start > windowMs) { b = { start: now, n: 0 }; buckets.set(key, b); }
  b.n++;
  if (buckets.size > 10000) for (const [k, v] of buckets) if (now - v.start > windowMs) buckets.delete(k);
  if (b.n > max) { send(res, 429, { error: 'Too many requests — take a breath and try again in a minute.' }); return false; }
  return true;
}

// Free-text query input: cap the length, strip control characters. Anything
// odd is dropped before it can be echoed or forwarded upstream.
export const cleanQuery = (s, max = 80) =>
  String(s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

// Year parameter: pass only a plain four-digit year.
export const cleanYear = y => (/^\d{4}$/.test(String(y || '')) ? String(y) : '');

// Retries network drops and rate limits (TMDB answers 429 under bursts).
export async function fetchJson(url, init = {}, timeoutMs = 12000, tries = 3) {
  for (let i = 1; ; i++) {
    try { return await fetchOnce(url, init, timeoutMs); }
    catch (e) {
      const retry = !e.status || e.status === 429 || e.status >= 500;
      if (!retry || i >= tries) throw e;
      await new Promise(r => setTimeout(r, 300 * i * i));
    }
  }
}

async function fetchOnce(url, init, timeoutMs) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: c.signal });
    if (!r.ok) throw Object.assign(new Error(`${r.status} from ${new URL(url).host}`), { status: r.status });
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function fetchText(url, timeoutMs = 10000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'CineScout/1.0 (+https://cine-scout-alpha.vercel.app)' } });
    if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`);
    return await r.text();
  } finally { clearTimeout(t); }
}

export const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// True when a piece of text plausibly talks about this exact title.
export function mentions(text, title, year) {
  const nt = norm(title), tx = ' ' + norm(text) + ' ';
  if (!nt) return false;
  if (!tx.includes(' ' + nt + ' ')) return false;
  // short or common-word titles ("Her", "Up", "Joker") need the year nearby too
  if (nt.length < 7 || nt.split(' ').length === 1) return year ? tx.includes(String(year)) || /\b(film|movie|series|review)\b/.test(tx) : true;
  return true;
}
