// Live data layer. Everything goes through our own /api functions (keys stay
// on the server); nothing is cached on the visitor's device except in memory
// for the current visit.

const mem = new Map();
// at most 6 requests in flight — bursts get connections dropped upstream
let active = 0; const waiting = [];
const slot = () => (active < 6 ? (active++, Promise.resolve()) : new Promise(r => waiting.push(r)));
const release = () => { const next = waiting.shift(); if (next) next(); else active--; };

async function get(url) {
  if (mem.has(url)) return mem.get(url);
  const p = slot().then(() => fetch(url)).finally(release).then(async r => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(body.error || `HTTP ${r.status}`), { status: r.status, body });
    return body;
  });
  mem.set(url, p);
  p.catch(() => mem.delete(url));
  return p;
}

export const tmdb = (path, params = {}) => get('/api/tmdb?' + new URLSearchParams({ path, ...params }));
export const IMG = (p, size = 'w500') => (p ? `https://image.tmdb.org/t/p/${size}${p}` : null);

// Services we know how to name; ids are looked up live per region.
export const PLATFORMS = [
  { id: 'netflix', name: 'Netflix', re: /^netflix( basic with ads| standard with ads)?$/i },
  { id: 'prime', name: 'Prime Video', re: /amazon prime video|^prime video/i },
  { id: 'hotstar', name: 'JioHotstar', re: /hotstar/i },
  { id: 'appletv', name: 'Apple TV+', re: /^apple tv( ?\+| plus)?$/i },
  { id: 'sonyliv', name: 'Sony LIV', re: /sony ?liv/i },
  { id: 'zee5', name: 'ZEE5', re: /zee5/i },
  { id: 'hoichoi', name: 'hoichoi', re: /hoichoi/i },
  { id: 'chorki', name: 'Chorki', re: /chorki/i },
  { id: 'mubi', name: 'MUBI', re: /^mubi/i },
];

// { netflix: [8, 1796], prime: [119], … } for this region, merged across films and series.
export async function providerMap(region) {
  const [m, t] = await Promise.all(['movie', 'tv'].map(k => tmdb(`/watch/providers/${k}`, { watch_region: region }).catch(() => ({ results: [] }))));
  const out = {};
  for (const p of [...(m.results || []), ...(t.results || [])]) {
    const known = PLATFORMS.find(x => x.re.test(p.provider_name));
    if (!known) continue;
    out[known.id] = [...new Set([...(out[known.id] || []), p.provider_id])];
  }
  return out;
}

export async function regionSupported(region) {
  const d = await tmdb('/watch/providers/regions').catch(() => null);
  return !d || (d.results || []).some(r => r.iso_3166_1 === region);
}

export const discover = (kind, params) => tmdb(`/discover/${kind}`, params);
export const details = (kind, id) => tmdb(`/${kind}/${id}`, { append_to_response: 'external_ids,watch/providers' });
export const trending = () => tmdb('/trending/all/week');

export async function acclaim(imdbIds) {
  const ids = [...new Set(imdbIds.filter(Boolean))];
  const out = {};
  for (let i = 0; i < ids.length; i += 40) Object.assign(out, await get('/api/acclaim?imdb=' + ids.slice(i, i + 40).join(',')).catch(() => ({})));
  return out;
}

export const redditFor = (title, year) => get(`/api/reddit?${new URLSearchParams({ q: title, year: year || '' })}`);
export const redditHot = () => get('/api/reddit?hot=1');
export const criticsFor = (title, year) => get(`/api/critics?${new URLSearchParams({ q: title, year: year || '' })}`);
export const criticsLatest = () => get('/api/critics');

// IMDb ratings (from IMDb's public daily dataset) for up to 200 ids per call.
export async function imdbRatings(ids) {
  const list = [...new Set(ids.filter(Boolean))].sort();
  const out = {};
  for (let i = 0; i < list.length; i += 200) Object.assign(out, await get('/api/imdb?ids=' + list.slice(i, i + 200).join(',')).catch(() => ({})));
  return out;
}

// Wikidata acclaim looked up by TMDB keys ("movie:603"); each result carries its IMDb id.
export async function acclaimByTmdb(keys) {
  const out = {};
  const list = [...new Set(keys)];
  const batches = [];
  for (let i = 0; i < list.length; i += 40) batches.push(list.slice(i, i + 40));
  const res = await Promise.all(batches.map(b => get('/api/acclaim?tmdb=' + b.join(',')).catch(() => ({}))));
  res.forEach(r => Object.assign(out, r));
  return out;
}
