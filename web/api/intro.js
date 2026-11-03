// Fresh material for the intro reel. Picks a random handful of calm,
// art-house titles and resolves their official YouTube trailers through TMDB,
// so the reel rotates through new clips instead of looping a fixed set. The
// client chooses a clean window inside each trailer (past the opening logos,
// before the end plate), keeping distributor logos, award laurels and title
// cards off the screen. Answers are cached briefly at the edge so every
// visitor within a window shares one TMDB fetch.
import { send, fetchJson, rateLimit } from './_lib.js';

// Calm, painterly, art-house — [title, year]. Resolved to official trailers
// live; a film without a usable trailer simply never comes back.
const CALM = [
  ['Her', 2013], ['Moonlight', 2016], ['Paterson', 2016], ['Past Lives', 2023],
  ['The Tree of Life', 2011], ['Days of Heaven', 1978], ['Nomadland', 2020],
  ['Call Me by Your Name', 2017], ['Columbus', 2017], ['Carol', 2015],
  ['Brooklyn', 2015], ['The Florida Project', 2017], ['Manchester by the Sea', 2016],
  ['Phantom Thread', 2017], ['Little Women', 2019], ['Leave No Trace', 2018],
  ['Portrait of a Lady on Fire', 2019], ['Roma', 2018], ['Paris, Texas', 1984],
  ['In the Mood for Love', 2000], ['Close', 2022], ['The Lunchbox', 2013],
  ['Village Rockstars', 2017], ['Memoria', 2021], ['Pather Panchali', 1955],
  ['Aftersun', 2022], ['All of Us Strangers', 2023], ['Lost in Translation', 2003],
  ['Amélie', 2001], ['Eternal Sunshine of the Spotless Mind', 2004],
  ['Before Sunrise', 1995], ['Before Sunset', 2004], ['Before Midnight', 2013],
  ['Boyhood', 2014], ['The Grand Budapest Hotel', 2014], ['Moonrise Kingdom', 2012],
  ['Captain Fantastic', 2016], ['Hunt for the Wilderpeople', 2016],
  ['Perfect Days', 2023], ['Drive My Car', 2021], ['Burning', 2018],
  ['Shoplifters', 2018], ['Cold War', 2018], ['Ida', 2013], ['Toni Erdmann', 2016],
  ['The Handmaiden', 2016], ['Happy as Lazzaro', 2018], ['C’mon C’mon', 2021],
  ['A Ghost Story', 2017], ['First Cow', 2019], ['Petite Maman', 2021],
  ['Parasite', 2019], ['Masaan', 2015], ['The Disciple', 2020], ['Aligarh', 2016],
  ['Kumbalangi Nights', 2019], ['Charulata', 1964], ['Mahanagar', 1963], ['Aparajito', 1956],
];

const DAY = 864e5;
const memo = new Map(); // "title year" → { key, at } (null remembered too, so dead films aren't re-searched)

const auth = () => {
  const t = process.env.TMDB_TOKEN;
  return t ? { Authorization: `Bearer ${t}`, Accept: 'application/json' } : {};
};
const qs = () => (process.env.TMDB_TOKEN ? '' : `&api_key=${encodeURIComponent(process.env.TMDB_API_KEY || '')}`);

async function trailerFor(title, year) {
  const id = `${title} ${year}`;
  const hit = memo.get(id);
  if (hit && Date.now() - hit.at < DAY) return hit.key;
  let key = null;
  try {
    const s = await fetchJson(`https://api.themoviedb.org/3/search/movie?include_adult=false&language=en-US&query=${encodeURIComponent(title)}&year=${year}${qs()}`, { headers: auth() });
    const m = (s.results || [])[0];
    if (m) {
      const v = await fetchJson(`https://api.themoviedb.org/3/movie/${m.id}/videos?language=en-US${qs()}`, { headers: auth() });
      const vids = (v.results || []).filter(x => x.site === 'YouTube' && /^[A-Za-z0-9_-]{6,20}$/.test(x.key || ''));
      const pick = vids.find(x => x.type === 'Trailer' && x.official !== false)
        || vids.find(x => x.type === 'Trailer')
        || vids.find(x => x.type === 'Teaser');
      key = pick?.key || null;
    }
  } catch {}
  memo.set(id, { key, at: Date.now() });
  if (memo.size > 2000) for (const [k, v] of memo) if (Date.now() - v.at > DAY) memo.delete(k);
  return key;
}

export default async function handler(req, res) {
  if (!rateLimit(req, res, { name: 'intro', max: 60 })) return;
  if (!process.env.TMDB_TOKEN && !process.env.TMDB_API_KEY) return send(res, 503, { error: 'TMDB key not configured' });
  // resolve a wide random draw; usually about a dozen come back with trailers
  const draw = [...CALM].sort(() => Math.random() - 0.5).slice(0, 18);
  const keys = await Promise.all(draw.map(([t, y]) => trailerFor(t, y)));
  const clips = draw.map(([title, year], i) => (keys[i] ? { key: keys[i], title, year } : null)).filter(Boolean).slice(0, 12);
  send(res, 200, { clips }, 600);
}
