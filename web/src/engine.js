// Cine Scout thinker, live edition.
// Answers become strict rules: hard filters go to TMDB's discover query, the
// rest are checked on every returned title. Nothing that breaks an answer is
// ever shown as a match. Ranking blends TMDB audience score, Rotten Tomatoes,
// Metacritic and festival/award record (Wikidata); Reddit and critics' feeds
// are shown per title as they arrive.
import { QUESTIONS, byId, G } from './questions.js';
import { discover, details, acclaim, IMG } from './live.js';

const KINDS = st => (st.kind === 'both' ? ['movie', 'tv'] : [st.kind || 'movie']);
const thisYear = new Date().getFullYear();

// ---- answers → state ------------------------------------------------------------

export function stateOf(answers, mood = EMPTY_MOOD) {
  const st = { kind: 'both', groups: [], none: { movie: new Set(), tv: new Set() }, answered: [] };
  for (const { qid, oid } of answers) {
    const q = byId[qid]; const o = q?.options.find(x => x.id === oid);
    if (!o) continue;
    st.answered.push({ qid, label: o.label, topic: q.topic });
    Object.assign(st, o.set || {});
    if (o.any) st.groups.push({ key: qid, label: o.label, ids: o.any });
    for (const k of ['movie', 'tv']) (o.none?.[k] || []).forEach(g => st.none[k].add(g));
  }
  for (const g of mood.groups) st.groups.push(g);
  for (const k of ['movie', 'tv']) mood.none[k].forEach(g => st.none[k].add(g));
  // a rule that has no genres for a format rules that format out
  if (st.kind === 'both') {
    const tvOk = st.groups.every(g => g.ids.tv?.length), movieOk = st.groups.every(g => g.ids.movie?.length);
    if (!tvOk && movieOk) st.kind = 'movie';
    if (!movieOk && tvOk) st.kind = 'tv';
  }
  return st;
}

export function visibleOptions(q, st) {
  return q.options.filter(o => !(o.hideFor || []).includes(st.kind));
}

// ---- typed mood -----------------------------------------------------------------

const LEX = [
  { name: 'funny', re: /\b(laugh\w*|funny|comed\w*|silly|hilarious|lighthearted)\b/, any: { movie: [G.comedy], tv: [G.comedy] } },
  { name: 'scary', re: /\b(horror|scary|ghost\w*|creepy|haunt\w*)\b/, any: { movie: [G.horror], tv: [] } },
  { name: 'romantic', re: /\b(love|romant\w*|romance)\b/, any: { movie: [G.romance], tv: [] } },
  { name: 'emotional', re: /\b(sad|cry|crying|emotion\w*|tear\w*|moving)\b/, any: { movie: [G.drama], tv: [G.drama] } },
  { name: 'suspense', re: /\b(thrill\w*|suspense\w*|tense|tension|edge)\b/, any: { movie: [G.thriller, G.mystery], tv: [G.mystery, G.crime] } },
  { name: 'action', re: /\b(action|fight\w*|chase)\b/, any: { movie: [G.action], tv: [G.actionAdventure] } },
  { name: 'crime', re: /\b(crime|murder\w*|heist\w*|mafia|detective\w*|gangster\w*|cops?)\b/, any: { movie: [G.crime], tv: [G.crime] } },
  { name: 'mystery', re: /\b(mystery|mysteries|whodunit|puzzle\w*)\b/, any: { movie: [G.mystery], tv: [G.mystery] } },
  { name: 'sci-fi', re: /\b(sci-?fi|science fiction|space|future\w*|alien\w*)\b/, any: { movie: [G.scifi], tv: [G.scifiFantasy] } },
  { name: 'fantasy', re: /\b(fantasy|magic\w*|myth\w*)\b/, any: { movie: [G.fantasy], tv: [G.scifiFantasy] } },
  { name: 'true story', re: /\b(true story|real events|biopic|historical|history)\b/, any: { movie: [G.history], tv: [G.warPolitics] } },
  { name: 'documentary', re: /\b(documentar\w*|docu\w*)\b/, any: { movie: [G.documentary], tv: [G.documentary] } },
  { name: 'animated', re: /\b(anim\w*|cartoon\w*|anime)\b/, any: { movie: [G.animation], tv: [G.animation] } },
  { name: 'war', re: /\b(war|soldier\w*|battle\w*)\b/, any: { movie: [G.war], tv: [G.warPolitics] } },
  { name: 'family', re: /\b(family|kids|children)\b/, any: { movie: [G.family], tv: [G.family, G.kids] } },
];
const NEG = /\b(no|not|without|zero|avoid|skip|never|nothing|hate)\b(\s+\w+){0,2}\s*$/;
export const EMPTY_MOOD = { groups: [], none: { movie: new Set(), tv: new Set() }, heard: [], avoided: [] };

export function parseMood(text) {
  const t = (text || '').toLowerCase();
  const out = { groups: [], none: { movie: new Set(), tv: new Set() }, heard: [], avoided: [] };
  for (const L of LEX) {
    const re = new RegExp(L.re.source, 'g'); let m, pos = false, neg = false;
    while ((m = re.exec(t))) { if (NEG.test(t.slice(Math.max(0, m.index - 24), m.index))) neg = true; else pos = true; }
    if (neg) { for (const k of ['movie', 'tv']) L.any[k].forEach(g => out.none[k].add(g)); out.avoided.push(L.name); }
    else if (pos) { out.groups.push({ key: 'free:' + L.name, label: `you said “${L.name}”`, ids: L.any }); out.heard.push(L.name); }
  }
  return out;
}

// ---- strict checks --------------------------------------------------------------

const FAME = {
  movie: { popular: { min: 3000 }, gems: { min: 80, max: 2500, rating: 7.0 }, base: { min: 150 } },
  tv: { popular: { min: 800 }, gems: { min: 40, max: 700, rating: 7.2 }, base: { min: 60 } },
};
// Regional-language titles get far fewer TMDB votes, so vote bands shrink for them.
const fameOf = (kind, st) => {
  const f = { ...FAME[kind].base, ...(st.fame ? FAME[kind][st.fame] : {}) };
  if (st.langs && !st.langs.includes('en')) { f.min = Math.max(10, Math.round(f.min / 6)); if (f.max) f.max = Math.round(f.max / 6); }
  return f;
};

export function failures(t, st) {
  const f = [];
  for (const g of st.groups) if (!(g.ids[t.kind] || []).some(id => t.genres.includes(id))) f.push(g.label);
  return f;
}
export function breaksHard(t, st) {
  if (t.genres.some(g => st.none[t.kind].has(g))) return true;
  // series have no age ratings in TMDB's search, so family-safe means a family, kids or animation series
  if (st.family && t.kind === 'tv' && ![G.family, G.kids, G.animation].some(g => t.genres.includes(g))) return true;
  if (st.langs && !st.langs.includes(t.lang)) return true;
  if (st.minYear && t.year && t.year < st.minYear) return true;
  const fm = fameOf(t.kind, st);
  if (t.votes < fm.min || (fm.max && t.votes > fm.max)) return true;
  return false;
}

// ---- discover -------------------------------------------------------------------

export function discoverParams(kind, st, ctx) {
  const fm = fameOf(kind, st);
  const p = {
    include_adult: 'false', include_video: 'false', language: 'en-US', watch_region: ctx.dataRegion || ctx.region,
    sort_by: st.fame === 'popular' ? 'vote_count.desc' : 'vote_average.desc',
    'vote_count.gte': fm.min, 'vote_average.gte': fm.rating || 6.5,
  };
  if (fm.max) p['vote_count.lte'] = fm.max;
  // push the narrowest rule to the server, the rest are checked client-side
  const g = [...st.groups].filter(x => x.ids[kind]?.length).sort((a, b) => a.ids[kind].length - b.ids[kind].length)[0];
  if (g) p.with_genres = g.ids[kind].join('|');
  if (st.none[kind].size) p.without_genres = [...st.none[kind]].join(',');
  if (st.langs?.length === 1) p.with_original_language = st.langs[0];
  if (st.minYear) p[kind === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'] = `${st.minYear}-01-01`;
  if (kind === 'movie') {
    p['primary_release_date.lte'] = new Date().toISOString().slice(0, 10);
    if (st.maxRuntime) { p['with_runtime.lte'] = st.maxRuntime; p['with_runtime.gte'] = 40; }
    if (st.family) { p.certification_country = 'US'; p['certification.lte'] = 'PG-13'; }
  } else if (st.status === 'ended') p.with_status = '3|4';
  if (ctx.services?.length) { p.with_watch_providers = ctx.services.join('|'); p.with_watch_monetization_types = 'flatrate|free|ads'; }
  return p;
}

export function normalize(r, kind) {
  const date = r.release_date || r.first_air_date || '';
  return {
    key: `${kind}:${r.id}`, id: r.id, kind,
    title: r.title || r.name, original: r.original_title || r.original_name,
    year: +date.slice(0, 4) || null, genres: r.genre_ids || (r.genres || []).map(g => g.id),
    lang: r.original_language, vote: r.vote_average || 0, votes: r.vote_count || 0, popularity: r.popularity || 0,
    poster: IMG(r.poster_path), backdrop: IMG(r.backdrop_path, 'w1280'), overview: r.overview || '',
  };
}

// Pages through TMDB until enough titles pass every rule (or the catalogue runs out).
export async function buildPool(st, ctx, want = 60, maxPages = 9) {
  const strict = [], near = [], seen = new Set();
  let total = 0, exhausted = true;
  const kinds = KINDS(st);
  for (const kind of kinds) {
    const params = discoverParams(kind, st, ctx);
    let page = 1, pages = 1, kindStrict = 0;
    while (page <= Math.min(pages, maxPages)) {
      const nums = [page, page + 1, page + 2].filter(n => n === 1 || n <= Math.min(pages, maxPages));
      const batch = await Promise.all(nums.map(n => discover(kind, { ...params, page: n })));
      for (const [i, d] of batch.entries()) {
        pages = Math.min(d.total_pages || 1, 500);
        if (nums[i] === 1) total += d.total_results || 0;
        for (const r of d.results || []) {
          const t = normalize(r, kind);
          if (seen.has(t.key) || ctx.history.has(t.key) || breaksHard(t, st)) continue;
          seen.add(t.key);
          const f = failures(t, st);
          if (!f.length) { strict.push(t); kindStrict++; } else if (f.length === 1) near.push({ ...t, missed: f });
        }
      }
      page += nums.length;
      if (kindStrict >= want / kinds.length) break;
    }
    if (page <= pages) exhausted = false;
  }
  return { strict, near, total, exhausted };
}

// ---- adaptive questions ---------------------------------------------------------

function optionKeeps(o, t, st) {
  const s = o.set || {};
  if (s.kind && s.kind !== 'both' && t.kind !== s.kind) return false;
  if (s.minYear && t.year < s.minYear) return false;
  if (s.langs && !s.langs.includes(t.lang)) return false;
  if (s.fame) { const fm = fameOf(t.kind, { ...st, fame: s.fame }); if (t.votes < (fm.min || 0) || (fm.max && t.votes > fm.max)) return false; }
  if (o.any && !(o.any[t.kind] || []).some(id => t.genres.includes(id))) return false;
  if (o.none && (o.none[t.kind] || []).some(id => t.genres.includes(id))) return false;
  return true;
}

// Core and practical questions come first, in order. After that the next
// question is the one whose answers would narrow the current matches most —
// a question that would not change anything is skipped entirely.
export function nextQuestion(answers, st, pool) {
  const done = new Set(answers.map(a => a.qid));
  const open = QUESTIONS.filter(q => !done.has(q.id) && (!q.when || q.when(st)) && visibleOptions(q, st).length > 1);
  const fixed = open.filter(q => q.core || q.practical).sort((a, b) => (a.core || a.practical) - (b.core || b.practical));
  if (fixed.length) return fixed[0];
  const items = pool?.strict || [];
  if (!items.length) return null;
  const scored = open.map(q => {
    const opts = visibleOptions(q, st);
    const keep = opts.map(o => items.filter(t => optionKeeps(o, t, st)).length / items.length);
    const effective = keep.filter(k => k < 0.98).length;
    return { q, gain: keep.reduce((s, k) => s + (1 - k), 0) / opts.length, effective };
  }).filter(x => x.effective >= 1);
  if (!scored.length) return null;
  scored.sort((a, b) => b.gain - a.gain);
  const top = scored.slice(0, 2);
  return top[Math.floor(Math.random() * top.length)].q;
}

export const MAX_Q = 8;
export function shouldStop(answers, pool) {
  const n = answers.length;
  if (n >= MAX_Q) return true;
  if (n >= 4 && pool.strict.length <= 12 && pool.exhausted) return true;
  return false;
}

// ---- ranking --------------------------------------------------------------------

const bayes = (t, C = 6.9) => { const m = t.kind === 'movie' ? 800 : 250; return (t.votes * t.vote + m * C) / (t.votes + m); };

export function watchInfo(d, region, ctx) {
  // TMDB has no data for some regions (e.g. Bangladesh); ctx.dataRegion is the stand-in
  const w = d?.['watch/providers']?.results?.[ctx.dataRegion || region];
  const names = arr => [...new Set((arr || []).map(p => p.provider_name))];
  const stream = names([...(w?.flatrate || []), ...(w?.free || []), ...(w?.ads || [])]);
  const rent = names([...(w?.rent || []), ...(w?.buy || [])]);
  const mine = ctx.serviceNames?.length ? stream.filter(n => ctx.serviceNames.some(s => n.toLowerCase().includes(s.toLowerCase().split(/[ +]/)[0]))) : stream;
  const link = w?.link || null;
  const where = region === 'IN' ? 'India' : region === 'BD' ? 'Bangladesh' : region;
  const proxy = ctx.dataRegion && ctx.dataRegion !== region ? ' (India listing — check locally)' : '';
  const name = d?.title || d?.name || 'the title';
  if (stream.length) return {
    blocked: false, badge: `Stream on ${stream.slice(0, 2).join(' · ')}${proxy}`, mine: mine.length > 0, fallback: null,
    steps: [`Open ${stream[0]} (signed in to the ${where} store)`, `Search “${name}”`, 'Play'],
    links: link ? [{ label: 'All options in ' + where, url: link }] : [],
  };
  if (rent.length) return {
    blocked: true, badge: `Rent or buy · ${rent.slice(0, 2).join(' · ')}`, mine: false,
    fallback: `Not on a subscription in ${where} right now.`,
    steps: [`Open ${rent[0]}`, `Search “${name}” → Rent`], links: link ? [{ label: 'All options in ' + where, url: link }] : [],
  };
  return {
    blocked: true, badge: `Not streaming in ${where}`, mine: false,
    fallback: ctx.regionNote || `No legal streaming option listed for ${where} yet.`,
    steps: ['Not listed on any service in your region right now', 'Availability changes often — check back later'], links: [],
  };
}

const fmtVotes = n => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k votes' : n + ' votes');
export function bars(t, a) {
  const out = [{ k: 'Audience', v: t.vote * 10, txt: `${t.vote.toFixed(1)} · ${fmtVotes(t.votes)}`, live: true }];
  if (a?.rt != null) out.push({ k: 'Rotten T.', v: a.rt, txt: a.rt + '%', live: true });
  if (a?.mc != null) out.push({ k: 'Metacritic', v: a.mc, txt: String(a.mc), live: true });
  if (a?.honorCount) out.push({ k: 'Honours', v: Math.min(100, a.honorCount * 12), txt: String(a.honorCount), live: true });
  return out;
}

// Enrich candidates with details (runtime, IMDb id, where to watch) + Wikidata.
export async function enrich(items, ctx, limit = 30) {
  const top = items.slice(0, limit);
  const det = [];
  for (let i = 0; i < top.length; i += 8) det.push(...await Promise.all(top.slice(i, i + 8).map(t => details(t.kind, t.id).catch(() => null))));
  const imdb = det.map(d => d?.external_ids?.imdb_id || d?.imdb_id || null);
  const acc = await acclaim(imdb).catch(() => ({}));
  return top.map((t, i) => {
    const d = det[i] || {};
    const runtime = t.kind === 'movie' ? d.runtime : (d.episode_run_time || [])[0];
    const langName = (d.spoken_languages || []).find(l => l.iso_639_1 === t.lang)?.english_name || t.lang?.toUpperCase();
    return { ...t, runtime, seasons: d.number_of_seasons, imdb: imdb[i], acclaim: acc[imdb[i]] || null, watch: watchInfo(d, ctx.region, ctx), langName };
  });
}

export function score(t, st, shown = {}) {
  const a = t.acclaim || {};
  const parts = [[bayes(t) / 10, 0.45]];
  if (a.rt != null) parts.push([a.rt / 100, 0.18]);
  if (a.mc != null) parts.push([a.mc / 100, 0.18]);
  let s = parts.reduce((x, p) => x + p[0] * p[1], 0) / parts.reduce((x, p) => x + p[1], 0);
  s += Math.min(0.06, (a.honorCount || 0) * 0.01) + (a.festival ? 0.03 : 0);
  if (!t.watch?.blocked) s += 0.05;
  if (t.watch?.mine) s += 0.04;
  if (st.fame === 'gems') s += Math.max(0, 0.04 - t.votes / 100000);
  // unless you asked for popular titles, the most famous ones step back a little
  if (st.fame !== 'popular' && t.votes > (t.kind === 'movie' ? 15000 : 5000)) s -= 0.035;
  s -= Math.min(0.06, (shown[t.key] || 0) * 0.015);
  return s;
}

export function toRec(t, st, strict) {
  const a = t.acclaim || {};
  const sc = score(t, st);
  const pct = strict === false ? Math.min(79, Math.round(50 + sc * 25)) : Math.min(99, Math.round(70 + sc * 30));
  const meta = [t.year, t.kind === 'tv' ? (t.seasons ? `${t.seasons} season${t.seasons > 1 ? 's' : ''}` : 'Series') : t.runtime ? `${t.runtime} min` : 'Film', t.langName].filter(Boolean).join(' · ');
  return {
    ...t.watch, id: t.key, title: t, meta, pct, strict, missed: t.missed || [],
    bars: bars(t, a), gem: t.votes < (t.kind === 'movie' ? 2500 : 700) && t.vote >= 7.2,
    honors: (a.honors || []).join(' · '), festival: a.festival,
    why: t.overview.length > 240 ? t.overview.slice(0, 237).replace(/\s+\S*$/, '') + '…' : t.overview,
  };
}

// Rules that can only be checked once full details are in. TMDB's search
// index sometimes has a wrong runtime, so the real one is checked here.
export function breaksDetails(t, st) {
  if (st.maxRuntime && t.kind === 'movie' && t.runtime && t.runtime > st.maxRuntime) return true;
  return false;
}

// Enrich in chunks until enough titles survive the detail checks.
async function enrichValid(items, st, ctx, want, cap = 60) {
  const out = [];
  for (let i = 0; i < Math.min(items.length, cap) && out.length < want; i += 15) {
    const chunk = await enrich(items.slice(i, i + 15), ctx, 15);
    out.push(...chunk.filter(t => !breaksDetails(t, st)));
  }
  return out;
}

export async function recommend(st, pool, ctx) {
  const shown = loadShown();
  const pre = s => [...s].sort((a, b) => bayes(b) - bayes(a));
  const strictE = await enrichValid(pre(pool.strict), st, ctx, 30);
  const ranked = strictE.map(t => ({ t, s: score(t, st, shown) })).sort((a, b) => b.s - a.s).slice(0, 10);
  let close = [];
  if (ranked.length < 10 && pool.near.length) {
    const nearE = await enrichValid(pre(pool.near), st, ctx, 10 - ranked.length + 4, 30);
    close = nearE.map(t => ({ t, s: score(t, st, shown) })).sort((a, b) => b.s - a.s).slice(0, 10 - ranked.length);
  }
  const recs = [...ranked.map(x => toRec(x.t, st, true)), ...close.map(x => toRec(x.t, st, false))];
  recordShown(recs.map(r => r.id));
  return {
    recs,
    trace: {
      total: pool.total, strict: pool.strict.length, exhausted: pool.exhausted,
      checked: strictE.length, withScores: strictE.filter(t => t.acclaim?.rt != null || t.acclaim?.mc != null).length,
      festival: strictE.filter(t => t.acclaim?.festival).length,
      rules: st.groups.map(g => g.label),
    },
  };
}

// ---- platform explorer ----------------------------------------------------------

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }

export async function platformPicks({ providerIds, region, sort, seed, history, kind = 'movie' }, ctx) {
  if (!providerIds.length) return { recs: [], total: 0 };
  const base = { watch_region: region, with_watch_providers: providerIds.join('|'), with_watch_monetization_types: 'flatrate|free|ads', include_adult: 'false', language: 'en-US' };
  const fm = FAME[kind];
  let params;
  if (sort === 'gems') params = { ...base, sort_by: 'vote_average.desc', 'vote_average.gte': fm.gems.rating, 'vote_count.gte': fm.gems.min, 'vote_count.lte': fm.gems.max };
  else if (sort === 'buzz') params = { ...base, sort_by: 'popularity.desc', 'vote_count.gte': 50 };
  else if (sort === 'new') params = { ...base, sort_by: 'popularity.desc', 'vote_average.gte': 6.8, 'vote_count.gte': 30, [kind === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte']: `${thisYear - 1}-01-01` };
  else params = { ...base, sort_by: 'vote_average.desc', 'vote_average.gte': 7.4, 'vote_count.gte': kind === 'movie' ? 1500 : 400 };
  const first = await discover(kind, { ...params, page: 1 });
  const pages = Math.min(first.total_pages || 1, 500);
  let raw = first.results || [];
  if (sort === 'gems' && pages > 1) {
    // random pages from the whole gem shelf, so every shuffle digs somewhere new
    const r = rng(seed);
    const picks = [...new Set([1 + Math.floor(r() * pages), 1 + Math.floor(r() * pages)])];
    raw = (await Promise.all(picks.map(p => discover(kind, { ...params, page: p })))).flatMap(d => d.results || []);
    raw = raw.map(x => ({ x, k: r() })).sort((a, b) => a.k - b.k).map(o => o.x);
  }
  const items = raw.map(r => normalize(r, kind)).filter(t => !history.has(t.key)).slice(0, 12);
  const enriched = await enrich(items, ctx, 12);
  const recs = enriched.map(t => ({ ...toRec(t, {}, undefined), pct: Math.min(99, Math.round(bayes(t) * 10)) }));
  return { recs, total: first.total_results || 0 };
}

// ---- memory (your own browser only: history and taste) --------------------------

const SKEY = 'cinescout.shown.v2', HKEY = 'cinescout.history.v2', PKEY = 'cinescout.prefs.v2';
export function loadShown() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }
export function recordShown(ids) { try { const m = loadShown(); ids.forEach(id => { m[id] = (m[id] || 0) + 1; }); localStorage.setItem(SKEY, JSON.stringify(m)); } catch {} }
export function loadHistory() { try { return new Set(JSON.parse(localStorage.getItem(HKEY) || '[]')); } catch { return new Set(); } }
export function saveHistory(s) { try { localStorage.setItem(HKEY, JSON.stringify([...s])); } catch {} }
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch { return null; } }
export function savePrefs(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }
