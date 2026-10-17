// Shared helpers for the serverless functions. Nothing is stored on the
// visitor's device: data is fetched live and only cached at Vercel's edge.

export function send(res, status, body, maxAge = 3600) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (status === 200) res.setHeader('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}`);
  else res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

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
