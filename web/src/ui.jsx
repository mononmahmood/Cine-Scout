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

export function Scores({ scores }) {
  return (
    <div className="scores">
      {scores.map((x, i) => (
        <span key={x.k} className={`sc ${x.cls}`} style={{ '--i': i }}>
          <b>{x.k}</b>{x.txt}{x.sub && <small>{x.sub}</small>}
        </span>
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
  const crit = cr?.items?.[0];
  if (!rd && !cr) return <div className="buzz"><span className="buzzline mut"><i className="spin" />Checking Reddit and critics…</span></div>;
  if (!(rd?.threads) && !crit) return null;
  return (
    <div className="buzz">
      {rd?.threads > 0 && <a className="buzzline" href={rd.top?.[0]?.url} target="_blank" rel="noreferrer"><b>Reddit</b> {rd.threads} thread{rd.threads > 1 ? 's' : ''}{rd.top?.[0] && <span className="mut"> · r/{rd.top[0].sub}</span>}</a>}
      {crit && <a className="buzzline crit" href={crit.url} target="_blank" rel="noreferrer"><b>{crit.source}</b> {crit.title.slice(0, 70)}</a>}
    </div>
  );
}

export function Card({ rec, index, leaving, onLove, onSeen, onReject }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const t = rec.title;
  return (
    <div className={`card ${leaving ? 'leaving' : ''}`} style={{ '--i': index }}>
      <div className="poster">
        <Poster t={t} />
        {rec.gem && <span className="ribbon">✦ Hidden gem</span>}
        <div className="poster-fade" />
        <MatchRing pct={rec.pct} strict={rec.strict} />
      </div>
      <div className="cbody">
        <strong className="ctitle">{t.title}</strong>
        <div className="mut meta">{rec.meta}</div>
        <Scores scores={rec.scores} />
        {rec.strict === false && <div className="fitline near">Misses: {rec.missed.join(' · ')}</div>}
        {rec.why && <div className={`why ${more ? 'open' : ''}`} onClick={() => setMore(m => !m)}>{rec.why}</div>}
        {rec.honors && <div className="honors">🏆 {rec.honors}</div>}
        <Buzz t={t} />
        <span className={`avail ${rec.blocked ? 'block' : 'ok'}`}>{rec.badge}</span>
        <details className="howto" open={open} onToggle={e => setOpen(e.target.open)}>
          <summary>{open ? 'Hide watch steps' : 'How to watch'}</summary>
          {rec.fallback && <div className="fb">{rec.fallback}</div>}
          <ol className="steps">{rec.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {rec.links.map((l, i) => <a key={i} className="linkbtn ext" href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>)}
        </details>
        <div className="mini">
          <button onClick={onLove} title="Loved it">♥ Loved</button>
          <button onClick={onSeen}>Seen</button>
          <button onClick={onReject}>Not for me</button>
        </div>
      </div>
    </div>
  );
}

// Analyzing: an old film-leader countdown. The sweep turns once per number;
// the line underneath names the real step being worked on.
const STAGES = region => [
  'Turning your answers into rules',
  'Searching every title on TMDB',
  'Throwing out anything that breaks a rule',
  'Reading IMDb ratings',
  'Rotten Tomatoes · Metacritic · festival prizes',
  `Checking what streams in ${region === 'IN' ? 'India' : 'Bangladesh'}`,
];
export function Thinking({ region, label = 'Rolling the reel', stages }) {
  const list = stages || STAGES(region);
  const [n, setN] = useState(8);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const a = setInterval(() => setN(x => (x <= 2 ? 8 : x - 1)), 900);
    const b = setInterval(() => setStage(x => Math.min(x + 1, list.length - 1)), 1100);
    return () => { clearInterval(a); clearInterval(b); };
  }, [region]);
  return (
    <div className="leaderwrap">
      <div className="leader" aria-label="Analyzing">
        <div className="sweep" key={n} />
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" /><circle cx="50" cy="50" r="36" /><line x1="50" y1="0" x2="50" y2="100" /><line x1="0" y1="50" x2="100" y2="50" /></svg>
        <b key={'n' + n}>{n}</b>
      </div>
      <div className="leadertext">
        <strong>{label}</strong>
        <span key={stage}>{list[stage]}</span>
      </div>
    </div>
  );
}

// Scroll progress through the first screen, as a CSS variable (--p: 0 → 1),
// so the clip can blur and the questions rise without re-rendering React.
export function useIntroScroll(on) {
  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    let raf = 0;
    const update = () => { raf = 0; root.style.setProperty('--p', Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.75))).toFixed(3)); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); root.style.removeProperty('--p'); };
  }, [on]);
}

// Full-screen looping moment from an official trailer (muted, inline, no
// controls). The trailer's backdrop shows until the video is really playing,
// and stays if the video can't play (low-power mode, blocked embeds).
export function IntroClip({ clip }) {
  const frame = useRef(null);
  const [playing, setPlaying] = useState(false);
  const len = 12;
  useEffect(() => {
    if (!clip) return;
    const cmd = (func, args = []) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    const onMsg = e => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let d; try { d = JSON.parse(e.data); } catch { return; }
      const state = d.event === 'onStateChange' ? d.info : d.event === 'infoDelivery' ? d.info?.playerState : undefined;
      if (state === 1) setPlaying(true);
      if (state === 0) { cmd('seekTo', [clip.start, true]); cmd('playVideo'); } // loop the same short moment, like a GIF
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [clip]);
  const onLoad = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.postMessage(JSON.stringify({ event: 'listening', id: 'intro', channel: 'widget' }), '*');
    w.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*');
  };
  const src = clip && `https://www.youtube-nocookie.com/embed/${clip.key}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&start=${clip.start}&end=${clip.start + len}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  return (
    <div className="intro-bg" aria-hidden="true">
      {clip?.backdrop && <div className="intro-still" style={{ backgroundImage: `url("${clip.backdrop}")` }} />}
      {src && !REDUCED && <iframe ref={frame} className={`intro-video ${playing ? 'on' : ''}`} src={src} title="" allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1} onLoad={onLoad} />}
      <div className="intro-shade" />
      <div className="hero-grain" />
    </div>
  );
}

export function IntroHero({ clip, onStart }) {
  return (
    <section className="intro-hero">
      <div className="intro-copy">
        <h1 className="logo big">CINE <span className="scout">SCOUT</span></h1>
        <p className="slogan">for those who stay for the credits</p>
      </div>
      <button className="intro-cue" onClick={onStart}>
        <span>Scroll to start</span>
        <i>⌄</i>
      </button>
      {clip && <div className="intro-credit">Now showing · {clip.title} — official trailer</div>}
    </section>
  );
}
