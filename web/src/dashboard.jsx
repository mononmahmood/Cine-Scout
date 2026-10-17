import React, { useMemo, useRef, useState } from 'react';

// Personal dashboard. No account: everything lives in this browser
// (localStorage) and can be exported to a file and imported elsewhere.

const GENRES = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-fi', 53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action & Adventure', 10762: 'Kids', 10765: 'Sci-fi & Fantasy', 10768: 'War & Politics' };
const LANGS = { hi: 'Hindi', bn: 'Bengali', en: 'English', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada', mr: 'Marathi', ko: 'Korean', ja: 'Japanese', es: 'Spanish', fr: 'French', it: 'Italian', de: 'German', zh: 'Chinese', fa: 'Persian' };
const LISTS = [['love', 'Loved', '♥'], ['seen', 'Seen', '✓'], ['reject', 'Not for me', '✕']];
const when = t => (t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);

export const STORE_KEYS = ['cinescout.prefs.v2', 'cinescout.history.v2', 'cinescout.marked.v2', 'cinescout.sessions.v1', 'cinescout.shown.v2'];

function Profile({ marked }) {
  const p = useMemo(() => {
    const liked = marked.filter(m => m.why === 'love' || m.why === 'seen');
    const g = {}, l = {}, d = {};
    for (const m of liked) {
      const w = m.why === 'love' ? 2 : 1;
      (m.genres || []).forEach(id => { if (GENRES[id]) g[GENRES[id]] = (g[GENRES[id]] || 0) + w; });
      if (m.lang) l[LANGS[m.lang] || m.lang.toUpperCase()] = (l[LANGS[m.lang] || m.lang.toUpperCase()] || 0) + w;
      if (m.year) { const dec = Math.floor(m.year / 10) * 10 + 's'; d[dec] = (d[dec] || 0) + w; }
    }
    const loved = marked.filter(m => m.why === 'love' && m.imdb);
    const avg = loved.length ? (loved.reduce((s, m) => s + m.imdb, 0) / loved.length).toFixed(1) : null;
    return { genres: top(g, 6), langs: top(l, 4), decades: top(d, 4), avg, max: Math.max(1, ...Object.values(g)) };
  }, [marked]);
  if (!p.genres.length) return <p className="mut">Mark a few titles as loved or seen and your taste profile appears here.</p>;
  return (
    <div className="profile">
      <div className="pcol">
        <h4>Genres you lean to</h4>
        {p.genres.map(([name, v], i) => (
          <div className="pbar" key={name}><span>{name}</span><div className="track"><div className="fill" style={{ '--w': (v / p.max) * 100 + '%', animationDelay: i * 0.06 + 's' }} /></div></div>
        ))}
      </div>
      <div className="pcol">
        <h4>Languages</h4>
        <div className="chips small">{p.langs.map(([n]) => <span key={n} className="chip req">{n}</span>)}</div>
        <h4>Decades</h4>
        <div className="chips small">{p.decades.map(([n]) => <span key={n} className="chip">{n}</span>)}</div>
        {p.avg && <><h4>Average IMDb of what you love</h4><div className="bignum">{p.avg}</div></>}
      </div>
    </div>
  );
}

export default function Dashboard({ marked, setMarked, setHistory, sessions, setSessions, prefs, onEditTaste, onRerun, say }) {
  const [tab, setTab] = useState('love');
  const file = useRef(null);
  const counts = Object.fromEntries(LISTS.map(([k]) => [k, marked.filter(m => m.why === k).length]));
  const shownTotal = useMemo(() => { try { return Object.keys(JSON.parse(localStorage.getItem('cinescout.shown.v2') || '{}')).length; } catch { return 0; } }, []);
  const list = marked.filter(m => m.why === tab);

  const remove = key => { setMarked(m => m.filter(x => x.key !== key)); setHistory(h => { const n = new Set(h); n.delete(key); return n; }); say('Removed — it can be suggested again'); };
  const move = (key, why) => setMarked(m => m.map(x => (x.key === key ? { ...x, why } : x)));

  const exportData = () => {
    const data = { app: 'cine-scout', version: 1, exportedAt: new Date().toISOString(), data: Object.fromEntries(STORE_KEYS.map(k => [k, localStorage.getItem(k)])) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `cine-scout-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const importData = async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'cine-scout' || !j.data) throw new Error('not a Cine Scout backup');
      for (const k of STORE_KEYS) { if (j.data[k] != null) localStorage.setItem(k, j.data[k]); }
      say('Backup restored'); setTimeout(() => location.reload(), 700);
    } catch (err) { say('Could not read that file — ' + err.message); }
    e.target.value = '';
  };
  const clearAll = () => {
    if (!confirm('Delete your lists, history and taste from this device? This cannot be undone.')) return;
    STORE_KEYS.forEach(k => localStorage.removeItem(k)); location.reload();
  };

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h2 className="headline">Your dashboard</h2>
          <div className="mut sub">Everything you’ve marked, watched and asked for. Saved only on this device — no account needed.</div>
        </div>
      </div>

      <div className="stats">
        {[['Loved', counts.love], ['Seen', counts.seen], ['Not for me', counts.reject], ['Sessions', sessions.length], ['Titles suggested', shownTotal]].map(([k, v], i) => (
          <div className="stat" key={k} style={{ '--i': i }}><b>{v}</b><span>{k}</span></div>
        ))}
      </div>

      <section className="dsec">
        <h3>Your taste</h3>
        <Profile marked={marked} />
        <div className="mut small tastenote">
          Defaults: {prefs?.maxRuntime ? `films up to ${prefs.maxRuntime} min` : 'any length'} · {prefs?.langs?.length ? prefs.langs.map(l => LANGS[l] || l).join(', ') : 'any language'} · {prefs?.services?.length ? `${prefs.services.length} service${prefs.services.length > 1 ? 's' : ''}` : 'all services'}
          <button className="linkbtn" onClick={onEditTaste}>Edit</button>
        </div>
      </section>

      <section className="dsec">
        <div className="seg tabs">{LISTS.map(([k, label, icon]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{icon} {label} <span className="mut">{counts[k]}</span></button>)}</div>
        {list.length === 0 ? <p className="mut">Nothing here yet — use the buttons under any recommendation.</p> : (
          <div className="mlist">
            {list.map((m, i) => (
              <div className="mrow" key={m.key} style={{ '--i': i }}>
                {m.poster ? <img src={m.poster} alt="" loading="lazy" /> : <div className="mph">{m.title?.[0]}</div>}
                <div className="minfo">
                  <b>{m.title}</b>
                  <span className="mut">{[m.year, LANGS[m.lang] || m.lang?.toUpperCase(), m.imdb && `IMDb ${m.imdb.toFixed(1)}`].filter(Boolean).join(' · ')}</span>
                  <span className="mut small">Marked {when(m.at)}</span>
                </div>
                <div className="mact">
                  {LISTS.filter(([k]) => k !== m.why).map(([k, , icon]) => <button key={k} title={`Move to ${k}`} onClick={() => move(m.key, k)}>{icon}</button>)}
                  <button title="Remove — allow it again" onClick={() => remove(m.key)}>↺</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dsec">
        <h3>Past sessions</h3>
        {sessions.length === 0 ? <p className="mut">Your Mind-Reader sessions will be listed here.</p> : (
          <div className="sessions">
            {sessions.map((s, i) => (
              <div className="session" key={s.at} style={{ '--i': i }}>
                <div className="srow">
                  <b>{when(s.at)}</b><span className="mut">{s.region === 'BD' ? 'Bangladesh' : 'India'}</span>
                  <button className="linkbtn gold" onClick={() => onRerun(s)}>Run again →</button>
                </div>
                <div className="chips small">{s.answers.map(a => <span key={a.topic + a.label} className="chip req"><span className="mut">{a.topic}:</span> {a.label}</span>)}{s.mood && <span className="chip req">“{s.mood}”</span>}</div>
                <div className="spicks">{s.picks.slice(0, 6).map(p => <span key={p.key} title={p.title}>{p.poster ? <img src={p.poster} alt={p.title} loading="lazy" /> : p.title}</span>)}</div>
              </div>
            ))}
            <button className="linkbtn" onClick={() => { if (confirm('Clear session history?')) setSessions([]); }}>Clear session history</button>
          </div>
        )}
      </section>

      <section className="dsec">
        <h3>Your data</h3>
        <p className="mut small">Stored in this browser only. Export a backup to keep it safe or to move it to another phone or computer.</p>
        <div className="btnrow">
          <button className="bigbtn" onClick={exportData}>Export backup</button>
          <button className="bigbtn ghost" onClick={() => file.current?.click()}>Import backup</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={importData} />
          <button className="bigbtn ghost danger" onClick={clearAll}>Clear everything</button>
        </div>
      </section>
    </div>
  );
}
