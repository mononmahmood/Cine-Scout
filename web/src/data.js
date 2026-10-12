// Mock catalogue (mirrors Sources/Musepark/Services.swift). Swap fetchCatalogue() for real TMDB.
export const CATALOGUE = [
  { id: 'tt1856101', title: 'Blade Runner 2049', year: 2017, kind: 'movie', poster: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', overview: 'A young blade runner unearths a buried secret.', imdb: 8.0, critic: 81, gem: false, tags: ['expansive','slow-burn','moral-ambiguity','surreal'], avail: [{ p: 'netflix', regions: ['IN'], type: 'stream' }, { p: 'appleTV', regions: ['IN','BD'], type: 'rent' }] },
  { id: 'tt6751668', title: 'Parasite', year: 2019, kind: 'movie', poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', overview: 'A poor family schemes into a wealthy household.', imdb: 8.5, critic: 97, gem: false, tags: ['moral-ambiguity','slow-burn','claustrophobic','silence-flaw'], avail: [{ p: 'prime', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt6208148', title: 'Severance', year: 2022, kind: 'tv', poster: null, overview: 'Office workers split work/life memories.', imdb: 8.7, critic: 86, gem: true, tags: ['psych-fracture','claustrophobic','slow-burn','surreal'], avail: [{ p: 'appleTV', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt1190634', title: 'The Boys', year: 2019, kind: 'tv', poster: null, overview: 'Vigilantes vs. corrupt supes.', imdb: 8.7, critic: 84, gem: false, tags: ['adrenaline','moral-ambiguity','dark-comedy','expansive'], avail: [{ p: 'prime', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt3581920', title: 'The Last of Us', year: 2023, kind: 'tv', poster: null, overview: 'A smuggler escorts a girl across ruin.', imdb: 8.8, critic: 84, gem: false, tags: ['slow-burn','moral-ambiguity','expansive'], avail: [] },
  { id: 'tt5051245', title: 'Tumbbad', year: 2018, kind: 'movie', poster: null, overview: 'A cursed treasure and greed in colonial India.', imdb: 8.2, critic: 80, gem: true, tags: ['lore','surreal','slow-burn','folk-horror','expansive'], avail: [{ p: 'prime', regions: ['IN'], type: 'stream' }] },
  { id: 'tt8108198', title: 'Andhadhun', year: 2018, kind: 'movie', poster: null, overview: 'A fake-blind pianist witnesses a crime and spirals.', imdb: 8.2, critic: 83, gem: true, tags: ['psych-fracture','adrenaline','dark-comedy','twist','moral-ambiguity'], avail: [{ p: 'netflix', regions: ['IN','BD'], type: 'stream' }] },
  { id: 'tt2084970', title: 'The Imitation Game', year: 2014, kind: 'movie', poster: null, overview: 'Turing races to crack Enigma in WWII.', imdb: 8.0, critic: 73, gem: true, tags: ['moral-ambiguity','true-story','slow-burn','claustrophobic'], avail: [{ p: 'prime', regions: ['IN'], type: 'stream' }] },
];

export const QUESTIONS = [
  { id: 'battery', cat: 'energy', prompt: 'Your brain battery right now?', options: [
    { id: 'full', label: 'Full — give me something hard to understand', tags: ['psych-fracture','twist','lore'], signal: { brain: 2 } },
    { id: 'half', label: 'Half — I want to feel it, but follow it easily', tags: ['emotional','moral-ambiguity'], signal: { brain: 1 } },
    { id: 'empty', label: 'Empty — loose comedy, zero effort tonight', tags: ['light-comedy','feel-good'], signal: { brain: 0, laugh: 2 } },
  ]},
  { id: 'hit', cat: 'heart', prompt: 'What should hit you harder tonight?', options: [
    { id: 'mind', label: 'A twist that rewires my brain', tags: ['twist','psych-fracture'], signal: { brain: 2, thrill: 1 } },
    { id: 'heart', label: 'A tug on my heart — romantic or emotional', tags: ['emotional','romance-light','hopeful'], signal: { love: 2 } },
    { id: 'laugh', label: 'Laughs — I want to wake the house up', tags: ['light-comedy','dark-comedy','feel-good'], signal: { laugh: 2 } },
  ]},
  { id: 'diner', cat: 'pace', prompt: 'A character walks into a late-night diner. What happens next?', options: [
    { id: 'silence', label: 'Sits in silence, carrying a flaw', tags: ['slow-burn','moral-ambiguity','emotional'], signal: { brain: 1 } },
    { id: 'assassin', label: 'An assassin walks in — chaos', tags: ['adrenaline','crime-world','twist'], signal: { thrill: 2 } },
    { id: 'surreal', label: 'Something surreal happens outside', tags: ['surreal','sci-escape','lore'], signal: { brain: 2 } },
  ]},
  { id: 'company', cat: 'context', prompt: 'Who is watching with you?', options: [
    { id: 'solo', label: 'Just me, headphones on', tags: [], signal: { solo: true } },
    { id: 'someone', label: 'Someone special — keep it warm', tags: ['romance-light','emotional','feel-good'], signal: { love: 1 } },
    { id: 'crowd', label: 'Friends / family — nothing awkward', tags: ['feel-good','light-comedy','hopeful'], signal: { clean: true } },
  ]},
  { id: 'tension', cat: 'thrill', prompt: 'How much tension can you take tonight?', options: [
    { id: 'edge', label: 'Edge of my seat — thriller me', tags: ['adrenaline','crime-world','twist'], signal: { thrill: 2 } },
    { id: 'cozy', label: 'Cozy tension — mystery without nightmares', tags: ['twist','true-story'], signal: { thrill: 1 } },
    { id: 'none', label: 'No tension — just vibes', tags: ['feel-good','light-comedy','hopeful'], signal: { thrill: 0 } },
  ]},
  { id: 'world', cat: 'escape', prompt: 'Real world or escape?', options: [
    { id: 'real', label: 'Real — true stories, real people', tags: ['true-story','true-feel','class-tension'], signal: {} },
    { id: 'escape', label: 'Full escape — sci-fi / fantasy worlds', tags: ['sci-escape','lore','expansive'], signal: {} },
    { id: 'under', label: 'Stylish underworld — crime, cons, heists', tags: ['crime-world','dark-comedy','twist'], signal: { thrill: 1 } },
  ]},
  { id: 'ending', cat: 'heart', prompt: 'Pick the ending you can live with.', options: [
    { id: 'happy', label: 'Happy and earned — I need hope', tags: ['hopeful','emotional','feel-good'], signal: { love: 1 } },
    { id: 'dark', label: 'Dark but truthful — hit me', tags: ['moral-ambiguity','psych-fracture'], signal: { brain: 1 } },
    { id: 'open', label: 'Open / confusing — I will discuss it for days', tags: ['twist','surreal','lore'], signal: { brain: 2 } },
  ]},
  { id: 'visual', cat: 'visual', prompt: 'What should it LOOK like?', options: [
    { id: 'tight', label: 'Tight rooms — faces, tension', tags: ['claustrophobic'], signal: {} },
    { id: 'wide', label: 'Wide world — journey, landscapes', tags: ['expansive'], signal: {} },
    { id: 'neon', label: 'Neon dream — strange and beautiful', tags: ['neon','surreal','sci-escape'], signal: {} },
  ]},
  { id: 'time', cat: 'context', prompt: 'How much time do you have?', options: [
    { id: 'short', label: 'Under 2 hours — movie only', tags: [], signal: { maxRuntime: 125, noSeries: true } },
    { id: 'night', label: 'One full night — epic is fine', tags: [], signal: { maxRuntime: 180, noSeries: false } },
    { id: 'binge', label: 'I can start a series', tags: [], signal: { seriesOk: true } },
  ]},
  { id: 'era', cat: 'context', prompt: 'Old or new?', options: [
    { id: 'new', label: 'New — 2020s energy', tags: [], signal: { minYear: 2019 } },
    { id: 'gold', label: '2000s–2010s gold is fine', tags: [], signal: { minYear: 2000 } },
    { id: 'any', label: 'Any era — classic is welcome', tags: [], signal: { minYear: 0 } },
  ]},
  { id: 'risk', cat: 'risk', prompt: 'Safe legend or hidden gem?', options: [
    { id: 'safe', label: 'Only safe legends — no failure tonight', tags: [], signal: { safeOnly: true } },
    { id: 'gem', label: 'Show me hidden gems I missed', tags: [], signal: { gemBoost: true } },
    { id: 'mix', label: 'Mix both', tags: [], signal: {} },
  ]},
  { id: 'pace', cat: 'pace', prompt: 'Last one — pacing?', options: [
    { id: 'slow', label: 'Slow-burn, let it breathe', tags: ['slow-burn'], signal: {} },
    { id: 'prop', label: 'Fast — no wasted minute', tags: ['adrenaline'], signal: { thrill: 1 } },
    { id: 'weird', label: 'Strange images that linger', tags: ['surreal','folk-horror'], signal: { brain: 1 } },
  ]},
];

export const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'appleTV', name: 'Apple TV+' },
];

export async function fetchCatalogue() { return CATALOGUE; }

export function verify(title, region) {
  const pname = pid => (PLATFORMS.find(p => p.id === pid) || {}).name || pid;
  const playable = title.avail.filter(a => a.type === 'stream' && a.regions.includes(region));
  const rent = title.avail.filter(a => a.type !== 'stream' && a.regions.includes(region));
  const jw = `https://www.justwatch.com/in/search?q=${encodeURIComponent(title.title)}`;
  if (playable.length) {
    const names = playable.map(a => pname(a.p)).join(' + ');
    return {
      badge: `Watch on ${names} [${region}]`, blocked: false, fallback: null,
      steps: [`Open ${names} app — must be logged into ${region} store`, `Search “${title.title} (${title.year})” exactly`, `Play — verified streaming in ${region} just now`],
      links: [{ label: `Check JustWatch ${region}`, url: jw }],
    };
  }
  if (rent.length) {
    const names = rent.map(a => pname(a.p)).join(' + ');
    return {
      badge: `Not streaming — Rent/Buy on ${names} [${region}]`, blocked: true,
      fallback: `Not in subscription. Rent it HD on ${names}, or pick a green-badge title instead.`,
      steps: [`Open ${names}`, `Search “${title.title} (${title.year})” → Rent/Buy section`, `Rent HD — usually ₹120–₹350 in IN`],
      links: [{ label: `Check JustWatch ${region}`, url: jw }],
    };
  }
  const alts = CATALOGUE.filter(t => t.id !== title.id && t.avail.some(a => a.type === 'stream' && a.regions.includes(region))).slice(0, 2).map(t => t.title);
  return {
    badge: `Not in ${region} — don't trust Google`, blocked: true,
    fallback: `Not on any OTT in ${region} right now. Try instead: ${alts.join(' / ') || 'Platform Explorer gems'}.`,
    steps: ['Do NOT trust the Google “Available on” box — it ignores country', `Search JustWatch with region set to ${region}`, 'Pick a green-badge result from this tool instead'],
    links: [{ label: `Verify on JustWatch ${region}`, url: jw }],
  };
}
