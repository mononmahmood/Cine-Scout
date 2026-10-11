// Mock catalogue (mirrors Sources/Musepark/Services.swift). Swap fetchCatalogue() for real TMDB.
export const CATALOGUE = [
  { id: 'tt1856101', title: 'Blade Runner 2049', year: 2017, kind: 'movie', poster: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', overview: 'A young blade runner unearths a buried secret.', imdb: 8.0, critic: 81, gem: false, tags: ['expansive','slow-burn','moral-ambiguity','surreal'], avail: [{ p: 'netflix', regions: ['IN'], type: 'stream' }, { p: 'appleTV', regions: ['IN','BD'], type: 'rent' }] },
  { id: 'tt6751668', title: 'Parasite', year: 2019, kind: 'movie', poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', overview: 'A poor family schemes into a wealthy household.', imdb: 8.5, critic: 97, gem: false, tags: ['moral-ambiguity','slow-burn','claustrophobic','silence-flaw'], avail: [{ p: 'prime', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt6208148', title: 'Severance', year: 2022, kind: 'tv', poster: null, overview: 'Office workers split work/life memories.', imdb: 8.7, critic: 86, gem: true, tags: ['psych-fracture','claustrophobic','slow-burn','surreal'], avail: [{ p: 'appleTV', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt1190634', title: 'The Boys', year: 2019, kind: 'tv', poster: null, overview: 'Vigilantes vs. corrupt supes.', imdb: 8.7, critic: 84, gem: false, tags: ['adrenaline','moral-ambiguity','expansive'], avail: [{ p: 'prime', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt3581920', title: 'The Last of Us', year: 2023, kind: 'tv', poster: null, overview: 'A smuggler escorts a girl across ruin.', imdb: 8.8, critic: 84, gem: false, tags: ['slow-burn','moral-ambiguity','expansive'], avail: [] },
  { id: 'tt5051245', title: 'Tumbbad', year: 2018, kind: 'movie', poster: null, overview: 'A cursed treasure and greed in colonial India.', imdb: 8.2, critic: 80, gem: true, tags: ['lore','surreal','slow-burn','expansive'], avail: [{ p: 'prime', regions: ['IN'], type: 'stream' }] },
  { id: 'tt8108198', title: 'Andhadhun', year: 2018, kind: 'movie', poster: null, overview: 'A fake-blind pianist witnesses a crime.', imdb: 8.2, critic: 83, gem: true, tags: ['psych-fracture','adrenaline','moral-ambiguity'], avail: [{ p: 'netflix', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt2084970', title: 'The Imitation Game', year: 2014, kind: 'movie', poster: null, overview: 'Turing cracks Enigma under pressure.', imdb: 8.0, critic: 73, gem: true, tags: ['moral-ambiguity','silence-flaw','claustrophobic'], avail: [{ p: 'prime', regions: ['IN'], type: 'stream' }] },
];

export const QUESTIONS = [
  { id: 'pacing', prompt: 'A character walks into a late-night diner. What happens next?', options: [
    { id: 'silence', label: 'A) They sit in silence, processing a flaw', tags: ['silence-flaw','slow-burn','moral-ambiguity'] },
    { id: 'assassin', label: 'B) An assassin walks in — chaos erupts', tags: ['adrenaline'] },
    { id: 'surreal', label: 'C) Something surreal happens outside', tags: ['surreal','psych-fracture','lore'] },
  ]},
  { id: 'complexity', prompt: 'How should the story challenge you tonight?', options: [
    { id: 'moral', label: 'A) Moral ambiguity — no clear good guys', tags: ['moral-ambiguity','slow-burn'] },
    { id: 'psyche', label: 'B) Psychological fracturing — identity bends', tags: ['psych-fracture','claustrophobic','surreal'] },
    { id: 'lore', label: 'C) Deep lore / world-building to sink into', tags: ['lore','expansive','slow-burn'] },
  ]},
  { id: 'space', prompt: 'Pick the visual/spatial vibe you crave:', options: [
    { id: 'claustro', label: 'A) Claustrophobic — tight rooms, tension', tags: ['claustrophobic','slow-burn'] },
    { id: 'expanse', label: 'B) Expansive — wide shots, journey', tags: ['expansive','lore'] },
    { id: 'neon', label: 'C) Neon-surreal — dreamlike texture', tags: ['surreal','psych-fracture'] },
  ]},
  { id: 'tempo', prompt: 'Final call — pacing for tonight?', options: [
    { id: 'slow', label: 'A) Slow-burn, let it breathe', tags: ['slow-burn','silence-flaw'] },
    { id: 'propulsive', label: 'B) Propulsive, no wasted minute', tags: ['adrenaline'] },
    { id: 'weird', label: 'C) Strange & lingering images', tags: ['surreal','lore','psych-fracture'] },
  ]},
];

export const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'appleTV', name: 'Apple TV+' },
];

// TODO: replace with real TMDB fetch using import.meta.env.VITE_TMDB_API_KEY
export async function fetchCatalogue() { return CATALOGUE; }
// TODO: replace with real JustWatch verification
export function verify(title, region) {
  const playable = title.avail.find(a => a.type === 'stream' && a.regions.includes(region));
  const rentBuy = title.avail.filter(a => a.type !== 'stream' && a.regions.includes(region));
  if (playable) return { badge: `Available on ${name(playable.p)} [${region}]`, blocked: false, fallback: null };
  if (rentBuy.length) return { badge: `Not streaming — Rent/Buy on ${name(rentBuy[0].p)} [${region}]`, blocked: true, fallback: `Rent via JustWatch → ${rentBuy[0].p}` };
  return { badge: 'Not currently streaming in your region', blocked: true, fallback: 'Closest alternative: similar mood title in Platform Explorer.' };
}
function name(pid) { return (PLATFORMS.find(p => p.id === pid) || {}).name || pid; }
