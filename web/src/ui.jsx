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
    // rAF for smoothness; a timer as backup in case frames are paused (background tab, low-power mode)
    const onScroll = () => { if (!raf) { raf = requestAnimationFrame(update); setTimeout(() => { if (raf) { cancelAnimationFrame(raf); update(); } }, 120); } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); root.style.removeProperty('--p'); };
  }, [on]);
}

// One trailer moment in a muted, inline, control-less YouTube player, slowed
// to 0.75× for a calmer feel. Clips without a hand-picked window get a clean
// one chosen live: the middle of the trailer only — past the distributor
// logos (MUBI, Neon, A24…), before the title plate — so platform logos, award
// laurels and end cards never reach the screen. It is only shown while its
// picture is actually moving inside that window: if playback time stops
// advancing (buffering, a stall, a pause) it fades out before YouTube can
// draw a spinner or a play/pause button.
const RATE = 0.75;
function ClipFrame({ clip, visible, onReady, onTime }) {
  const frame = useRef(null);
  const win = useRef(null); // { start, len } — the clean window being shown
  const cb = useRef({ onReady, onTime });
  cb.current = { onReady, onTime };
  const [moving, setMoving] = useState(false);
  // freeze the clip the moment it is no longer the one on screen — a paused
  // player can draw YouTube's big play button, so this runs only while hidden
  useEffect(() => {
    if (visible) return;
    try { frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*'); } catch {}
  }, [visible]);
  useEffect(() => {
    let last = -1, lastAt = 0, state = -1, slowed = false, playAt = 0, dur = 0, ct = -1;
    const cmd = (func, args = []) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
    const onMsg = e => {
      // player messages only: both the source frame and the origin must match
      if (e.origin !== 'https://www.youtube-nocookie.com' && e.origin !== 'https://www.youtube.com') return;
      if (e.source !== frame.current?.contentWindow) return; // several players can be live at once
      let d; try { d = JSON.parse(e.data); } catch { return; }
      const info = d.info || {};
      const st = d.event === 'onStateChange' ? d.info : info.playerState;
      if (typeof st === 'number') state = st;
      if (typeof info.duration === 'number' && info.duration > 0) dur = info.duration;
      if (!dur && info.videoData?.length_seconds) dur = +info.videoData.length_seconds;
      if (state === 1 && !slowed) { cmd('setPlaybackRate', [RATE]); cmd('mute'); slowed = true; playAt = Date.now(); }
      // choose the clean window once the trailer's real length is known (or,
      // if the player never reports it, after 3 s on a typical-length guess).
      // The 30–55 % band skips the cold open (distributor logos) and the
      // back half (title cards, laurels, end plates) of typical trailers.
      if (state === 1 && slowed && !win.current) {
        let w = null;
        if (clip.start != null) w = { start: clip.start, len: clip.len }; // hand-picked: trusted as-is
        else if (dur >= 45) {
          const len = Math.min(10, Math.max(7, Math.round(dur * 0.1)));
          w = { start: Math.round((dur * 0.3 + Math.random() * Math.max(4, dur * 0.25 - len)) * 10) / 10, len };
        } else if (dur >= 25) w = { start: Math.round(dur * 0.35 * 10) / 10, len: Math.min(7, Math.round(dur * 0.22)) };
        else if (Date.now() - playAt > 3000) w = { start: 42, len: 8 }; // length unknown: middle of a typical trailer
        if (w) {
          win.current = w;
          cmd('seekTo', [w.start, true]);
          cb.current.onReady(w);
        }
      }
      if (typeof info.currentTime === 'number') {
        if (info.currentTime > last + 0.01) { last = info.currentTime; lastAt = Date.now(); }
        ct = info.currentTime;
        const w = win.current;
        // nothing is reported until playback is actually inside the window,
        // so pre-seek frames (the opening logos) can never show
        cb.current.onTime(w && info.currentTime >= w.start - 0.3 ? info.currentTime - w.start : null);
      }
    };
    // watchdog: visible only while the player is "playing", time moved in the
    // last 0.7 s, and the picture is strictly inside the clean window — the
    // moment any of those slip (buffer, pause, seek, window end) it hides,
    // taking YouTube's pause/play chrome with it
    const dog = setInterval(() => {
      const w = win.current;
      setMoving(state === 1 && Date.now() - lastAt < 700 && !document.hidden && w != null
        && ct >= w.start - 0.35 && ct <= w.start + w.len + 0.2);
    }, 150);
    window.addEventListener('message', onMsg);
    return () => { window.removeEventListener('message', onMsg); clearInterval(dog); };
  }, [clip]);
  const onLoad = () => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.postMessage(JSON.stringify({ event: 'listening', id: clip.key, channel: 'widget' }), '*');
    w.postMessage(JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }), '*');
    w.postMessage(JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }), '*');
  };
  const src = `https://www.youtube-nocookie.com/embed/${clip.key}?autoplay=1&mute=1&controls=0&playsinline=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&hl=en&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  return <iframe ref={frame} className={`intro-video ${visible && moving ? 'on' : ''}`} src={src} title="" allow="autoplay; encrypted-media" tabIndex={-1} onLoad={onLoad} />;
}

// A reel of calm trailer moments, each playing its clean window once (at
// 0.75×). The next clip loads in a hidden player ~5 s before the window ends,
// then the two crossfade slowly; no poster is ever shown. When the batch runs
// out, onExhausted asks for a fresh one — the reel keeps rotating with new
// material instead of looping the same few clips.
export function IntroReel({ clips, onExhausted }) {
  const [slots, setSlots] = useState([]); // { n, i, ready, win }
  const [active, setActive] = useState(0);
  const [dead, setDead] = useState(false); // playback blocked (Low Power Mode, Data Saver…)
  const cycled = useRef(false);
  const fails = useRef(0);
  const timers = useRef({});
  useEffect(() => {
    if (!clips?.length) return;
    cycled.current = false;
    fails.current = 0; setDead(false);
    Object.values(timers.current).forEach(clearTimeout); timers.current = {};
    setSlots([{ n: 0, i: 0, ready: false, win: null }]); setActive(0);
  }, [clips]);
  const live = useRef({ slots: [], active: 0, clips: [] });
  live.current = { slots, active, clips };
  const clearTimer = n => { if (timers.current[n]) { clearTimeout(timers.current[n]); delete timers.current[n]; } };
  const advance = slot => {
    const { slots: s, clips: cs } = live.current;
    clearTimer(slot.n);
    const nextN = slot.n + 1, last = slot.i >= cs.length - 1;
    if (!s.find(x => x.n === nextN) && !last) setSlots(cur => [...cur, { n: nextN, i: slot.i + 1, ready: false, win: null }]);
    live.current.active = nextN; setActive(nextN);
    setTimeout(() => setSlots(cur => cur.filter(x => x.n !== slot.n)), 2600);
    if (last && !cycled.current) { cycled.current = true; onExhausted?.(); }
  };
  const ready = (n, win) => {
    if (live.current.slots.find(x => x.n === n)?.ready) return;
    setSlots(s => s.map(x => (x.n === n ? { ...x, ready: true, win } : x)));
    // safety net: a clip that never actually plays its window is left after 8 s;
    // two dead clips in a row means playback is blocked on this device — stand
    // down and let the poster reel show instead
    clearTimer(n);
    timers.current[n] = setTimeout(() => {
      const s = live.current.slots.find(x => x.n === n);
      if (live.current.active !== n || !s) return;
      fails.current++;
      if (fails.current >= 2) setDead(true);
      else advance(s);
    }, 8000);
  };
  const onTime = (slot, t) => {
    const { slots: s, active: a, clips: cs } = live.current;
    if (slot.n !== a || !cs?.length || t == null) return;
    fails.current = 0; // this clip is genuinely playing
    const w = slot.win; if (!w) return;
    const next = s.find(x => x.n === slot.n + 1);
    const last = slot.i >= cs.length - 1;
    if (t >= w.len - 5 && !next && !last) { setSlots([...s, { n: slot.n + 1, i: slot.i + 1, ready: false, win: null }]); return; }
    // hand over at the end of the window; if the next one isn't moving yet, wait up to 4 s more
    if (next && ((t >= w.len && next.ready) || t >= w.len + 4)) advance(slot);
  };
  const cur = slots.find(x => x.n === active);
  const clip = cur && clips[cur.i];
  return (
    <div className="intro-bg" aria-hidden="true">
      <div className="intro-drift">
        {!REDUCED && !dead && slots.map(x => (
          <ClipFrame key={x.n} clip={clips[x.i]} visible={x.n === active} onReady={win => ready(x.n, win)} onTime={t => onTime(x, t)} />
        ))}
      </div>
      {!dead && <>
        <div className="intro-leak" />
        <div className="intro-shade" />
        <div className="intro-gate"><i /><i /><i /><i /></div>
        {clip && <div className="intro-credit" key={clip.key}>Now showing · <i>{clip.title}</i> ({clip.year}) · official trailer</div>}
      </>}
      <div className="hero-grain" />
    </div>
  );
}

export function IntroHero({ onStart }) {
  return (
    <section className="intro-hero">
      <div className="intro-copy">
        <h1 className="logo big">CINE <span className="scout">SCOUT</span></h1>
        <p className="slogan">for those who stay for the credits</p>
        <p className="lede intro-lede">Not sure what to watch tonight?<br />Answer a few questions — we'll find films and series that fit your mood.</p>
      </div>
      <button className="intro-cue" onClick={onStart}>
        <span>Scroll to start</span>
        <i>⌄</i>
      </button>
    </section>
  );
}
