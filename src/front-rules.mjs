/* ============================================================================
   Rules the front page lives by.

   Pure functions, no file access, so the audit in src/check.mjs and the page
   builder in src/pages.mjs read the same definitions and the tests can hold
   each one to account on its own.

   The front page at / carries headlines written by other newsrooms, so two
   house rules have to be applied to text the site did not write: no em or en
   dash anywhere in visible text, and no technology stories, which are not
   disaster reporting. A headline that cannot be made to comply is left out;
   the page is never padded with a line it cannot stand behind.
   ========================================================================= */

/** Technology stories: off subject on a disaster front page. */
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
  'flood(?!lit|light)', 'flash flood', 'landslide', 'mudslide', 'earthquake', 'quake', 'tremor', 'aftershock',
  'avalanche', 'glacier', 'glacial', 'GLOF', 'barrier lake', 'monsoon', 'heavy rain', 'rainfall',
  'storm', 'cyclone', 'lightning', 'hailstorm', 'windstorm', 'cold wave', 'heatwave', 'drought',
  'wildfire', 'forest fire', 'fire', 'disaster', 'hazard', 'rescue', 'rescued', 'missing',
  'death toll', 'dead(?!line|lock)', 'killed', 'bodies', 'relief', 'evacuat', 'displaced', 'shelter',
  'NDRRMA', 'NEOC', 'Nepal Police', 'Nepali Army', 'Armed Police', 'Red Cross', 'ReliefWeb',
  'Rasuwa', 'Bhote ?Koshi', 'Trishuli', 'Narayani', 'Syabrubesi', 'Rasuwagadhi',
  'highway blocked', 'road blocked', 'bridge', 'washed away', 'swept away', 'inundat',
  'बाढी', 'पहिरो', 'भूकम्प', 'भुइँचालो', 'विपद्', 'विपद', 'उद्धार', 'बेपत्ता', 'मृत्यु', 'ज्यान', 'शव',
  'राहत', 'वर्षा', 'हिमपात', 'हिमताल', 'हिमपहिरो', 'चक्रवात', 'आगलागी', 'डुबान', 'चट्याङ',
  'सडक अवरुद्ध', 'राजमार्ग अवरुद्ध', 'पुल', 'रसुवा', 'भोटेकोशी', 'त्रिशूली', 'नारायणी',
].join('|'), 'i');

/* A Nepali newsroom also prints the world's disasters. A headline that names
   another country's event is not Nepal news, however many of the words above
   it carries, so it stays off the front page. China and India are left off this
   list on purpose: the Rasuwa flood started in Tibet and bodies were
   recovered across the Indian border. The Nepali spellings matter as much as
   the English: a central Peru quake reached the front page on 22 Nov 2026 as
   "मध्य पेरुमा ... भूकम्प". */
const FOREIGN_WORDS = new RegExp('\\b(?:Spain|Spanish|Italy|Italian|France|French|German[y]?|Britain|British|UK|United States|US|American|Japan(?:ese)?|Philippines?|Indonesia[n]?|Pakistan[i]?|Bangladesh[i]?|Sri Lanka[n]?|Afghan(?:istan)?|Brazil(?:ian)?|Mexic(?:o|an)|Australia[n]?|Africa[n]?|Europe(?:an)?|Turk(?:ey|ish)|Iran(?:ian)?|Vietnam(?:ese)?|Thai(?:land)?|Myanmar|Taiwan(?:ese)?|Korea[n]?|Russia[n]?|Ukrain(?:e|ian)|Canad(?:a|ian)|Chile(?:an)?|Peru(?:vian)?|Greece|Greek|Portug(?:al|uese)'
  + '|Gaza|Israel[i]?|Morocc(?:o|an)|Liby(?:a|an)|Haiti(?:an)?|Ecuador(?:ian)?|Colombia[n]?|Cuba[n]?|Malaysia[n]?|Cambodia[n]?|Bhutan(?:ese)?|Syria[n]?|Egypt(?:ian)?|Sudan(?:ese)?|Kenya[n]?|Nigeria[n]?|Ethiopia[n]?|Somalia[n]?|California|Texas|Florida|Hawaii|Caribbean|Jamaica[n]?)\\b'
  + '|पेरु|गाजामा|गाजाको|गाजाका|गाजाबाट|गाजा पट्टी|इजरायल|अमेरिका|जापान|पाकिस्तान|बंगलादेश|बङ्गलादेश|श्रीलंका|श्रीलङ्का|अफगानिस्तान|इन्डोनेसिया|इण्डोनेसिया|फिलिपिन्स|टर्की|टर्किये|इरान|भियतनाम|थाइल्यान्ड|म्यानमार|ताइवान|कोरिया|रूस|रुसमा|रुसको|रुसी|युक्रेन|क्यानडा|चिली|मेक्सिको|ब्राजिल|अष्ट्रेलिया|अस्ट्रेलिया|अफ्रिका|युरोप|स्पेन|इटाली|फ्रान्स|जर्मनी|बेलायत|ग्रीस|पोर्चुगल|मोरक्को|लिबिया|हाइटी|इक्वेडर|कोलम्बिया|क्युबा|मलेसिया|कम्बोडिया|भुटान');

/* A foreign name in a headline that is also about Nepal is a Nepal story: a
   Japanese firm raising money for Bhotekoshi flood victims, Indian tourists
   missing in Dolpa, a band's European tour raising money "for the flood
   affected" (बाढी प्रभावितलाई, which in a Nepali paper means Nepal's). The
   country name only counts when Nepal is not named. */
const NEPAL_WORDS = /\bNepal|Bhote ?Koshi|Rasuwa|Trishuli|Kathmandu|नेपाल|भोटेकोशी|रसुवा|त्रिशूली|काठमाडौं|काठमाडौँ|बाढी ?प्रभावितलाई|बाढी ?पीडितलाई/i;

/* Subjects the disaster feeds carry by accident: a newsroom's general desk
   writes about them with a district's name in the story. Roads, weather and
   rivers are deliberately absent, because those are this site's business. */
const OFF_SUBJECT = new RegExp([
  'Hormuz', 'होर्मुज', 'Manchester United', 'म्यानचेस्टर', 'apples?', 'स्याउ',
  'World Bank', 'विश्व बैंक', 'economic growth', 'अर्थतन्त्र', 'भ्याट', 'exported to India', 'विद्युत निर्यात',
  'festival', 'दशैं', 'दसैँ',
  'election', 'candidates?', 'निर्वाचन', 'चुनाव', 'उम्मेदवार', 'मतदान',
  'shooting', 'shot dead', 'गोली प्रहार',
].join('|'), 'i');

/* What rescues an off-subject headline: the disaster itself, not a place
   name. "Rasuwa" or "Trishuli" alone tied a lake's tourist season to the
   flood; "relief" alone tied a paddy price to it. */
const STRONG_DISASTER = new RegExp([
  '\\bflood(?!lit|light)', 'landslide', 'mudslide', 'earthquake', '\\bquake', 'aftershock', 'avalanche',
  'glacial', '\\bGLOF', 'barrier lake', 'heavy rain', 'cyclone', 'lightning', 'hailstorm', 'windstorm',
  'cold wave', 'heatwave', 'drought', 'wildfire', 'forest fire', 'disaster', '\\brescue', '\\bmissing',
  'death toll', '\\bdead\\b', '\\bkilled', '\\bbodies', '\\bevacuat', '\\bdisplaced', '\\bvictims?',
  '\\bsurvivors?', 'washed away', 'swept away', 'inundat',
  'बाढी', 'पहिरो', 'भूकम्प', 'भुइँचालो', 'विपद्', 'विपद', 'उद्धार', 'बेपत्ता', 'मृत्यु', 'शव',
  'हिमपहिरो', 'चक्रवात', 'आगलागी', 'डुबान', 'चट्याङ', 'पीडित',
].join('|'), 'i');

/* Sport and tourism stories. A flood word alone does not rescue these:
   "tourists return to Gosaikunda after the flood" is a travel story. They
   stay only when the disaster did something to someone or something in them:
   a flood that sweeps away hotels, tourists stranded, aid for the victims,
   a minister visiting a flood-hit district. */
const SPORT_WORDS = new RegExp([
  'football', 'futsal', 'cricket', '\\bNPL\\b', '\\bT20', '\\bODI\\b', 'wickets?', 'innings', 'tri-series',
  'league', 'tournament', 'stadium', 'फुटबल', 'क्रिकेट', 'खेलकुद', 'खेलाडी', 'रंगशाला', 'रङ्गशाला',
].join('|'), 'i');
const TOURISM_WORDS = /\b(?:tourism|tourists?|resorts?|hotels?|travel awards?|trekking destination|cake-mixing)\b|पर्यटक|पर्यटन|पदयात्रा|गन्तव्य|होटल|रिसोर्ट/i;
const HARM_WORDS = new RegExp('\\b(?:dead|killed|died|death|missing|rescued?|stranded|injured|trapped|bodies|evacuat\\w*|victims?|displaced'
  + '|sweeps?|swept|bur(?:y|ies|ied)|damag(?:e|es|ed)|destro(?:y|ys|yed)|collaps(?:e|es|ed)|hit|affected|relief|aid)\\b'
  + '|बेपत्ता|उद्धार|मृत्यु|घाइते|फसे|शव|ज्यान|पीडित|बगायो|बगाए|पुरियो|क्षति|ध्वस्त|प्रभावित|राहत', 'i');

/* Money-market stories borrow disaster words as figures of speech: a share
   index "collapses", tech stocks suffer a "landslide" (पहिरो). The disaster
   word does not rescue these, or a trading floor ends up as the story of the
   day on a flood site. Only market phrases count: a bare "shares" or
   "stocks" also reads "police shares missing list" or "relief stocks". */
const MARKET_WORDS = /\b(?:stock markets?|share markets?|stock exchange|share index|tech stocks|share prices?|stock prices?|NEPSE|Nasdaq|Wall Street)\b|सेयर बजार|सेयरमा|सेयरको|नेप्से/i;

/* Crypto stories are the other kind that borrow this site's words: a column
   on mining bitcoin with surplus hydropower is about hydropower and money,
   not about a dam or a flood. Always off subject, disaster word or not. */
const CRYPTO_WORDS = /\b(?:digital wealth|cryptocurrenc(?:y|ies)|bitcoin|crypto(?:[- ]?(?:mining|currency|assets?|exchange))?|blockchain)\b|क्रिप्टो|बिटकोइन/i;

/* Floodlit grounds are cricket, not a flood (22 Nov 2026: "Government plans
   floodlit home grounds for all eight NPL clubs" led the newsroom list). */
const PUN_WORDS = /\bflood-?lit\b|\bflood-?lights?\b|\bflood-?lighting\b/i;

const RULES = {
  disaster: DISASTER_WORDS, foreign: FOREIGN_WORDS, nepal: NEPAL_WORDS,
  market: MARKET_WORDS, crypto: CRYPTO_WORDS, pun: PUN_WORDS,
  sport: SPORT_WORDS, tourism: TOURISM_WORDS, harm: HARM_WORDS, off: OFF_SUBJECT, strong: STRONG_DISASTER,
};

/** The rules as [source, flags] pairs, for the page's own script to rebuild. */
export const FRONT_RULE_SOURCES = Object.fromEntries(
  Object.entries(RULES).map(([k, re]) => [k, [re.source, re.flags]]));

/**
 * One verdict on a headline: 'off' (off subject), 'none' (no disaster in
 * it), 'foreign' (another country's disaster) or 'nepal'. Written without
 * module references, because the front page's script runs this very
 * function, from its source text, against the rules above.
 */
export function headlineVerdict(title, R) {
  var t = String(title || '');
  if (R.market.test(t) || R.crypto.test(t) || R.pun.test(t)) return 'off';
  if ((R.sport.test(t) || R.tourism.test(t)) && !(R.strong.test(t) && R.harm.test(t))) return 'off';
  if (R.off.test(t) && !R.strong.test(t)) return 'off';
  if (!R.disaster.test(t)) return 'none';
  if (R.foreign.test(t) && !R.nepal.test(t)) return 'foreign';
  return 'nepal';
}

/** Off subject, unless the headline itself ties it to a disaster. */
export function isOffSubject(title) {
  return headlineVerdict(title, RULES) === 'off';
}

export function isNepalDisasterHeadline(title) {
  return headlineVerdict(title, RULES) === 'nepal';
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
    ? `Nepal Disaster News Today: ${parts.join(', ')} in the ${name}`
    : `Nepal Disaster News Today: ${name}`;
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
