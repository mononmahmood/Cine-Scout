// Poster auto-fill: runs in the visitor's browser (home IPs reach artwork
// services that block datacenters). iTunes Search needs no key. Results are
// cached in localStorage, misses retried after 7 days.
const KEY = 'cinescout.posters.v1';
const HIT_TTL = 90 * 864e5, MISS_TTL = 7 * 864e5;

export function loadPosterCache() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}
function save(cache) {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* private mode */ }
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

function scoreCandidate(t, c) {
  const name = norm(c.trackName || c.collectionName || '');
  const nt = norm(t.title);
  if (!name || !nt) return -1;
  let s = 0;
  if (name === nt) s += 4;
  else if (name.includes(nt) || nt.includes(name)) s += 2;
  else return -1;
  const y = parseInt((c.releaseDate || '').slice(0, 4), 10);
  if (y && Math.abs(y - t.year) <= 2) s += 2;
  else if (y && Math.abs(y - t.year) > 5) s -= 3;
  return s;
}

async function query(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    return (await r.json()).results || [];
  } catch { return []; }
}

async function resolveOne(t) {
  const e = encodeURIComponent(t.title);
  const qs = t.kind === 'tv'
    ? [`https://itunes.apple.com/search?term=${e}&entity=tvSeason&limit=8&country=IN`,
       `https://itunes.apple.com/search?term=${e}&entity=tvSeason&limit=8&country=US`]
    : [`https://itunes.apple.com/search?term=${e}&media=movie&entity=movie&limit=8&country=IN`,
       `https://itunes.apple.com/search?term=${e}&media=movie&entity=movie&limit=8&country=US`];
  let best = null, bestS = 0;
  for (const u of qs) {
    for (const c of await query(u)) {
      if (!c.artworkUrl100) continue;
      const s = scoreCandidate(t, c);
      if (s > bestS) { bestS = s; best = c; }
    }
    if (bestS >= 4) break;
  }
  if (!best || bestS < 2) return null;
  return best.artworkUrl100.replace('100x100bb', '600x600bb');
}

export async function boostPosters(titles, onUpdate) {
  // Disabled: the artwork service blocks cross-origin browser calls, so this
  // can never succeed in production. Posters ship verified in the catalogue.
  return;
}

export function cachedUrl(cache, id) {
  const hit = cache && cache[id];
  return hit && hit.u ? hit.u : null;
}
