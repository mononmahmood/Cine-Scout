// Cine Scout thinker, live edition.
// Answers become strict rules: hard filters go to TMDB's discover query, the
// rest are checked on every returned title. Nothing that breaks an answer is
// ever shown as a match. Ranking blends TMDB audience score, Rotten Tomatoes,
// Metacritic and festival/award record (Wikidata); Reddit and critics' feeds
// are shown per title as they arrive.
import { QUESTIONS, byId, G } from './questions.js';
import { discover, details, acclaim, acclaimByTmdb, imdbRatings, IMG } from './live.js';

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
  const proxy = ctx.dataRegion && ctx.dataRegion !== region ? ' (India listing)' : '';
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
    fallback: ctx.regionNote ? null : `No legal streaming option listed for ${where} yet.`,
    steps: ['Not listed on any service in your region right now', 'Availability changes often — check back later'], links: [],
  };
}

const kfmt = n => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));

// Compact score chips, IMDb first. `live` marks data fetched just now.
export function scores(t) {
  const a = t.acclaim || {};
  const out = [];
  if (t.imdbRating) out.push({ k: 'IMDb', txt: t.imdbRating.toFixed(1), sub: kfmt(t.imdbVotes), cls: 'imdb' });
  if (a.rt != null) out.push({ k: 'RT', txt: a.rt + '%', cls: a.rt >= 60 ? 'fresh' : 'rotten' });
  if (a.mc != null) out.push({ k: 'MC', txt: String(a.mc), cls: a.mc >= 75 ? 'mc-hi' : a.mc >= 50 ? 'mc-mid' : 'mc-lo' });
  if (!t.imdbRating) out.push({ k: 'TMDB', txt: t.vote.toFixed(1), sub: kfmt(t.votes), cls: 'tmdb' });
  if (a.honorCount) out.push({ k: '🏆', txt: String(a.honorCount), cls: 'hon' });
  return out;
}

// Details (runtime, where to watch, IMDb id) + Wikidata + IMDb ratings.
export async function enrich(items, ctx) {
  const det = [];
  for (let i = 0; i < items.length; i += 8) det.push(...await Promise.all(items.slice(i, i + 8).map(t => details(t.kind, t.id).catch(() => null))));
  const imdb = det.map((d, i) => d?.external_ids?.imdb_id || d?.imdb_id || items[i].imdb || null);
  const [acc, ir] = await Promise.all([acclaim(imdb).catch(() => ({})), imdbRatings(imdb).catch(() => ({}))]);
  return items.map((t, i) => {
    const d = det[i] || {};
    const runtime = t.kind === 'movie' ? d.runtime : (d.episode_run_time || [])[0];
    const langName = (d.spoken_languages || []).find(l => l.iso_639_1 === t.lang)?.english_name || t.lang?.toUpperCase();
    const r = ir[imdb[i]];
    return { ...t, runtime, seasons: d.number_of_seasons, imdb: imdb[i], acclaim: acc[imdb[i]] || t.acclaim || null, imdbRating: r?.rating ?? t.imdbRating ?? null, imdbVotes: r?.votes ?? t.imdbVotes ?? 0, watch: watchInfo(d, ctx.region, ctx), langName };
  });
}

// One quality number from every source we have; IMDb weighs most.
export function quality(t) {
  const a = t.acclaim || {};
  const parts = [[bayes(t) / 10, t.imdbRating ? 0.15 : 0.45]];
  if (t.imdbRating && t.imdbVotes >= 500) parts.push([t.imdbRating / 10, 0.4]);
  if (a.rt != null) parts.push([a.rt / 100, 0.18]);
  if (a.mc != null) parts.push([a.mc / 100, 0.18]);
  return parts.reduce((x, p) => x + p[0] * p[1], 0) / parts.reduce((x, p) => x + p[1], 0);
}

export function score(t, st, shown = {}) {
  const a = t.acclaim || {};
  let s = quality(t);
  s += Math.min(0.06, (a.honorCount || 0) * 0.01) + (a.festival ? 0.03 : 0);
  if (!t.watch?.blocked) s += 0.05;
  if (t.watch?.mine) s += 0.04;
  const v = t.imdbVotes || t.votes * 20;
  if (st.fame === 'gems') s += Math.max(0, 0.04 - v / 2e6);
  // unless you asked for popular titles, the most famous ones step back a little
  if (st.fame !== 'popular') {
    const big = t.kind === 'movie' ? 400000 : 150000;
    if (v > big) s -= 0.04 + Math.min(0.05, (v - big) / (big * 20));
  }
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
    scores: scores(t), gem: !!t.gem, honors: (a.honors || []).slice(0, 2).join(' · '), festival: a.festival,
    why: t.overview,
  };
}

// Rules that can only be checked once full details are in. TMDB's search
// index sometimes has a wrong runtime, so the real one is checked here.
export function breaksDetails(t, st) {
  if (st.maxRuntime && t.kind === 'movie' && t.runtime && t.runtime > st.maxRuntime) return true;
  return false;
}

// A cursor walks the strict matches best-first; each call to nextBatch
// enriches just enough titles to return the next 10 (for "Show 10 more").
export function makeCursor(st, pool, ctx, maxPages = 9) {
  const order = s => [...s].sort((a, b) => bayes(b) - bayes(a));
  return { st, ctx, queue: order(pool.strict), near: order(pool.near), pos: 0, spare: [], seen: new Set([...pool.strict, ...pool.near].map(t => t.key)), maxPages, exhausted: pool.exhausted, total: pool.total, strictCount: pool.strict.length };
}

async function refill(c) {
  if (c.exhausted || c.maxPages >= 40) return false;
  c.maxPages += 10;
  const p = await buildPool(c.st, c.ctx, (c.maxPages) * 8, c.maxPages);
  const fresh = p.strict.filter(t => !c.seen.has(t.key)).sort((a, b) => bayes(b) - bayes(a));
  fresh.forEach(t => c.seen.add(t.key));
  c.queue.push(...fresh); c.exhausted = p.exhausted; c.strictCount += fresh.length;
  return fresh.length > 0;
}

export async function nextBatch(c, n = 10) {
  const shown = loadShown();
  const mega = t => (t.imdbVotes || 0) > (t.kind === 'movie' ? 700000 : 300000);
  const needLesser = () => c.st.fame !== 'popular' && c.spare.filter(t => !mega(t)).length < n - 3 && c.pos < Math.min(c.queue.length, c.pos0 + 75);
  c.pos0 = c.pos;
  while (c.spare.length < n + 5 || needLesser()) {
    if (c.pos >= c.queue.length && !(await refill(c))) break;
    const chunk = c.queue.slice(c.pos, c.pos + 15); c.pos += chunk.length;
    const e = await enrich(chunk, c.ctx);
    c.spare.push(...e.filter(t => !breaksDetails(t, c.st)));
  }
  c.spare.sort((a, b) => score(b, c.st, shown) - score(a, c.st, shown));
  // unless you asked for popular titles, at most 3 in 10 may be the famous canon
  const take = [];
  let megaCount = 0;
  for (const t of [...c.spare]) {
    if (take.length >= n) break;
    if (c.st.fame !== 'popular' && mega(t)) { if (megaCount >= 3) continue; megaCount++; }
    take.push(t); c.spare.splice(c.spare.indexOf(t), 1);
  }
  // not enough lesser-known titles left: fill with the rest rather than show fewer
  while (take.length < n && c.spare.length) take.push(c.spare.shift());
  recordShown(take.map(t => t.key));
  return take.map(t => toRec(t, c.st, true));
}
export const hasMore = c => c.spare.length > 0 || c.pos < c.queue.length || !c.exhausted;

export async function recommend(st, pool, ctx) {
  const cursor = makeCursor(st, pool, ctx);
  const recs = await nextBatch(cursor, 10);
  if (recs.length < 10 && cursor.near.length) {
    const e = (await enrich(cursor.near.slice(0, 14), ctx)).filter(t => !breaksDetails(t, st));
    const shown = loadShown();
    e.sort((a, b) => score(b, st, shown) - score(a, st, shown));
    recs.push(...e.slice(0, 10 - recs.length).map(t => toRec(t, st, false)));
  }
  return {
    recs, cursor,
    trace: {
      total: pool.total, strict: pool.strict.length, exhausted: pool.exhausted,
      withScores: recs.filter(r => r.title.acclaim?.rt != null || r.title.acclaim?.mc != null).length,
      withImdb: recs.filter(r => r.title.imdbRating).length,
      festival: recs.filter(r => r.festival).length,
      rules: st.groups.map(g => g.label),
    },
  };
}

// ---- platform explorer ----------------------------------------------------------

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }

// What counts as a hidden gem: rated well by a real crowd on IMDb (or backed
// by critics or a festival), but not a mass-market blockbuster.
export const GEM = {
  movie: { minVotes: 1500, maxVotes: 300000, good: 7.0, okWithCritics: 6.6 },
  tv: { minVotes: 800, maxVotes: 150000, good: 7.6, okWithCritics: 7.2 },
};
export function gemVerdict(t) {
  const g = GEM[t.kind], a = t.acclaim || {};
  if (!t.imdbRating || t.imdbVotes < g.minVotes || t.imdbVotes > g.maxVotes) return false;
  const critics = (a.rt != null && a.rt >= 88) || (a.mc != null && a.mc >= 75) || a.festival || (a.honorCount || 0) >= 2;
  return t.imdbRating >= g.good || (t.imdbRating >= g.okWithCritics && critics);
}
function gemScore(t) {
  const a = t.acclaim || {};
  let s = quality(t) + (a.festival ? 0.04 : 0) + Math.min(0.05, (a.honorCount || 0) * 0.008);
  s -= 0.03 * Math.log10(Math.max(10, t.imdbVotes)); // the less seen, the more of a find
  return s;
}

// Candidates from the service's live catalogue, checked against Wikidata + IMDb.
async function candidates(kind, base, pagesSpec) {
  const lists = await Promise.all(pagesSpec.map(({ params, page }) => discover(kind, { ...base, ...params, page }).catch(() => ({ results: [] }))));
  const seen = new Set(), out = [];
  for (const d of lists) for (const r of d.results || []) { const t = normalize(r, kind); if (!seen.has(t.key)) { seen.add(t.key); out.push(t); } }
  const acc = await acclaimByTmdb(out.map(t => t.key));
  const ir = await imdbRatings(Object.values(acc).map(a => a.imdb));
  return out.map(t => { const a = acc[t.key]; const r = a?.imdb && ir[a.imdb]; return { ...t, acclaim: a || null, imdb: a?.imdb || null, imdbRating: r?.rating ?? null, imdbVotes: r?.votes ?? 0 }; });
}

export async function platformPicks({ providerIds, region, sort, seed, history, kind = 'movie', recent = new Set() }, ctx) {
  if (!providerIds.length) return { recs: [], total: 0, pool: 0 };
  const base = { watch_region: region, with_watch_providers: providerIds.join('|'), with_watch_monetization_types: 'flatrate|free|ads', include_adult: 'false', language: 'en-US' };
  if (kind === 'movie') base['with_runtime.gte'] = 65; // feature films only — no shorts or TV specials
  const r = rng(seed);
  let picked = [], total = 0, pool = 0;
  if (sort === 'gems') {
    const rated = { sort_by: 'vote_average.desc', 'vote_count.gte': kind === 'movie' ? 40 : 20 };
    const known = { sort_by: 'vote_count.desc' };
    const first = await discover(kind, { ...base, ...rated, page: 1 });
    total = first.total_results || 0;
    const pages = Math.min(first.total_pages || 1, 25);
    // the whole shelf of a small service; a random slice of a big one
    const rnd = [...new Set(Array.from({ length: 4 }, () => 1 + Math.floor(r() * pages)))];
    const spec = [...new Set([1, 2, ...rnd])].filter(p => p <= pages).map(page => ({ params: rated, page }))
      .concat([1, 2, 3].map(page => ({ params: known, page })));
    const all = (await candidates(kind, base, spec)).filter(t => !history.has(t.key));
    const gems = all.filter(t => (t.gem = gemVerdict(t)));
    pool = gems.length;
    const fresh = gems.filter(t => !recent.has(t.key));
    const from = fresh.length >= 12 ? fresh : gems;
    const drawn = from.map(t => ({ t, k: Math.log(r() + 1e-9) / Math.exp(gemScore(t) * 6) })).sort((a, b) => b.k - a.k).map(x => x.t);
    // keep the shelf varied: at most 3 documentaries and 3 animations per draw
    const cap = { [G.documentary]: 3, [G.animation]: 3 }, used = {};
    for (const t of drawn) {
      const g = Object.keys(cap).find(id => t.genres.includes(+id));
      if (g && (used[g] = (used[g] || 0) + 1) > cap[g]) continue;
      picked.push(t);
      if (picked.length === 12) break;
    }
    // a small shelf can't always honour the caps — fill up rather than show a half-empty draw
    for (const t of drawn) { if (picked.length >= 12) break; if (!picked.includes(t)) picked.push(t); }
  } else {
    const spec = sort === 'buzz' ? [1, 2].map(page => ({ params: { sort_by: 'popularity.desc', 'vote_count.gte': 30 }, page }))
      : sort === 'new' ? [1, 2, 3].map(page => ({ params: { sort_by: 'popularity.desc', 'vote_count.gte': 20, [kind === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte']: `${thisYear - 1}-06-01` }, page }))
      : [1, 2, 3, 4].map(page => ({ params: { sort_by: 'vote_count.desc' }, page }));
    const all = (await candidates(kind, base, spec)).filter(t => !history.has(t.key));
    total = all.length;
    let list = all;
    if (sort === 'best') list = all.filter(t => t.imdbVotes >= (kind === 'movie' ? 25000 : 8000)).sort((a, b) => b.imdbRating - a.imdbRating);
    else if (sort === 'new') list = all.filter(t => !t.imdbRating || t.imdbRating >= 6.8).sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
    picked = list.slice(0, 12);
    picked.forEach(t => { t.gem = gemVerdict(t); });
  }
  const enriched = await enrich(picked, ctx);
  const recs = enriched.map((t, i) => ({ ...toRec({ ...t, gem: picked[i].gem }, {}, undefined), pct: Math.round(quality(t) * 100) }));
  return { recs, total, pool };
}

// ---- memory (your own browser only: history and taste) --------------------------

const SKEY = 'cinescout.shown.v2', HKEY = 'cinescout.history.v2', PKEY = 'cinescout.prefs.v2';
export function loadShown() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }
export function recordShown(ids) { try { const m = loadShown(); ids.forEach(id => { m[id] = (m[id] || 0) + 1; }); localStorage.setItem(SKEY, JSON.stringify(m)); } catch {} }
export function loadHistory() { try { return new Set(JSON.parse(localStorage.getItem(HKEY) || '[]')); } catch { return new Set(); } }
export function saveHistory(s) { try { localStorage.setItem(HKEY, JSON.stringify([...s])); } catch {} }
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch { return null; } }
export function savePrefs(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }
