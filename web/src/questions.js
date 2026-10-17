// Question bank. Plain wording, every option maps to something the live
// catalogue can actually filter on, so an answer is never decorative.
//
// Each option can set:
//   any:  { movie: [genreIds], tv: [genreIds] }  — title must have one of these (strict)
//   none: { movie: [...], tv: [...] }            — title must have none of these (strict)
//   set:  hard filters (kind, maxRuntime, minYear, langs, fame, status, family)
// `wordings` are interchangeable phrasings; one is picked per session.
// `when(state)` hides a question that would not make sense right now, and
// `hideFor` hides an option the chosen format cannot satisfy.

const G = {
  action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80, documentary: 99, drama: 18, family: 10751,
  fantasy: 14, history: 36, horror: 27, music: 10402, mystery: 9648, romance: 10749, scifi: 878, thriller: 53, war: 10752, western: 37,
  // TV-only genres
  actionAdventure: 10759, kids: 10762, scifiFantasy: 10765, warPolitics: 10768, reality: 10764, soap: 10766, talk: 10767, news: 10763,
};
export { G };

const year = new Date().getFullYear();

export const QUESTIONS = [
  {
    id: 'format', core: 1, topic: 'Format',
    wordings: ['Film or series tonight?', 'Are you after a film or a series?'],
    options: [
      { id: 'movie', label: 'A film', set: { kind: 'movie' } },
      { id: 'tv', label: 'A series', set: { kind: 'tv' } },
      { id: 'both', label: 'Either is fine', set: { kind: 'both' } },
    ],
  },
  {
    id: 'mood', core: 2, topic: 'Mood',
    wordings: ['What mood are you in?', 'What kind of feeling do you want from it?', 'How do you want to feel while watching?'],
    options: [
      { id: 'funny', label: 'Light and funny', any: { movie: [G.comedy], tv: [G.comedy] }, none: { movie: [G.horror], tv: [] } },
      { id: 'gripping', label: 'Gripping and suspenseful', any: { movie: [G.thriller, G.crime, G.mystery], tv: [G.crime, G.mystery] } },
      { id: 'moving', label: 'Emotional and moving', any: { movie: [G.drama, G.romance], tv: [G.drama] }, none: { movie: [G.horror], tv: [] } },
      { id: 'scary', label: 'Scary', any: { movie: [G.horror], tv: [] }, hideFor: ['tv'] },
      { id: 'epic', label: 'Big adventure or fantasy', any: { movie: [G.adventure, G.fantasy, G.scifi], tv: [G.actionAdventure, G.scifiFantasy] } },
    ],
  },
  {
    id: 'runtime', practical: 3, topic: 'Length', when: s => s.kind === 'movie',
    wordings: ['How much time do you have?', 'How long can the film be?'],
    options: [
      { id: 'short', label: 'Under 2 hours', set: { maxRuntime: 120 } },
      { id: 'mid', label: 'Up to 2½ hours', set: { maxRuntime: 150 } },
      { id: 'any', label: 'Length doesn’t matter', set: {} },
    ],
  },
  {
    id: 'status', practical: 3, topic: 'Series status', when: s => s.kind === 'tv',
    wordings: ['A finished series, or one still running?', 'Do you want a series that has already ended?'],
    options: [
      { id: 'ended', label: 'Finished — I want a proper ending', set: { status: 'ended' } },
      { id: 'running', label: 'Still running is fine', set: {} },
    ],
  },
  {
    id: 'company', practical: 4, topic: 'Watching with',
    wordings: ['Who is watching?', 'Who will be watching with you?'],
    options: [
      { id: 'solo', label: 'Just me', set: {} },
      { id: 'adults', label: 'Me and other adults', set: {} },
      { id: 'kids', label: 'Family, including kids', set: { family: true }, none: { movie: [G.horror, G.thriller, G.crime, G.war], tv: [G.crime, G.warPolitics] } },
    ],
  },
  {
    id: 'subject', topic: 'Subject',
    wordings: ['What should the story be about?', 'Which kind of story do you want?'],
    options: [
      { id: 'real', label: 'Real events or real people', any: { movie: [G.history, G.documentary, G.war], tv: [G.documentary, G.warPolitics] } },
      { id: 'crime', label: 'Crime, mystery or investigation', any: { movie: [G.crime, G.mystery], tv: [G.crime, G.mystery] } },
      { id: 'love', label: 'Love and relationships', any: { movie: [G.romance], tv: [] }, hideFor: ['tv'] },
      { id: 'worlds', label: 'Other worlds — sci-fi or fantasy', any: { movie: [G.scifi, G.fantasy], tv: [G.scifiFantasy] } },
      { id: 'open', label: 'No preference', set: {} },
    ],
  },
  {
    id: 'intensity', topic: 'Intensity', when: s => !s.family,
    wordings: ['How intense can it get?', 'How much violence or darkness is okay?'],
    options: [
      { id: 'gentle', label: 'Keep it gentle', none: { movie: [G.horror, G.thriller, G.war, G.crime], tv: [G.crime, G.warPolitics] } },
      { id: 'some', label: 'Some tension is fine', none: { movie: [G.horror], tv: [] } },
      { id: 'all', label: 'Anything goes', set: {} },
    ],
  },
  {
    id: 'era', topic: 'Release year',
    wordings: ['How recent should it be?', 'Any preference on release year?'],
    options: [
      { id: 'new', label: `Recent — ${year - 5} or later`, set: { minYear: year - 5 } },
      { id: 'modern', label: '2000 or later', set: { minYear: 2000 } },
      { id: 'any', label: 'Any year — classics welcome', set: {} },
    ],
  },
  {
    id: 'language', topic: 'Language',
    wordings: ['Which language would you like?', 'Any language preference?'],
    options: [
      { id: 'hi', label: 'Hindi', set: { langs: ['hi'] } },
      { id: 'bn', label: 'Bengali', set: { langs: ['bn'] } },
      { id: 'south', label: 'Tamil, Telugu, Malayalam or Kannada', set: { langs: ['ta', 'te', 'ml', 'kn'] } },
      { id: 'en', label: 'English', set: { langs: ['en'] } },
      { id: 'any', label: 'Any language — subtitles are fine', set: {} },
    ],
  },
  {
    id: 'fame', topic: 'Well-known or not',
    wordings: ['Well-known titles or lesser-known ones?', 'Do you want something popular or a hidden find?'],
    options: [
      { id: 'popular', label: 'Popular favourites', set: { fame: 'popular' } },
      { id: 'gems', label: 'Lesser-known gems', set: { fame: 'gems' } },
      { id: 'mix', label: 'A mix of both', set: {} },
    ],
  },
];

export const byId = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));
