// Heavy-thinker engine: mood fit + multi-source quality + personal prefs + diversity + no-trash guard.
import { verify } from './data.js';

export function collectSignals(asked, answers) {
  const tags = new Set(); const sig = {};
  asked.forEach(q => {
    const o = q.options.find(x => x.id === answers[q.id]); if (!o) return;
    (o.tags || []).forEach(t => tags.add(t));
    Object.assign(sig, o.signal || {});
    if (o.signal?.thrill !== undefined) sig.thrill = Math.max(sig.thrill ?? -1, o.signal.thrill);
    if (o.signal?.brain !== undefined) sig.brain = Math.max(sig.brain ?? -1, o.signal.brain);
    if (o.signal?.laugh !== undefined) sig.laugh = Math.max(sig.laugh ?? 0, o.signal.laugh);
    if (o.signal?.love !== undefined) sig.love = Math.max(sig.love ?? 0, o.signal.love);
  });
  return { tags, sig };
}

function quality(t, sig) {
  // multi-source: imdb + critics + subscriber buzz; trash (low both) can never win
  let q = (t.imdb / 10) * 0.45 + (t.critic / 100) * 0.3 + (t.buzz / 100) * 0.25;
  if (t.imdb < 7.5 || t.critic < 55) q -= 0.35; // no failure / trashy
  if (sig.safeOnly && (t.imdb < 8.3 || t.buzz < 78)) q -= 0.2;
  if (sig.gemBoost && t.gem) q += 0.08;
  return q;
}

export function scoreTitle(t, tags, sig, prefs) {
  const hit = t.tags.filter(x => tags.has(x)).length;
  const denom = Math.max(t.tags.length, 1);
  return hit / denom + (t.imdb - 8.0) * 0.15 + t.critic / 1000 + (t.gem ? 0.03 : 0);
}

export function applyHardFilters(cat, sig, prefs) {
  return cat.filter(t => {
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

export function rank(catalogue, tags, sig = {}, prefs = null) {
  return [...catalogue].map(t => ({ t, s: scoreTitle(t, tags, sig, prefs) })).sort((a, b) => b.s - a.s);
}
export function marginOf(r) { return r.length < 2 ? 0 : r[0].s - r[1].s; }

// Dynamic stop: confident early (2 Qs), else up to 6. Picks next question by category need.
const CAT_ORDER = ['energy', 'heart', 'thrill', 'pace', 'escape', 'context', 'visual', 'risk'];
export function shouldStop(n, margin) {
  if (n >= 6) return true;
  if (n >= 2 && margin > 0.22) return true;
  if (n >= 4 && margin > 0.10) return true;
  return false;
}
export function pickNext(allQs, asked, tags, sig) {
  const remaining = allQs.filter(q => !asked.map(a => a.id).includes(q.id));
  if (!remaining.length) return null;
  // prioritize categories that disambiguate current signals
  const need = [];
  if (sig.thrill === undefined) need.push('thrill');
  if (sig.brain === undefined) need.push('energy');
  if (tags.size < 3) need.push('heart', 'pace');
  remaining.sort((a, b) => {
    const ai = need.includes(a.cat) ? 0 : CAT_ORDER.indexOf(a.cat) + 10;
    const bi = need.includes(b.cat) ? 0 : CAT_ORDER.indexOf(b.cat) + 10;
    return ai - bi;
  });
  return remaining[0];
}

function diversify(ranked, limit = 10) {
  const out = []; const cluster = {};
  for (const r of ranked) {
    const key = r.t.tags.includes('light-comedy') ? 'comedy' : r.t.tags.includes('crime-world') || r.t.tags.includes('adrenaline') ? 'thrill' : r.t.tags.includes('sci-escape') ? 'scifi' : 'drama';
    if ((cluster[key] || 0) >= 3) continue;
    cluster[key] = (cluster[key] || 0) + 1; out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildRecommendations(catalogue, tags, sig, region, history, prefs) {
  const pool = applyHardFilters(catalogue, sig, prefs).filter(t => !history.has(t.id));
  const base = pool.length >= 10 ? pool : catalogue.filter(t => !history.has(t.id));
  const ranked = diversify(rank(base.length ? base : catalogue, tags, sig, prefs), 10);
  const recs = ranked.map(({ t, s }) => {
    const v = verify(t, region);
    const pct = Math.min(99, Math.max(62, Math.round(72 + s * 42) - (v.blocked ? 14 : 0)));
    const overlap = t.tags.filter(x => tags.has(x)).slice(0, 3).join(', ') || 'tonight’s energy';
    const src = `IMDb ${t.imdb.toFixed(1)} · Critics ${t.critic} · Buzz ${t.buzz}${t.gem ? ' · Hidden gem' : ''}`;
    return { ...v, id: t.id, title: t, pct, src, why: `Fits ${overlap}. ${t.overview} ${srcLine(t, sig)}` };
  });
  return recs.sort((a, b) => (a.blocked - b.blocked) || (b.pct - a.pct)).slice(0, 10);
}
function srcLine(t, sig) {
  if (sig.brain === 0) return 'Easy watch, no homework needed.';
  if (sig.brain === 2) return 'Demands full attention — worth it.';
  if (sig.thrill === 2) return 'Genuinely tense throughout.';
  if (sig.laugh >= 2) return 'Chosen to make you laugh tonight.';
  return 'Checked across IMDb, critics and subscriber buzz.';
}

export function topForPlatform(catalogue, pids, sort, region, history) {
  let list = catalogue.filter(t => t.imdb >= 7.8 && t.avail.some(a => pids.includes(a.p)));
  list = list.filter(t => !history.has(t.id));
  const key = sort === 'buzz' ? (t => t.buzz) : sort === 'critics' ? (t => t.critic) : sort === 'gems' ? (t => (t.gem ? 1000 : 0) + t.imdb * 10) : (t => t.imdb * 10 + t.critic / 10 + t.buzz / 20 + (t.gem ? 6 : 0));
  return [...list].sort((a, b) => key(b) - key(a)).slice(0, 18).map(t => {
    const v = verify(t, region);
    return { ...v, id: t.id, title: t, pct: Math.min(99, Math.round(t.imdb * 10) + (t.gem ? 3 : 0)), src: `IMDb ${t.imdb.toFixed(1)} · Critics ${t.critic} · Buzz ${t.buzz}${t.gem ? ' · Gem' : ''}`, why: `${t.gem ? 'Hidden gem many subscribers miss' : 'Top-rated'} on ${pids.join(', ')}. ${t.overview}` };
  });
}

// persistence
const HKEY = 'musepark.history.v1', PKEY = 'musepark.prefs.v1';
export function loadHistory() { try { const d = JSON.parse(localStorage.getItem(HKEY) || '{}'); return new Set([...(d.seen || []), ...(d.rejected || [])]); } catch { return new Set(); } }
export function saveHistory(s) { localStorage.setItem(HKEY, JSON.stringify({ seen: [...s], rejected: [] })); }
export function loadPrefs() { try { return JSON.parse(localStorage.getItem(PKEY) || 'null'); } catch { return null; } }
export function savePrefs(p) { localStorage.setItem(PKEY, JSON.stringify(p)); }
