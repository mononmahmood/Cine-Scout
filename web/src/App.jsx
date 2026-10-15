import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOGUE, QUESTIONS, PLATFORMS, fetchCatalogue } from './data.js';
import { collectSignals, parseMoodText, rank, marginOf, shouldStop, pickNext, coopLine, buildRecommendations, topForPlatform, loadHistory, saveHistory, loadPrefs, savePrefs, loadRuns, saveRuns, recordShown } from './engine.js';

import { loadPosterCache, boostPosters, cachedUrl } from './posterBoost.js';
import { pullAwardsLive, pullBuzzLive, pullRedditHot, loadLive, saveLive } from './live.js';

const LANGS = ['Hindi', 'English', 'Korean', 'Bengali'];

// Big cinematic reel: a master-film poster drifts in with a slow zoom,
// glides, fades, and a new random one takes its place. Pool is the full
// catalogue, order random every cycle.
// Full-bleed backdrop: a blurred, slightly zoomed poster drifts from one
// side to the other, crossfades, and a new random one takes over. Covers
// the whole question page; content floats above it.
function HeroReel({ pool, artPool }) {
  const anyPool = pool.length ? pool : [];
  const draw = (avoidSrc) => {
    let list = (artPool.length && Math.random() < 0.45) ? artPool : anyPool;
    if (!list.length) list = anyPool;
    if (!list.length) return null;
    let p = list[Math.floor(Math.random() * list.length)];
    let guard = 0;
    while (p.src === avoidSrc && guard++ < 10) p = list[Math.floor(Math.random() * list.length)];
    return p;
  };
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [showB, setShowB] = useState(false);
  useEffect(() => {
    if (!anyPool.length) return;
    if (!a) { setA(draw(null)); return; }
    if (!b) { setB(draw(a.src)); return; }
    const t = setInterval(() => {
      if (!showB) setB(draw(a.src)); else setA(draw(b.src));
      setShowB(s => !s);
    }, 7000);
    return () => clearInterval(t);
  }, [anyPool.length, a, b, showB]); // eslint-disable-line
  if (!a || !b) return null;
  if (!a || !b) return null;
  return (
    <div className="hero" aria-hidden="true">
      <div className="hero-layer" key={'a' + a.src} style={{ backgroundImage: `url("${a.src}")`, opacity: showB ? 0 : 1 }} />
      <div className="hero-layer" key={'b' + b.src} style={{ backgroundImage: `url("${b.src}")`, opacity: showB ? 1 : 0 }} />
      <div className="hero-shade" />
    </div>
  );
}

function Poster({ t, src }) {
  if (src) return <img src={src} alt={t.title} loading="lazy" />;
  const initials = t.title.split(' ').map(w => w[0]).slice(0, 2).join('');
  return <div className="poster-fallback"><span>{initials}</span><small>{t.year}</small></div>;
}

function Card({ rec, src, buzz, onLove, onSeen, onReject }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <Poster t={rec.title} src={src} />
      <div className="row" style={{ marginTop: 9 }}>
        <strong style={{ fontSize: 15 }}>{rec.title.title}</strong>
        <span className="pill match">{rec.pct}%</span>
      </div>
      <div className="mut" style={{ fontSize: 12 }}>{rec.title.year} · {rec.title.kind === 'tv' ? 'Series' : 'Film'} · {rec.title.runtime > 300 ? 'series' : rec.title.runtime + ' min'} · IMDb {rec.title.imdb.toFixed(1)}</div>
      <div className="mut" style={{ fontSize: 12.5, marginTop: 6 }}>{rec.why}</div>
      <div className="src">{rec.src}</div>
      {rec.because && rec.because.length > 0 && <div className="because">Because you picked: {rec.because.join(' · ')}</div>}
      {rec.honors && <div className="honors">{rec.honors}</div>}
      {buzz && buzz.n >= 0 && <div className="buzzline">Reddit: {buzz.n} mentions in film subs · live</div>}
      <span className={`avail ${rec.blocked ? 'block' : 'ok'}`}>{rec.badge}</span>
      {rec.fallback && <div className="fb">{rec.fallback}</div>}
      <details className="howto" open={open} onToggle={e => setOpen(e.target.open)}>
        <summary>{open ? 'Hide watch steps' : 'Exactly how to watch'}</summary>
        <ol className="steps">{rec.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {rec.links.map((l, i) => <span key={i}><a className="linkbtn" style={{ color: '#7dd3fc' }} href={l.url} target="_blank" rel="noreferrer">{l.label}</a></span>)}
      </details>
      <div className="mini" style={{ marginTop: 9 }}>
        <button onClick={onLove}>Loved it</button>
        <button onClick={onSeen}>Seen</button>
        <button onClick={onReject}>Not for me</button>
      </div>
    </div>
  );
}

function Onboard({ initial, onDone }) {
  const [langs, setLangs] = useState(initial?.langs || ['Hindi', 'English']);
  const [maxRuntime, setMaxRuntime] = useState(initial?.maxRuntime || 180);
  const [noSeries, setNoSeries] = useState(initial?.noSeries || false);
  const [loved, setLoved] = useState((initial?.lovedTags || []).join(', '));
  const [hated, setHated] = useState((initial?.hatedTags || []).join(', '));
  const [hideFamous, setHideFamous] = useState(initial?.hideFamous || false);
  const tg = k => setLangs(langs.includes(k) ? langs.filter(x => x !== k) : [...langs, k]);
  return (
    <div className="onboard">
      <h2 style={{ margin: 0 }}>One minute, then it knows you.</h2>
      <p className="mut" style={{ fontSize: 13 }}>Taste + history. Nothing repeats, legends step aside unless you ask for them.</p>
      <label>Languages you enjoy</label>
      <div className="chips">{LANGS.map(l => <button key={l} className={`chip ${langs.includes(l) ? 'on' : ''}`} onClick={() => tg(l)}>{l}</button>)}</div>
      <label>Max movie length: {maxRuntime} min</label>
      <input type="range" min="100" max="240" value={maxRuntime} onChange={e => setMaxRuntime(+e.target.value)} style={{ width: '100%' }} />
      <label><input type="checkbox" checked={noSeries} onChange={e => setNoSeries(e.target.checked)} /> Films only — no series</label>
      <label>Films you loved (comma separated)</label>
      <input type="text" value={loved} onChange={e => setLoved(e.target.value)} placeholder="Tumbbad, Burning" style={{ width: '100%' }} />
      <label>What should it never push? (e.g. horror, slow)</label>
      <input type="text" value={hated} onChange={e => setHated(e.target.value)} placeholder="horror" style={{ width: '100%' }} />
      <label><input type="checkbox" checked={hideFamous} onChange={e => setHideFamous(e.target.checked)} /> I have seen most famous blockbusters — hide them unless I ask for legends</label>
      <button className="bigbtn" onClick={() => onDone({ langs, maxRuntime, noSeries, hideFamous, lovedTags: loved.split(',').map(s => s.trim().toLowerCase()).filter(Boolean), hatedTags: hated.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) })}>Save and start</button>
    </div>
  );
}

function SeenList({ cat, history, toggle, markAll, onDone }) {
  const famous = [...cat].sort((a, b) => b.buzz - a.buzz).slice(0, 20);
  return (
    <div className="onboard" style={{ maxWidth: 680 }}>
      <h2 style={{ margin: 0 }}>Tick what you have watched.</h2>
      <p className="mut" style={{ fontSize: 13 }}>Checked titles never appear again — in Mind-Reader or Platform lists. This is the fastest fix for famous-film repeats.</p>
      <div className="seenlist">
        {famous.map(t => (
          <label key={t.id} className="seenrow">
            <input type="checkbox" checked={history.has(t.id)} onChange={() => toggle(t.id)} />
            <span><b>{t.title}</b> <span className="mut">({t.year} · IMDb {t.imdb.toFixed(1)})</span></span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="bigbtn" style={{ marginTop: 0 }} onClick={markAll}>Seen them all</button>
        <button className="bigbtn ghost" style={{ marginTop: 0 }} onClick={onDone}>Done — give me fresh picks</button>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState('mind');
  const [region, setRegion] = useState('IN');
  const [asked, setAsked] = useState([]);
  const [answers, setAnswers] = useState({});
  const [freeText, setFreeText] = useState('');
  const [freeTags, setFreeTags] = useState(new Set());
  const [done, setDone] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState(() => loadHistory());
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [showPrefs, setShowPrefs] = useState(() => !loadPrefs());
  const [cat, setCat] = useState(CATALOGUE);
  const [pids, setPids] = useState(['prime']);
  const [sort, setSort] = useState('best');
  const [showSeen, setShowSeen] = useState(false);
  const [runCount, setRunCount] = useState(() => loadRuns());
  const [art, setArt] = useState(() => loadPosterCache());
  const [live, setLive] = useState(() => loadLive());
  const [liveMsg, setLiveMsg] = useState('Pulling live data…');
  const [hot, setHot] = useState(null);

  useEffect(() => { fetchCatalogue().then(setCat); }, []);
  useEffect(() => { saveHistory(history); }, [history]);
  // Fill missing posters from the visitor's network (cached, silent)
  useEffect(() => {
    const missing = cat.filter(t => !t.poster && !cachedUrl(loadPosterCache(), t.id));
    if (!missing.length) return;
    boostPosters(missing, () => setArt(loadPosterCache()));
  }, [cat]);
  // Live pull on every load: awards for all (fast) + buzz for the titles
  // most likely to surface. Full buzz refresh on demand + per-result top-up.
  const refreshLive = async (full = false) => {
    setLiveMsg('Pulling live data…');
    try {
      const aw = await pullAwardsLive(cat.map(t => ({ id: t.id, wiki: t.wiki })));
      setLive(prev => { const n = { ...(prev || {}), awards: aw, buzz: (prev || {}).buzz || {} }; saveLive(n); return n; });
      setLiveMsg('Awards live · buzz updating…');
    } catch { setLiveMsg('Live awards unreachable · showing saved'); }
    try {
      const entries = full ? cat : [...cat].sort((a, b) => b.buzz - a.buzz).slice(0, 30);
      await pullBuzzLive(entries, (id, r) => {
        setLive(prev => { const n = { ...(prev || {}), buzz: { ...((prev || {}).buzz || {}), [id]: r } }; saveLive(n); return n; });
      });
      setLiveMsg(full ? 'Live' : 'Live · deeper buzz on Refresh');
    } catch { setLiveMsg('Live (partial)'); }
  };
  useEffect(() => { refreshLive(false); }, []); // eslint-disable-line
  // Top-up buzz for exactly the 10 shown results
  useEffect(() => {
    if (!done || !recs.length) return;
    const missing = recs.map(r => r.title).filter(t => !(loadLive()?.buzz || {})[t.id]);
    if (missing.length) pullBuzzLive(missing, (id, r) => {
      setLive(prev => { const n = { ...(prev || {}), buzz: { ...((prev || {}).buzz || {}), [id]: r } }; saveLive(n); return n; });
    }).catch(() => {});
  }, [done]); // eslint-disable-line
  useEffect(() => {
    if (route === 'plat' || route.startsWith('plat')) {
      pullRedditHot(cat).then(setHot).catch(() => {});
    }
  }, [route]); // eslint-disable-line
  const imgOf = t => t.poster || cachedUrl(art, t.id);
  const pool = useMemo(() => cat
    .map(t => ({ src: t.poster || cachedUrl(art, t.id), art: t.gem || t.tags.includes('art-house') || t.tags.includes('slow-cinema') || t.tags.includes('world-cinema') }))
    .filter(p => p.src), [cat, art]);
  const artPool = useMemo(() => pool.filter(p => p.art), [pool]);

  const { tags, sig } = useMemo(() => collectSignals(asked, answers, freeTags), [asked, answers, freeTags]);

  const current = useMemo(() => {
    if (done) return null;
    const ranked = rank(cat.filter(t => ![...history].includes(t.id)), tags, sig, prefs, runCount);
    if (asked.length >= 2 && shouldStop(asked.length, marginOf(ranked))) return null;
    return pickNext(QUESTIONS, asked, tags, sig);
  }, [asked, tags, sig, done, cat, history, prefs, runCount]);

  const recorded = useRef(false);
  useEffect(() => { if (!current && asked.length >= 2 && !done && !thinking) { setDone(true); const n = runCount + 1; setRunCount(n); saveRuns(n); } }, [current, asked, done, thinking]); // eslint-disable-line

  const res = useMemo(() => done ? buildRecommendations(cat, tags, sig, region, history, prefs, runCount, live, asked, answers, freeText) : { recs: [], trace: null }, [done, cat, tags, sig, region, history, prefs, runCount, live, asked, answers, freeText]);
  const recs = res.recs || [];
  const plat = useMemo(() => route.startsWith('plat') ? topForPlatform(cat, pids, sort, region, history, live) : [], [route, cat, pids, sort, region, history, live]);
  const line = useMemo(() => coopLine(asked, answers), [asked, answers]);
  useEffect(() => {
    if (done && recs.length && !recorded.current) { recorded.current = true; recordShown(recs.map(r => r.id)); }
  }, [done, recs.length]); // eslint-disable-line

  const answer = (q, o) => {
    setThinking(true);
    setTimeout(() => {
      const na = [...asked, q]; const nans = { ...answers, [q.id]: o.id };
      setAsked(na); setAnswers(nans);
      const { tags: nt, sig: ns } = collectSignals(na, nans, freeTags);
      const ranked = rank(cat, nt, ns, prefs, runCount);
      if (shouldStop(na.length, marginOf(ranked))) { setDone(true); const n = runCount + 1; setRunCount(n); saveRuns(n); }
      setThinking(false);
    }, 500);
  };
  const applyFree = () => { if (freeText.trim()) setFreeTags(parseMoodText(freeText)); };
  const reset = () => { recorded.current = false; setAsked([]); setAnswers({}); setFreeText(''); setFreeTags(new Set()); setDone(false); };
  const mark = id => setHistory(new Set([...history, id]));
  const tpid = id => setPids(pids.includes(id) ? pids.filter(x => x !== id) : [...pids, id]);

  return (
    <div className="app">
      <aside className="side">
        <h1 className="logo">CINE<br /><span className="scout">SCOUT</span></h1>
        <div className="tag">for cinephiles · art to mainstream</div>
        <div className="sec">Diagnose</div>
        <div className="nav"><button className={route === 'mind' ? 'on' : ''} onClick={() => setRoute('mind')}>Mind-Reader</button></div>
        <div className="sec">Explore</div>
        <div className="nav"><button className={route === 'plat' ? 'on' : ''} onClick={() => setRoute('plat')}>Best by platform</button></div>
        <div className="sec">You</div>
        <div className="nav">
          <button onClick={() => setShowPrefs(true)}>My taste</button>
          <button onClick={() => setShowSeen(true)}>Mark watched</button>
          <button onClick={reset}>New session</button>
        </div>
        <div className="mut" style={{ fontSize: 11, margin: '14px 8px' }}>{history.size === 0 ? 'No history yet.' : `Remembers ${history.size} — never repeats.`} <button style={{ background: 'none', border: 0, color: '#71717a', cursor: 'pointer', padding: 0 }} onClick={() => setHistory(new Set())}>reset</button></div>
      </aside>
      <main className="main">
        <HeroReel pool={pool} artPool={artPool} />
        <div className="mcontent">
        <div className="topbar">
          <div className="mut" style={{ fontSize: 12 }}>Verified for <b style={{ color: '#fff' }}>{region}</b> · <span className="livedot" />{liveMsg} <button className="linkbtn" onClick={() => refreshLive(true)}>Refresh</button></div>
          <div className="seg">{['IN', 'BD'].map(r => <button key={r} className={region === r ? 'on' : ''} onClick={() => { setRegion(r); reset(); }}>{r === 'IN' ? 'India' : 'Bangladesh'}</button>)}</div>
        </div>

        {showPrefs ? (
          <div style={{ marginTop: 18 }}><Onboard initial={prefs} onDone={p => { setPrefs(p); savePrefs(p); setShowPrefs(false); }} /></div>
        ) : showSeen ? (
          <div style={{ marginTop: 18 }}><SeenList cat={cat} history={history}
            toggle={id => { const n = new Set(history); n.has(id) ? n.delete(id) : n.add(id); setHistory(n); }}
            markAll={() => { const n = new Set(history); [...cat].sort((a, b) => b.buzz - a.buzz).slice(0, 20).forEach(t => n.add(t.id)); setHistory(n); }}
            onDone={() => { setShowSeen(false); reset(); }} /></div>
        ) : route === 'mind' ? (
          <>
            <h2 style={{ margin: '16px 0 2px', letterSpacing: '-.02em' }}>Tonight, what are you?</h2>
            <div className="mut" style={{ fontSize: 13 }}>{line}</div>
            <div className="freebox">
              <input type="text" value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFree()} placeholder="Or type it: slow and sad, no comedy..." />
              <button onClick={applyFree}>Read this</button>
            </div>
            {freeTags.size > 0 && <div className="mut" style={{ fontSize: 12, marginTop: 6 }}>Heard: {[...freeTags].filter(x => !x.startsWith('__')).join(', ')}</div>}
            <div className="dots">{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <i key={i} className={asked.length > i ? 'on' : ''} />)}</div>
            {done ? (
              <>
                <h3 style={{ marginTop: 16 }}>10 for tonight — checked for {region}</h3>
                {res.trace && (
                  <details className="howto">
                    <summary>How it thought</summary>
                    <ol className="steps">
                      <li>Read {res.trace.agreed} answers → signals: {res.trace.signals.join(', ') || 'open mood'}</li>
                      <li>Compared {res.trace.considered} titles, skipped {res.trace.excludedSeen} already seen</li>
                      <li>Shortlisted {res.trace.shortlisted}, re-scored for agreement across your answers</li>
                      {res.trace.blocked > 0 && <li>{res.trace.blocked} strong match{res.trace.blocked > 1 ? 'es' : ''} not streaming in {region} — kept below with rent or alternative paths</li>}
                    </ol>
                  </details>
                )}
                <div className="grid">{recs.map(r => <Card key={r.id} rec={r} src={imgOf(r.title)} buzz={live?.buzz?.[r.id]} onLove={() => mark(r.id)} onSeen={() => mark(r.id)} onReject={() => mark(r.id)} />)}</div>
                <div className="mini" style={{ marginTop: 14 }}><button onClick={reset}>New session — different mood</button></div>
              </>
            ) : thinking ? (
              <div className="q" style={{ marginTop: 16 }}><strong>Cross-checking IMDb, critics and buzz. Dropping the obvious.</strong><div className="think" /></div>
            ) : current ? (
              <div className="q" style={{ marginTop: 16 }} key={current.id + asked.length}>
                <strong style={{ fontSize: 17 }}>{current.prompt}</strong>
                {current.options.map(o => <button key={o.id} className="opt" onClick={() => answer(current, o)}>{o.label}</button>)}
                <div className="mut" style={{ fontSize: 11, marginTop: 10 }}>Question {asked.length + 1} · order shifts every run · stops when sure (max 8)</div>
              </div>
            ) : <p className="mut">Reading you…</p>}
          </>
        ) : (
          <>
            <h2 style={{ margin: '16px 0 2px' }}>Best by platform</h2>
            <div className="mut" style={{ fontSize: 13 }}>Deep cuts included. Switch services on or off.</div>
            {hot && hot.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="mut" style={{ fontSize: 12, marginBottom: 6 }}>Hot on Reddit right now · live</div>
                <div className="hotrow">
                  {hot.map(h => {
                    const t = cat.find(x => x.id === h.id);
                    if (!t) return null;
                    const inner = (<><img src={imgOf(t)} alt={t.title} loading="lazy" /><span>{t.title}</span><small>r/{h.sub} · {h.score + h.comments}</small></>);
                    return h.url
                      ? <a key={h.id} className="hotcard" href={h.url} target="_blank" rel="noreferrer">{inner}</a>
                      : <div key={h.id} className="hotcard">{inner}</div>;
                  })}
                </div>
              </div>
            )}
            <div className="chips">{PLATFORMS.map(p => <button key={p.id} className={`chip ${pids.includes(p.id) ? 'on' : ''}`} onClick={() => tpid(p.id)}>{p.name}</button>)}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mut" style={{ fontSize: 12 }}>Sort:</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="best">Best overall</option>
                <option value="buzz">Most buzz</option>
                <option value="critics">Critics first</option>
                <option value="gems">Deep cuts first</option>
              </select>
            </div>
            <div className="grid">{plat.map(r => <Card key={r.id} rec={r} src={imgOf(r.title)} buzz={live?.buzz?.[r.id]} onLove={() => mark(r.id)} onSeen={() => mark(r.id)} onReject={() => mark(r.id)} />)}</div>
            {plat.length === 0 && <p className="mut">Turn on at least one platform.</p>}
          </>
        )}
        </div>
      </main>
    </div>
  );
}
