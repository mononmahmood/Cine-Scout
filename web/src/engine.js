// Cine Scout thinker.
// Every answer that names a mood is a strict requirement: a title must share
// at least one tag with each of those answers. Practical answers (time, era,
// "no tension", "polished only"…) are hard filters that never relax.
// Quality blends every source we hold — IMDb, critics, Rotten Tomatoes and
// Metacritic (live from Wikidata), live Reddit — and only orders titles
// inside the same match tier, so a famous film can never outrank a better fit.
import { verify } from './data.js';

const optionOf = (q, answers) => q.options.find(x => x.id === (answers || {})[q.id]);

// Questions that own a signal: their answer wins over side effects of others.
const OWNER = { thrill: 'tension', brain: 'battery', arthouse: 'depth' };
const MAXED = ['thrill', 'brain', 'laugh', 'love'];

// Plain-words box. Each mood word becomes its own requirement; "no X" / "not X"
// / "without X" becomes a hard exclusion instead.
const LEX = [
  { name: 'slow', re: /\b(slow|quiet|calm|meditat\w*|breath\w*|gentle)\b/, tags: ['slow-cinema', 'slow-burn'], core: ['slow-cinema'] },
  { name: 'twisty', re: /\b(twist\w*|confus\w*|mind\w*|complex|puzzl\w*)\b/, tags: ['twist', 'psych-fracture'], core: ['psych-fracture'] },
  { name: 'comedy', re: /\b(laugh\w*|funny|comed\w*|silly|hilarious|lighthearted)\b/, tags: ['light-comedy', 'dark-comedy'], core: ['light-comedy', 'dark-comedy'] },
  { name: 'dark', re: /\b(dark|bleak|disturb\w*|grim|brutal)\b/, tags: ['moral-ambiguity', 'psych-fracture'], core: ['psych-fracture'] },
  { name: 'emotional', re: /\b(love|romant\w*|romance|heart\w*|sad|cry|crying|emotion\w*|tear\w*)\b/, tags: ['emotional', 'romance-light'], core: ['romance-light'] },
  { name: 'tense', re: /\b(thrill\w*|action|tense|tension|edge|chase|fight\w*|violen\w*)\b/, tags: ['adrenaline'], core: ['adrenaline'] },
  { name: 'eerie', re: /\b(horror|scary|ghost\w*|folk|creepy|eerie)\b/, tags: ['folk-horror', 'surreal'], core: ['folk-horror'] },
  { name: 'far-out', re: /\b(sci-?fi|science|space|future\w*|fantasy|dream\w*|alien\w*)\b/, tags: ['sci-escape', 'lore'], core: ['sci-escape'] },
  { name: 'true story', re: /\b(true|real|based|biopic|documentary)\b/, tags: ['true-story', 'true-feel'], core: ['true-story'] },
  { name: 'art-house', re: /\b(art-?house|festival|criterion|satyajit|auteur|arthouse)\b/, tags: ['art-house', 'world-cinema', 'slow-cinema'], core: ['art-house'] },
  { name: 'crime', re: /\b(crime|murder\w*|heist\w*|mafia|detective\w*|gangster\w*|cops?)\b/, tags: ['crime-world'], core: ['crime-world'] },
  { name: 'uplifting', re: /\b(hope\w*|uplift\w*|feel-?good|warm|happy|wholesome)\b/, tags: ['hopeful', 'feel-good'], core: [] },
];
const NEG = /\b(no|not|without|zero|avoid|skip|never|nothing)\b(\s+\w+){0,2}\s*$/;

export function parseMood(text) {
  const t = (text || '').toLowerCase();
  const groups = [], avoid = new Set(), heard = [], avoided = [];
  for (const L of LEX) {
    const m = t.match(new RegExp(L.re.source, 'g'));
    if (!m) continue;
    let positive = false, negative = false;
    let from = 0;
    for (const word of m) {
      const i = t.indexOf(word, from); from = i + word.length;
      if (NEG.test(t.slice(Math.max(0, i - 24), i))) negative = true; else positive = true;
    }
    if (negative) { L.core.forEach(x => avoid.add(x)); avoided.push(L.name); }
    if (positive && !negative) { groups.push({ q: 'free:' + L.name, label: `you said “${L.name}”`, tags: L.tags }); heard.push(L.name); }
  }
  return { groups, avoid, heard, avoided };
}
export const EMPTY_MOOD = { groups: [], avoid: new Set(), heard: [], avoided: [] };

// Everything the answers mean, in one place.
export function analyze(asked, answers, mood = EMPTY_MOOD) {
  const sig = {}, groups = [];
  asked.forEach(q => {
    const o = optionOf(q, answers); if (!o) return;
    if (o.tags?.length) groups.push({ q: q.id, label: o.label, tags: o.tags });
    for (const [k, v] of Object.entries(o.signal || {})) {
      sig[k] = MAXED.includes(k) ? Math.max(sig[k] ?? -1, v) : v;
    }
  });
  for (const [k, qid] of Object.entries(OWNER)) {
    const q = asked.find(x => x.id === qid); const o = q && optionOf(q, answers);
    if (o && o.signal?.[k] !== undefined) sig[k] = o.signal[k];
  }
  groups.push(...mood.groups);
  const tags = new Set(groups.flatMap(g => g.tags));
  return { sig, groups, tags, avoid: mood.avoid };
}

const famous = t => (t.baseBuzz ?? t.buzz) >= 88 || (t.imdb >= 8.7 && (t.baseBuzz ?? t.buzz) >= 84);

// Hard filters: never relaxed. Returns the reason a title is out, or null.
export function hardReason(t, sig, avoid, prefs) {
  if (avoid?.size && t.tags.some(x => avoid.has(x))) return 'avoid';
  if (sig.thrill === 0 && t.tags.includes('adrenaline')) return 'tension';
  if (sig.brain === 0 && t.tags.includes('psych-fracture')) return 'heavy';
  if (sig.arthouse === -1 && (t.tags.includes('art-house') || t.tags.includes('slow-cinema'))) return 'arthouse';
  if (sig.clean && t.tags.includes('psych-fracture')) return 'group';
  if (sig.safeOnly && !(t.imdb >= 8.0 && (t.baseBuzz ?? t.buzz) >= 75)) return 'legend';
  // "show me what I missed": only under-seen titles — the catalogue's gem flag or low popularity
  if (sig.gemBoost && (famous(t) || !(t.gem || (t.baseBuzz ?? t.buzz) <= 72))) return 'famous';
  if (sig.noSeries && t.kind === 'tv') return 'series';
  if (sig.onlySeries && t.kind !== 'tv') return 'film';
  if (sig.maxRuntime && t.kind === 'movie' && t.runtime > sig.maxRuntime) return 'runtime';
  if (sig.minYear && t.year < sig.minYear) return 'era';
  if (prefs) {
    if (prefs.hideFamous && famous(t) && !sig.safeOnly) return 'famous';
    if (prefs.noSeries && t.kind === 'tv') return 'series';
    if (prefs.maxRuntime && t.kind === 'movie' && t.runtime > prefs.maxRuntime) return 'runtime';
    if (prefs.langs?.length && !t.langs.some(l => prefs.langs.includes(l)) && !t.langs.includes('English')) return 'language';
    const low = t.title.toLowerCase();
    if (prefs.hatedTags?.some(h => low.includes(h) || t.tags.some(x => x.includes(h)))) return 'never';
  }
  return null;
}

const hits = (t, g) => g.tags.some(x => t.tags.includes(x));
export function strictPool(cat, a, prefs, history) {
  return cat.filter(t => !history?.has(t.id) && !hardReason(t, a.sig, a.avoid, prefs) && a.groups.every(g => hits(t, g)));
}

// Next question = the one that splits the remaining strict matches most evenly
// (so every answer genuinely narrows the shelf), random among the best three.
export function pickNext(allQs, asked, answers, mood, cat, prefs, history) {
  const askedIds = new Set(asked.map(q => q.id));
  const scored = [];
  for (const q of allQs) {
    if (askedIds.has(q.id)) continue;
    const counts = q.options.map(o => strictPool(cat, analyze([...asked, q], { ...answers, [q.id]: o.id }, mood), prefs, history).length);
    const total = counts.reduce((x, y) => x + y, 0);
    const live = counts.filter(c => c > 0).length;
    if (live < 2 || !total) continue;
    scored.push({ q, bal: (1 - Math.max(...counts) / total) + live * 0.05 });
  }
  if (!scored.length) return null;
  scored.sort((x, y) => y.bal - x.bal);
  const top = scored.slice(0, 3);
  return top[Math.floor(Math.random() * top.length)].q;
}

export const MAX_Q = 7;
export function shouldFinish(n, strictCount) {
  if (n >= MAX_Q) return true;
  if (n >= 1 && strictCount <= 5) return true;
  if (n >= 2 && strictCount <= 10) return true;
  if (n >= 4 && strictCount <= 18) return true;
  return false;
}

export function coopLine(asked, answers) {
  if (!asked.length) return 'Tell me tonight in one tap — or type it below.';
  const last = asked[asked.length - 1];
  const o = optionOf(last, answers);
  const ack = (last.follow && o && last.follow[o.id]) || 'Noted.';
  return `${ack} Digging one layer deeper.`;
}

// ---- sources ---------------------------------------------------------------

function withLive(catalogue, live) {
  return catalogue.map(t => {
    const b = live?.buzz?.[t.id];
    const a = live?.awards?.byId?.[t.id];
    const rv = live?.awards?.reviews?.[t.id] || {};
    let buzz = t.buzz;
    if (b && b.n > 0) buzz = Math.min(97, Math.max(t.buzz, 55 + b.n * 5));
    return { ...t, baseBuzz: t.buzz, buzz, reddit: b ? b.n : null, rt: rv.rt ?? null, mc: rv.mc ?? null, awards: a !== undefined ? a : (t.awards || []) };
  });
}

// Weighted mean of every score we actually have for this title.
export function quality(t) {
  const parts = [[t.imdb / 10, 0.35], [t.critic / 100, 0.2], [t.buzz / 100, 0.15]];
  if (t.rt != null) parts.push([t.rt / 100, 0.15]);
  if (t.mc != null) parts.push([t.mc / 100, 0.15]);
  const w = parts.reduce((s, p) => s + p[1], 0);
  return parts.reduce((s, p) => s + p[0] * p[1], 0) / w;
}

export function sourceBars(t) {
  const out = [{ k: 'IMDb', v: t.imdb * 10, txt: t.imdb.toFixed(1) }, { k: 'Critics', v: t.critic, txt: String(t.critic) }];
  if (t.rt != null) out.push({ k: 'Rotten T.', v: t.rt, txt: t.rt + '%', live: true });
  if (t.mc != null) out.push({ k: 'Metacritic', v: t.mc, txt: String(t.mc), live: true });
  out.push({ k: 'Buzz', v: t.buzz, txt: t.reddit != null ? `${t.reddit} posts` : String(t.buzz), live: t.reddit != null });
  return out;
}

// ---- Mind-Reader results -----------------------------------------------------

export function buildRecommendations(catalogue, a, { region, history, prefs, live, asked, answers, freeText }) {
  const cat = withLive(catalogue, live);
  const shown = loadShown();
  const unseen = cat.filter(t => !history.has(t.id));
  const out = {}; const passed = [];
  for (const t of unseen) {
    const r = hardReason(t, a.sig, a.avoid, prefs);
    if (r) out[r] = (out[r] || 0) + 1; else passed.push(t);
  }
  const G = a.groups.length;
  const rows = passed.map(t => {
    const ok = a.groups.map(g => hits(t, g));
    const matched = ok.filter(Boolean).length;
    const density = a.tags.size ? t.tags.filter(x => a.tags.has(x)).length / Math.max(t.tags.length, 1) : 0;
    let s = quality(t) * 0.6 + density * 0.25;
    if (verify(t, region).blocked === false) s += 0.1;
    if (a.sig.gemBoost && t.gem && !famous(t)) s += 0.08;
    if (!a.sig.safeOnly && famous(t)) s -= 0.05;
    if (prefs?.lovedTags?.some(x => t.title.toLowerCase().includes(x) || t.tags.includes(x))) s += 0.04;
    if (prefs?.lovedIds?.length) {
      const lovedTags = new Set(catalogue.filter(x => prefs.lovedIds.includes(x.id)).flatMap(x => x.tags));
      s += Math.min(0.05, t.tags.filter(x => lovedTags.has(x)).length * 0.015);
    }
    s -= Math.min(0.1, 0.025 * (shown[t.id] || 0));
    return { t, s, matched, missed: a.groups.filter((g, i) => !ok[i]).map(g => g.label) };
  });
  rows.sort((x, y) => (y.matched - x.matched) || (y.s - x.s));
  const strictCount = rows.filter(r => r.matched === G).length;
  const picked = rows.slice(0, 10);
  const recs = picked.map(({ t, s, matched, missed }) => {
    const v = verify(t, region);
    const strict = matched === G;
    const fit = G ? matched / G : 1;
    const pct = strict ? Math.min(99, Math.round(80 + s * 20)) : Math.min(79, Math.round(45 + fit * 25 + s * 10));
    const eff = t.tags.filter(x => a.tags.has(x)).slice(0, 3).join(', ');
    return {
      ...v, id: t.id, title: t, pct, strict, missed, bars: sourceBars(t), gem: t.gem && !famous(t),
      honors: (t.awards || []).join(' · '),
      because: becauseOf(t, asked, answers, freeText),
      why: `${eff ? 'Fits ' + eff + '. ' : ''}${t.overview}`,
    };
  });
  return {
    recs,
    trace: {
      considered: cat.length,
      excludedSeen: cat.length - unseen.length,
      filtered: Object.values(out).reduce((x, y) => x + y, 0),
      reasons: out,
      passed: passed.length,
      strict: strictCount,
      requirements: a.groups.map(g => g.label),
      sources: {
        reviews: cat.filter(t => t.rt != null || t.mc != null).length,
        reddit: cat.filter(t => t.reddit != null).length,
        awards: live?.awards?.byId ? Object.keys(live.awards.byId).length : 0,
      },
    },
  };
}

function becauseOf(t, asked, answers, freeText) {
  const notes = [];
  for (const q of asked || []) {
    const o = optionOf(q, answers);
    if (o && (o.tags || []).some(tag => t.tags.includes(tag))) {
      const short = String(o.label).slice(0, 60);
      if (!notes.includes(short)) notes.push(short);
    }
    if (notes.length === 2) break;
  }
  if (notes.length < 2 && freeText && freeText.trim()) notes.push(`your words: “${freeText.trim().slice(0, 60)}”`);
  return notes;
}

// ---- Platform explorer ---------------------------------------------------------

// A hidden gem: genuinely strong, genuinely under-watched. Uses the catalogue's
// own popularity (not the live-inflated one) plus live Reddit chatter.
export function isHiddenGem(t) {
  const base = t.baseBuzz ?? t.buzz;
  if (famous(t) || base > 76) return false;
  if (t.reddit != null && t.reddit >= 10) return false;
  return (t.imdb >= 7.6 && t.critic >= 75) || t.critic >= 90 || (t.rt != null && t.rt >= 92);
}

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }

export function topForPlatform(catalogue, pids, sort, region, history, live = null, seed = 1, recent = new Set()) {
  const cat = withLive(catalogue, live);
  const onPlat = t => t.avail.some(x => pids.includes(x.p) && x.regions.includes(region));
  const streams = t => t.avail.some(x => pids.includes(x.p) && x.type === 'stream' && x.regions.includes(region));
  let list = cat.filter(t => onPlat(t) && !history.has(t.id));
  const shown = loadShown();
  if (sort === 'gems') {
    // weighted random draw: better gems are likelier, but every shuffle differs
    const r = rng(seed);
    const draw = arr => {
      const fresh = arr.filter(t => !recent.has(t.id));
      const base = fresh.length >= 6 ? fresh : arr;
      return base.map(t => ({ t, k: Math.log(r() + 1e-9) / Math.pow(quality(t), 4), on: streams(t) }))
        .sort((x, y) => (y.on - x.on) || (y.k - x.k)).map(x => x.t);
    };
    const gems = draw(list.filter(isHiddenGem)).slice(0, 9);
    // thin platforms: top up with lesser-known strong titles, labelled as such
    const extra = gems.length >= 6 ? [] : draw(list.filter(t => !gems.includes(t) && !famous(t) && t.imdb >= 7.5)).slice(0, 6 - gems.length);
    list = [...gems, ...extra];
  } else {
    const key = sort === 'buzz' ? (t => t.buzz) : sort === 'critics' ? (t => (t.rt ?? t.mc ?? t.critic)) : (t => quality(t) * 100 - (famous(t) ? 4 : 0));
    list = list.filter(t => t.imdb >= 7.5)
      .sort((x, y) => (streams(y) - streams(x)) || (key(y) - (shown[y.id] || 0) * 2) - (key(x) - (shown[x.id] || 0) * 2));
  }
  return list.slice(0, 12).map(t => {
    const v = verify(t, region);
    const gem = isHiddenGem(t);
    return {
      ...v, id: t.id, title: t, pct: Math.min(99, Math.round(quality(t) * 100)), bars: sourceBars(t), gem,
      honors: (t.awards || []).join(' · '),
      why: `${gem ? 'Hidden gem — strong scores, little noise. ' : ''}${t.overview}`,
    };
  });
}

// ---- memory -------------------------------------------------------------------

// Titles shown but ignored sink a little every run (only inside their match tier).
const SKEY = 'cinescout.shown.v1';
export function loadShown() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }
export function recordShown(ids) {
  try {
    const m = loadShown();
    ids.forEach(id => { m[id] = (m[id] || 0) + 1; });
    localStorage.setItem(SKEY, JSON.stringify(m));
  } catch {}
}

const HKEY = 'matinee.history.v1', PKEY = 'matinee.prefs.v1', RKEY = 'matinee.runs.v1';
export function loadHistory() { try { const d = JSON.parse(localStorage.getItem(HKEY) || '{}'); return new Set([...(d.seen || []), ...(d.rejected || [])]); } catch { return new Set(); } }
export function saveHistory(s) { try { localStorage.setItem(HKEY, JSON.stringify({ seen: [...s], rejected: [] })); } catch {} }
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch { return null; } }
export function savePrefs(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }
export function loadRuns() { try { return +localStorage.getItem(RKEY) || 0; } catch { return 0; } }
export function saveRuns(n) { try { localStorage.setItem(RKEY, String(n)); } catch {} }
