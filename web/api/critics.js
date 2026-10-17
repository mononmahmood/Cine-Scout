// Latest pieces from critics, cinephile blogs and film press, via their
// public RSS feeds. Returns headlines + links only (never the articles).
// ?q=Title&year=2019 → pieces mentioning that title; no q → latest overall.
import { send, fetchText, mentions } from './_lib.js';

const FEEDS = [
  { name: 'RogerEbert.com', url: 'https://www.rogerebert.com/feed', kind: 'critic' },
  { name: 'The Guardian Film', url: 'https://www.theguardian.com/film/rss', kind: 'critic' },
  { name: 'Slant', url: 'https://www.slantmagazine.com/feed/', kind: 'critic' },
  { name: 'IndieWire', url: 'https://www.indiewire.com/feed/', kind: 'press' },
  { name: 'Variety Film', url: 'https://variety.com/v/film/feed/', kind: 'press' },
  { name: 'Deadline Film', url: 'https://deadline.com/v/film/feed/', kind: 'festival' },
  { name: 'Hollywood Reporter Reviews', url: 'https://www.hollywoodreporter.com/c/movies/movie-reviews/feed/', kind: 'critic' },
  { name: 'Letterboxd Journal', url: 'https://letterboxd.com/journal/rss/', kind: 'cinephile' },
  { name: 'NDTV Movies', url: 'https://feeds.feedburner.com/ndtvmovies-latest', kind: 'india' },
  { name: 'Cinema Express', url: 'https://www.cinemaexpress.com/feed', kind: 'india' },
  { name: 'The Daily Star · Film', url: 'https://www.thedailystar.net/entertainment/tv-film/rss.xml', kind: 'bangladesh' },
];

const strip = s => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? strip(m[1]) : ''; };

function parse(xml, feed) {
  return (xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []).map(b => ({
    source: feed.name, kind: feed.kind,
    title: tag(b, 'title'),
    url: tag(b, 'link') || (b.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/i) || [])[1] || '',
    at: Date.parse(tag(b, 'pubDate')) || 0,
    blurb: tag(b, 'description').slice(0, 220),
  })).filter(i => i.title && i.url);
}

export default async function handler(req, res) {
  const { q, year } = req.query || {};
  const results = await Promise.allSettled(FEEDS.map(f => fetchText(f.url).then(x => parse(x, f))));
  const items = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  const live = results.filter(r => r.status === 'fulfilled').length;
  const list = q ? items.filter(i => mentions(`${i.title} ${i.blurb}`, q, year)) : items;
  list.sort((a, b) => b.at - a.at);
  send(res, 200, { feeds: FEEDS.length, live, items: list.slice(0, q ? 6 : 24).map(({ blurb, ...i }) => (q ? { ...i, blurb } : i)) }, 1800);
}
