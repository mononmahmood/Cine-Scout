import React, { useEffect, useRef, useState } from 'react';
import { redditFor, criticsFor } from './live.js';

export const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const wait = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));

// Full-bleed backdrop. Two persistent layers: the next image is preloaded,
// mounted invisibly on the back layer, then crossfaded in while both layers
// keep drifting — so there is never a pop, a restart, or a half-loaded image.
export function HeroReel({ pool }) {
  const ref = useRef(pool);
  ref.current = pool;
  const [layers, setLayers] = useState([{ src: null, n: 0 }, { src: null, n: 0 }]);
  const [front, setFront] = useState(0);
  const ready = pool.length > 0;
  useEffect(() => {
    if (!ready) return;
    let alive = true, cur = 1, last = null, timer;
    const pick = () => {
      const list = ref.current;
      let s = list[Math.floor(Math.random() * list.length)], guard = 0;
      while (s === last && guard++ < 8) s = list[Math.floor(Math.random() * list.length)];
      return s;
    };
    const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i.decode ? i.decode().then(() => true, () => true) : true); i.onerror = () => res(false); i.src = src; });
    const step = async () => {
      if (document.hidden) { timer = setTimeout(step, 1500); return; }
      let src, tries = 0;
      do { src = pick(); } while (!(await load(src)) && ++tries < 4);
      if (!alive) return;
      const next = 1 - cur;
      setLayers(L => { const c = [...L]; c[next] = { src, n: L[next].n + 1 }; return c; });
      requestAnimationFrame(() => requestAnimationFrame(() => { if (alive) setFront(next); }));
      cur = next; last = src;
      timer = setTimeout(step, REDUCED ? 20000 : 8000);
    };
    step();
    return () => { alive = false; clearTimeout(timer); };
  }, [ready]);
  return (
    <div className="hero" aria-hidden="true">
      {layers.map((l, i) => l.src && (
        <div key={i + '-' + l.n} className={`hero-layer drift-${l.n % 2} ${front === i ? 'on' : ''}`} style={{ backgroundImage: `url("${l.src}")` }} />
      ))}
      <div className="hero-shade" />
      <div className="hero-grain" />
    </div>
  );
}

export function Poster({ t }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true); }, [t.poster]);
  if (t.poster && !failed) return <img ref={ref} src={t.poster} alt={t.title} loading="lazy" className={loaded ? 'loaded' : ''} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />;
  const initials = t.title.split(' ').map(w => w[0]).slice(0, 2).join('');
  return <div className="poster-fallback"><span>{initials}</span><small>{t.year}</small></div>;
}

export function MatchRing({ pct, strict }) {
  const C = 2 * Math.PI * 17;
  return (
    <div className={`ring ${strict === false ? 'near' : ''}`} title={`${pct}%`}>
      <svg viewBox="0 0 40 40" width="46" height="46">
        <circle cx="20" cy="20" r="17" className="ring-bg" />
        <circle cx="20" cy="20" r="17" className="ring-fg" style={{ strokeDasharray: C, '--off': C * (1 - pct / 100), '--full': C }} />
      </svg>
      <b>{pct}<small>%</small></b>
    </div>
  );
}

export function SourceBars({ bars }) {
  return (
    <div className="bars">
      {bars.map((b, i) => (
        <div className="bar" key={b.k}>
          <span>{b.k}{b.live && <i className="livedot sm" />}</span>
          <div className="track"><div className="fill" style={{ '--w': Math.max(4, Math.min(100, b.v)) + '%', animationDelay: 0.15 + i * 0.07 + 's' }} /></div>
          <em>{b.txt}</em>
        </div>
      ))}
    </div>
  );
}

// What people and critics are saying right now — loaded per card, live.
function Buzz({ t }) {
  const [rd, setRd] = useState(null);
  const [cr, setCr] = useState(null);
  useEffect(() => {
    let alive = true;
    redditFor(t.title, t.year).then(d => alive && setRd(d)).catch(() => alive && setRd({ error: true }));
    criticsFor(t.title, t.year).then(d => alive && setCr(d)).catch(() => alive && setCr({ items: [] }));
    return () => { alive = false; };
  }, [t.key]);
  return (
    <div className="buzz">
      {!rd ? <div className="buzzline mut"><i className="spin" />Reading Reddit…</div>
        : rd.error ? null
        : rd.threads ? (
          <div className="buzzline">
            <b>Reddit</b> · {rd.threads} thread{rd.threads > 1 ? 's' : ''}{rd.top?.[0] && <> · <a href={rd.top[0].url} target="_blank" rel="noreferrer">“{rd.top[0].title.slice(0, 60)}”</a> <span className="mut">r/{rd.top[0].sub}</span></>}
          </div>
        ) : <div className="buzzline mut">Reddit · no recent threads</div>}
      {cr?.items?.length > 0 && (
        <div className="critics">
          {cr.items.slice(0, 2).map(i => <a key={i.url} href={i.url} target="_blank" rel="noreferrer"><b>{i.source}</b> {i.title.slice(0, 80)}</a>)}
        </div>
      )}
    </div>
  );
}

export function Card({ rec, index, leaving, onLove, onSeen, onReject }) {
  const [open, setOpen] = useState(false);
  const t = rec.title;
  return (
    <div className={`card ${leaving ? 'leaving' : ''}`} style={{ '--i': index }}>
      <div className="poster">
        <Poster t={t} />
        {rec.gem && <span className="ribbon">✦ Hidden gem</span>}
        {rec.festival && <span className="ribbon fest">Festival winner</span>}
        <div className="poster-fade" />
        <MatchRing pct={rec.pct} strict={rec.strict} />
      </div>
      <strong className="ctitle">{t.title}</strong>
      <div className="mut meta">{rec.meta}</div>
      {rec.strict === true && <div className="fitline ok">✓ Matches every answer</div>}
      {rec.strict === false && <div className="fitline near">Misses: {rec.missed.join(' · ')}</div>}
      <div className="why">{rec.why}</div>
      <SourceBars bars={rec.bars} />
      {rec.honors && <div className="honors">🏆 {rec.honors}</div>}
      <Buzz t={t} />
      <span className={`avail ${rec.blocked ? 'block' : 'ok'}`}>{rec.badge}</span>
      {rec.fallback && <div className="fb">{rec.fallback}</div>}
      <details className="howto" open={open} onToggle={e => setOpen(e.target.open)}>
        <summary>{open ? 'Hide watch steps' : 'Exactly how to watch'}</summary>
        <ol className="steps">{rec.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {rec.links.map((l, i) => <a key={i} className="linkbtn ext" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
      </details>
      <div className="mini">
        <button onClick={onLove}>♥ Loved it</button>
        <button onClick={onSeen}>Seen</button>
        <button onClick={onReject}>Not for me</button>
      </div>
    </div>
  );
}

export const SOURCES = (region, n) => [
  `Turning your ${n} answer${n === 1 ? '' : 's'} into strict rules`,
  'Searching the full TMDB catalogue live',
  'Dropping every title that breaks a rule',
  'Audience scores · TMDB',
  'Rotten Tomatoes + Metacritic · Wikidata',
  'Festival prizes and awards · Wikidata',
  `Where to stream in ${region === 'IN' ? 'India' : 'Bangladesh'}`,
];
export function Thinking({ region, n, label = 'Analyzing every source…' }) {
  return (
    <div className="q thinking">
      <strong>{label}</strong>
      <ul className="scan">{SOURCES(region, n).map((s, i) => <li key={s} style={{ '--i': i }}><i className="tick" />{s}</li>)}</ul>
      <div className="think" />
    </div>
  );
}
