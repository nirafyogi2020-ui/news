/* ============================================================================
   Rules the front page lives by.

   Pure functions, no file access, so the audit in src/check.mjs and the page
   builder in src/pages.mjs read the same definitions and the tests can hold
   each one to account on its own.

   The front page at / carries headlines written by other newsrooms, so two
   house rules have to be applied to text the site did not write: no em or en
   dash anywhere in visible text, and no sentence that mentions the tooling
   behind the site. A headline that cannot be made to comply is left out; the
   page is never padded with a line it cannot stand behind.
   ========================================================================= */

/** Words the site never prints in its own voice, or in a line it reprints. */
export const BANNED_WORDS = /\b(?:AI|A\.I\.|artificial intelligence|machine learning|LLMs?|chatbots?|generated|generative|models?)\b/i;

export function hasBannedWord(text) {
  return BANNED_WORDS.test(String(text || ''));
}

export function hasDash(text) {
  return /[–—]/.test(String(text || ''));
}

/**
 * A reprinted headline, made to fit the house style.
 *
 * An em dash, or a spaced en dash, is doing the job of a comma; a bare en dash
 * between two words is doing the job of a hyphen. Both are swapped for the
 * plain character and the headline keeps its meaning. Whitespace is tidied.
 * Returns an empty string for a headline that still breaks a rule, which the
 * caller treats as "leave it out".
 */
export function cleanHeadline(title) {
  let t = String(title || '')
    .replace(/\s+[–—]\s+/g, ', ')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t || hasBannedWord(t) || hasDash(t)) return '';
  return t;
}

/* What counts as disaster news on a national front, in the two languages the
   newsrooms this site reads publish in. A newsroom feed carries everything it
   prints, and a front page about disasters should not carry a story about
   apple yields because the same feed delivered it. */
const DISASTER_WORDS = new RegExp([
  'flood', 'flash flood', 'landslide', 'mudslide', 'earthquake', 'quake', 'tremor', 'aftershock',
  'avalanche', 'glacier', 'glacial', 'GLOF', 'barrier lake', 'monsoon', 'heavy rain', 'rainfall',
  'storm', 'cyclone', 'lightning', 'hailstorm', 'windstorm', 'cold wave', 'heatwave', 'drought',
  'wildfire', 'forest fire', 'fire', 'disaster', 'hazard', 'rescue', 'rescued', 'missing',
  'death toll', 'dead', 'killed', 'bodies', 'relief', 'evacuat', 'displaced', 'shelter',
  'NDRRMA', 'NEOC', 'Nepal Police', 'Nepali Army', 'Armed Police', 'Red Cross', 'ReliefWeb',
  'Rasuwa', 'Bhote ?Koshi', 'Trishuli', 'Narayani', 'Syabrubesi', 'Rasuwagadhi',
  'highway blocked', 'road blocked', 'bridge', 'washed away', 'swept away', 'inundat',
  'बाढी', 'पहिरो', 'भूकम्प', 'भुइँचालो', 'विपद्', 'विपद', 'उद्धार', 'बेपत्ता', 'मृत्यु', 'ज्यान', 'शव',
  'राहत', 'वर्षा', 'हिमपात', 'हिमताल', 'हिमपहिरो', 'चक्रवात', 'आगलागी', 'डुबान', 'चट्याङ',
  'सडक अवरुद्ध', 'राजमार्ग अवरुद्ध', 'पुल', 'रसुवा', 'भोटेकोशी', 'त्रिशूली', 'नारायणी',
].join('|'), 'i');

/** The same test, as source text, for the page's own script to rebuild. */
export const DISASTER_WORDS_SOURCE = DISASTER_WORDS.source;

/* A Nepali newsroom also prints the world's disasters. A headline that names
   another country's event is not Nepal news, however many of the words above
   it carries. China and India are left off this list on purpose: the Rasuwa
   flood started in Tibet and bodies were recovered across the Indian border. */
const FOREIGN_WORDS = /\b(?:Spain|Spanish|Italy|Italian|France|French|German[y]?|Britain|British|UK|United States|US|American|Japan(?:ese)?|Philippines?|Indonesia[n]?|Pakistan[i]?|Bangladesh[i]?|Sri Lanka[n]?|Afghan(?:istan)?|Brazil(?:ian)?|Mexic(?:o|an)|Australia[n]?|Africa[n]?|Europe(?:an)?|Turk(?:ey|ish)|Iran(?:ian)?|Vietnam(?:ese)?|Thai(?:land)?|Myanmar|Taiwan(?:ese)?|Korea[n]?|Russia[n]?|Ukrain(?:e|ian)|Canad(?:a|ian)|Chile(?:an)?|Peru(?:vian)?|Greece|Greek|Portug(?:al|uese))\b/;

export function isNepalDisasterHeadline(title) {
  const t = String(title || '');
  return DISASTER_WORDS.test(t) && !FOREIGN_WORDS.test(t);
}

/* Road and access reporting, picked out of the same headlines. */
const ROAD_WORDS = /\b(?:road|roads|highway|bridge|bridges|route|pass|trail|blocked|reopen|reopened|reopens|closed|detour|landslide blocks|stranded)\b|सडक|राजमार्ग|पुल|अवरुद्ध|खुल्यो|सञ्चालन|काठेपुल|बाटो/i;

export function isRoadHeadline(title) {
  return ROAD_WORDS.test(String(title || ''));
}

/**
 * The newsroom items a national front will print, newest first.
 *
 * Takes the raw /api/news list. Keeps press, official, alert and quake items
 * from the Nepal feed; drops videos (they have their own tab on the
 * dashboard), anything outside Nepal, duplicates by URL, and any headline
 * that cannot be cleaned to house style.
 */
export function frontNews(items, limit = 12) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.title || !item.url) continue;
    if (item.kind === 'video') continue;
    if (item.region && item.region !== 'nepal') continue;
    if (!/^https:\/\//.test(item.url)) continue;
    if (seen.has(item.url)) continue;
    const title = cleanHeadline(item.title);
    if (!title || !isNepalDisasterHeadline(title)) continue;
    seen.add(item.url);
    out.push({
      title,
      url: item.url,
      source: String(item.source || '').trim(),
      time: item.time || null,
      image: /^https:\/\//.test(item.image || '') ? item.image : '',
      kind: item.kind || 'press',
    });
  }
  out.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  return out.slice(0, limit);
}

/** The road and access lines, from the already-filtered front list. */
export function roadNews(items, limit = 5) {
  return (items || []).filter(i => isRoadHeadline(i.title)).slice(0, limit);
}

/** Digits only, as a number: "1,456" -> 1456. null when there is none. */
export function figureNumber(value) {
  const n = Number(String(value == null ? '' : value).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The front page title. The figures lead because Google cuts a title around
 * 65 characters and the figures are what a reader searched for. Always under
 * 75 characters, which the build enforces as well.
 */
export function frontTitle(event) {
  const stats = (event && event.stats) || [];
  const dead = stats.find(s => s && s.icon === 'dead');
  const missing = stats.find(s => s && s.icon === 'missing');
  const name = (event && event.name) || 'Nepal disaster';
  const parts = [];
  if (dead) parts.push(`${dead.value} dead`);
  if (missing) parts.push(`${missing.value} missing`);
  const t = parts.length
    ? `Nepal Disaster Update Live: ${parts.join(', ')} in the ${name}`
    : `Nepal Disaster Update Live: ${name}`;
  return t.length > 74 ? t.slice(0, 74).replace(/[\s,]+\S*$/, '') : t;
}

/**
 * The three lines at the top of the page, in plain words, each one from a
 * fact the site already holds. Nothing here is written for the occasion.
 *
 *   1. What happened, from the event's own lede.
 *   2. Where it stands, from the counters and their source.
 *   3. What to do, from the standing emergency numbers.
 */
export function tldrLines(event, asOfText) {
  const stats = (event && event.stats) || [];
  const dead = stats.find(s => s && s.icon === 'dead');
  const missing = stats.find(s => s && s.icon === 'missing');
  const lines = [];
  const lede = String((event && event.lede) || '').trim();
  if (lede) lines.push({ k: 'What happened', t: lede });
  if (dead || missing) {
    const bits = [];
    if (dead) bits.push(`${dead.value} ${dead.label || 'confirmed dead'}`);
    if (missing) bits.push(`${missing.value} ${missing.label || 'listed missing'}`);
    lines.push({
      k: 'Where it stands',
      t: `${(event && event.asOfSource) || 'Officials'}: ${bits.join(' and ')}`
        + (asOfText ? `, as of ${asOfText}` : '') + '. Missing does not mean dead.',
    });
  }
  lines.push({
    k: 'What to do',
    t: 'In an emergency call 100 or 112. Give only through the Government of Nepal’s own relief fund.',
  });
  return lines.slice(0, 3);
}

/** Day 1 is the day the event started, counted in whole days from `now`. */
export function daysSince(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(1, Math.floor((now - t) / 86400000) + 1);
}
