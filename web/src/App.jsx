import React, { useEffect, useMemo, useState } from 'react';
import { CATALOGUE, QUESTIONS, PLATFORMS, fetchCatalogue } from './data.js';
import { collectSignals, rank, marginOf, shouldStop, buildRecommendations, topForPlatform, loadHistory, saveHistory, loadPrefs, savePrefs } from './engine.js';

const LANGS = ['Hindi', 'English', 'Korean', 'Bengali'];

function Card({ rec, onSeen, onReject }) {
  return (
    <div className="card">
      {rec.title.poster ? <img src={rec.title.poster} alt="" loading="lazy" /> : <img alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'/%3E%3C/svg%3E" />}
      <div className="row" style={{ marginTop: 8 }}>
        <strong>{rec.title.title}</strong>
        <span className="pill match">{rec.pct}% match</span>
      </div>
      <div className="mut" style={{ fontSize: 12 }}>{rec.title.year} · {rec.title.kind} · IMDb {rec.title.imdb.toFixed(1)}{rec.title.gem ? ' · Gem' : ''}</div>
      <div className="mut" style={{ fontSize: 12, marginTop: 6 }}>{rec.why}</div>
      <div className="src">{rec.src}</div>
      <span className={`avail ${rec.blocked ? 'block' : 'ok'}`}>{rec.badge}</span>
      {rec.fallback && <div className="fb">{rec.fallback}</div>}
      <div className="mini" style={{ marginTop: 8 }}>
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
  const tg = k => setLangs(langs.includes(k) ? langs.filter(x => x !== k) : [...langs, k]);
  return (
    <div className="onboard">
      <h2 style={{ margin: 0 }}>Tell it once — it remembers.</h2>
      <p className="mut" style={{ fontSize: 13 }}>Give your taste. The thinker uses this every time, plus your Seen history, so results never repeat.</p>
      <label>Languages you enjoy</label>
      <div className="chips">{LANGS.map(l => <button key={l} className={`chip ${langs.includes(l) ? 'on' : ''}`} onClick={() => tg(l)}>{l}</button>)}</div>
      <label>Max movie length: {maxRuntime} min</label>
      <input type="range" min="100" max="240" value={maxRuntime} onChange={e => setMaxRuntime(+e.target.value)} style={{ width: '100%' }} />
      <label><input type="checkbox" checked={noSeries} onChange={e => setNoSeries(e.target.checked)} /> Movies only — no series for me</label>
      <button className="bigbtn" onClick={() => onDone({ langs, maxRuntime, noSeries })}>Save my taste →</button>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState('mind');
  const [region, setRegion] = useState('IN');
  const [asked, setAsked] = useState([]);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [history, setHistory] = useState(() => loadHistory());
  const [prefs, setPrefs] = useState(() => loadPrefs());
  const [showPrefs, setShowPrefs] = useState(() => !loadPrefs());
  const [cat, setCat] = useState(CATALOGUE);
  const [pids, setPids] = useState(['prime']);
  const [sort, setSort] = useState('best');
  useEffect(() => { fetchCatalogue().then(setCat); }, []);
  useEffect(() => { saveHistory(history); }, [history]);

  const { tags, sig } = useMemo(() => collectSignals(asked, answers), [asked, answers]);

  const current = useMemo(() => {
    if (done) return null;
    const ranked = rank(cat.filter(t => ![...history].includes(t.id)), tags, sig, prefs);
    if (shouldStop(asked.length, marginOf(ranked))) return null;
    return QUESTIONS.find(q => !asked.map(a => a.id).includes(q.id)) || null;
  }, [asked, tags, sig, done, cat, history, prefs]);

  useEffect(() => { if (!current && asked.length >= 2 && !done && !thinking) setDone(true); }, [current, asked, done, thinking]);

  const recs = useMemo(() => done ? buildRecommendations(cat, tags, sig, region, history, prefs) : [], [done, cat, tags, sig, region, history, prefs]);
  const plat = useMemo(() => route.startsWith('plat') ? topForPlatform(cat, pids, sort, region, history) : [], [route, cat, pids, sort, region, history]);

  const answer = (q, o) => {
    setThinking(true);
    setTimeout(() => {
      const na = [...asked, q]; const nans = { ...answers, [q.id]: o.id };
      setAsked(na); setAnswers(nans);
      const { tags: nt, sig: ns } = collectSignals(na, nans);
      if (shouldStop(na.length, marginOf(rank(cat, nt, ns, prefs)))) setDone(true);
      setThinking(false);
    }, 550);
  };
  const reset = () => { setAsked([]); setAnswers({}); setDone(false); };
  const mark = id => setHistory(new Set([...history, id]));
  const tpid = id => setPids(pids.includes(id) ? pids.filter(x => x !== id) : [...pids, id]);

  if (showPrefs) return <div className="app"><main className="main"><h1 style={{ margin: '6px 0 14px' }}>Musepark 1.3</h1><Onboard initial={prefs} onDone={p => { setPrefs(p); savePrefs(p); setShowPrefs(false); }} /></main></div>;

  return (
    <div className="app">
      <aside className="side">
        <h1>Musepark 1.3</h1>
        <div className="tag">Akinator for movies · no trash</div>
        <div className="sec">Mind-Reader</div>
        <div className="nav"><button className={route === 'mind' ? 'on' : ''} onClick={() => { setRoute('mind'); }}>Mind-Reader</button></div>
        <div className="sec">Platform Explorer</div>
        <div className="nav"><button className={route === 'plat' ? 'on' : ''} onClick={() => setRoute('plat')}>Best by platform</button></div>
        <div className="sec">You</div>
        <div className="nav">
          <button onClick={() => setShowPrefs(true)}>My taste</button>
          <button onClick={() => { reset(); }}>New diagnosis</button>
        </div>
        <div className="mut" style={{ fontSize: 11, margin: '14px 8px' }}>{history.size === 0 ? 'No history yet.' : `Remembers ${history.size} seen.`} <button style={{ background: 'none', border: 0, color: '#71717a', cursor: 'pointer', padding: 0 }} onClick={() => setHistory(new Set())}>reset</button></div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="mut" style={{ fontSize: 12 }}>Verified for <b style={{ color: '#fff' }}>{region}</b></div>
          <div className="seg">{['IN', 'BD'].map(r => <button key={r} className={region === r ? 'on' : ''} onClick={() => { setRegion(r); reset(); }}>{r === 'IN' ? 'India' : 'Bangladesh'}</button>)}</div>
        </div>
        {route === 'mind' ? (
          <>
            <h2 style={{ margin: '16px 0 2px', letterSpacing: '-.02em' }}>What’s tonight’s mood?</h2>
            <div className="mut" style={{ fontSize: 13 }}>Simple questions, tricky reads. It re-thinks after every answer.</div>
            <div className="dots">{[0, 1, 2, 3, 4, 5].map(i => <i key={i} className={asked.length > i ? 'on' : ''} />)}</div>
            {done ? (
              <>
                <h3 style={{ marginTop: 16 }}>Your must-watch picks ({recs.length})</h3>
                <div className="grid">{recs.map(r => <Card key={r.id} rec={r} onSeen={() => mark(r.id)} onReject={() => mark(r.id)} />)}</div>
                <div className="mini" style={{ marginTop: 14 }}><button onClick={reset}>Ask me again — new mood</button></div>
              </>
            ) : thinking ? (
              <div className="q" style={{ marginTop: 16 }}><strong>Thinking across IMDb · critics · subscriber buzz…</strong><div className="think" /></div>
            ) : current ? (
              <div className="q" style={{ marginTop: 16 }} key={current.id}>
                <strong style={{ fontSize: 17 }}>{current.prompt}</strong>
                {current.options.map(o => <button key={o.id} className="opt" onClick={() => answer(current, o)}>{o.label}</button>)}
                <div className="mut" style={{ fontSize: 11, marginTop: 10 }}>Question {asked.length + 1} of ~6</div>
              </div>
            ) : <p className="mut">Reading you…</p>}
          </>
        ) : (
          <>
            <h2 style={{ margin: '16px 0 2px' }}>Best by platform</h2>
            <div className="mut" style={{ fontSize: 13 }}>Hidden gems included. Switch services on or off.</div>
            <div className="chips">{PLATFORMS.map(p => <button key={p.id} className={`chip ${pids.includes(p.id) ? 'on' : ''}`} onClick={() => tpid(p.id)}>{p.name}</button>)}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mut" style={{ fontSize: 12 }}>Sort:</span>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="best">Best overall</option>
                <option value="buzz">Most buzz</option>
                <option value="critics">Critics first</option>
                <option value="gems">Hidden gems first</option>
              </select>
            </div>
            <div className="grid">{plat.map(r => <Card key={r.id} rec={r} onSeen={() => mark(r.id)} onReject={() => mark(r.id)} />)}</div>
            {plat.length === 0 && <p className="mut">Turn on at least one platform.</p>}
          </>
        )}
      </main>
    </div>
  );
}
