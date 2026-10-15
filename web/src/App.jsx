import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGUE, QUESTIONS, PLATFORMS, fetchCatalogue } from './data.js';
import { analyze, parseMood, EMPTY_MOOD, strictPool, pickNext, shouldFinish, MAX_Q, coopLine, buildRecommendations, topForPlatform, loadHistory, saveHistory, loadPrefs, savePrefs, loadRuns, saveRuns, recordShown } from './engine.js';
import { loadPosterCache, cachedUrl } from './posterBoost.js';
import { pullAwardsLive, pullBuzzLive, pullRedditHot, loadLive, saveLive } from './live.js';

const LANGS = ['Hindi', 'English', 'Korean', 'Bengali'];
const REDUCED = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, REDUCED ? 0 : ms));

// Full-bleed backdrop. Two persistent layers: the next poster is preloaded,
// mounted invisibly on the back layer, then crossfaded in while both layers
// keep drifting — so there is never a pop, a restart, or a half-loaded image.
function HeroReel({ pool, artPool }) {
  const pools = useRef({ pool, artPool });
  pools.current = { pool, artPool };
  const [layers, setLayers] = useState([{ src: null, n: 0 }, { src: null, n: 0 }]);
  const [front, setFront] = useState(0);
  const ready = pool.length > 0;
  useEffect(() => {
    if (!ready) return;
    let alive = true, cur = 1, last = null, timer;
    const pick = () => {
      const { pool: p, artPool: a } = pools.current;
      const list = a.length && Math.random() < 0.45 ? a : p;
      let s = list[Math.floor(Math.random() * list.length)].src, guard = 0;
      while (s === last && guard++ < 8) s = list[Math.floor(Math.random() * list.length)].src;
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
      // two frames: let the hidden layer paint at its start pose before fading in
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

function Poster({ t, src }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true); }, [src]);
  if (src && !failed) return <img ref={ref} src={src} alt={t.title} loading="lazy" className={loaded ? 'loaded' : ''} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />;
  const initials = t.title.split(' ').map(w => w[0]).slice(0, 2).join('');
  return <div className="poster-fallback"><span>{initials}</span><small>{t.year}</small></div>;
}

function MatchRing({ pct, strict }) {
  const C = 2 * Math.PI * 17;
  return (
    <div className={`ring ${strict === false ? 'near' : ''}`} title={`${pct}% match`}>
      <svg viewBox="0 0 40 40" width="46" height="46">
        <circle cx="20" cy="20" r="17" className="ring-bg" />
        <circle cx="20" cy="20" r="17" className="ring-fg" style={{ strokeDasharray: C, '--off': C * (1 - pct / 100), '--full': C }} />
      </svg>
      <b>{pct}<small>%</small></b>
    </div>
  );
}

function SourceBars({ bars }) {
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

function Card({ rec, src, index, leaving, onLove, onSeen, onReject }) {
  const [open, setOpen] = useState(false);
  const t = rec.title;
  return (
    <div className={`card ${leaving ? 'leaving' : ''}`} style={{ '--i': index }}>
      <div className="poster">
        <Poster t={t} src={src} />
        {rec.gem && <span className="ribbon">✦ Hidden gem</span>}
        <div className="poster-fade" />
        <MatchRing pct={rec.pct} strict={rec.strict} />
      </div>
      <strong className="ctitle">{t.title}</strong>
      <div className="mut meta">{t.year} · {t.kind === 'tv' ? 'Series' : 'Film'}{t.kind === 'movie' ? ` · ${t.runtime} min` : ''} · {t.langs.slice(0, 2).join(', ')}</div>
      {rec.strict === true && <div className="fitline ok">✓ Matches every answer</div>}
      {rec.strict === false && <div className="fitline near">Misses: {rec.missed.join(' · ')}</div>}
      <div className="why">{rec.why}</div>
      <SourceBars bars={rec.bars} />
      {rec.because?.length > 0 && <div className="because">Because you picked: {rec.because.join(' · ')}</div>}
      {rec.honors && <div className="honors">🏆 {rec.honors}</div>}
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

const SOURCES = (region, n) => [
  `Reading your ${n} answer${n === 1 ? '' : 's'} as strict requirements`,
  'Dropping everything that breaks a hard rule',
  'IMDb audience ratings',
  'Critics score',
  'Rotten Tomatoes + Metacritic · Wikidata live',
  'Reddit film-sub chatter · live',
  'Awards · Wikidata live',
  `Checking streaming in ${region === 'IN' ? 'India' : 'Bangladesh'}`,
];
function Thinking({ region, n }) {
  return (
    <div className="q thinking">
      <strong>Analyzing every source…</strong>
      <ul className="scan">{SOURCES(region, n).map((s, i) => <li key={s} style={{ '--i': i }}><i className="tick" />{s}</li>)}</ul>
      <div className="think" />
    </div>
  );
}

function rulesOf(sig, avoided) {
  const r = [];
  if (sig.maxRuntime) r.push(`Under ${Math.round(sig.maxRuntime / 60)} h`);
  if (sig.noSeries) r.push('Films only');
  if (sig.onlySeries) r.push('Series only');
  if (sig.minYear) r.push(`${sig.minYear}+`);
  if (sig.thrill === 0) r.push('No tension');
  if (sig.brain === 0) r.push('Nothing heavy');
  if (sig.arthouse === -1) r.push('No art-house');
  if (sig.clean) r.push('Group-safe');
  if (sig.safeOnly) r.push('Legends only');
  if (sig.gemBoost) r.push('No famous titles');
  (avoided || []).forEach(a => r.push(`No ${a}`));
  return r;
}

function Onboard({ initial, onDone }) {
  const [langs, setLangs] = useState(initial?.langs || ['Hindi', 'English']);
  const [maxRuntime, setMaxRuntime] = useState(initial?.maxRuntime || 240);
  const [noSeries, setNoSeries] = useState(initial?.noSeries || false);
  const [loved, setLoved] = useState((initial?.lovedTags || []).join(', '));
  const [hated, setHated] = useState((initial?.hatedTags || []).join(', '));
  const [hideFamous, setHideFamous] = useState(initial?.hideFamous || false);
  const tg = k => setLangs(langs.includes(k) ? langs.filter(x => x !== k) : [...langs, k]);
  const split = s => s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  return (
    <div className="onboard">
      <h2>One minute, then it knows you.</h2>
      <p className="mut">Taste + history. Nothing repeats, legends step aside unless you ask for them.</p>
      <label>Languages you enjoy <span className="mut">(English titles always allowed)</span></label>
      <div className="chips">{LANGS.map(l => <button key={l} className={`chip ${langs.includes(l) ? 'on' : ''}`} onClick={() => tg(l)}>{l}</button>)}</div>
      <label>Max movie length: <b>{maxRuntime >= 240 ? 'no limit' : maxRuntime + ' min'}</b></label>
      <input type="range" min="90" max="240" step="5" value={maxRuntime} onChange={e => setMaxRuntime(+e.target.value)} />
      <label className="check"><input type="checkbox" checked={noSeries} onChange={e => setNoSeries(e.target.checked)} /> Films only — no series</label>
      <label>Films you loved (comma separated)</label>
      <input type="text" value={loved} onChange={e => setLoved(e.target.value)} placeholder="Tumbbad, Burning" />
      <label>What should it never push? (e.g. horror, slow)</label>
      <input type="text" value={hated} onChange={e => setHated(e.target.value)} placeholder="horror" />
      <label className="check"><input type="checkbox" checked={hideFamous} onChange={e => setHideFamous(e.target.checked)} /> I have seen most famous blockbusters — hide them unless I ask for legends</label>
      <button className="bigbtn" onClick={() => onDone({ langs, maxRuntime: maxRuntime >= 240 ? null : maxRuntime, noSeries, hideFamous, lovedTags: split(loved), hatedTags: split(hated) })}>Save and start</button>
    </div>
  );
}

function SeenList({ cat, history, toggle, markAll, onDone }) {
  const famous = [...cat].sort((a, b) => b.buzz - a.buzz).slice(0, 20);
  return (
    <div className="onboard wide">
      <h2>Tick what you have watched.</h2>
      <p className="mut">Checked titles never appear again — in Mind-Reader or Platform lists.</p>
      <div className="seenlist">
        {famous.map((t, i) => (
          <label key={t.id} className={`seenrow ${history.has(t.id) ? 'on' : ''}`} style={{ '--i': i }}>
            <input type="checkbox" checked={history.has(t.id)} onChange={() => toggle(t.id)} />
            <span><b>{t.title}</b> <span className="mut">({t.year} · IMDb {t.imdb.toFixed(1)})</span></span>
          </label>
        ))}
      </div>
      <div className="btnrow">
        <button className="bigbtn" onClick={markAll}>Seen them all</button>
        <button className="bigbtn ghost" onClick={onDone}>Done — give me fresh picks</button>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState('mind');
  const [region, setRegion] = useState('IN');
  const [cat, setCat] = useState(CATALOGUE);
  const [history, setHistory] = useState(() => loadHistory());
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [showPrefs, setShowPrefs] = useState(() => !loadPrefs());
  const [showSeen, setShowSeen] = useState(false);
  const [live, setLive] = useState(() => loadLive());
  const liveRef = useRef(live); liveRef.current = live;
  const [liveMsg, setLiveMsg] = useState('Pulling live data…');
  const [hot, setHot] = useState(null);
  const [toast, setToast] = useState(null);
  const [leavingIds, setLeavingIds] = useState(new Set());

  // Mind-Reader state machine: ask → thinking → done
  const [phase, setPhase] = useState('ask');
  const [asked, setAsked] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(null);
  const [picked, setPicked] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [freeText, setFreeText] = useState('');
  const [mood, setMood] = useState(EMPTY_MOOD);
  const [result, setResult] = useState(null);

  // Platform explorer
  const [pids, setPids] = useState(['prime']);
  const [sort, setSort] = useState('gems');
  const [seed, setSeed] = useState(() => (Date.now() % 1e9) | 1);
  const [recentGems, setRecentGems] = useState(new Set());
  const [spin, setSpin] = useState(0);

  const art = useMemo(() => loadPosterCache(), []);
  useEffect(() => { fetchCatalogue().then(setCat); }, []);
  useEffect(() => { saveHistory(history); }, [history]);

  const say = msg => { setToast({ msg, k: Date.now() }); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);

  // Live pull on every load: awards + review scores for all, buzz for the
  // titles most likely to surface. Results already on screen stay frozen.
  const putBuzz = (id, r) => setLive(prev => { const n = { ...(prev || {}), buzz: { ...((prev || {}).buzz || {}), [id]: r } }; saveLive(n); return n; });
  const refreshLive = async (full = false) => {
    setLiveMsg('Pulling live data…');
    try {
      const aw = await pullAwardsLive(cat.map(t => ({ id: t.id, wiki: t.wiki })));
      setLive(prev => { const n = { ...(prev || {}), awards: aw, buzz: (prev || {}).buzz || {} }; saveLive(n); return n; });
      setLiveMsg('Reviews + awards live · buzz updating…');
    } catch { setLiveMsg('Live reviews unreachable · showing saved'); }
    try {
      // skip titles fetched in the last 6 hours — the Reddit archive rate-limits hard
      const stale = t => !(liveRef.current?.buzz?.[t.id]?.at > Date.now() - 6 * 3600e3);
      const entries = (full ? cat : [...cat].sort((a, b) => b.buzz - a.buzz).slice(0, 16)).filter(stale);
      await pullBuzzLive(entries, putBuzz);
      setLiveMsg(full ? 'All sources live' : 'Live · deeper buzz on Refresh');
    } catch { setLiveMsg('Live (partial)'); }
  };
  useEffect(() => { refreshLive(false); }, []); // eslint-disable-line
  useEffect(() => {
    if (route === 'plat' && !hot) pullRedditHot(cat).then(setHot).catch(() => {});
  }, [route]); // eslint-disable-line

  const imgOf = t => t.poster || cachedUrl(art, t.id);
  const pool = useMemo(() => cat
    .map(t => ({ src: imgOf(t), art: t.gem || t.tags.includes('art-house') || t.tags.includes('slow-cinema') || t.tags.includes('world-cinema') }))
    .filter(p => p.src), [cat]); // eslint-disable-line
  const artPool = useMemo(() => pool.filter(p => p.art), [pool]);

  const a = useMemo(() => analyze(asked, answers, mood), [asked, answers, mood]);
  const strictNow = useMemo(() => strictPool(cat, a, prefs, history).length, [cat, a, prefs, history]);
  const line = useMemo(() => coopLine(asked, answers), [asked, answers]);
  const rules = rulesOf(a.sig, mood.avoided);

  const nextQ = (na, nans, m) => pickNext(QUESTIONS, na, nans, m, cat, prefs, history);
  useEffect(() => { if (phase === 'ask' && !current && !asked.length) setCurrent(nextQ([], {}, mood)); }, [phase, current, asked.length]); // eslint-disable-line

  const finish = async (na, nans, m) => {
    setPhase('thinking'); setCurrent(null);
    await wait(1900);
    const r = buildRecommendations(cat, analyze(na, nans, m), { region, history, prefs, live: liveRef.current, asked: na, answers: nans, freeText });
    setResult(r); setPhase('done');
    recordShown(r.recs.map(x => x.id)); saveRuns(loadRuns() + 1);
    // top up live buzz for what is on screen (shown on cards only after a refresh)
    pullBuzzLive(r.recs.map(x => x.title).filter(t => !liveRef.current?.buzz?.[t.id]), putBuzz).catch(() => {});
  };

  const answer = async (q, o) => {
    if (picked) return;
    setPicked(o.id);
    await wait(200); setLeaving(true);
    await wait(260);
    const na = [...asked, q], nans = { ...answers, [q.id]: o.id };
    setAsked(na); setAnswers(nans); setPicked(null); setLeaving(false);
    const k = strictPool(cat, analyze(na, nans, mood), prefs, history).length;
    const nq = shouldFinish(na.length, k) ? null : nextQ(na, nans, mood);
    if (!nq) finish(na, nans, mood); else setCurrent(nq);
  };

  const applyFree = () => {
    if (!freeText.trim()) return;
    const m = parseMood(freeText); setMood(m);
    if (!m.heard.length && !m.avoided.length) { say('Could not read a mood there — try words like slow, funny, crime, true story'); return; }
    if (phase === 'done') { finish(asked, answers, m); return; }
    const k = strictPool(cat, analyze(asked, answers, m), prefs, history).length;
    if (asked.length && shouldFinish(asked.length, k)) { finish(asked, answers, m); return; }
    setCurrent(nextQ(asked, answers, m));
  };

  const reset = () => { setAsked([]); setAnswers({}); setFreeText(''); setMood(EMPTY_MOOD); setResult(null); setCurrent(null); setPicked(null); setLeaving(false); setPhase('ask'); setRoute('mind'); };

  // Card actions animate out first, then land in history.
  const act = (id, kind) => {
    setLeavingIds(s => new Set([...s, id]));
    setTimeout(() => {
      setHistory(h => new Set([...h, id]));
      if (kind === 'love') setPrefs(p => { const n = { ...(p || {}), lovedIds: [...new Set([...(p?.lovedIds || []), id])] }; savePrefs(n); return n; });
      setResult(r => r && { ...r, recs: r.recs.filter(x => x.id !== id) });
      setLeavingIds(s => { const n = new Set(s); n.delete(id); return n; });
    }, REDUCED ? 0 : 380);
    say(kind === 'love' ? 'Loved — more like this next time' : kind === 'seen' ? 'Marked as seen — it won’t come back' : 'Got it — won’t show that again');
  };

  // Platform list is frozen per shuffle so live updates never jump it around.
  const plat = useMemo(() => route === 'plat' ? topForPlatform(cat, pids, sort, region, history, liveRef.current, seed, recentGems) : [], [route, cat, pids, sort, region, history, seed]); // eslint-disable-line
  const shuffle = () => { setRecentGems(s => new Set([...s, ...plat.map(r => r.id)])); setSeed(x => (x * 48271) % 2147483647 || 7); setSpin(s => s + 1); };
  const tpid = id => setPids(pids.includes(id) ? pids.filter(x => x !== id) : [...pids, id]);

  const recs = result?.recs || [];
  const exact = recs.filter(r => r.strict), close = recs.filter(r => !r.strict);
  const cardProps = (r, i) => ({ rec: r, index: i, src: imgOf(r.title), leaving: leavingIds.has(r.id), onLove: () => act(r.id, 'love'), onSeen: () => act(r.id, 'seen'), onReject: () => act(r.id, 'reject') });
  const gemCount = plat.filter(r => r.gem).length;

  const view = showPrefs ? 'prefs' : showSeen ? 'seen' : route;
  const go = r => { setShowPrefs(false); setShowSeen(false); setRoute(r); };
  const NAV = [
    { k: 'mind', label: 'Mind-Reader', icon: '◎', on: () => go('mind') },
    { k: 'plat', label: 'By platform', icon: '▦', on: () => go('plat') },
    { k: 'prefs', label: 'My taste', icon: '♥', on: () => { setShowSeen(false); setShowPrefs(true); } },
    { k: 'seen', label: 'Watched', icon: '✓', on: () => { setShowPrefs(false); setShowSeen(true); } },
  ];

  return (
    <div className="app">
      <aside className="side">
        <h1 className="logo">CINE<br /><span className="scout">SCOUT</span></h1>
        <div className="tag">for cinephiles · art to mainstream</div>
        <div className="sec">Diagnose · Explore · You</div>
        <nav className="nav">
          {NAV.map(n => <button key={n.k} className={view === n.k ? 'on' : ''} onClick={n.on}><span className="ico">{n.icon}</span>{n.label}</button>)}
          <button onClick={reset}><span className="ico">↺</span>New session</button>
        </nav>
        <div className="mut memo">{history.size === 0 ? 'No history yet.' : `Remembers ${history.size} — never repeats.`} {history.size > 0 && <button className="linkbtn" onClick={() => { if (confirm('Forget every title you marked?')) setHistory(new Set()); }}>reset</button>}</div>
      </aside>
      <HeroReel pool={pool} artPool={artPool} />
      <main className="main">
        <div className="topbar">
          <div className="mut livebar"><span className="livedot" />{liveMsg} <button className="linkbtn" onClick={() => refreshLive(true)}>Refresh</button></div>
          <div className="seg" data-on={region}>
            <span className="seg-pill" />
            {['IN', 'BD'].map(r => <button key={r} className={region === r ? 'on' : ''} onClick={() => { if (r !== region) { setRegion(r); reset(); } }}>{r === 'IN' ? 'India' : 'Bangladesh'}</button>)}
          </div>
        </div>

        <div className="view" key={view}>
          {view === 'prefs' ? (
            <Onboard initial={prefs} onDone={p => { const n = { ...(prefs || {}), ...p }; setPrefs(n); savePrefs(n); setShowPrefs(false); say('Taste saved'); }} />
          ) : view === 'seen' ? (
            <SeenList cat={cat} history={history}
              toggle={id => { const n = new Set(history); n.has(id) ? n.delete(id) : n.add(id); setHistory(n); }}
              markAll={() => { const n = new Set(history); [...cat].sort((x, y) => y.buzz - x.buzz).slice(0, 20).forEach(t => n.add(t.id)); setHistory(n); }}
              onDone={() => { setShowSeen(false); reset(); }} />
          ) : view === 'mind' ? (
            <>
              <h2 className="headline">Tonight, what are you?</h2>
              <div className="mut sub" key={line}>{phase === 'done' ? 'Every pick below was checked against each of your answers.' : line}</div>
              <div className="freebox">
                <input type="text" value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFree()} placeholder="Or type it: slow and sad, no comedy…" />
                <button onClick={applyFree}>Read this</button>
              </div>
              {(mood.heard.length > 0 || mood.avoided.length > 0) && (
                <div className="chips small">
                  {mood.heard.map(h => <span key={h} className="chip req">{h}</span>)}
                  {mood.avoided.map(h => <span key={h} className="chip rule">no {h}</span>)}
                </div>
              )}
              {phase !== 'done' && (
                <div className="progress">
                  <div className="ptrack"><div className="pfill" style={{ width: `${Math.min(100, (asked.length / MAX_Q) * 100)}%` }} /></div>
                  <span className="mut">{phase === 'thinking' ? 'Analyzing' : `${strictNow} title${strictNow === 1 ? '' : 's'} still fit every answer`}</span>
                </div>
              )}

              {phase === 'thinking' ? <Thinking region={region} n={asked.length} /> : phase === 'done' ? (
                <>
                  {(a.groups.length > 0 || rules.length > 0) && (
                    <div className="chips small reqs">
                      {a.groups.map(g => <span key={g.q} className="chip req">{g.label}</span>)}
                      {rules.map(r => <span key={r} className="chip rule">{r}</span>)}
                    </div>
                  )}
                  {result?.trace && (
                    <details className="howto trace">
                      <summary>How it thought</summary>
                      <ol className="steps">
                        <li>Turned {result.trace.requirements.length} answers into strict requirements{rules.length ? ` + ${rules.length} hard rule${rules.length > 1 ? 's' : ''}` : ''}</li>
                        <li>Started from {result.trace.considered} titles, skipped {result.trace.excludedSeen} you have seen, removed {result.trace.filtered} that broke a hard rule</li>
                        <li>{result.trace.strict} of {result.trace.passed} matched every answer</li>
                        <li>Ranked inside each tier by IMDb + critics{result.trace.sources.reviews ? ` + Rotten Tomatoes/Metacritic (${result.trace.sources.reviews} titles live)` : ''}{result.trace.sources.reddit ? ` + Reddit (${result.trace.sources.reddit} live)` : ''}</li>
                        <li>Streaming in {region} breaks ties</li>
                      </ol>
                    </details>
                  )}
                  <h3 className="sechead"><span className="dot ok" />{exact.length ? `${exact.length} exact match${exact.length > 1 ? 'es' : ''}` : 'No title matches every answer'}<span className="mut"> · checked for {region}</span></h3>
                  {exact.length > 0 && <div className="grid">{exact.map((r, i) => <Card key={r.id} {...cardProps(r, i)} />)}</div>}
                  {close.length > 0 && (
                    <>
                      <h3 className="sechead"><span className="dot near" />Close matches <span className="mut">· each misses one answer, shown on the card</span></h3>
                      <div className="grid">{close.map((r, i) => <Card key={r.id} {...cardProps(r, exact.length + i)} />)}</div>
                    </>
                  )}
                  <div className="btnrow"><button className="bigbtn" onClick={reset}>New session — different mood</button></div>
                </>
              ) : current ? (
                <div className={`q ${leaving ? 'out' : ''}`} key={current.id}>
                  <div className="qnum">Question {asked.length + 1}</div>
                  <strong className="qtext">{current.prompt}</strong>
                  {current.options.map((o, i) => (
                    <button key={o.id} className={`opt ${picked === o.id ? 'picked' : ''} ${picked && picked !== o.id ? 'dim' : ''}`} style={{ '--i': i }} onClick={() => answer(current, o)}>
                      <span className="key">{'ABC'[i]}</span>{o.label}
                    </button>
                  ))}
                  <div className="qfoot mut">
                    <span>Order shifts every run · stops once it is sure</span>
                    {(asked.length >= 1 || mood.groups.length > 0) && <button className="linkbtn" onClick={() => finish(asked, answers, mood)}>Show my picks now →</button>}
                  </div>
                </div>
              ) : <div className="q"><div className="think" /></div>}
            </>
          ) : (
            <>
              <h2 className="headline">Best by platform</h2>
              <div className="mut sub">Only titles you can get on these services in {region === 'IN' ? 'India' : 'Bangladesh'}.</div>
              {hot && hot.length > 0 && (
                <div className="hotwrap">
                  <div className="mut label"><span className="livedot" />Hot on Reddit right now</div>
                  <div className="hotrow">
                    {hot.map((h, i) => {
                      const t = cat.find(x => x.id === h.id);
                      if (!t) return null;
                      const inner = (<><img src={imgOf(t)} alt={t.title} loading="lazy" /><span>{t.title}</span><small>r/{h.sub} · {h.score + h.comments}</small></>);
                      return h.url
                        ? <a key={h.id} className="hotcard" style={{ '--i': i }} href={h.url} target="_blank" rel="noreferrer">{inner}</a>
                        : <div key={h.id} className="hotcard" style={{ '--i': i }}>{inner}</div>;
                    })}
                  </div>
                </div>
              )}
              <div className="chips">{PLATFORMS.map(p => <button key={p.id} className={`chip ${pids.includes(p.id) ? 'on' : ''}`} onClick={() => tpid(p.id)}>{p.name}</button>)}</div>
              <div className="sortrow">
                <div className="seg tabs">
                  {[['gems', '✦ Hidden gems'], ['best', 'Best overall'], ['critics', 'Critics first'], ['buzz', 'Most buzz']].map(([k, l]) => <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>)}
                </div>
                {sort === 'gems' && <button className="shuffle" onClick={shuffle}><span className="sic" style={{ transform: `rotate(${spin * 360}deg)` }}>⟳</span> Shuffle gems</button>}
              </div>
              {sort === 'gems' && plat.length > 0 && gemCount < plat.length && (
                <div className="mut note">Only {gemCount} true hidden gem{gemCount === 1 ? '' : 's'} on {pids.length > 1 ? 'these services' : 'this service'} in {region} — topped up with lesser-known strong titles.</div>
              )}
              <div className="grid" key={sort + seed + pids.join() + region}>{plat.map((r, i) => <Card key={r.id} {...cardProps(r, i)} />)}</div>
              {plat.length === 0 && <p className="mut empty">{pids.length ? `Nothing on ${pids.map(p => PLATFORMS.find(x => x.id === p).name).join(' + ')} in ${region} yet — try another service.` : 'Turn on at least one platform.'}</p>}
            </>
          )}
        </div>
      </main>
      <nav className="tabbar">
        {NAV.map(n => <button key={n.k} className={view === n.k ? 'on' : ''} onClick={n.on}><span>{n.icon}</span>{n.label}</button>)}
      </nav>
      {toast && <div className="toast" key={toast.k}>{toast.msg}</div>}
    </div>
  );
}
