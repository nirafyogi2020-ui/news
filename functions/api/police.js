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
  if (latin.trim() === '2083-05-10') return '2026-08-26T12:00:00+05:45';
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
