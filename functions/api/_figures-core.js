/**
 * Figure extraction, shared by the Worker endpoints and the Node updater.
 *
 * Pure functions only — no fetch, no Worker globals — so `node --test` can
 * exercise every rule in here without a network. Everything that talks to the
 * outside world lives in figures.js, police.js or bipad.js.
 *
 * The job: given news and bulletin items from government bodies and
 * newsrooms, read the casualty figures out of the sentences that state them,
 * and say for each one who stated it and when. Nothing here invents a number,
 * and a sentence this does not recognise produces no figure rather than a
 * guess.
 */

/* The metrics the site's counters actually carry. Each one is read
   independently: a bulletin that states a new death toll and repeats an old
   rescue total updates the first and leaves the second alone. */
export const METRICS = ['dead', 'missing', 'injured', 'rescued', 'personnel'];

/* Bounds are a sanity filter, not a forecast. They exist to throw out the
   things that look like figures and are not: bulletin numbers (10275), years
   (2026), phone numbers, money in rupees. A figure outside these is dropped
   rather than published. */
export const BOUNDS = {
  dead:      { min: 1, max: 50000 },
  missing:   { min: 1, max: 100000 },
  injured:   { min: 1, max: 50000 },
  rescued:   { min: 1, max: 200000 },
  personnel: { min: 1, max: 500000 }
};

/* Who published it. A figure from the body that issues it outranks the same
   figure relayed by a newsroom, but only as a tie-break: a newer newsroom
   report still beats an older official one, which is the whole point of
   reading the newsrooms at all. */
export const PRIMARY = [
  'NDRRMA', 'Nepal Police', 'Nepal Army', 'Home Ministry', 'BIPAD Portal',
  'ReliefWeb (UN OCHA)', 'GDACS (UN / EC)', 'PMO'
];

export function isPrimary(source) {
  return PRIMARY.indexOf(String(source || '')) !== -1;
}

/* ---------------------------------------------------------------------------
   Numbers
   ------------------------------------------------------------------------- */

/** Devanagari digits to ASCII. */
export function latinDigits(text) {
  return String(text == null ? '' : text)
    .replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
}

/**
 * Nepali bulletins write large numbers in words as well as digits: "४ सय ६९"
 * is 469, "११ सय १४" is 1114, "३ हजार ९ सय १६" is 3916 and "११ हजार ९ सय ९३"
 * is 11,993. A plain digit run is also common, and so is a लाख for six
 * figures.
 *
 * Rather than one regex per shape, this walks the run left to right adding
 * each number to the unit that follows it, which is how the language builds
 * the figure in the first place. A trailing number with no unit is the
 * remainder. Anything it cannot read at all returns null rather than a
 * half-parsed number.
 */
const NE_UNITS = { 'लाख': 100000, 'हजार': 1000, 'सय': 100 };

export function nepaliNumber(text) {
  const t = latinDigits(text).replace(/,/g, '');
  const token = /(\d+)\s*(लाख|हजार|सय)?/g;
  let total = 0;
  let found = false;
  let match;
  while ((match = token.exec(t))) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    found = true;
    total += match[2] ? value * NE_UNITS[match[2]] : value;
  }
  return found ? total : null;
}

/**
 * A plain figure written the way English copy writes it: "1,114", "1114".
 * Returns null on anything else, including the bare word "one".
 */
export function plainNumber(text) {
  const m = String(text == null ? '' : text).replace(/,/g, '').match(/\d+/);
  return m ? Number(m[0]) : null;
}

/* ---------------------------------------------------------------------------
   Reading a metric out of a sentence

   Each metric owns a list of patterns. Every pattern has exactly one capture
   group holding the number, so one loop can run all of them. The patterns are
   deliberately tight: they require the number and the word that gives it
   meaning to sit next to each other, because "469" alone in a story about a
   flood is not a death toll.
   ------------------------------------------------------------------------- */

const NUM_EN = '([\\d][\\d,]{0,9})';
/* Nepali writes the count either in digits or in सय/हजार words, so the group
   has to allow both plus the spaces between them. */
const NUM_NE = '((?:[\\d०-९][\\d०-९,]*\\s*(?:लाख|हजार|सय)?\\s*){1,4})';

const PATTERNS = {
  dead: [
    [new RegExp(NUM_EN + '\\s*(?:people|persons?|victims?)?\\s*(?:confirmed\\s+)?(?:have\\s+)?(?:were\\s+)?(?:are\\s+)?dead\\b', 'i'), 'en'],
    [new RegExp(NUM_EN + '\\s*(?:bodies|dead\\s+bodies)\\b', 'i'), 'en'],
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:have\\s+)?(?:been\\s+)?killed\\b', 'i'), 'en'],
    [new RegExp('death\\s+toll[^.\\d]{0,40}' + NUM_EN, 'i'), 'en'],
    [new RegExp('(?:toll|fatalities)\\s+(?:has\\s+)?(?:risen|climbed|reached|rose)\\s+to\\s+' + NUM_EN, 'i'), 'en'],
    [new RegExp(NUM_NE + '\\s*(?:जनाको|जनाक|जना)?\\s*(?:मृत्यु|निधन)', ''), 'ne'],
    [new RegExp(NUM_NE + '\\s*(?:जनाको\\s*)?शव', ''), 'ne'],
    [new RegExp('मृतक\\s*(?:संख्या)?[^\\d०-९,।;·]{0,12}' + NUM_NE, ''), 'ne']
  ],
  missing: [
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:still\\s+|remain\\s+|are\\s+)?missing\\b', 'i'), 'en'],
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:remain\\s+|are\\s+)?unaccounted\\s+for\\b', 'i'), 'en'],
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:are\\s+)?out\\s+of\\s+contact\\b', 'i'), 'en'],
    [new RegExp(NUM_NE + '\\s*(?:जना)?\\s*(?:बेपत्ता|सम्पर्कविहीन|सम्पर्कविहिन)', ''), 'ne'],
    [new RegExp('(?:बेपत्ता|सम्पर्कविहीन)\\s*(?:संख्या)?[^\\d०-९,।;·]{0,12}' + NUM_NE, ''), 'ne']
  ],
  injured: [
    [new RegExp(NUM_EN + '\\s*(?:people|persons?|others?)?\\s*(?:were\\s+|are\\s+|have\\s+been\\s+)?injured\\b', 'i'), 'en'],
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:were\\s+)?(?:wounded|hurt)\\b', 'i'), 'en'],
    [new RegExp(NUM_NE + '\\s*(?:जना)?\\s*घाइते', ''), 'ne'],
    [new RegExp('घाइते[^\\d०-९,।;·]{0,12}' + NUM_NE, ''), 'ne']
  ],
  rescued: [
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:have\\s+been\\s+|were\\s+|been\\s+)?rescued\\b', 'i'), 'en'],
    [new RegExp(NUM_EN + '\\s*(?:people|persons?)?\\s*(?:were\\s+)?(?:evacuated|airlifted)\\b', 'i'), 'en'],
    [new RegExp('rescued\\s+(?:a\\s+total\\s+of\\s+)?' + NUM_EN, 'i'), 'en'],
    [new RegExp(NUM_NE + '\\s*(?:जनाको|जना)?\\s*उद्(?:धा|दा)र', ''), 'ne'],
    [new RegExp('उद्(?:धा|दा)र\\s*(?:गरिएको)?\\s*(?:संख्या)?[^\\d०-९,।;·]{0,12}' + NUM_NE, ''), 'ne']
  ],
  personnel: [
    [new RegExp(NUM_EN + '\\s*(?:security\\s+)?personnel\\s+(?:have\\s+been\\s+)?(?:deployed|mobilis|mobiliz)', 'i'), 'en'],
    [new RegExp(NUM_NE + '\\s*(?:जना)?\\s*(?:जनशक्ति|सुरक्षाकर्मी)\\s*(?:खटि|परिचालन)', ''), 'ne'],
    [new RegExp('खटिएको\\s*जनशक्ति[^\\d०-९,।;·]{0,12}' + NUM_NE, ''), 'ne']
  ]
};

/**
 * Some numbers sit next to a casualty word and are still not a casualty
 * figure. A bulletin serial ("बुलेटिन नं. १०२७५"), a date, a time, a phone
 * number and a money figure all read as digits. Any sentence carrying one of
 * these markers immediately before the number is skipped.
 */
const NOT_A_COUNT = /(?:bulletin|बुलेटिन|सूचना\s*नं|नं\.?|no\.?|rs\.?|रु\.?|रुपैयाँ|अर्ब|करोड|crore|billion|million|%|प्रतिशत|मेगावाट|\bmw\b|किमी|km\b|hectare|हेक्टर)\s*$/i;

/* ---------------------------------------------------------------------------
   Is this sentence stating the total, or one place's share of it?

   This is the rule that matters most, and the one that is least obvious.

   Every source in the list is a government body or an established newsroom,
   and they all publish correct numbers. They just do not all publish the
   *same* number: on one afternoon the feed carried "a total of 1,114 bodies
   ... recovered", "133 bodies recovered from areas affected in Rasuwa" and
   "105 bodies found along the bank from Timure to Ghatte Khola" — three true
   sentences, three different figures, one of them the national toll and two
   of them a district's and a riverbank's share of it.

   Taking whichever published most recently would have put 105 under the
   hero. So a figure is only allowed to set a counter when its sentence reads
   as a total. A sentence naming a place and claiming no total is a
   sub-count: it is kept and shown as context, and it never sets the number.
   ------------------------------------------------------------------------- */

/* Wording that marks a sentence as stating the whole figure. */
const TOTAL_MARKER = new RegExp([
  'a\\s+total\\s+of', '\\bin\\s+total\\b', '\\baltogether\\b', '\\boverall\\b',
  '\\bnationwide\\b', '\\bacross\\s+the\\s+country\\b', '\\bcountrywide\\b',
  'death\\s+toll', '\\btoll\\s+(?:has\\s+)?(?:rises?|risen|climbs?|climbed|reach\\w*|passe?[sd]?|hits?|stands?|now)',
  'still\\s+missing', 'remain\\w*\\s+(?:missing|unaccounted)', 'unaccounted\\s+for',
  '(?:rises?|risen|climbs?|climbed|reach\\w*|passe?[sd]?)\\s+to\\b',
  '\\bso\\s+far\\b', '\\bto\\s+date\\b',
  'जम्मा', 'कुल', 'मृतक\\s*संख्या', 'देशभर', 'सम्पर्कविहीन\\s*संख्या',
  'पुग्यो', 'पुगेको', 'नाघ्यो', 'हालसम्म'
].join('|'), 'i');

/* Places this event happens in. A sentence that names one and claims no
   total is reporting that place's share. 'Nepal' is deliberately absent:
   it is the whole country, so "1,000 dead in Nepal" is a total, not a
   sub-count. */
const PLACE_MARKER = new RegExp([
  'rasuwa', 'nuwakot', 'dhading', 'chitwan', 'nawalparasi', 'gorkha', 'tanahun',
  'makwanpur', 'kathmandu', 'timure', 'syaphrubesi', 'syabrubesi', 'betrawati',
  'dhunche', 'ghatte', 'bhotekoshi', 'bhote\\s*koshi', 'trishuli', 'narayani',
  'langtang', 'gyirong', 'kerung', 'rasuwagadhi',
  'रसुवा', 'नुवाकोट', 'धादिङ', 'चितवन', 'नवलपरासी', 'गोरखा', 'तनहुँ',
  'मकवानपुर', 'काठमाडौं', 'टिमुरे', 'स्याफ्रुबेँसी', 'धुन्चे', 'घट्टे',
  'भोटेकोशी', 'त्रिशूली', 'नारायणी', 'लाङटाङ'
].join('|'), 'i');

/**
 * 'total'   — states the whole figure and may set a counter
 * 'local'   — one place's share; kept as context, never sets a counter
 * 'unknown' — neither marker; only a body that issues figures may set a
 *             counter from it
 */
export function scopeOf(sentence) {
  const text = String(sentence == null ? '' : sentence);
  if (TOTAL_MARKER.test(text)) return 'total';
  if (PLACE_MARKER.test(text)) return 'local';
  return 'unknown';
}

/**
 * May this candidate set the counter, or is it context only?
 *
 * Only a sentence that names a place and claims no total is refused. Every
 * other sentence is allowed to set the number, whichever masthead it came
 * from, because every source in the list is a government body or an
 * established newsroom and the site does not rank them against each other —
 * it ranks by who published first.
 *
 * The remaining way a true sentence produces a wrong counter is an old page
 * resurfacing with a fresh timestamp, and that is caught by the floor in
 * pickFigure rather than here.
 */
export function canSetCounter(candidate) {
  if (!candidate) return false;
  return candidate.scope !== 'local';
}

/**
 * Read every figure a piece of text states.
 *
 * Returns one row per metric found, each carrying the exact sentence it came
 * from, so the page and the audit can always show its own working. A text
 * stating several metrics produces several rows; a text stating none produces
 * an empty array.
 */
export function readFigures(text) {
  const source = String(text == null ? '' : text);
  if (!source.trim()) return [];

  /* Sentence by sentence, because a paragraph mentioning both the dead and
     the rescued must not let one metric's keyword claim the other's number. */
  const sentences = source.split(/(?:।|\.\s|\n|·|;)/).filter(s => s && s.trim());
  const out = [];
  const seen = new Set();

  for (const sentence of sentences) {
    for (const metric of METRICS) {
      for (const [pattern, lang] of PATTERNS[metric]) {
        const match = sentence.match(pattern);
        if (!match) continue;

        /* What sits immediately before the number decides whether it is a
           count at all. "रु. ५ अर्ब" is money, not people. */
        const before = sentence.slice(0, match.index + match[0].indexOf(match[1]));
        if (NOT_A_COUNT.test(before.slice(-24))) continue;

        const value = lang === 'ne' ? nepaliNumber(match[1]) : plainNumber(match[1]);
        if (!inBounds(metric, value)) continue;

        const key = metric + ':' + value;
        if (seen.has(key)) continue;
        seen.add(key);

        const clean = sentence.trim().slice(0, 240);
        out.push({
          metric,
          value,
          lang,
          scope: scopeOf(clean),
          sentence: clean
        });
      }
    }
  }
  return out;
}

export function inBounds(metric, value) {
  const bound = BOUNDS[metric];
  if (!bound) return false;
  return Number.isFinite(value) && value >= bound.min && value <= bound.max;
}

/* ---------------------------------------------------------------------------
   Choosing between candidates

   The rule the site runs on is first-wins: whoever publishes a figure first
   sets it, whether that is NDRRMA or a newsroom, and the figure follows the
   sources down as well as up. Every source in the list is a government body or
   an established newsroom, so there is no ranking by trust — only by time.
   ------------------------------------------------------------------------- */

/**
 * Pick the figure for one metric from every candidate that stated it.
 *
 * Newest publication time wins outright. Where two sources carry the same
 * timestamp — common, because a bulletin hour is quoted by everyone who
 * relays it — the body that issues the figure wins over the newsroom
 * relaying it, and past that the higher figure wins, because a relay that
 * rounds down should not lower a stated toll.
 *
 * Candidates with no usable timestamp never win against one that has a
 * timestamp; they are only used when nothing else is available at all.
 */
export function pickFigure(candidates, options = {}) {
  const all = (candidates || []).filter(c => c && inBounds(c.metric, c.value));
  if (!all.length) return null;

  const scored = all.map(c => ({
    ...c,
    scope: c.scope || scopeOf(c.sentence),
    at: c.time ? new Date(c.time).getTime() : NaN
  }));

  /* Only sentences that state a total may set the counter. The rest are kept
     below as context, so a reader can still see that a district reported 133
     without that figure ever standing in for the national one. */
  let eligible = scored.filter(canSetCounter);

  /* Re-dated archives are the other way a true sentence produces a wrong
     counter: a wire item from the first day of the event carries "more than
     389 killed ... 1,400 still missing" and arrives with today's timestamp
     when the feed re-indexes it. A figure below what the page already
     publishes is therefore only allowed to win if it says it is a
     correction. Silence is treated as staleness, not as a revision. */
  const floor = Number(options.floor);
  if (Number.isFinite(floor) && floor > 0) {
    eligible = eligible.filter(c => c.value >= floor || CORRECTION.test(c.sentence || ''));
  }

  if (!eligible.length) return null;

  eligible.sort((a, b) => {
    const at = Number.isFinite(a.at) ? a.at : -Infinity;
    const bt = Number.isFinite(b.at) ? b.at : -Infinity;
    if (bt !== at) return bt - at;
    const ap = isPrimary(a.source) ? 0 : 1;
    const bp = isPrimary(b.source) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    /* Same moment, same standing: prefer the exact figure over the rounded
       one. One wire item carried both "nearly 4,000 missing" and the 3,916 it
       was rounding; the counter should show the figure somebody counted. */
    const ar = roundness(a.value);
    const br = roundness(b.value);
    if (ar !== br) return ar - br;
    return b.value - a.value;
  });

  const winner = eligible[0];

  /* Everything else that stated a figure for this metric, newest first,
     including the sub-counts that were never allowed to win. The page shows
     these under the number so a reader sees the spread rather than one line
     they have to take on faith. */
  const others = scored
    .filter(c => c !== winner)
    .sort((a, b) => (Number.isFinite(b.at) ? b.at : -Infinity) - (Number.isFinite(a.at) ? a.at : -Infinity))
    .slice(0, 8)
    .map(c => ({
      value: c.value,
      source: c.source || null,
      url: c.url || null,
      time: c.time || null,
      scope: c.scope
    }));

  return {
    metric: winner.metric,
    value: winner.value,
    scope: winner.scope,
    source: winner.source || null,
    url: winner.url || null,
    time: winner.time || null,
    statedTime: winner.statedTime || null,
    sentence: winner.sentence || null,
    others
  };
}

/**
 * How round a figure looks. "Nearly 4,000" and "more than 1,000" are a
 * writer's approximation of a counted figure; 3,916 and 1,114 are the counted
 * figure. Used only to break a tie between sources publishing at the same
 * moment, never to prefer one masthead over another.
 */
function roundness(value) {
  if (value % 1000 === 0) return 2;
  if (value % 100 === 0) return 1;
  return 0;
}

/* Wording that marks a lower figure as a deliberate revision rather than an
   old page resurfacing. Only these let a counter go down. */
const CORRECTION = /\b(?:correct\w*|revis\w*|reduc\w*|lower\w*|down\s+from|amend\w*)\b|सच्याइ|संशोधन|घटाइ/i;

/**
 * The bulletin hour a sentence counts up to, when it states one: "आज दिउँसो
 * २:०० बजेसम्म", "as of 2pm". Returned as written, never inferred.
 */
export function statedHour(sentence) {
  const t = latinDigits(sentence || '');
  const m = t.match(/(\d{1,2})\s*:\s*(\d{2})/) ||
            t.match(/\b(\d{1,2})\s*(am|pm)\b/i);
  return m ? m[0].replace(/\s+/g, '') : null;
}

/**
 * Turn a list of feed items into figure candidates.
 *
 * Each item contributes its title and summary. The item's own publication
 * time and source travel with every figure read out of it, because a figure
 * without a time and a name is not publishable.
 */
export function candidatesFrom(items) {
  const out = [];
  for (const item of items || []) {
    if (!item) continue;
    const text = [item.title, item.summary, item.body].filter(Boolean).join(' । ');
    for (const found of readFigures(text)) {
      out.push({
        ...found,
        source: item.source || null,
        url: item.url || null,
        time: item.time || null,
        statedTime: statedHour(found.sentence)
      });
    }
  }
  return out;
}

/**
 * The whole board: one resolved figure per metric, plus the candidates that
 * lost. A metric no source states at all is absent rather than zero, so the
 * page keeps whatever it was built with.
 */
export function resolveBoard(items, options = {}) {
  const all = candidatesFrom(items);
  const floors = options.floors || {};
  const board = {};
  for (const metric of METRICS) {
    const picked = pickFigure(
      all.filter(c => c.metric === metric),
      { floor: floors[metric] }
    );
    if (picked) board[metric] = picked;
  }
  return board;
}
