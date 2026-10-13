// Matinee thinker: mood fit + multi-source quality + freshness + personal taste. Always 10.
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

export function scoreTitle(t, tags, sig, prefs, runCount) {
  const eff = new Set([...tags].filter(x => !x.startsWith('__')));
  const hit = t.tags.filter(x => eff.has(x)).length;
  const mood = eff.size === 0 ? 0.5 : hit / Math.max(t.tags.length, 1);
  let s = mood * 0.55 + quality(t, sig) * 0.35;
  // anti-gimmick: famous legends step aside unless asked for safe legends or explicitly loved
  const lovedFamous = prefs?.lovedTags?.some(x => t.title.toLowerCase().includes(x));
  if (overexposed(t) && !sig.safeOnly && !lovedFamous) s -= 0.14;
  // freshness: unseen deep cuts rise when user wants digging or after several runs
  if ((sig.gemBoost || sig.freshBoost || (runCount || 0) >= 1) && t.gem && t.buzz < 75) s += 0.10;
  if (sig.safeOnly && (t.imdb < 8.3 || t.buzz < 78) && !t.gem) s -= 0.2;
  if (sig.gemBoost && t.gem) s += 0.06;
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
  if ((sig.safeOnly || sig.arthouse === 2 || sig.brain === 2) && t.awards?.length) s += 0.04; // acclaimed records
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

export function rank(catalogue, tags, sig = {}, prefs = null, runCount = 0) {
  return [...catalogue].map(t => ({ t, s: scoreTitle(t, tags, sig, prefs, runCount) })).sort((a, b) => b.s - a.s);
}
export function marginOf(r) { return r.length < 2 ? 0 : r[0].s - r[1].s; }

export function shouldStop(n, margin) {
  if (n >= 6) return true;
  if (n >= 2 && margin > 0.22) return true;
  if (n >= 4 && margin > 0.10) return true;
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
    if ((cluster[k] || 0) >= 3) continue;
    cluster[k] = (cluster[k] || 0) + 1; out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildRecommendations(catalogue, tags, sig, region, history, prefs, runCount = 0) {
  const pool = applyHardFilters(catalogue, sig, prefs).filter(t => !history.has(t.id));
  const base = pool.length >= 10 ? pool : catalogue.filter(t => !history.has(t.id));
  const ranked = diversify(rank(base.length ? base : catalogue, tags, sig, prefs, runCount), 10);
  const recs = ranked.map(({ t, s }) => {
    const v = verify(t, region);
    const pct = Math.min(99, Math.max(62, Math.round(72 + s * 42) - (v.blocked ? 14 : 0)));
    const eff = [...tags].filter(x => !x.startsWith('__'));
    const overlap = t.tags.filter(x => eff.includes(x)).slice(0, 3).join(', ') || 'tonight’s energy';
    const src = `IMDb ${t.imdb.toFixed(1)} · Critics ${t.critic} · Buzz ${t.buzz}${t.gem ? ' · Deep cut' : ''}`;
    return { ...v, id: t.id, title: t, pct, src, honors: (t.awards || []).join(' · '), why: `Fits ${overlap}. ${t.overview} ${srcLine(t, sig)}` };
  });
  return recs.sort((a, b) => (a.blocked - b.blocked) || (b.pct - a.pct)).slice(0, 10);
}
function srcLine(t, sig) {
  if (sig.brain === 0) return 'Easy watch, no homework.';
  if (sig.brain === 2) return 'Demands attention — pays off.';
  if (sig.thrill === 2) return 'Sustained tension throughout.';
  if (sig.laugh >= 2) return 'Picked to make you laugh.';
  return 'Cross-checked on IMDb, critics and buzz.';
}

export function topForPlatform(catalogue, pids, sort, region, history) {
  let list = catalogue.filter(t => t.imdb >= 7.8 && t.avail.some(a => pids.includes(a.p)));
  list = list.filter(t => !history.has(t.id));
  const key = sort === 'buzz' ? (t => t.buzz) : sort === 'critics' ? (t => t.critic) : sort === 'gems' ? (t => (t.gem ? 1000 : 0) + t.imdb * 10) : (t => t.imdb * 10 + t.critic / 10 + t.buzz / 20 + (t.gem ? 6 : 0) - (overexposed(t) ? 8 : 0));
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
