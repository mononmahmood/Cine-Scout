import React, { useEffect, useMemo, useState } from 'react';
import { CATALOGUE, QUESTIONS, PLATFORMS, fetchCatalogue } from './data.js';
import { rank, marginOf, shouldStop, buildRecommendations, topForPlatform, loadHistory, saveHistory } from './engine.js';

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
      <span className={`avail ${rec.blocked ? 'block' : 'ok'}`}>{rec.badge}</span>
      {rec.fallback && <div className="fb">{rec.fallback}</div>}
      <div className="mini" style={{ marginTop: 8 }}>
        <button onClick={onSeen}>Seen</button>
        <button onClick={onReject}>Not for me</button>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState('mind');
  const [region, setRegion] = useState('IN');
  const [asked, setAsked] = useState([]);
  const [answers, setAnswers] = useState({});
  const [done, setDone] = useState(false);
  const [history, setHistory] = useState(() => loadHistory());
  const [cat, setCat] = useState(CATALOGUE);
  useEffect(() => { fetchCatalogue().then(setCat); }, []);
  useEffect(() => { saveHistory(history); }, [history]);

  const tags = useMemo(() => {
    const s = new Set();
    asked.forEach(q => { const oid = answers[q.id]; const o = q.options.find(x => x.id === oid); o?.tags.forEach(t => s.add(t)); });
    return s;
  }, [asked, answers]);

  const current = useMemo(() => {
    if (done) return null;
    const ranked = rank(cat.filter(t => ![...history].includes(t.id)), tags);
    if (shouldStop(asked.length, marginOf(ranked))) return null;
    return QUESTIONS.find(q => !asked.map(a => a.id).includes(q.id)) || null;
  }, [asked, tags, done, cat, history]);

  useEffect(() => { if (!current && asked.length >= 2 && !done) setDone(true); }, [current, asked, done]);

  const recs = useMemo(() => done ? buildRecommendations(cat, tags, region, history) : [], [done, cat, tags, region, history]);
  const plat = useMemo(() => {
    if (!route.startsWith('plat:')) return null;
    const pid = route.split(':')[1];
    return topForPlatform(cat.filter(t => t.avail.some(a => a.p === pid) || pid === 'all'), region, history);
  }, [route, cat, region, history]);

  const answer = (q, o) => {
    const na = [...asked, q]; setAsked(na); setAnswers({ ...answers, [q.id]: o.id });
    const nt = new Set(tags); o.tags.forEach(t => nt.add(t));
    const ranked = rank(cat, nt);
    if (shouldStop(na.length, marginOf(ranked))) setDone(true);
  };
  const reset = () => { setAsked([]); setAnswers({}); setDone(false); };
  const mark = id => setHistory(new Set([...history, id]));

  return (
    <div className="app">
      <aside className="side">
        <h1>Musepark 1.3</h1>
        <div className="sec">Mind-Reader</div>
        <div className="nav"><button className={route === 'mind' ? 'on' : ''} onClick={() => setRoute('mind')}>Mind-Reader</button></div>
        <div className="sec">Platform Explorer</div>
        <div className="nav">{PLATFORMS.map(p => <button key={p.id} className={route === 'plat:' + p.id ? 'on' : ''} onClick={() => setRoute('plat:' + p.id)}>{p.name}</button>)}</div>
        <div className="mut" style={{ fontSize: 11, margin: '14px 8px' }}>{history.size === 0 ? 'No history yet' : `Tracking ${history.size} seen/rejected`} · <button style={{ background: 'none', border: 0, color: '#9a9a9a', cursor: 'pointer', padding: 0 }} onClick={() => setHistory(new Set())}>reset</button></div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="mut" style={{ fontSize: 12 }}>Strict region: IN / BD verified</div>
          <div className="seg">
            {['IN', 'BD'].map(r => <button key={r} className={region === r ? 'on' : ''} onClick={() => { setRegion(r); reset(); }}>{r}</button>)}
          </div>
        </div>
        {route === 'mind' ? (
          <>
            <h2 style={{ margin: '14px 0 4px' }}>Mind-Reader</h2>
            <div className="mut">Situational diagnosis — answer one, we recalculate. Dynamic stop when confident.</div>
            {done ? (
              <>
                <h3>Your flawless picks ({recs.length})</h3>
                <div className="grid">{recs.map(r => <Card key={r.id} rec={r} onSeen={() => mark(r.id)} onReject={() => mark(r.id)} />)}</div>
                <div className="mini" style={{ marginTop: 12 }}><button onClick={reset}>Ask again</button></div>
              </>
            ) : current ? (
              <div className="q" style={{ marginTop: 14 }}>
                <strong>{current.prompt}</strong>
                {current.options.map(o => <button key={o.id} className="opt" onClick={() => answer(current, o)}>{o.label}</button>)}
                <div className="mut" style={{ fontSize: 11, marginTop: 8 }}>Question {asked.length + 1} of ~4</div>
              </div>
            ) : <p className="mut">Reading your mood…</p>}
          </>
        ) : (
          <>
            <h2 style={{ margin: '14px 0 4px' }}>{PLATFORMS.find(p => 'plat:' + p.id === route)?.name}</h2>
            <div className="mut">Best · IMDb 8.0+ · hidden gems first · verified for {region}</div>
            <div className="grid">{(plat || []).map(r => <Card key={r.id} rec={r} onSeen={() => mark(r.id)} onReject={() => mark(r.id)} />)}</div>
          </>
        )}
      </main>
    </div>
  );
}
