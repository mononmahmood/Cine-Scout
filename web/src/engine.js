// Dynamic Akinator loop + anti-repetition + regional ranking (mirrors Engine.swift)
import { verify } from './data.js';

export function scoreTitle(t, tags) {
  const hit = t.tags.filter(x => tags.has(x)).length;
  const denom = Math.max(t.tags.length, 1);
  return hit / denom + (t.imdb - 8.0) * 0.15 + t.critic / 1000 + (t.gem ? 0.03 : 0);
}

export function rank(catalogue, tags) {
  return [...catalogue]
    .map(t => ({ t, s: tags.size === 0 ? 0.5 : scoreTitle(t, tags) }))
    .sort((a, b) => b.s - a.s);
}

export function marginOf(ranked) {
  if (ranked.length < 2) return 0;
  return ranked[0].s - ranked[1].s;
}

export function shouldStop(askedCount, margin) {
  if (askedCount >= 4) return true;
  if (askedCount >= 2 && margin > 0.30) return true;
  if (askedCount >= 3 && margin > 0.15) return true;
  return false;
}

export function buildRecommendations(catalogue, tags, region, history) {
  let cands = catalogue.filter(t => !history.has(t.id));
  cands = rank(cands.length ? cands : catalogue, tags).map(r => r.t).slice(0, 10);
  const scored = rank(cands, tags);
  const recs = scored.map(({ t, s }) => {
    const v = verify(t, region);
    const pct = Math.min(99, Math.max(62, Math.round(72 + s * 32) - (v.blocked ? 12 : 0)));
    const overlap = t.tags.filter(x => tags.has(x)).slice(0, 3).join(', ') || 'atmospheric pacing';
    return { ...v, id: t.id, title: t, pct, why: `Matches your ${overlap} mood. Rated ${t.imdb.toFixed(1)} on IMDb. ${t.overview}` };
  });
  return recs.sort((a, b) => (a.blocked - b.blocked) || (b.pct - a.pct));
}

export function topForPlatform(catalogue, region, history) {
  return catalogue
    .filter(t => t.imdb >= 8.0)
    .sort((a, b) => ((b.gem - a.gem) || ((b.imdb + b.critic / 100) - (a.imdb + a.critic / 100))))
    .filter(t => !history.has(t.id))
    .map(t => {
      const v = verify(t, region);
      const pct = Math.min(99, Math.max(80, Math.round(t.imdb * 10) + (t.gem ? 4 : 0)));
      return { ...v, id: t.id, title: t, pct, why: `${t.gem ? 'Hidden gem' : 'Top-rated'} · IMDb ${t.imdb.toFixed(1)} · Critics ${t.critic}. ${t.overview}` };
    });
}

// localStorage history tracker
const KEY = 'musepark.history.v1';
export function loadHistory() {
  try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); return new Set([...(d.seen || []), ...(d.rejected || [])]); }
  catch { return new Set(); }
}
export function saveHistory(set) {
  localStorage.setItem(KEY, JSON.stringify({ seen: [...set], rejected: [] }));
}
