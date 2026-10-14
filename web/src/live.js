// Live data layer: pulled fresh from the visitor's browser on every load.
// Reddit buzz via Arctic Shift, awards via Wikipedia -> Wikidata.
// Static catalogue values stay only as instant display + offline fallback.
const WP = 'https://en.wikipedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const AS = 'https://arctic-shift.photon-reddit.com/api/posts/search';

async function jget(url, timeoutMs = 25000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const enc = s => encodeURIComponent(s);

// Subreddits that actually talk about each title (from community mapping)
const SUBS = {
  tt1856101: 'movies,TrueFilm,criterion', tt6751668: 'movies,TrueFilm,criterion',
  tt6208148: 'television,TrueFilm', tt1190634: 'television', tt5051245: 'bollywood,horror',
  tt8108198: 'bollywood,movies', tt2084970: 'movies', tt3581920: 'television',
  tt0111161: 'movies', tt0468569: 'movies', tt7286456: 'movies', tt0137523: 'movies',
  tt1375666: 'movies', tt0816692: 'movies', tt10986410: 'television', tt0903747: 'television',
  tt1475582: 'television', tt3565400: 'bollywood,television', tt15379454: 'bollywood',
  tt1343092: 'television', tt0054215: 'criterion,TrueFilm', tt0057742: 'criterion,TrueFilm',
  tt1832382: 'TrueFilm,criterion', tt0118694: 'criterion,TrueFilm', tt0079944: 'criterion,TrueFilm',
  tt0060827: 'criterion,TrueFilm', tt0040522: 'criterion,TrueFilm', tt0046438: 'criterion,TrueFilm',
  tt0100232: 'criterion,TrueFilm', tt0364569: 'movies,TrueFilm', tt0467406: 'movies,TrueFilm',
  tt1305806: 'bollywood', tt2903846: 'bollywood', tt11968972: 'bollywood,TrueFilm',
  tt2186745: 'movies,TrueFilm', tt7282468: 'TrueFilm,criterion', tt1241325: 'TrueFilm,criterion',
  tt8579674: 'movies', tt1255953: 'TrueFilm', tt26446407: 'TrueFilm,criterion',
  tt0038650: 'movies,TrueFilm',
  tt0045152: 'movies,TrueFilm',
  tt0108052: 'movies,TrueFilm',
  tt0457430: 'movies,TrueFilm',
  tt0110912: 'movies,TrueFilm',
  tt0109830: 'bollywood,movies',
  tt0068646: 'movies,TrueFilm',
  tt0071562: 'movies,TrueFilm',
  tt0120815: 'movies,TrueFilm',
  tt0120737: 'bollywood,movies',
  tt0167260: 'bollywood,movies',
  tt0133093: 'bollywood,movies',
  tt0482571: 'movies,TrueFilm',
  tt0407887: 'movies,TrueFilm',
  tt0993846: 'movies,TrueFilm',
  tt1675434: 'movies,TrueFilm',
  tt0114814: 'movies,TrueFilm',
  tt0114369: 'movies,TrueFilm',
  tt0120586: 'movies,TrueFilm',
  tt0118799: 'movies,TrueFilm',
  tt0253474: 'movies,TrueFilm',
  tt0361748: 'movies,TrueFilm',
  tt1853728: 'movies,TrueFilm',
  tt0105236: 'movies,TrueFilm',
  tt0110413: 'movies,TrueFilm',
  tt0120689: 'movies,TrueFilm',
  tt0245429: 'movies,TrueFilm',
  tt0405508: 'bollywood,movies',
  tt0317248: 'movies,TrueFilm',
  tt0405094: 'movies,TrueFilm',
  tt0476735: 'movies,TrueFilm',
  tt0434409: 'movies,TrueFilm',
  tt0372784: 'bollywood,movies',
  tt1345836: 'bollywood,movies',
  tt0848228: 'bollywood,movies',
  tt4154796: 'bollywood,movies',
  tt2015381: 'bollywood,movies',
  tt7131622: 'movies,TrueFilm',
  tt2582802: 'movies,TrueFilm',
  tt1392190: 'movies,TrueFilm',
  tt1950186: 'movies,TrueFilm',
  tt1187043: 'bollywood,movies',
  tt5074352: 'bollywood,movies',
  tt1954470: 'bollywood,movies',
  tt0986264: 'bollywood,movies',
  tt2338152: 'bollywood,movies',
  tt0213338: 'bollywood,movies',
  tt0871510: 'bollywood,movies',
  tt0451822: 'bollywood,movies',
  tt4430212: 'bollywood,movies',
  tt2356180: 'bollywood,movies',
  tt1639426: 'bollywood,movies',
  tt2631186: 'bollywood,movies',
  tt10189514: 'bollywood,movies',
  tt8178634: 'bollywood,movies',
  tt0060196: 'movies,TrueFilm',
  tt0056058: 'criterion,TrueFilm',
  tt0047396: 'criterion,TrueFilm',
  tt0095327: 'movies,TrueFilm',
  tt0075314: 'movies,TrueFilm',
  tt0081505: 'movies,TrueFilm',
  tt0099685: 'movies,TrueFilm',
  tt0112573: 'movies,TrueFilm',
  tt0102926: 'movies,TrueFilm',
  tt0105695: 'movies,TrueFilm',
  tt0088763: 'movies,TrueFilm',
  tt0080684: 'movies,TrueFilm',
  tt0076759: 'movies,TrueFilm',
  tt0097576: 'movies,TrueFilm',
  tt0034583: 'criterion,TrueFilm',
  tt0062622: 'criterion,TrueFilm',
  tt0057012: 'criterion,TrueFilm',
  tt0056172: 'criterion,TrueFilm',
  tt0027977: 'criterion,TrueFilm',
  tt0021749: 'criterion,TrueFilm',
  tt0944947: 'bollywood,television',
  tt0185906: 'television',
  tt0306414: 'television',
  tt0141842: 'television',
  tt4574334: 'bollywood,television',
  tt6468322: 'bollywood,television',
  tt0386676: 'television',
  tt0108778: 'television',
  tt2356777: 'television',
  tt2442560: 'television',
  tt4786824: 'television',
  tt5753856: 'bollywood,television',
  tt0098904: 'television',
  tt9055008: 'bollywood,television',
  tt6105098: 'bollywood,television',
  tt10059064: 'bollywood,television',
  tt6473300: 'bollywood,television',
  tt6077448: 'bollywood,television',
  tt12311694: 'bollywood,television',
  tt13899598: 'bollywood,television',
  tt7772588: 'bollywood,television',
  tt10919420: 'bollywood,television',
  tt5875444: 'television',
  tt14688474: 'television',
  tt15677150: 'television',
};

const TIER = ['academy award', 'oscar', "palme d'or", 'golden lion', 'golden bear', 'grand prix',
  'bafta', 'césar', 'cesar', 'golden globe', 'national film award', 'filmfare', 'cannes',
  'venice', 'berlin international', 'sundance', 'critics choice', "critics' choice",
  'screen actors', 'directors guild', 'locarno', 'karlovy'];
const tierOf = s => { s = (s || '').toLowerCase(); for (let i = 0; i < TIER.length; i++) if (s.includes(TIER[i])) return i; return 99; };

function curate(claims, labels) {
  const seen = new Set(), rows = [];
  const push = (qid, won) => {
    const name = labels[qid];
    if (!name || seen.has(name)) return;
    seen.add(name); rows.push({ name, won });
  };
  for (const v of claims.P166 || []) { try { push(v.mainsnak.datavalue.value.id, true); } catch {} }
  for (const v of claims.P1411 || []) { try { push(v.mainsnak.datavalue.value.id, false); } catch {} }
  rows.sort((a, b) => (tierOf(a.name) - tierOf(b.name)) || ((b.won - a.won)) || (a.name < b.name ? -1 : 1));
  const out = [];
  for (const r of rows) {
    if (tierOf(r.name) > 12) continue;
    out.push(r.won ? r.name : r.name + ' (nom.)');
    if (out.length === 3) break;
  }
  return out;
}

export async function pullAwardsLive(entries) {
  // entries: [{id, wiki}] — chunked so URLs stay small at 140 titles
  const arts = entries.map(e => e.wiki).filter(Boolean);
  const artToQ = {};
  for (let i = 0; i < arts.length; i += 40) {
    const pp = await jget(`${WP}?action=query&titles=${enc(arts.slice(i, i + 40).join('|'))}&prop=pageprops&format=json&origin=*`);
    for (const p of Object.values(pp.query.pages)) {
      const q = p.pageprops && p.pageprops.wikibase_item;
      if (q) artToQ[p.title] = q;
    }
  }
  const qids = [...new Set(Object.values(artToQ))];
  const byQ = {};
  for (let i = 0; i < qids.length; i += 50) {
    const cl = await jget(`${WD}?action=wbgetentities&ids=${qids.slice(i, i + 50).join('|')}&props=claims&format=json&origin=*`);
    for (const [q, e] of Object.entries(cl.entities || {})) byQ[q] = (e.claims || {});
  }
  const need = new Set();
  for (const c of Object.values(byQ))
    for (const prop of ['P166', 'P1411'])
      for (const v of c[prop] || []) { try { need.add(v.mainsnak.datavalue.value.id); } catch {} }
  const labels = {};
  const arr = [...need];
  for (let i = 0; i < arr.length; i += 50) {
    const lb = await jget(`${WD}?action=wbgetentities&ids=${arr.slice(i, i + 50).join('|')}&props=labels&languages=en&format=json&origin=*`);
    for (const [q, e] of Object.entries(lb.entities || {})) {
      try { labels[q] = e.labels.en.value; } catch {}
    }
  }
  const byId = {};
  for (const e of entries) {
    const q = artToQ[e.wiki];
    if (q && byQ[q]) byId[e.id] = curate(byQ[q], labels);
  }
  return { byId, at: Date.now() };
}

function norm(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ''); }

function verifiedCount(title, year, posts) {
  const nt = norm(title);
  const words = nt.split(' ').filter(w => w.length > 2 && !['the', 'and', 'for'].includes(w));
  let n = 0;
  const sample = [];
  for (const p of posts) {
    const txt = norm(String(p.title || '') + ' ' + String(p.selftext || '').slice(0, 500));
    const tag = nt.length >= 9 || words.length >= 2;
    let hit = nt && txt.includes(nt) && (String(year) && txt.includes(String(year)) || tag);
    if (!hit && words.length >= 2) {
      const have = words.filter(w => txt.includes(w)).length;
      if (have >= Math.max(2, words.length * 0.6) && txt.includes(String(year))) hit = true;
    }
    if (hit) { n++; if (sample.length < 3) sample.push({ s: p.subreddit, t: (p.title || '').slice(0, 90), c: p.score || 0 }); }
  }
  return { n, sample };
}

async function pullBuzzOne(t) {
  const subs = SUBS[t.id] || 'movies';
  const url = `${AS}?query=${enc(t.title)}&subreddit=${subs}&after=2026-06-01&limit=20&sort=desc`;
  const d = await jget(url, 20000);
  const posts = (d && d.data) || [];
  return verifiedCount(t.title, t.year, posts);
}

export async function pullBuzzLive(entries, onOne) {
  // Progressive: concurrency 4, calls onOne(id, {n, sample, at}) as each lands
  const queue = entries.filter(e => SUBS[e.id]);
  const POOL = 4;
  for (let k = 0; k < queue.length; k += POOL) {
    await Promise.all(queue.slice(k, k + POOL).map(async t => {
      try {
        const r = await pullBuzzOne(t);
        onOne && onOne(t.id, { ...r, at: Date.now() });
      } catch { /* flaky archive: keep static fallback */ }
    }));
  }
}

// Live "hot right now" shelf: recent top posts across film subs, mapped to catalogue.
export async function pullRedditHot(catalogue) {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const byId = new Map();
  const normT = t => norm(t.title);
  for (const sub of ['movies', 'television', 'TrueFilm', 'criterion', 'bollywood']) {
    let posts = [];
    try {
      const d = await jget(`${AS}?subreddit=${sub}&after=${since}&limit=40&sort=desc`, 25000);
      posts = (d && d.data) || [];
    } catch { continue; }
    for (const p of posts) {
      const txt = norm(String(p.title || '') + ' ' + String(p.selftext || '').slice(0, 300));
      for (const t of catalogue) {
        if (byId.has(t.id)) continue;
        const nt = normT(t);
        if (nt.length < 4) continue;
        const words = nt.split(' ').filter(w => w.length > 2 && !['the', 'and', 'for'].includes(w));
        let hit = nt.length >= 5 && txt.includes(nt);
        if (!hit && words.length >= 2) {
          const have = words.filter(w => txt.includes(w)).length;
          if (have >= Math.max(2, Math.ceil(words.length * 0.7))) hit = true;
        }
        if (hit) {
          byId.set(t.id, { id: t.id, sub, score: p.score || 0, comments: p.num_comments || 0, post: (p.title || '').slice(0, 110), url: p.permalink ? 'https://www.reddit.com' + p.permalink : null });
        }
      }
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  return [...byId.values()].sort((a, b) => (b.score + b.comments) - (a.score + a.comments)).slice(0, 10);
}

const LKEY = 'cinescout.live.v1';
export function loadLive() {
  try { return JSON.parse(localStorage.getItem(LKEY) || 'null'); } catch { return null; }
}
export function saveLive(live) {
  try { localStorage.setItem(LKEY, JSON.stringify(live)); } catch {}
}
