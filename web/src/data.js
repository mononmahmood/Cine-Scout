// Cine Scout — catalogue + question bank + watch-path verifier
// TODO: swap fetchCatalogue() for TMDB (VITE_TMDB_API_KEY) and verify() for JustWatch.

export const APP_NAME = 'Cine Scout';

export const PLATFORMS = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'appleTV', name: 'Apple TV+' },
];

// Famous posters for the background marquee (TMDB images, decorative only)
export const MARQUEE_POSTERS = [
  'https://image.tmdb.org/t/p/w342/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  'https://image.tmdb.org/t/p/w342/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'https://image.tmdb.org/t/p/w342/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  'https://image.tmdb.org/t/p/w342/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  'https://image.tmdb.org/t/p/w342/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg',
  'https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  'https://image.tmdb.org/t/p/w342/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
  'https://image.tmdb.org/t/p/w342/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg',
];
export const CATALOGUE = [
  { id: 'tt6751668', title: 'Parasite', year: 2019, kind: 'movie', langs: ['Korean','Hindi','English'], runtime: 132, poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', overview: 'A poor family schemes its way into a wealthy household.', imdb: 8.5, critic: 97, buzz: 92, gem: false, tags: ['moral-ambiguity','slow-burn','claustrophobic','twist','class-tension'], awards: ["Academy Award for Best Director", "Academy Award for Best International Feature Film", "Academy Award for Best Picture"], avail: [P('prime',['IN','BD']), P('netflix',['IN'],'rent')] },
  { id: 'tt1856101', title: 'Blade Runner 2049', year: 2017, kind: 'movie', langs: ['English','Hindi'], runtime: 164, poster: 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', overview: 'A young blade runner unearths a long-buried secret.', imdb: 8.0, critic: 81, buzz: 78, gem: false, tags: ['expansive','slow-burn','surreal','sci-escape','neon'], awards: ["Academy Award for Best Cinematography", "Academy Award for Best Visual Effects", "Academy Award for Best Production Design (nom.)"], avail: [P('netflix',['IN']), P('appleTV',['IN','BD'],'rent')] },
  { id: 'tt6208148', title: 'Severance', year: 2022, kind: 'tv', langs: ['English'], runtime: 480, poster: null, overview: 'Office workers surgically split work and life memories.', imdb: 8.7, critic: 86, buzz: 90, gem: true, tags: ['psych-fracture','claustrophobic','slow-burn','surreal','twist'], awards: ["Golden Globe Award for Best Television Series \u2013 Drama (nom.)"], avail: [P('appleTV',['IN','BD'])] },
  { id: 'tt1190634', title: 'The Boys', year: 2019, kind: 'tv', langs: ['English','Hindi'], runtime: 480, poster: 'https://image.tmdb.org/t/p/w500/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg', overview: 'Vigilantes take on corrupt superheroes.', imdb: 8.7, critic: 84, buzz: 95, gem: false, tags: ['adrenaline','moral-ambiguity','dark-comedy','expansive'], avail: [P('prime',['IN','BD'])] },
  { id: 'tt5051245', title: 'Tumbbad', year: 2018, kind: 'movie', langs: ['Hindi'], runtime: 104, poster: null, overview: 'Greed and a cursed treasure in colonial India.', imdb: 8.2, critic: 80, buzz: 74, gem: true, tags: ['lore','surreal','slow-burn','folk-horror','expansive'], awards: ["Filmfare Award for Best Art Direction", "Filmfare Award for Best Cinematographer", "Filmfare Award for Best Sound Design"], avail: [P('prime',['IN'])] },
  { id: 'tt8108198', title: 'Andhadhun', year: 2018, kind: 'movie', langs: ['Hindi'], runtime: 139, poster: null, overview: 'A fake-blind pianist witnesses a crime and spirals.', imdb: 8.2, critic: 83, buzz: 82, gem: true, tags: ['psych-fracture','adrenaline','dark-comedy','twist','moral-ambiguity'], avail: [P('netflix',['IN','BD'])] },
  { id: 'tt2084970', title: 'The Imitation Game', year: 2014, kind: 'movie', langs: ['English'], runtime: 114, poster: null, overview: 'Turing races to crack Enigma in WWII.', imdb: 8.0, critic: 73, buzz: 70, gem: true, tags: ['moral-ambiguity','true-story','slow-burn','claustrophobic'], awards: ["Academy Award for Best Writing, Adapted Screenplay", "Academy Award for Best Actor (nom.)", "Academy Award for Best Director (nom.)"], avail: [P('prime',['IN'])] },
  { id: 'tt3581920', title: 'The Last of Us', year: 2023, kind: 'tv', langs: ['English'], runtime: 540, poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg', overview: 'A smuggler escorts a girl across a ruined America.', imdb: 8.8, critic: 84, buzz: 96, gem: false, tags: ['slow-burn','moral-ambiguity','expansive','emotional'], avail: [] },
  { id: 'tt0111161', title: 'The Shawshank Redemption', year: 1994, kind: 'movie', langs: ['English','Hindi'], runtime: 142, poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', overview: 'Hope survives decades inside a brutal prison.', imdb: 9.3, critic: 82, buzz: 93, gem: false, tags: ['emotional','slow-burn','hopeful','true-feel','moral-ambiguity'], awards: ["Academy Award for Best Actor (nom.)", "Academy Award for Best Cinematography (nom.)", "Academy Award for Best Film Editing (nom.)"], avail: [P('prime',['IN'],'rent'), P('appleTV',['IN','BD'],'rent')] },
  { id: 'tt0468569', title: 'The Dark Knight', year: 2008, kind: 'movie', langs: ['English','Hindi'], runtime: 152, poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', overview: 'Batman faces the Joker’s chaos in Gotham.', imdb: 9.0, critic: 84, buzz: 94, gem: false, tags: ['adrenaline','moral-ambiguity','crime-world','twist','expansive'], awards: ["Academy Award for Best Sound Editing", "Academy Award for Best Supporting Actor", "Academy Award for Best Cinematography (nom.)"], avail: [P('netflix',['IN','BD']), P('prime',['IN'],'rent')] },
  { id: 'tt7286456', title: 'Joker', year: 2019, kind: 'movie', langs: ['English','Hindi'], runtime: 122, poster: 'https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', overview: 'A broken comedian descends into infamy.', imdb: 8.4, critic: 59, buzz: 88, gem: false, tags: ['psych-fracture','claustrophobic','moral-ambiguity','slow-burn'], awards: ["Academy Award for Best Actor", "Academy Award for Best Original Score", "Academy Award for Best Picture (nom.)"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt0137523', title: 'Fight Club', year: 1999, kind: 'movie', langs: ['English'], runtime: 139, poster: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', overview: 'An insomniac and a soap salesman build an underground club.', imdb: 8.8, critic: 66, buzz: 89, gem: false, tags: ['psych-fracture','twist','moral-ambiguity','dark-comedy'], awards: ["Academy Award for Best Sound Editing (nom.)"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt1375666', title: 'Inception', year: 2010, kind: 'movie', langs: ['English','Hindi'], runtime: 148, poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', overview: 'Thieves plant an idea inside a dream.', imdb: 8.8, critic: 74, buzz: 91, gem: false, tags: ['psych-fracture','sci-escape','twist','adrenaline','lore'], awards: ["Academy Award for Best Cinematography", "Academy Award for Best Sound", "Academy Award for Best Sound Editing"], avail: [P('netflix',['IN']), P('prime',['IN'],'rent')] },
  { id: 'tt0816692', title: 'Interstellar', year: 2014, kind: 'movie', langs: ['English','Hindi'], runtime: 169, poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', overview: 'Explorers cross a wormhole to save humanity.', imdb: 8.7, critic: 74, buzz: 93, gem: false, tags: ['sci-escape','emotional','expansive','slow-burn','hopeful'], avail: [P('prime',['IN'],'rent'), P('netflix',['IN','BD'])] },
  { id: 'tt10986410', title: 'Ted Lasso', year: 2020, kind: 'tv', langs: ['English'], runtime: 600, poster: 'https://image.tmdb.org/t/p/w500/5fhZdwP1DVJ0FyVH6vrFdHwpXIn.jpg', overview: 'An American coach wins over an English football club with kindness.', imdb: 8.8, critic: 83, buzz: 85, gem: true, tags: ['feel-good','light-comedy','emotional','hopeful'], avail: [P('appleTV',['IN','BD'])] },
  { id: 'tt0903747', title: 'Breaking Bad', year: 2008, kind: 'tv', langs: ['English','Hindi'], runtime: 2900, poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', overview: 'A teacher cooks meth to save his family.', imdb: 9.5, critic: 87, buzz: 97, gem: false, tags: ['crime-world','slow-burn','moral-ambiguity','adrenaline','twist'], awards: ["Golden Globe Award for Best Television Series \u2013 Drama"], avail: [P('netflix',['IN','BD'])] },
  { id: 'tt1475582', title: 'Sherlock', year: 2010, kind: 'tv', langs: ['English'], runtime: 360, poster: null, overview: 'Modern Holmes solves impossible cases.', imdb: 9.1, critic: 79, buzz: 86, gem: false, tags: ['twist','crime-world','adrenaline','lore'], avail: [P('prime',['IN','BD'])] },
  { id: 'tt3565400', title: 'Panchayat', year: 2020, kind: 'tv', langs: ['Hindi'], runtime: 480, poster: null, overview: 'A city engineer adjusts to village panchayat life.', imdb: 8.9, critic: 78, buzz: 88, gem: true, tags: ['light-comedy','feel-good','true-feel','slow-burn'], avail: [P('prime',['IN','BD'])] },
  { id: 'tt15379454', title: '12th Fail', year: 2023, kind: 'movie', langs: ['Hindi'], runtime: 147, poster: null, overview: 'A UPSC aspirant refuses to quit.', imdb: 8.7, critic: 75, buzz: 90, gem: true, tags: ['true-story','emotional','hopeful','true-feel'], avail: [P('netflix',['IN'])] },
  { id: 'tt1343092', title: 'The Big Bang Theory', year: 2007, kind: 'tv', langs: ['English'], runtime: 6000, poster: 'https://image.tmdb.org/t/p/w500/ooBGRQBdbGzBxAVfExiO8r7kloA.jpg', overview: 'Nerdy roommates navigate love and physics.', imdb: 8.2, critic: 57, buzz: 84, gem: false, tags: ['light-comedy','feel-good','romance-light'], awards: ["Golden Globe Award for Best Television Series \u2013 Musical or Comedy (nom.)"], avail: [P('netflix',['IN','BD'])] },
  // Cinephile shelf: art films, world cinema, slow cinema — same scoring, no gimmick boost,
  { id: 'tt0054215', title: 'Pather Panchali', year: 1955, kind: 'movie', langs: ['Bengali'], runtime: 125, poster: null, overview: 'Apu grows up in rural Bengal. The birth of Indian neorealism.', imdb: 8.2, critic: 93, buzz: 52, gem: true, tags: ['slow-cinema','true-feel','art-house','world-cinema','emotional'], awards: ["BAFTA Award for Best Film", "National Film Award for Best Bengali Feature Film", "National Film Award for Best Feature Film"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt0057742', title: 'Charulata', year: 1964, kind: 'movie', langs: ['Bengali'], runtime: 117, poster: null, overview: 'A lonely housewife drifts toward her husband’s cousin in 1870s Calcutta.', imdb: 8.1, critic: 95, buzz: 44, gem: true, tags: ['slow-cinema','art-house','world-cinema','emotional','romance-light'], awards: ["National Film Award for Best Feature Film"], avail: [] },
  { id: 'tt1832382', title: 'A Separation', year: 2011, kind: 'movie', langs: ['Persian','English'], runtime: 123, poster: null, overview: 'A divorce spirals into a moral maze in Tehran.', imdb: 8.3, critic: 95, buzz: 58, gem: true, tags: ['moral-ambiguity','slow-burn','true-feel','art-house','world-cinema'], awards: ["Academy Award for Best International Feature Film", "Academy Award for Best Writing, Original Screenplay (nom.)", "International Submission to the Academy Awards (nom.)"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt0118694', title: 'In the Mood for Love', year: 2000, kind: 'movie', langs: ['Cantonese','English'], runtime: 98, poster: null, overview: 'Two neighbours suspect their spouses and fall into restraint.', imdb: 8.1, critic: 85, buzz: 55, gem: true, tags: ['slow-cinema','art-house','romance-light','emotional','neon'], awards: ["International Submission to the Academy Awards (nom.)", "BAFTA Award for Best Film Not in the English Language (nom.)", "C\u00e9sar Award for Best Foreign Film"], avail: [P('appleTV',['IN'],'rent')] },
  { id: 'tt0079944', title: 'Stalker', year: 1979, kind: 'movie', langs: ['Russian'], runtime: 162, poster: null, overview: 'A guide leads two men into the forbidden Zone.', imdb: 8.1, critic: 90, buzz: 47, gem: true, tags: ['slow-cinema','art-house','sci-escape','surreal','world-cinema'], avail: [] },
  { id: 'tt0060827', title: 'Persona', year: 1966, kind: 'movie', langs: ['Swedish'], runtime: 85, poster: null, overview: 'A nurse and her mute patient blur into one identity.', imdb: 8.0, critic: 86, buzz: 42, gem: true, tags: ['psych-fracture','art-house','slow-cinema','claustrophobic'], awards: ["International Submission to the Academy Awards (nom.)"], avail: [] },
  { id: 'tt0040522', title: 'Bicycle Thieves', year: 1948, kind: 'movie', langs: ['Italian'], runtime: 89, poster: null, overview: 'A father and son search Rome for a stolen bicycle.', imdb: 8.3, critic: 93, buzz: 46, gem: true, tags: ['true-feel','true-story','art-house','world-cinema','emotional'], awards: ["Academy Award for Best Writing, Adapted Screenplay (nom.)", "BAFTA Award for Best Film (nom.)", "Golden Globe Award for Best Non-English Language Film (nom.)"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt0046438', title: 'Tokyo Story', year: 1953, kind: 'movie', langs: ['Japanese'], runtime: 136, poster: null, overview: 'Ageing parents visit children who have no time.', imdb: 8.2, critic: 93, buzz: 43, gem: true, tags: ['slow-cinema','art-house','true-feel','emotional','world-cinema'], avail: [] },
  { id: 'tt0100232', title: 'Close-Up', year: 1990, kind: 'movie', langs: ['Persian'], runtime: 98, poster: null, overview: 'A man impersonates a famous director; Kiarostami films the trial.', imdb: 8.2, critic: 87, buzz: 40, gem: true, tags: ['art-house','true-story','world-cinema','moral-ambiguity','slow-cinema'], avail: [] },
  { id: 'tt0364569', title: 'Oldboy', year: 2003, kind: 'movie', langs: ['Korean'], runtime: 120, poster: null, overview: 'Imprisoned 15 years without reason, a man hunts his captor.', imdb: 8.4, critic: 74, buzz: 80, gem: false, tags: ['twist','psych-fracture','crime-world','adrenaline','moral-ambiguity'], awards: ["Cannes Film Festival Grand Prix"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt0467406', title: 'The Handmaiden', year: 2016, kind: 'movie', langs: ['Korean'], runtime: 145, poster: null, overview: 'A pickpocket cons a heiress in occupied Korea.', imdb: 8.1, critic: 84, buzz: 72, gem: true, tags: ['twist','romance-light','crime-world','lore','moral-ambiguity'], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt1305806', title: 'The Lunchbox', year: 2013, kind: 'movie', langs: ['Hindi'], runtime: 104, poster: null, overview: 'A misdelivered lunchbox connects two lonely strangers.', imdb: 7.8, critic: 76, buzz: 66, gem: true, tags: ['true-feel','emotional','romance-light','slow-burn'], avail: [P('netflix',['IN'])] },
  { id: 'tt2903846', title: 'Ship of Theseus', year: 2012, kind: 'movie', langs: ['Hindi','English'], runtime: 143, poster: null, overview: 'Three lives probe identity, beauty and justice.', imdb: 8.0, critic: 70, buzz: 48, gem: true, tags: ['art-house','moral-ambiguity','slow-cinema','world-cinema'], awards: ["National Film Award for Best Feature Film"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt11968972', title: 'Court', year: 2014, kind: 'movie', langs: ['Hindi','Marathi'], runtime: 116, poster: null, overview: 'A folk singer’s trial exposes the Indian legal machine.', imdb: 7.6, critic: 75, buzz: 45, gem: true, tags: ['art-house','true-feel','slow-cinema','moral-ambiguity'], awards: ["International Submission to the Academy Awards (nom.)", "National Film Award for Best Feature Film"], avail: [P('netflix',['IN'])] },
  { id: 'tt2186745', title: 'Memories of Murder', year: 2003, kind: 'movie', langs: ['Korean'], runtime: 132, poster: null, overview: 'Detectives hunt a serial killer in 1980s Korea.', imdb: 8.1, critic: 82, buzz: 74, gem: true, tags: ['crime-world','slow-burn','true-story','twist','moral-ambiguity'], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt7282468', title: 'Burning', year: 2018, kind: 'movie', langs: ['Korean'], runtime: 148, poster: null, overview: 'A drifter suspects a rival of something unspeakable.', imdb: 7.5, critic: 88, buzz: 58, gem: true, tags: ['slow-burn','surreal','art-house','moral-ambiguity','psych-fracture'], awards: ["International Submission to the Academy Awards (nom.)"], avail: [P('appleTV',['IN'],'rent')] },
  { id: 'tt1241325', title: 'Shoplifters', year: 2018, kind: 'movie', langs: ['Japanese'], runtime: 121, poster: null, overview: 'A makeshift family survives by shoplifting in Tokyo.', imdb: 7.9, critic: 93, buzz: 60, gem: true, tags: ['true-feel','emotional','slow-cinema','art-house','world-cinema'], awards: ["International Submission to the Academy Awards (nom.)", "Palme d'Or", "C\u00e9sar Award for Best Foreign Film"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt8579674', title: '1917', year: 2019, kind: 'movie', langs: ['English'], runtime: 119, poster: null, overview: 'Two soldiers cross no-man’s land in one unbroken shot.', imdb: 8.0, critic: 78, buzz: 79, gem: false, tags: ['adrenaline','expansive','true-story','emotional'], awards: ["Academy Award for Best Cinematography", "Academy Award for Best Sound", "Academy Award for Best Visual Effects"], avail: [P('prime',['IN'],'rent'), P('netflix',['IN','BD'])] },
  { id: 'tt1255953', title: 'Incendies', year: 2010, kind: 'movie', langs: ['French','Arabic'], runtime: 131, poster: null, overview: 'Twins trace their mother’s hidden past in the Middle East.', imdb: 8.3, critic: 80, buzz: 62, gem: true, tags: ['twist','true-feel','moral-ambiguity','emotional','art-house'], awards: ["Academy Award for Best International Feature Film (nom.)", "International Submission to the Academy Awards (nom.)"], avail: [P('prime',['IN'],'rent')] },
  { id: 'tt26446407', title: 'Perfect Days', year: 2023, kind: 'movie', langs: ['Japanese'], runtime: 125, poster: null, overview: 'A Tokyo toilet cleaner finds quiet poetry in routine.', imdb: 7.9, critic: 87, buzz: 64, gem: true, tags: ['slow-cinema','feel-good','true-feel','art-house','emotional'], awards: ["Academy Award for Best International Feature Film (nom.)", "International Submission to the Academy Awards (nom.)", "Palme d'Or (nom.)"], avail: [P('appleTV',['IN'],'rent')] },
];

// Cooperative questions — plain wording, each reveals something different.
// Order is shuffled per run; follow-ups reference your last answer.
export const QUESTIONS = [
  { id: 'battery', cat: 'energy', prompt: 'How tired is your brain right now?', follow: { full: 'Sharp it is — I can go deep.', half: 'Half battery — feeling with ease.', empty: 'Empty — keeping it effortless.' }, options: [
    { id: 'full', label: 'Sharp — I can handle something demanding', tags: ['psych-fracture','twist','lore','art-house'], signal: { brain: 2 } },
    { id: 'half', label: 'Half — moving but easy to follow', tags: ['emotional','moral-ambiguity'], signal: { brain: 1 } },
    { id: 'empty', label: 'Drained — keep it light tonight', tags: ['light-comedy','feel-good'], signal: { brain: 0, laugh: 2 } },
  ]},
  { id: 'hit', cat: 'heart', prompt: 'What should land hardest?', follow: { mind: 'Mind-bender it is.', heart: 'Going for the heart.', laugh: 'Laughs coming up.' }, options: [
    { id: 'mind', label: 'A twist that rearranges everything', tags: ['twist','psych-fracture'], signal: { brain: 2, thrill: 1 } },
    { id: 'heart', label: 'Something emotional or romantic', tags: ['emotional','romance-light','hopeful'], signal: { love: 2 } },
    { id: 'laugh', label: 'Proper laughter', tags: ['light-comedy','dark-comedy','feel-good'], signal: { laugh: 2 } },
  ]},
  { id: 'diner', cat: 'pace', prompt: 'A stranger walks into a late-night diner. What do you want to happen?', follow: { silence: 'Quiet and heavy, noted.', assassin: 'Chaos — noted.', surreal: 'Strange — noted.' }, options: [
    { id: 'silence', label: 'Nothing much — silence, weight, a look', tags: ['slow-burn','slow-cinema','moral-ambiguity','emotional'], signal: { brain: 1 } },
    { id: 'assassin', label: 'Trouble walks in after them', tags: ['adrenaline','crime-world','twist'], signal: { thrill: 2 } },
    { id: 'surreal', label: 'Something outside feels wrong', tags: ['surreal','sci-escape','lore'], signal: { brain: 2 } },
  ]},
  { id: 'depth', cat: 'taste', prompt: 'Be honest — mainstream polish or raw art-house?', follow: { poly: 'Polished and gripping.', raw: 'Raw and uncompromising.', either: 'Keeping both doors open.' }, options: [
    { id: 'poly', label: 'Polished — gripping and clean', tags: [], signal: { arthouse: -1 } },
    { id: 'raw', label: 'Raw — festival films, slow cinema welcome', tags: ['art-house','slow-cinema','world-cinema'], signal: { arthouse: 2 } },
    { id: 'either', label: 'Either — surprise me', tags: [], signal: { arthouse: 0 } },
  ]},
  { id: 'company', cat: 'context', prompt: 'Who is watching?', follow: { solo: 'Solo mode.', someone: 'Keeping it warm.', crowd: 'Crowd-safe.' }, options: [
    { id: 'solo', label: 'Just me', tags: [], signal: { solo: true } },
    { id: 'someone', label: 'With someone — keep it warm', tags: ['romance-light','emotional','feel-good'], signal: { love: 1 } },
    { id: 'crowd', label: 'Group — nothing awkward', tags: ['feel-good','light-comedy','hopeful'], signal: { clean: true } },
  ]},
  { id: 'tension', cat: 'thrill', prompt: 'How much tension tonight?', follow: { edge: 'Full tension.', cozy: 'Light mystery.', none: 'Zero tension.' }, options: [
    { id: 'edge', label: 'Full — keep me on edge', tags: ['adrenaline','crime-world','twist'], signal: { thrill: 2 } },
    { id: 'cozy', label: 'Light — mystery without dread', tags: ['twist','true-story'], signal: { thrill: 1 } },
    { id: 'none', label: 'None — calm only', tags: ['feel-good','light-comedy','hopeful','slow-cinema'], signal: { thrill: 0 } },
  ]},
  { id: 'world', cat: 'escape', prompt: 'Which world do you want?', follow: { real: 'Real world.', escape: 'Far away.', under: 'Underworld.' }, options: [
    { id: 'real', label: 'This world — true stories, real people', tags: ['true-story','true-feel','class-tension'], signal: {} },
    { id: 'escape', label: 'Far from here — sci-fi, other eras', tags: ['sci-escape','lore','expansive'], signal: {} },
    { id: 'under', label: 'The underworld — crime, cons, heists', tags: ['crime-world','dark-comedy','twist'], signal: { thrill: 1 } },
  ]},
  { id: 'ending', cat: 'heart', prompt: 'What ending can you live with tonight?', follow: { happy: 'Hope it is.', dark: 'Truth over comfort.', open: 'Leaving it open.' }, options: [
    { id: 'happy', label: 'Hopeful and earned', tags: ['hopeful','emotional','feel-good'], signal: { love: 1 } },
    { id: 'dark', label: 'Dark but honest', tags: ['moral-ambiguity','psych-fracture'], signal: { brain: 1 } },
    { id: 'open', label: 'Unresolved — I will sit with it', tags: ['twist','surreal','lore','art-house'], signal: { brain: 2 } },
  ]},
  { id: 'visual', cat: 'visual', prompt: 'What should it look like?', follow: { tight: 'Close and tense.', wide: 'Wide and travelling.', neon: 'Dreamlike.' }, options: [
    { id: 'tight', label: 'Close faces, tight rooms', tags: ['claustrophobic'], signal: {} },
    { id: 'wide', label: 'Landscapes, journeys', tags: ['expansive'], signal: {} },
    { id: 'neon', label: 'Dreamlike and strange', tags: ['neon','surreal','sci-escape'], signal: {} },
  ]},
  { id: 'time', cat: 'context', prompt: 'How much time do you have?', follow: { short: 'Under two hours.', night: 'Full night free.', binge: 'Series is fine.' }, options: [
    { id: 'short', label: 'Under 2 hours, film only', tags: [], signal: { maxRuntime: 125, noSeries: true } },
    { id: 'night', label: 'A full evening — epic is fine', tags: [], signal: { maxRuntime: 180, noSeries: false } },
    { id: 'binge', label: 'Happy to start a series', tags: [], signal: { seriesOk: true } },
  ]},
  { id: 'era', cat: 'context', prompt: 'Does old cinema put you off?', follow: { new: 'New only.', gold: '2000s onward fine.', any: 'Any era welcome.' }, options: [
    { id: 'new', label: 'Keep it new', tags: [], signal: { minYear: 2015 } },
    { id: 'gold', label: '2000s onward is fine', tags: [], signal: { minYear: 2000 } },
    { id: 'any', label: 'Black-and-white welcome', tags: ['art-house','world-cinema'], signal: { minYear: 0 } },
  ]},
  { id: 'risk', cat: 'risk', prompt: 'Safe legend or something you have not heard of?', follow: { safe: 'Legends only.', gem: 'Digging deep.', mix: 'Mixing both.' }, options: [
    { id: 'safe', label: 'Legends only — no misses tonight', tags: [], signal: { safeOnly: true } },
    { id: 'gem', label: 'Dig — show me what I missed', tags: [], signal: { gemBoost: true, freshBoost: true } },
    { id: 'mix', label: 'A mix', tags: [], signal: {} },
  ]},
  { id: 'pace', cat: 'pace', prompt: 'And the pace?', follow: { slow: 'Slow it is.', prop: 'Fast.', weird: 'Strange and lingering.' }, options: [
    { id: 'slow', label: 'Slow — let it breathe', tags: ['slow-burn','slow-cinema'], signal: {} },
    { id: 'prop', label: 'Fast — no wasted minute', tags: ['adrenaline'], signal: { thrill: 1 } },
    { id: 'weird', label: 'Strange images that stay', tags: ['surreal','folk-horror'], signal: { brain: 1 } },
  ]},
];

export async function fetchCatalogue() { return CATALOGUE; }

// Strict IN/BD verifier with clear watch-path steps (mock — wire JustWatch here).
export function verify(title, region) {
  const pname = pid => (PLATFORMS.find(p => p.id === pid) || {}).name || pid;
  const playable = title.avail.filter(a => a.type === 'stream' && a.regions.includes(region));
  const rent = title.avail.filter(a => a.type !== 'stream' && a.regions.includes(region));
  const jw = `https://www.justwatch.com/in/search?q=${encodeURIComponent(title.title)}`;
  if (playable.length) {
    const names = playable.map(a => pname(a.p)).join(' + ');
    return {
      badge: `Watch on ${names} [${region}]`, blocked: false, fallback: null,
      steps: [`Open ${names} — signed into the ${region} store`, `Search “${title.title} (${title.year})” exactly`, `Play — verified for ${region}`],
      links: [{ label: `Check JustWatch ${region}`, url: jw }],
    };
  }
  if (rent.length) {
    const names = rent.map(a => pname(a.p)).join(' + ');
    return {
      badge: `Not streaming — rent on ${names} [${region}]`, blocked: true,
      fallback: `Not in subscription. Rent HD on ${names}, or pick a green-badge title.`,
      steps: [`Open ${names}`, `Search “${title.title} (${title.year})” — Rent section`, `Rent HD (usually Rs 120–350 in IN)`],
      links: [{ label: `Check JustWatch ${region}`, url: jw }],
    };
  }
  const alts = CATALOGUE.filter(t => t.id !== title.id && t.avail.some(a => a.type === 'stream' && a.regions.includes(region))).slice(0, 2).map(t => t.title);
  return {
    badge: `Not in ${region} — ignore Google`, blocked: true,
    fallback: `Not on OTT in ${region} right now. Try: ${alts.join(' / ') || 'Platform Explorer'}.`,
    steps: ['Do not trust the Google availability box — it ignores country', `Search JustWatch with region set to ${region}`, 'Pick a green-badge result instead'],
    links: [{ label: `Verify on JustWatch ${region}`, url: jw }],
  };
}
