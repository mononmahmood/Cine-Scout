// Reddit discussion for one title, or the week's top film threads.
// Uses Reddit's official API (app-only OAuth) when REDDIT_CLIENT_ID and
// REDDIT_CLIENT_SECRET are set; otherwise the public Arctic Shift archive.
import { send, fetchJson, mentions } from './_lib.js';

const SUBS = ['movies', 'TrueFilm', 'criterion', 'flicks', 'MovieSuggestions', 'television', 'bollywood', 'tollywood', 'kollywood', 'IndianCinema', 'bangladesh'];
const UA = 'web:cine-scout:1.0 (by /u/cinescout-app)';
let cached = { token: null, until: 0 };

async function token() {
  const id = process.env.REDDIT_CLIENT_ID, secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cached.token && Date.now() < cached.until) return cached.token;
  const d = await fetchJson('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: 'grant_type=client_credentials',
  });
  cached = { token: d.access_token, until: Date.now() + (d.expires_in - 120) * 1000 };
  return cached.token;
}

const shape = p => ({ sub: p.subreddit, title: p.title, score: p.score || 0, comments: p.num_comments || 0, url: 'https://www.reddit.com' + p.permalink, at: (p.created_utc || 0) * 1000 });

async function official(tok, q, hot) {
  const h = { Authorization: `Bearer ${tok}`, 'User-Agent': UA };
  const multi = SUBS.join('+');
  const url = hot
    ? `https://oauth.reddit.com/r/movies+TrueFilm+criterion+bollywood+IndianCinema/top?t=week&limit=40`
    : `https://oauth.reddit.com/r/${multi}/search?q=${encodeURIComponent(`"${q}"`)}&restrict_sr=1&sort=relevance&t=all&limit=50`;
  const d = await fetchJson(url, { headers: h });
  return (d.data?.children || []).map(c => c.data);
}

async function archive(q, hot) {
  const since = new Date(Date.now() - (hot ? 7 : 365) * 864e5).toISOString().slice(0, 10);
  const url = hot
    ? `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=movies&after=${since}&limit=40&sort=desc`
    : `https://arctic-shift.photon-reddit.com/api/posts/search?title=${encodeURIComponent(q)}&subreddit=movies&after=${since}&limit=50&sort=desc`;
  const d = await fetchJson(url, {}, 15000);
  return d.data || [];
}

export default async function handler(req, res) {
  const { q, year, hot } = req.query || {};
  if (!hot && !q) return send(res, 400, { error: 'q required' });
  let posts = [], source = 'reddit';
  try {
    const tok = await token();
    posts = tok ? await official(tok, q, hot) : (source = 'archive', await archive(q, hot));
  } catch (e) {
    try { source = 'archive'; posts = await archive(q, hot); }
    catch { return send(res, 502, { error: 'Reddit unreachable', source }); }
  }
  if (hot) {
    const top = posts.filter(p => !p.stickied).map(shape).sort((a, b) => (b.score + b.comments) - (a.score + a.comments)).slice(0, 12);
    return send(res, 200, { source, posts: top }, 1800);
  }
  const hits = posts.filter(p => mentions(`${p.title} ${(p.selftext || '').slice(0, 600)}`, q, year));
  const top = hits.map(shape).sort((a, b) => (b.score + b.comments) - (a.score + a.comments));
  send(res, 200, {
    source,
    threads: hits.length,
    engagement: top.reduce((s, p) => s + p.score + p.comments, 0),
    top: top.slice(0, 3),
  }, 3600 * 6);
}
