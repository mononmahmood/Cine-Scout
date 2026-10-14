// Cine Scout thinker: mood fit + multi-source quality + freshness + personal taste. Always 10.
import { verify } from './data.js';

export function collectSignals(asked, answers, freeTags) {
  const tags = new Set(freeTags || []);
  const sig = {};
  asked.forEach(q => {
    const o = q.options.find(x => x.id === answers[q.id]); if (!o) return;
    (o.tags || []).forEach(t => tags.add(t));
    Object.assign(sig, o.signal || {});
    if (o.signal?.thrill !== undefined) sig.thrill = Math.max(sig.thrill ?? -1, o.signal.thrill);
    if (o.signal?.brain !== undefined) sig.brain = Math.max(sig.brain ?? -1, o.signal.brain);
    if (o.signal?.laugh !== undefined) sig.laugh = Math.max(sig.laugh ?? 0, o.signal.laugh);
    if (o.signal?.love !== undefined) sig.love = Math.max(sig.love ?? 0, o.signal.love);
    if (o.signal?.arthouse !== undefined) sig.arthouse = o.signal.arthouse;
  });
  return { tags, sig };
}

// Plain-words box: "something slow and sad, no comedy" -> tags
export function parseMoodText(text) {
  const t = (text || '').toLowerCase(); const out = new Set();
  const has = (...ws) => ws.some(w => t.includes(w));
  if (has('slow', 'quiet', 'calm', 'meditat')) out.add('slow-cinema').add('slow-burn');
  if (has('twist', 'confusing', 'mind', 'complex', 'hard')) out.add('twist').add('psych-fracture');
  if (has('laugh', 'funny', 'comedy', 'light', 'loose')) out.add('light-comedy').add('feel-good');
  if (has('dark', 'bleak', 'disturb')) out.add('moral-ambiguity').add('psych-fracture');
  if (has('love', 'romant', 'heart', 'sad', 'cry', 'emotion')) out.add('emotional');
  if (has('thrill', 'action', 'tense', 'edge', 'chase')) out.add('adrenaline');
  if (has('horror', 'scary', 'ghost', 'folk')) out.add('folk-horror');
  if (has('sci', 'space', 'future', 'dream')) out.add('sci-escape');
  if (has('true', 'real', 'based')) out.add('true-story').add('true-feel');
  if (has('art', 'festival', 'classic', 'criterion', 'satya', 'ray')) out.add('art-house').add('world-cinema');
  if (has('crime', 'murder', 'heist', 'mafia', 'detect')) out.add('crime-world');
  if (has('no comedy', 'not comedy', 'no laugh')) out.add('__no_comedy');
  if (has('no horror', 'not horror')) out.add('__no_horror');
  return out;
}

function quality(t, sig) {
  let q = (t.imdb / 10) * 0.45 + (t.critic / 100) * 0.3 + (t.buzz / 100) * 0.25;
  if (t.imdb < 7.4 || t.critic < 55) q -= 0.4; // never recommend trash
  return q;
}

function overexposed(t) { return t.imdb >= 8.7 && t.buzz >= 88; }

export function scoreTitle(t, tags, sig, prefs, runCount, shown) {
  const eff = new Set([...tags].filter(x => !x.startsWith('__')));
  const hit = t.tags.filter(x => eff.has(x)).length;
  const mood = eff.size === 0 ? 0.5 : hit / Math.max(t.tags.length, 1);
  let s = mood * 0.65 + quality(t, sig) * 0.28;
  if (shown && shown[t.id]) s -= Math.min(0.25, 0.06 * shown[t.id]); // seen-but-ignored sinks
  // anti-gimmick: famous legends step aside unless asked for safe legends or explicitly loved
  const lovedFamous = prefs?.lovedTags?.some(x => t.title.toLowerCase().includes(x));
  if (overexposed(t) && !sig.safeOnly && !lovedFamous) s -= 0.14;
  // freshness: unseen deep cuts rise when user wants digging or after several runs
  if ((sig.gemBoost || sig.freshBoost || (runCount || 0) >= 1) && t.gem && t.buzz < 75) s += 0.10;
  if (sig.safeOnly && (t.imdb < 8.3 || t.buzz < 78) && !t.gem) s -= 0.2;
  if (sig.gemBoost && t.gem) s += 0.06;
  if ((sig.safeOnly || sig.arthouse === 2 || sig.brain === 2) && t.awards?.length) s += 0.04; // acclaimed records
  // arthouse appetite
  if (sig.arthouse === 2 && t.tags.includes('art-house')) s += 0.10;
  if (sig.arthouse === -1 && t.tags.includes('art-house')) s -= 0.18;
  // taste
  if (prefs) {
    if (prefs.lovedTags?.some(x => t.title.toLowerCase().includes(x) || t.tags.includes(x))) s += 0.06;
    if (prefs.hatedTags?.some(x => t.title.toLowerCase().includes(x) || t.tags.includes(x))) s -= 0.3;
    if (prefs.langs?.length && !t.langs.some(l => prefs.langs.includes(l)) && !t.langs.includes('English')) s -= 0.1;
  }
  if (tags.has('__no_comedy') && (t.tags.includes('light-comedy') || t.tags.includes('dark-comedy'))) s -= 0.5;
  if (tags.has('__no_horror') && t.tags.includes('folk-horror')) s -= 0.5;
  if (sig.brain === 0 && t.tags.includes('psych-fracture')) s -= 0.3;
  if (sig.brain === 2 && t.tags.includes('light-comedy') && !t.tags.includes('dark-comedy')) s -= 0.2;
  if (sig.thrill === 0 && t.tags.includes('adrenaline')) s -= 0.3;
  if (sig.thrill === 2 && !(t.tags.includes('adrenaline') || t.tags.includes('crime-world') || t.tags.includes('twist'))) s -= 0.15;
  if (sig.laugh >= 2 && !(t.tags.includes('light-comedy') || t.tags.includes('dark-comedy'))) s -= 0.2;
  if (sig.love >= 2 && !(t.tags.includes('emotional') || t.tags.includes('romance-light') || t.tags.includes('hopeful'))) s -= 0.15;
  return s;
}

export function applyHardFilters(cat, sig, prefs) {
  return cat.filter(t => {
    if (prefs?.hideFamous && overexposed(t) && !sig.safeOnly) return false; // seen-the-famous-ones mode
    if (sig.noSeries && t.kind === 'tv') return false;
    if (!sig.seriesOk && t.kind === 'tv' && sig.maxRuntime && sig.maxRuntime <= 125) return false;
    if (sig.maxRuntime && t.kind === 'movie' && t.runtime > sig.maxRuntime + 45) return false;
    if (sig.minYear && t.year < sig.minYear) return false;
    if (sig.clean && t.tags.includes('psych-fracture') && t.imdb < 8.5) return false;
    if (prefs?.maxRuntime && t.kind === 'movie' && t.runtime > prefs.maxRuntime + 45) return false;
    if (prefs?.noSeries && t.kind === 'tv') return false;
    if (prefs?.langs?.length && !t.langs.some(l => prefs.langs.includes(l)) && !t.langs.includes('English')) return false;
    return true;
  });
}

export function rank(catalogue, tags, sig = {}, prefs = null, runCount = 0, shown = null) {
  return [...catalogue].map(t => ({ t, s: scoreTitle(t, tags, sig, prefs, runCount, shown) })).sort((a, b) => b.s - a.s);
}
export function marginOf(r) { return r.length < 2 ? 0 : r[0].s - r[1].s; }

export function shouldStop(n, margin) {
  if (n >= 8) return true;
  if (n >= 2 && margin > 0.22) return true;
  if (n >= 4 && margin > 0.10) return true;
  if (n >= 6 && margin > 0.06) return true;
  return false;
}

// Random + cooperative: shuffle need, add jitter so runs differ
export function pickNext(allQs, asked, tags, sig) {
  const remaining = allQs.filter(q => !asked.map(a => a.id).includes(q.id));
  if (!remaining.length) return null;
  const need = [];
  if (sig.thrill === undefined) need.push('thrill');
  if (sig.brain === undefined) need.push('energy');
  if (sig.arthouse === undefined) need.push('taste');
  if (tags.size < 3) need.push('heart', 'pace', 'escape');
  const pool = remaining.filter(q => need.includes(q.cat));
  const cands = pool.length ? pool : remaining;
  return cands[Math.floor(Math.random() * cands.length)];
}

export function coopLine(asked, answers) {
  if (!asked.length) return 'Tell me tonight in one tap — or type it below.';
  const last = asked[asked.length - 1];
  const o = last.options.find(x => x.id === answers[last.id]);
  const ack = (last.follow && o && last.follow[o.id]) || 'Noted.';
  return `${ack} Digging one layer deeper.`;
}

function diversify(ranked, limit = 10) {
  const out = []; const cluster = {};
  const keyOf = t => t.tags.includes('art-house') || t.tags.includes('slow-cinema') ? 'arthouse' : t.tags.includes('light-comedy') ? 'comedy' : t.tags.includes('crime-world') || t.tags.includes('adrenaline') ? 'thrill' : t.tags.includes('sci-escape') ? 'scifi' : 'drama';
  for (const r of ranked) {
    const k = keyOf(r.t);
    if ((cluster[k] || 0) >= 2) continue;
    cluster[k] = (cluster[k] || 0) + 1; out.push(r);
    if (out.length >= limit) break;
  }
  // fill to limit even if clusters exhausted (always 10)
  for (const r of ranked) { if (out.length >= limit) break; if (!out.includes(r)) out.push(r); }
  return out;
}

// Shown-memory: titles shown but ignored sink a little more every run.
// Stronger than history alone — kills across-run repeats.
const SKEY = 'cinescout.shown.v1';
export function loadShown() { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch { return {}; } }
export function recordShown(ids) {
  try {
    const m = loadShown();
    ids.forEach(id => { m[id] = (m[id] || 0) + 1; });
    localStorage.setItem(SKEY, JSON.stringify(m));
  } catch {}
}

function withLive(catalogue, live) {
  if (!live) return catalogue;
  return catalogue.map(t => {
    const b = live.buzz && live.buzz[t.id];
    const a = live.awards && live.awards.byId && live.awards.byId[t.id];
    let buzz = t.buzz;
    if (b && b.n > 0) buzz = Math.min(97, Math.max(t.buzz, 55 + b.n * 5));
    return { ...t, buzz, awards: a !== undefined ? a : (t.awards || []) };
  });
}

export function buildRecommendations(catalogue, tags, sig, region, history, prefs, runCount = 0, live = null, asked = [], answers = {}, freeText = '') {
  catalogue = withLive(catalogue, live);
  const shown = loadShown();
  // Stage 0: hard filters + seen exclusion (counted for the trace)
  const prePool = applyHardFilters(catalogue, sig, prefs);
  const unseen = prePool.filter(t => !history.has(t.id));
  const base = unseen.length >= 10 ? unseen : catalogue.filter(t => !history.has(t.id));
  const pool = base.length ? base : catalogue;
  // Stage 1: broad rank, keep 30
  const stage1 = rank(pool, tags, sig, prefs, runCount, shown).slice(0, 30);
  // Stage 2: deliberate rescore — agreement across answers + jitter + full context
  const rescored = stage1.map(({ t, s }) => {
    let agree = 0;
    for (const q of asked || []) {
      const o = q.options.find(x => x.id === (answers || {})[q.id]);
      if (o && (o.tags || []).some(tag => t.tags.includes(tag))) agree++;
    }
    return { t, s: s + Math.min(0.06, agree * 0.02) + (Math.random() - 0.5) * 0.05 };
  }).sort((a, b) => b.s - a.s);
  const ranked = diversify(rescored, 10);
  const recs = ranked.map(({ t, s }) => {
    const v = verify(t, region);
    const pct = Math.min(99, Math.max(58, Math.round(64 + s * 42) - (v.blocked ? 14 : 0)));
    const eff = [...tags].filter(x => !x.startsWith('__'));
    const overlap = t.tags.filter(x => eff.includes(x)).slice(0, 3).join(', ') || 'tonight’s energy';
    const src = `IMDb ${t.imdb.toFixed(1)} · Critics ${t.critic} · Buzz ${t.buzz}${t.gem ? ' · Deep cut' : ''}`;
    return { ...v, id: t.id, title: t, pct, src, honors: (t.awards || []).join(' · '), because: becauseOf(t, asked, answers, freeText), why: `Fits ${overlap}. ${t.overview} ${srcLine(t, sig)}` };
  });
  const sorted = recs.sort((a, b) => (a.blocked - b.blocked) || (b.pct - a.pct));
  const final = sorted.slice(0, 10);
  const eff = [...tags].filter(x => !x.startsWith('__'));
  const trace = {
    considered: prePool.length,
    excludedSeen: prePool.length - unseen.length,
    shortlisted: stage1.length,
    blocked: final.filter(r => r.isBlockedInRegion).length,
    signals: [...eff].slice(0, 5),
    agreed: asked ? asked.length : 0,
  };
  return { recs: final, trace };
}
function becauseOf(t, asked, answers, freeText) {
  const notes = [];
  for (const q of asked || []) {
    const o = q.options.find(x => x.id === (answers || {})[q.id]);
    if (o && (o.tags || []).some(tag => t.tags.includes(tag))) {
      const short = String(o.label).replace(/^[A-C]\)\s*/, '').slice(0, 60);
      if (!notes.includes(short)) notes.push(short);
    }
    if (notes.length === 2) break;
  }
  if (notes.length < 2 && freeText && freeText.trim()) notes.push(`your words: “${freeText.trim().slice(0, 60)}”`);
  return notes;
}

function srcLine(t, sig) {
  if (sig.brain === 0) return 'Easy watch, no homework.';
  if (sig.brain === 2) return 'Demands attention — pays off.';
  if (sig.thrill === 2) return 'Sustained tension throughout.';
  if (sig.laugh >= 2) return 'Picked to make you laugh.';
  return 'Cross-checked on IMDb, critics and buzz.';
}

export function topForPlatform(catalogue, pids, sort, region, history, live = null) {
  catalogue = withLive(catalogue, live);
  let list = catalogue.filter(t => t.imdb >= 7.5 && t.avail.some(a => pids.includes(a.p)));
  list = list.filter(t => !history.has(t.id));
  const shown = loadShown();
  const key = sort === 'buzz' ? (t => t.buzz - (shown[t.id] || 0) * 3) : sort === 'critics' ? (t => t.critic - (shown[t.id] || 0) * 3) : sort === 'gems' ? (t => (t.gem ? 1000 : 0) + t.imdb * 10 - (shown[t.id] || 0) * 5) : (t => t.imdb * 10 + t.critic / 10 + t.buzz / 20 + (t.gem ? 6 : 0) - (overexposed(t) ? 8 : 0) - (shown[t.id] || 0) * 4);
  return [...list].sort((a, b) => key(b) - key(a)).slice(0, 18).map(t => {
    const v = verify(t, region);
    return { ...v, id: t.id, title: t, pct: Math.min(99, Math.round(t.imdb * 10) + (t.gem ? 3 : 0)), src: `IMDb ${t.imdb.toFixed(1)} · Critics ${t.critic} · Buzz ${t.buzz}${t.gem ? ' · Deep cut' : ''}`, honors: (t.awards || []).join(' · '), why: `${t.gem ? 'Deep cut most subscribers miss' : 'Top-rated'} on ${pids.join(', ')}. ${t.overview}` };
  });
}

const HKEY = 'matinee.history.v1', PKEY = 'matinee.prefs.v1', RKEY = 'matinee.runs.v1';
export function loadHistory() { try { const d = JSON.parse(localStorage.getItem(HKEY) || '{}'); return new Set([...(d.seen || []), ...(d.rejected || [])]); } catch { return new Set(); } }
export function saveHistory(s) { localStorage.setItem(HKEY, JSON.stringify({ seen: [...s], rejected: [] })); }
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch { return null; } }
export function savePrefs(p) { localStorage.setItem(PKEY, JSON.stringify(p)); }
export function loadRuns() { try { return +localStorage.getItem(RKEY) || 0; } catch { return 0; } }
export function saveRuns(n) { localStorage.setItem(RKEY, String(n)); }
