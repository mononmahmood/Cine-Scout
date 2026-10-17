// IMDb ratings from IMDb's own daily public dataset (title.ratings.tsv.gz,
// ~9 MB). Streamed and scanned per request — nothing is stored — and the
// answer is cached at the edge for a day. ?ids=tt1,tt2,… (max 200)
// Data courtesy of IMDb (https://www.imdb.com), used for personal, non-commercial purposes.
import { createGunzip } from 'node:zlib';
import { Readable } from 'node:stream';
import { send } from './_lib.js';

const URL_ = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const memo = new Map(); // warm-instance memo of ratings already found

export default async function handler(req, res) {
  const ids = [...new Set(String(req.query?.ids || '').split(',').filter(x => /^tt\d{6,10}$/.test(x)))].slice(0, 200);
  if (!ids.length) return send(res, 400, { error: 'ids required' });
  const out = {}, want = new Set();
  for (const id of ids) memo.has(id) ? (out[id] = memo.get(id)) : want.add(id);
  if (want.size) {
    try {
      const r = await fetch(URL_);
      if (!r.ok) throw new Error('IMDb dataset ' + r.status);
      const lines = Readable.fromWeb(r.body).pipe(createGunzip());
      let rest = '';
      outer: for await (const chunk of lines) {
        const text = rest + chunk.toString('utf8');
        const parts = text.split('\n');
        rest = parts.pop();
        for (const line of parts) {
          const tab = line.indexOf('\t');
          const id = line.slice(0, tab);
          if (!want.has(id)) continue;
          const [, rating, votes] = line.split('\t');
          const v = { rating: +rating, votes: +votes };
          out[id] = v; memo.set(id, v); want.delete(id);
          if (!want.size) break outer;
        }
      }
      lines.destroy();
    } catch (e) {
      if (!Object.keys(out).length) return send(res, 502, { error: String(e.message || e) });
    }
  }
  if (memo.size > 50000) memo.clear();
  send(res, 200, out, 3600 * 12);
}
