// TMDB proxy: keeps the key on the server and allows only read endpoints the
// app needs, with sane parameter values. Set TMDB_TOKEN (v4 read access token)
// or TMDB_API_KEY (v3).
import { send, fetchJson, rateLimit } from './_lib.js';

const ALLOWED = [
  /^\/discover\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/(movie|tv)\/\d+\/videos$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/watch\/providers\/(movie|tv|regions)$/,
  /^\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/search\/(multi|movie|tv|keyword)$/,
  /^\/find\/tt\d+$/,
];
// Only parameters the app actually uses, with tame values (ids, dates, pipes,
// commas). Anything else is dropped before it reaches TMDB.
const OK_KEY = /^[a-z0-9_.]{1,40}$/;
const OK_VALUE = /^[\w .,:/|+\-]*$/;

export default async function handler(req, res) {
  if (!rateLimit(req, res, { name: 'tmdb', max: 240 })) return;
  const token = process.env.TMDB_TOKEN, key = process.env.TMDB_API_KEY;
  if (!token && !key) return send(res, 503, { error: 'TMDB key not configured', setup: 'Add TMDB_TOKEN in Vercel → Settings → Environment Variables' });
  const { path, ...rest } = req.query || {};
  if (!path || !ALLOWED.some(r => r.test(path))) return send(res, 400, { error: 'path not allowed' });
  const u = new URL('https://api.themoviedb.org/3' + path);
  for (const [k, v] of Object.entries(rest)) {
    if (k === 'api_key' || k === 'include_adult' || !OK_KEY.test(k)) continue;
    const val = (Array.isArray(v) ? v.join(',') : String(v)).slice(0, 200);
    if (!OK_VALUE.test(val)) continue;
    u.searchParams.set(k, val);
  }
  // adult content stays off, decided here and not by the caller
  u.searchParams.set('include_adult', 'false');
  if (!token) u.searchParams.set('api_key', key);
  try {
    const data = await fetchJson(u.toString(), { headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : {} });
    // discovery pages change slowly; details a little slower still
    send(res, 200, data, path.startsWith('/trending') ? 1800 : 3600 * 6);
  } catch (e) {
    send(res, e.status === 404 ? 404 : 502, { error: String(e.message || e) });
  }
}
