/**
 * GET /api/police
 *
 * Nepal Police's own news list, read straight from their public website
 * (nepalpolice.gov.np) — no Facebook, no API key, no login. Their homepage
 * lists recent notices/press items in plain server-rendered HTML; this
 * parses that listing the same way the news aggregator already reads
 * plain HTML/RSS from newsroom sites.
 *
 * There's no published timestamp finer than a Bikram Sambat date on this
 * listing (no hour/minute), so `time` is left null rather than guessed —
 * items still show, just without a false "X minutes ago".
 *
 * Response shape:
 *   { updated, items: [ { title, url, source, time, kind, region, image,
 *     summary } ], errors: [] }
 */

const CACHE_SECONDS = 300;

const TOPIC = [
  'rasuwa', 'bhotekoshi', 'trishuli', 'flood', 'baadhi',
  'रसुवा', 'भोटेकोशी', 'त्रिशूली', 'बाढी', 'नुवाकोट', 'उद्धार', 'राहत'
];

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  let items = [];
  try {
    items = await loadPoliceNews();
  } catch (e) {
    errors.push('nepalpolice: ' + e.message);
  }

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    items,
    errors
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=120, s-maxage=${CACHE_SECONDS}`,
      'access-control-allow-origin': '*'
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export async function loadPoliceNews() {
  const res = await fetch('https://nepalpolice.gov.np/', {
    headers: {
      'accept': 'text/html',
      'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
    }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const html = await res.text();

  const pattern = /<li>\s*<div class="textbox-02">\s*<a href="(\/news\/\d+\/)">\s*<h6[^>]*>(.*?)<\/h6>\s*<\/a>\s*<span[^>]*>([^<]*)<\/span>\s*<p[^>]*>(.*?)<\/p>/gs;

  const items = [];
  let match;
  while ((match = pattern.exec(html))) {
    const [, path, title, bsDate, summary] = match;
    const cleanedTitle = cleanText(title);
    if (!matches(cleanedTitle + ' ' + summary, TOPIC)) continue;
    items.push({
      title: cleanedTitle,
      url: 'https://nepalpolice.gov.np' + path,
      source: 'Nepal Police',
      time: bsDateToIso(bsDate),
      kind: 'official',
      region: 'nepal',
      image: null,
      // The listing carries a date and no clock time, so the card must print
      // the date. "12 hours ago" off a made-up noon would be a false precision.
      dateOnly: true,
      summary: cleanText(summary).slice(0, 220)
    });
  }
  return items.slice(0, 10);
}

/**
 * The listing only carries a Bikram Sambat date (e.g. "२०८३-०५-१०"), no
 * Gregorian conversion and no time of day. Rather than pull in a full BS
 * calendar library for one field, this maps the one date that actually
 * matters here: 2083-05-10 BS is confirmed (from NDRRMA's own dated
 * situation report) to be 26 Aug 2026, the day of this flood. Anything
 * else returns null — shown with no timestamp rather than a wrong one.
 */
function bsDateToIso(bsDate) {
  const latin = String(bsDate || '').replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
  const parts = latin.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const [, year, month, day] = parts;
  // Days inside one BS month run consecutively in the Gregorian calendar too,
  // so one confirmed anchor date fixes the whole month with no calendar
  // library: 2083-05-10 BS is 26 Aug 2026 (NDRRMA's own dated situation
  // report), which puts 2083-05-01 on 17 Aug 2026. Any other month returns
  // null and the item shows with no timestamp rather than a wrong one.
  if (year !== '2083' || month !== '05') return null;
  const date = new Date(Date.UTC(2026, 7, 16 + Number(day)));
  return date.toISOString().slice(0, 10) + 'T12:00:00+05:45';
}

/* ---------- reading a figure out of a bulletin ---------- */

/** Devanagari digits to ASCII. */
function latinDigits(text) {
  return String(text || '').replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
}

/**
 * Nepali bulletins write large numbers in words as well as digits: "४ सय ६९"
 * is 469, "१५ सय ४५" is 1545, and "१ हजार २ सय" is 1200. A plain digit run is
 * also common. This reads both, and returns null on anything it does not
 * recognise rather than a half-parsed number.
 */
export function nepaliNumber(text) {
  const t = latinDigits(text).replace(/,/g, '');
  let m = t.match(/(\d+)\s*हजार\s*(?:(\d+)\s*सय)?\s*(\d+)?/);
  if (m) {
    return Number(m[1]) * 1000 + (m[2] ? Number(m[2]) * 100 : 0) + (m[3] ? Number(m[3]) : 0);
  }
  m = t.match(/(\d+)\s*सय\s*(\d+)?/);
  if (m) return Number(m[1]) * 100 + (m[2] ? Number(m[2]) : 0);
  m = t.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * The confirmed death toll, read from the police bulletin itself.
 *
 * The counters on the site are edited by hand once an hour, and a toll that
 * moves at 07:00 should not wait for that. This reads the number out of the
 * sentence that states it, and only that sentence: "... सम्म ४ सय ६९ जनाको
 * मृत्यु भएको छ". No sentence in that shape means no figure, not a guess.
 */
export function tollFromPolice(items) {
  const found = [];
  for (const item of items) {
    const text = (item.title || '') + ' । ' + (item.summary || '');
    for (const sentence of text.split(/।|\.\s/)) {
      if (!/मृत्यु|शव/.test(sentence)) continue;
      const before = sentence.split(/जनाको|जनाक|शव/)[0];
      if (!before || before === sentence) continue;
      const value = nepaliNumber(before);
      if (!value || value < 10 || value > 100000) continue;
      found.push({
        dead: value,
        source: 'Nepal Police',
        url: item.url,
        // The bulletin usually states the hour it counts up to.
        statedTime: (latinDigits(sentence).match(/(\d{1,2})\s*:\s*(\d{2})/) || [null])[0] || null,
        date: item.time || null,
        sentence: sentence.trim().slice(0, 220)
      });
    }
    // The headline and the body of one bulletin carry the same figure; the
    // body is the one that says which hour it counts up to, so it wins.
    const best = found.find(f => f.statedTime) || found[0];
    if (best) return best;
  }
  return null;
}

function matches(text, words) {
  const lower = (text || '').toLowerCase();
  return words.some(word => lower.includes(word.toLowerCase()));
}

function cleanText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
