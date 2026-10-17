// Festival prizes, awards, nominations and critic scores (Rotten Tomatoes,
// Metacritic) from Wikidata, looked up by IMDb id. ?imdb=tt1,tt2,… (max 40)
import { send, fetchJson } from './_lib.js';

const FESTIVALS = ['cannes', 'palme', 'venice', 'golden lion', 'berlin', 'golden bear', 'sundance', 'toronto', 'tiff', 'locarno', 'karlovy', 'busan', 'rotterdam', 'san sebasti', 'mami', 'iffk', 'iffi', 'kerala', 'goa', 'dhaka international'];
const MAJOR = ['academy award', 'oscar', 'bafta', 'golden globe', 'césar', 'national film award', 'filmfare', 'independent spirit', 'critics', 'european film award', 'asian film award'];
const rankOf = s => {
  const l = s.toLowerCase();
  if (FESTIVALS.some(f => l.includes(f))) return 0;
  const i = MAJOR.findIndex(m => l.includes(m));
  return i < 0 ? 99 : 1 + i;
};
const RT = 'http://www.wikidata.org/entity/Q105584', MC = 'http://www.wikidata.org/entity/Q150248', TOMATOMETER = 'http://www.wikidata.org/entity/Q108403393';

export default async function handler(req, res) {
  const ids = String(req.query?.imdb || '').split(',').filter(x => /^tt\d+$/.test(x)).slice(0, 40);
  if (!ids.length) return send(res, 400, { error: 'imdb ids required' });
  const sparql = `SELECT ?imdb ?type ?label ?val ?by ?method WHERE {
    VALUES ?imdb { ${ids.map(i => `"${i}"`).join(' ')} }
    ?item wdt:P345 ?imdb .
    { ?item wdt:P166 ?x . BIND("won" AS ?type) ?x rdfs:label ?label . FILTER(lang(?label) = "en") }
    UNION { ?item wdt:P1411 ?x . BIND("nom" AS ?type) ?x rdfs:label ?label . FILTER(lang(?label) = "en") }
    UNION { ?item p:P444 ?st . ?st ps:P444 ?val ; pq:P447 ?by . OPTIONAL { ?st pq:P459 ?method } BIND("score" AS ?type) }
  }`;
  try {
    const d = await fetchJson('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(sparql), {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'CineScout/1.0 (https://cine-scout-alpha.vercel.app)' },
    }, 20000);
    const out = {};
    for (const b of d.results.bindings) {
      const id = b.imdb.value;
      const o = out[id] || (out[id] = { honors: [], festival: false, rt: null, mc: null });
      if (b.type.value === 'score') {
        const m = String(b.val.value).match(/([\d.]+)\s*(%|\/\s*(\d+))/);
        if (!m) continue;
        const v = Math.round(parseFloat(m[1]) / (m[3] ? +m[3] : 100) * 100);
        if (b.by.value === RT && (!b.method || b.method.value === TOMATOMETER)) o.rt = v;
        if (b.by.value === MC) o.mc = v;
      } else {
        const name = b.label.value + (b.type.value === 'nom' ? ' (nom.)' : '');
        if (!o.honors.some(h => h.name === name)) o.honors.push({ name, won: b.type.value === 'won', rank: rankOf(b.label.value) });
      }
    }
    for (const o of Object.values(out)) {
      o.festival = o.honors.some(h => h.rank === 0);
      o.honorCount = o.honors.filter(h => h.rank < 99).length;
      o.honors = o.honors.filter(h => h.rank < 99).sort((a, b) => (a.rank - b.rank) || (b.won - a.won)).slice(0, 4).map(h => h.name);
    }
    send(res, 200, out, 3600 * 24);
  } catch (e) {
    send(res, 502, { error: String(e.message || e) });
  }
}
