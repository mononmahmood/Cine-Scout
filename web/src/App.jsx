import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QUESTIONS, byId, G } from './questions.js';
import { stateOf, visibleOptions, parseMood, EMPTY_MOOD, buildPool, nextQuestion, shouldStop, MAX_Q, recommend, nextBatch, hasMore, platformPicks, loadHistory, saveHistory, loadPrefs, savePrefs } from './engine.js';
import { PLATFORMS, providerMap, regionSupported, trending, IMG, redditHot, criticsLatest, introReel } from './live.js';

// First screen: a reel of calm trailer moments. ?intro=0 turns it off
// (the old poster backdrop), as does the system's reduce-motion setting.
const INTRO = typeof location !== 'undefined' && new URLSearchParams(location.search).get('intro') !== '0'
  && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
import { CATALOGUE } from './data.js';
import { HeroReel, Card, Thinking, wait, REDUCED, IntroReel, IntroHero, useIntroScroll } from './ui.jsx';

const NEVER = [['Horror', G.horror], ['War', G.war], ['Romance', G.romance], ['Animation', G.animation], ['Musicals', G.music], ['Documentary', G.documentary]];
const regionName = r => (r === 'IN' ? 'India' : 'Bangladesh');

const LANG_CHOICES = [['hi', 'Hindi'], ['bn', 'Bengali'], ['en', 'English'], ['ta', 'Tamil'], ['te', 'Telugu'], ['ml', 'Malayalam'], ['kn', 'Kannada'], ['mr', 'Marathi'], ['ko', 'Korean'], ['ja', 'Japanese'], ['es', 'Spanish'], ['fr', 'French']];
const langName = c => LANG_CHOICES.find(l => l[0] === c)?.[1] || c;

// First page on a new device, and "My taste" afterwards. Everything here is a
// default: answering a question about the same thing always wins.
function Taste({ initial, available, welcome, plain, onDone }) {
  const [services, setServices] = useState(initial?.services || []);
  const [never, setNever] = useState(initial?.never || []);
  const [langs, setLangs] = useState(initial?.langs || []);
  const [maxRuntime, setMaxRuntime] = useState(initial?.maxRuntime || 240);
  const tg = (list, set, k) => set(list.includes(k) ? list.filter(x => x !== k) : [...list, k]);
  return (
    <div className={`onboard ${welcome ? 'welcome' : ''}`}>
      {welcome ? (
        <div className="welcome-head">
          {plain ? <h2>Before the first film</h2> : <>
            <h1 className="logo big">CINE <span className="scout">SCOUT</span></h1>
            <p className="slogan">for those who stay for the credits</p>
          </>}
          <p className="mut">Four quick choices so every pick fits you. All optional — you can change them any time under <b>My taste</b>.</p>
        </div>
      ) : (
        <>
          <h2>Your taste</h2>
          <p className="mut">These are defaults. If you answer a question about the same thing, your answer wins.</p>
        </>
      )}
      <label>Usual film length: <b>{maxRuntime >= 240 ? 'any length' : `up to ${Math.floor(maxRuntime / 60)} h ${maxRuntime % 60 ? (maxRuntime % 60) + ' min' : ''}`}</b></label>
      <input type="range" min="90" max="240" step="10" value={maxRuntime} onChange={e => setMaxRuntime(+e.target.value)} />
      <div className="rangeticks mut"><span>1 h 30</span><span>2 h</span><span>3 h</span><span>Any</span></div>
      <label>Languages you watch <span className="mut">(none selected = any language)</span></label>
      <div className="chips wrap">{LANG_CHOICES.map(([c, n]) => <button key={c} className={`chip ${langs.includes(c) ? 'on' : ''}`} onClick={() => tg(langs, setLangs, c)}>{n}</button>)}</div>
      <label>Services you subscribe to <span className="mut">(none selected = all)</span></label>
      <div className="chips wrap">{PLATFORMS.filter(p => available[p.id]).map(p => <button key={p.id} className={`chip ${services.includes(p.id) ? 'on' : ''}`} onClick={() => tg(services, setServices, p.id)}>{p.name}</button>)}</div>
      {!Object.keys(available).length && <p className="mut small">Loading services for your region…</p>}
      <label>Never recommend</label>
      <div className="chips wrap">{NEVER.map(([n, id]) => <button key={id} className={`chip ${never.includes(id) ? 'on' : ''}`} onClick={() => tg(never, setNever, id)}>{n}</button>)}</div>
      <div className="btnrow">
        <button className="bigbtn" onClick={() => onDone({ services, never, langs, maxRuntime: maxRuntime >= 240 ? null : maxRuntime })}>{welcome ? 'Start scouting' : 'Save'}</button>
        {welcome && <button className="bigbtn ghost" onClick={() => onDone({})}>Skip for now</button>}
      </div>
    </div>
  );
}

function Watched({ items, onRemove, onDone }) {
  return (
    <div className="onboard wide">
      <h2>Titles you have marked</h2>
      <p className="mut">These never come back as recommendations. Remove one to allow it again.</p>
      {items.length === 0 && <p className="mut">Nothing yet — use “Seen” or “Not for me” on any card.</p>}
      <div className="seenlist">
        {items.map((t, i) => (
          <div key={t.key} className="seenrow on" style={{ '--i': i }}>
            <span><b>{t.title}</b> <span className="mut">({t.year || '—'})</span></span>
            <button className="linkbtn" onClick={() => onRemove(t.key)}>remove</button>
          </div>
        ))}
      </div>
      <div className="btnrow"><button className="bigbtn" onClick={onDone}>Done</button></div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState('mind');
  const [region, setRegion] = useState('IN');
  const [prefs, setPrefs] = useState(() => loadPrefs() || { services: [], never: [] });
  const firstVisit = useRef(!loadPrefs());
  const [history, setHistory] = useState(() => loadHistory());
  const [marked, setMarked] = useState(() => { try { return JSON.parse(localStorage.getItem('cinescout.marked.v2') || '[]'); } catch { return []; } });
  const [panel, setPanel] = useState(() => (loadPrefs() ? null : 'welcome')); // 'welcome' | 'taste' | 'watched'
  const [toast, setToast] = useState(null);
  const [leavingIds, setLeavingIds] = useState(new Set());
  const [apiError, setApiError] = useState(null);
  const [heroPool, setHeroPool] = useState(() => CATALOGUE.map(t => t.poster).filter(Boolean));
  const [providers, setProviders] = useState({});
  const [regionNote, setRegionNote] = useState(null);
  const [reel] = useState(() => (INTRO ? introReel(4) : []));
  useIntroScroll(INTRO);
  const startRef = useRef(null);
  const [dataRegion, setDataRegion] = useState('IN');

  // Mind-Reader
  const [phase, setPhase] = useState('ask'); // ask | narrowing | thinking | done
  const [answers, setAnswers] = useState([]);
  const [current, setCurrent] = useState(null);
  const [wording] = useState(() => Object.fromEntries(QUESTIONS.map(q => [q.id, Math.floor(Math.random() * q.wordings.length)])));
  const [picked, setPicked] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [pool, setPool] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [mood, setMood] = useState(EMPTY_MOOD);
  const [result, setResult] = useState(null);
  const [moreState, setMoreState] = useState('idle'); // idle | loading | done
  const run = useRef(0);

  // Platform explorer
  const [pids, setPids] = useState(['prime']);
  const [sort, setSort] = useState('gems');
  const [kind, setKind] = useState('movie');
  const [seed, setSeed] = useState(() => (Date.now() % 1e9) | 1);
  const [spin, setSpin] = useState(0);
  const [plat, setPlat] = useState({ loading: false, recs: [], total: 0, pool: 0 });
  const recentGems = useRef(new Set());
  const [hot, setHot] = useState(null);
  const [press, setPress] = useState(null);

  const say = msg => setToast({ msg, k: Date.now() });
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { saveHistory(history); }, [history]);
  useEffect(() => { try { localStorage.setItem('cinescout.marked.v2', JSON.stringify(marked)); } catch {} }, [marked]);

  // live: backdrops, providers for the region, whether TMDB covers the region
  useEffect(() => {
    trending().then(d => {
      const imgs = (d.results || []).map(r => IMG(r.backdrop_path, 'w1280')).filter(Boolean);
      if (imgs.length) setHeroPool(imgs);
      setApiError(null);
    }).catch(e => setApiError(e.status === 503 ? 'setup' : 'down'));
  }, []);
  useEffect(() => {
    setProviders({}); setRegionNote(null); setDataRegion(region);
    regionSupported(region).then(ok => {
      const dr = ok ? region : 'IN';
      setDataRegion(dr);
      setRegionNote(ok ? null : `There is no public streaming data for ${regionName(region)}, so availability below uses India’s listings as the closest guide. Netflix and Prime catalogues differ a little between the two — check the app before you settle in.`);
      providerMap(dr).then(setProviders).catch(() => {});
    });
  }, [region]);

  const services = useMemo(() => (prefs.services || []).flatMap(id => providers[id] || []), [prefs, providers]);
  const ctx = useMemo(() => ({
    region, dataRegion, history, services, regionNote,
    serviceNames: (prefs.services || []).map(id => PLATFORMS.find(p => p.id === id)?.name).filter(Boolean),
  }), [region, dataRegion, history, services, regionNote, prefs]);

  // taste defaults; an answer to the same question always wins
  const withPrefs = (s, na) => {
    (prefs.never || []).forEach(g => { s.none.movie.add(g); s.none.tv.add(g); });
    const answered = new Set(na.map(a => a.qid));
    if (prefs.maxRuntime && !answered.has('runtime') && !s.maxRuntime) { s.maxRuntime = prefs.maxRuntime; s.prefRuntime = true; }
    if (prefs.langs?.length && !answered.has('language') && !s.langs) { s.langs = prefs.langs; s.prefLangs = true; }
    return s;
  };
  const st = useMemo(() => withPrefs(stateOf(answers, mood), answers), [answers, mood, prefs]); // eslint-disable-line

  // ---- Mind-Reader flow ----
  useEffect(() => { if (phase === 'ask' && !current && !answers.length) setCurrent(nextQuestion([], st, null)); }, [phase, current, answers.length]); // eslint-disable-line

  const advance = async (na, m = mood) => {
    const my = ++run.current;
    const s = withPrefs(stateOf(na, m), na);
    let nq = nextQuestion(na, s, null);
    if (nq && (nq.core || nq.practical)) { setCurrent(nq); setPhase('ask'); return; }
    setPhase('narrowing'); setCurrent(null);
    try {
      const p = await buildPool(s, ctx, 60, 4);
      if (my !== run.current) return;
      setPool(p);
      nq = shouldStop(na, p) ? null : nextQuestion(na, s, p);
      if (nq) { setCurrent(nq); setPhase('ask'); } else finish(na, m);
    } catch (e) { if (my === run.current) { setApiError(e.status === 503 ? 'setup' : 'down'); setPhase('ask'); } }
  };

  const finish = async (na = answers, m = mood) => {
    const my = ++run.current;
    setPhase('thinking'); setCurrent(null);
    const s = withPrefs(stateOf(na, m), na);
    try {
      const [p] = await Promise.all([buildPool(s, ctx, 60, 9), wait(1600)]);
      const r = await recommend(s, p, ctx);
      if (my !== run.current) return;
      setPool(p); setResult(r); setMoreState(hasMore(r.cursor) ? 'idle' : 'done'); setPhase('done');
    } catch (e) { if (my === run.current) { setApiError(e.status === 503 ? 'setup' : 'down'); setPhase('ask'); } }
  };

  const answer = async (q, o) => {
    if (picked) return;
    setPicked(o.id);
    await wait(200); setLeaving(true);
    await wait(260);
    const na = [...answers, { qid: q.id, oid: o.id }];
    setAnswers(na); setPicked(null); setLeaving(false);
    advance(na);
  };

  // jump back to any earlier question and answer it differently
  const editAnswer = i => {
    run.current++;
    const na = answers.slice(0, i);
    setAnswers(na); setResult(null); setPicked(null); setLeaving(false);
    setCurrent(byId[answers[i].qid]); setPhase('ask');
  };

  const applyFree = () => {
    if (!freeText.trim()) return;
    const m = parseMood(freeText); setMood(m);
    if (!m.heard.length && !m.avoided.length) { say('Try words like funny, crime, sci-fi, true story, no horror'); return; }
    if (phase === 'done') finish(answers, m); else if (answers.length >= 2) advance(answers, m);
  };

  const loadMore = async () => {
    if (!result?.cursor || moreState === 'loading') return;
    setMoreState('loading');
    try {
      const extra = await nextBatch(result.cursor, 10);
      const have = new Set(result.recs.map(r => r.id));
      const add = extra.filter(r => !have.has(r.id));
      setResult(r => ({ ...r, recs: [...r.recs.filter(x => x.strict), ...add, ...r.recs.filter(x => x.strict === false)] }));
      setMoreState(add.length && hasMore(result.cursor) ? 'idle' : 'done');
    } catch { setMoreState('idle'); say('Could not load more right now'); }
  };

  const reset = () => { run.current++; setAnswers([]); setFreeText(''); setMood(EMPTY_MOOD); setResult(null); setPool(null); setCurrent(null); setPicked(null); setLeaving(false); setPhase('ask'); setRoute('mind'); setPanel(null); };

  const act = (rec, kindOf) => {
    setLeavingIds(s => new Set([...s, rec.id]));
    setTimeout(() => {
      setHistory(h => new Set([...h, rec.id]));
      setMarked(m => [{ key: rec.id, title: rec.title.title, year: rec.title.year, why: kindOf }, ...m.filter(x => x.key !== rec.id)]);
      setResult(r => r && { ...r, recs: r.recs.filter(x => x.id !== rec.id) });
      setPlat(p => ({ ...p, recs: p.recs.filter(x => x.id !== rec.id) }));
      setLeavingIds(s => { const n = new Set(s); n.delete(rec.id); return n; });
    }, REDUCED ? 0 : 380);
    say(kindOf === 'love' ? 'Loved — marked as watched' : kindOf === 'seen' ? 'Marked as seen — it won’t come back' : 'Got it — won’t show that again');
  };

  // ---- Platform explorer ----
  useEffect(() => {
    if (route !== 'plat') return;
    let alive = true;
    const ids = pids.flatMap(id => providers[id] || []);
    if (!ids.length) { setPlat({ loading: false, recs: [], total: 0 }); return; }
    setPlat(p => ({ ...p, loading: true }));
    platformPicks({ providerIds: ids, region: dataRegion, sort, seed, history, kind, recent: recentGems.current }, ctx)
      .then(r => { if (!alive) return; r.recs.forEach(x => recentGems.current.add(x.id)); setPlat({ loading: false, ...r }); })
      .catch(e => { if (alive) { setPlat({ loading: false, recs: [], total: 0 }); setApiError(e.status === 503 ? 'setup' : 'down'); } });
    return () => { alive = false; };
  }, [route, pids, sort, kind, seed, dataRegion, providers]); // eslint-disable-line
  useEffect(() => {
    if (route !== 'plat') return;
    if (!hot) redditHot().then(setHot).catch(() => setHot({ posts: [] }));
    if (!press) criticsLatest().then(setPress).catch(() => setPress({ items: [] }));
  }, [route]); // eslint-disable-line
  const shuffle = () => { setSeed(x => (x * 48271) % 2147483647 || 7); setSpin(s => s + 1); };
  const tpid = id => setPids(pids.includes(id) ? pids.filter(x => x !== id) : [...pids, id]);

  const recs = result?.recs || [];
  const exact = recs.filter(r => r.strict), close = recs.filter(r => r.strict === false);
  const cardProps = (r, i) => ({ rec: r, index: i, leaving: leavingIds.has(r.id), onLove: () => act(r, 'love'), onSeen: () => act(r, 'seen'), onReject: () => act(r, 'reject') });
  const view = panel || route;
  const go = r => { setPanel(null); setRoute(r); };
  const NAV = [
    { k: 'mind', label: 'Mind-Reader', icon: '◎', on: () => go('mind') },
    { k: 'plat', label: 'By platform', icon: '▦', on: () => go('plat') },
    { k: 'taste', label: 'My taste', icon: '♥', on: () => setPanel('taste') },
    { k: 'watched', label: 'Watched', icon: '✓', on: () => setPanel('watched') },
  ];
  const rules = [
    st.kind === 'movie' && 'Films only', st.kind === 'tv' && 'Series only',
    st.maxRuntime && `Under ${st.maxRuntime} min`, st.status === 'ended' && 'Finished series',
    st.minYear && `${st.minYear} or later`, st.langs && `Language: ${st.langs.map(langName).join(', ')}`,
    st.fame === 'gems' && 'Lesser-known only', st.fame === 'popular' && 'Popular only', st.family && 'Family-safe',
    ...mood.avoided.map(a => `No ${a}`), ...(prefs.never || []).map(g => `No ${NEVER.find(n => n[1] === g)?.[0]}`),
    prefs.services?.length && `Only my services`,
  ].filter(Boolean);
  const availablePlatforms = PLATFORMS.filter(p => providers[p.id]);
  const answeredIds = new Set(answers.map(a => a.qid));
  const defaults = [
    prefs.maxRuntime && !answeredIds.has('runtime') && st.kind !== 'tv' && `Films up to ${prefs.maxRuntime} min`,
    prefs.langs?.length > 0 && !answeredIds.has('language') && prefs.langs.map(langName).join(', '),
  ].filter(Boolean);

  return (
    <div className={`app ${INTRO ? 'intro-mode' : ''}`}>
      <aside className="side">
        <h1 className="logo">CINE<br /><span className="scout">SCOUT</span></h1>
        <div className="tag">for those who stay for the credits</div>
        <div className="sec">Reel reading · Explore · You</div>
        <nav className="nav">
          {NAV.map(n => <button key={n.k} className={view === n.k ? 'on' : ''} onClick={n.on}><span className="ico">{n.icon}</span>{n.label}</button>)}
          <button onClick={reset}><span className="ico">↺</span>New session</button>
        </nav>
        <div className="mut memo">{history.size === 0 ? 'No history yet.' : `Remembers ${history.size} — never repeats.`}</div>
        <div className="mut attribution">Film data from TMDB · streaming data via JustWatch · scores and prizes from Wikidata · discussion from Reddit · headlines from critics’ public feeds. This product uses the TMDB API but is not endorsed or certified by TMDB.</div>
      </aside>
      {INTRO ? <IntroReel clips={reel} /> : <HeroReel pool={heroPool} />}
      <main className="main">
        {(view !== 'welcome' || INTRO) && (
          <header className="mhead">
            <div className="logo small">CINE <span className="scout">SCOUT</span></div>
            <div className="slogan">for those who stay for the credits</div>
          </header>
        )}
        {INTRO && <IntroHero onStart={() => startRef.current?.scrollIntoView({ behavior: 'smooth' })} />}
        <div className="after-intro" ref={startRef}>
        <div className="topbar">
          <div className="mut livebar"><span className={`livedot ${apiError ? 'off' : ''}`} />{apiError ? 'Live catalogue offline' : 'Live · TMDB, Wikidata, Reddit, critics'}</div>
          <div className="seg" data-on={region}>
            <span className="seg-pill" />
            {['IN', 'BD'].map(r => <button key={r} className={region === r ? 'on' : ''} onClick={() => { if (r !== region) { setRegion(r); reset(); } }}>{regionName(r)}</button>)}
          </div>
        </div>
        {apiError && (
          <div className="banner">
            {apiError === 'setup'
              ? <><b>Almost there:</b> the TMDB key is not set on the server yet. Add <code>TMDB_TOKEN</code> in Vercel → Project → Settings → Environment Variables, then redeploy.</>
              : <><b>Live catalogue unreachable.</b> TMDB did not answer — try again in a minute.</>}
          </div>
        )}
        {regionNote && <div className="banner soft">{regionNote}</div>}

        <div className="view" key={view}>
          {view === 'taste' || view === 'welcome' ? (
            <Taste initial={prefs} available={providers} welcome={view === 'welcome'} plain={INTRO} onDone={p => { const n = { services: [], never: [], ...prefs, ...p }; setPrefs(n); savePrefs(n); setPanel(null); say(view === 'welcome' ? 'Set — let’s find tonight’s film' : 'Saved'); }} />
          ) : view === 'watched' ? (
            <Watched items={marked} onDone={() => setPanel(null)} onRemove={key => { setMarked(m => m.filter(x => x.key !== key)); setHistory(h => { const n = new Set(h); n.delete(key); return n; }); }} />
          ) : view === 'mind' ? (
            <>
              <h2 className="headline">Tonight, what are you?</h2>
              <div className="mut sub">{phase === 'done' ? 'Every exact match below obeys each of your answers.' : 'A few plain questions. Tap any answer below to change it.'}</div>
              <div className="freebox">
                <input type="text" value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => e.key === 'Enter' && applyFree()} placeholder="Or type it: a funny crime film, no horror…" />
                <button onClick={applyFree}>Read this</button>
              </div>
              {(answers.length > 0 || mood.heard.length > 0 || rules.length > 0 || defaults.length > 0) && (
                <div className="chips small reqs">
                  {answers.map((a, i) => {
                    const q = byId[a.qid]; const o = q.options.find(x => x.id === a.oid);
                    return <button key={a.qid} className="chip req edit" title="Change this answer" onClick={() => editAnswer(i)}><span className="mut">{q.topic}:</span> {o.label} <i>✎</i></button>;
                  })}
                  {mood.heard.map(h => <span key={h} className="chip req">you said “{h}”</span>)}
                  {rules.filter(r => r.startsWith('No') || r === 'Only my services').map(r => <span key={r} className="chip rule">{r}</span>)}
                  {defaults.map(d => <button key={d} className="chip rule edit" title="Your default — tap to change" onClick={() => setPanel('taste')}>{d} <span className="mut">· default</span> <i>✎</i></button>)}
                </div>
              )}
              {phase !== 'done' && (
                <div className="progress">
                  <div className="ptrack"><div className="pfill" style={{ width: `${Math.min(100, (answers.length / MAX_Q) * 100)}%` }} /></div>
                  <span className="mut">{pool && answers.length >= 3 ? `${pool.strict.length}${pool.exhausted ? '' : '+'} titles fit every answer so far` : `${answers.length} of up to ${MAX_Q}`}</span>
                </div>
              )}

              {phase === 'thinking' ? <Thinking region={region} n={answers.length} />
                : phase === 'narrowing' ? <div className="q"><strong className="qtext">Checking what fits so far…</strong><div className="think" /></div>
                : phase === 'done' ? (
                  <>
                    {result?.trace && (
                      <details className="howto trace">
                        <summary>How it thought</summary>
                        <ol className="steps">
                          <li>Turned your answers into {result.trace.rules.length} strict genre rules{rules.length ? ` and ${rules.length} hard filters` : ''}</li>
                          <li>Searched the live TMDB catalogue: {result.trace.total.toLocaleString()} titles passed the filters, {result.trace.strict}{result.trace.exhausted ? '' : '+'} of those passed every rule</li>
                          <li>Rated each pick with IMDb ({result.trace.withImdb} of {recs.length}), Rotten Tomatoes / Metacritic ({result.trace.withScores}) and festival or award records ({result.trace.festival} festival winners)</li>
                          <li>Ranked by combined score; titles you can stream in {regionName(region)}{prefs.services?.length ? ' on your services' : ''} break ties</li>
                        </ol>
                      </details>
                    )}
                    <h3 className="sechead"><span className="dot ok" />{exact.length ? `${exact.length} exact match${exact.length > 1 ? 'es' : ''}` : 'Nothing matches every answer'}<span className="mut"> · {regionName(region)}</span></h3>
                    {!exact.length && <p className="mut">Try changing one answer above — the chips are clickable.</p>}
                    {exact.length > 0 && <div className="grid">{exact.map((r, i) => <Card key={r.id} {...cardProps(r, i)} />)}</div>}
                    {close.length > 0 && (
                      <>
                        <h3 className="sechead"><span className="dot near" />Close matches <span className="mut">· each misses one answer, named on the card</span></h3>
                        <div className="grid">{close.map((r, i) => <Card key={r.id} {...cardProps(r, exact.length + i)} />)}</div>
                      </>
                    )}
                    <div className="btnrow">
                      {exact.length > 0 && moreState !== 'done' && (
                        <button className={`bigbtn more ${moreState === 'loading' ? 'busy' : ''}`} disabled={moreState === 'loading'} onClick={loadMore}>
                          {moreState === 'loading' ? <><i className="spin dark" />Finding 10 more…</> : 'Show 10 more'}
                        </button>
                      )}
                      {moreState === 'done' && exact.length > 0 && <span className="mut endnote">That’s every title that fits all your answers.</span>}
                      <button className="bigbtn ghost" onClick={reset}>New session</button>
                    </div>
                  </>
                ) : current ? (
                  <div className={`q ${leaving ? 'out' : ''}`} key={current.id + answers.length}>
                    <div className="qnum">Question {answers.length + 1} · {current.topic}</div>
                    <strong className="qtext">{current.wordings[wording[current.id] % current.wordings.length]}</strong>
                    {visibleOptions(current, st).map((o, i) => (
                      <button key={o.id} className={`opt ${picked === o.id ? 'picked' : ''} ${picked && picked !== o.id ? 'dim' : ''}`} style={{ '--i': i }} onClick={() => answer(current, o)}>
                        <span className="key">{'ABCDE'[i]}</span>{o.label}
                      </button>
                    ))}
                    <div className="qfoot mut">
                      <span>Questions adapt to your answers · skipped when they would not change anything</span>
                      {answers.length >= 2 && <button className="linkbtn" onClick={() => finish()}>Show my picks now →</button>}
                    </div>
                  </div>
                ) : <div className="q"><div className="think" /></div>}
            </>
          ) : (
            <>
              <h2 className="headline">Best by platform</h2>
              <div className="mut sub">Live from each service’s current catalogue in {regionName(region)}.</div>
              {(press?.items?.length > 0 || hot?.posts?.length > 0) && (
                <div className="ticker" aria-label="Latest film news">
                  <span className="tick-label"><span className="livedot" />Now</span>
                  <div className="tick-track">
                    <div className="tick-run">
                      {[0, 1].map(copy => (
                        <React.Fragment key={copy}>
                          {[...(press?.items || []).slice(0, 8).map(i => ({ src: i.source, t: i.title, url: i.url })), ...(hot?.posts || []).slice(0, 4).map(p => ({ src: 'r/' + p.sub, t: p.title, url: p.url }))]
                            .map(x => <a key={copy + x.url} href={x.url} target="_blank" rel="noreferrer" tabIndex={copy ? -1 : 0}><b>{x.src}</b>{x.t}</a>)}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="chips">{availablePlatforms.map(p => <button key={p.id} className={`chip ${pids.includes(p.id) ? 'on' : ''}`} onClick={() => tpid(p.id)}>{p.name}</button>)}</div>
              {!availablePlatforms.length && !apiError && <p className="mut">Loading services in {regionName(region)}…</p>}
              <div className="sortrow">
                <div className="seg tabs">
                  {[['gems', '✦ Hidden gems'], ['best', 'Best rated'], ['new', 'New & good'], ['buzz', 'Trending']].map(([k, l]) => <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>)}
                </div>
                <div className="seg tabs">
                  {[['movie', 'Films'], ['tv', 'Series']].map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}
                </div>
                {sort === 'gems' && <button className="shuffle" onClick={shuffle}><span className="sic" style={{ transform: `rotate(${spin * 360}deg)` }}>⟳</span> Shuffle gems</button>}
              </div>
              {!plat.loading && plat.recs.length > 0 && <div className="mut note">{sort === 'gems' ? `${plat.pool} hidden gems found in this draw — IMDb 7+ from a real crowd (or critic-backed), never a blockbuster. Shuffle to dig elsewhere.` : sort === 'best' ? 'Highest IMDb ratings with at least a solid crowd of voters' : sort === 'new' ? 'Released in the last year or so, best IMDb ratings first' : 'Most watched on this service right now'}</div>}
              {plat.loading ? <Thinking region={region} label="Scouting the shelf" stages={['Reading the service’s live catalogue', 'Looking up every title on IMDb', 'Checking critics and festival records', 'Setting aside the blockbusters', 'Drawing your picks']} /> : (
                <div className="grid" key={sort + seed + pids.join() + region + kind}>{plat.recs.map((r, i) => <Card key={r.id} {...cardProps(r, i)} />)}</div>
              )}
              {!plat.loading && !plat.recs.length && availablePlatforms.length > 0 && <p className="mut empty">{pids.length ? 'Nothing here yet — try another service or shelf.' : 'Turn on at least one service.'}</p>}
            </>
          )}
        </div>
        </div>
      </main>
      <nav className="tabbar">
        {NAV.map(n => <button key={n.k} className={view === n.k ? 'on' : ''} onClick={n.on}><span>{n.icon}</span>{n.label}</button>)}
      </nav>
      {toast && <div className="toast" key={toast.k}>{toast.msg}</div>}
    </div>
  );
}
