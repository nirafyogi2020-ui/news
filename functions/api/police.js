/**
 * GET /api/police
 *
 * Nepal Police's own news list, read straight from their public website
 * (nepalpolice.gov.np) — no Facebook, no API key, no login. Their homepage
 * lists recent notices/press items in plain server-rendered HTML; this
 * parses that listing the same way the news aggregator already reads
 * plain HTML/RSS from newsroom sites.
 *
 * The listing carries a short teaser. The figures usually live in the full
 * bulletin, so the newest matching items are opened and their body text is
 * carried on the item as `body`. That is the difference between reading "469"
 * out of a 220-character teaser and reading the whole district breakdown.
 *
 * Response shape:
 *   { updated, items: [ { title, url, source, time, kind, region, image,
 *     summary, body } ], errors: [] }
 */

import { latinDigits, nepaliNumber, readFigures, statedHour } from './_figures-core.js';

export { latinDigits, nepaliNumber };

const CACHE_SECONDS = 300;

/* How many of the newest matching bulletins get opened in full. The listing
   itself is one fetch; each body is another, so this is the only place the
   endpoint's cost grows. Three covers "the newest bulletin plus the two it
   might be correcting" without turning one page view into a crawl. */
const BODIES_TO_OPEN = 3;

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

export async function loadPoliceNews({ withBodies = true } = {}) {
  const html = await getText('https://nepalpolice.gov.np/');

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
      summary: cleanText(summary).slice(0, 220),
      body: null
    });
  }

  const top = items.slice(0, 10);

  /* The teaser is cut at 220 characters, which is usually short of the
     sentence carrying the figures and always short of the district
     breakdown. Open the newest few and keep their text. A body that fails to
     load leaves `body` null and the teaser still stands. */
  if (withBodies) {
    await Promise.all(top.slice(0, BODIES_TO_OPEN).map(async item => {
      try {
        item.body = extractBody(await getText(item.url));
      } catch (e) {
        item.body = null;
      }
    }));
  }

  return top;
}

/** The readable text of one bulletin page, with the chrome stripped out. */
export function extractBody(html) {
  const source = String(html || '');
  const scoped = source.match(/<div[^>]+class="[^"]*(?:news-detail|detail-content|editor-content|content-area)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  const region = scoped ? scoped[1] : source;
  const text = cleanText(
    region
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\/(p|div|li|br|h[1-6])>/gi, ' । ')
  );
  return text ? text.slice(0, 4000) : null;
}

/* ---------------------------------------------------------------------------
   Bikram Sambat dates

   The listing only carries a BS date (e.g. "२०८३-०५-१०"), no Gregorian
   conversion and no time of day.

   Rather than pull in a full calendar library, this uses one verified anchor
   and the month lengths of the year around it. 2083-05-10 BS is 26 Aug 2026,
   confirmed from NDRRMA's own dated situation report, which puts 2083-01-01
   (Nepali new year) on 14 April 2026 — the expected date, which is the check
   that the table below is the right one.

   A year with no table returns null, and the item shows with no timestamp
   rather than a wrong one. Adding a year is adding one row.
   ------------------------------------------------------------------------- */
const BS_YEARS = {
  // Baisakh … Chaitra
  2083: { startsUtc: Date.UTC(2026, 3, 14), months: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30] }
};

export function bsDateToIso(bsDate) {
  const parts = latinDigits(bsDate).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);

  const table = BS_YEARS[year];
  if (!table) return null;
  if (!(month >= 1 && month <= 12)) return null;
  if (!(day >= 1 && day <= table.months[month - 1])) return null;

  let offset = 0;
  for (let m = 0; m < month - 1; m++) offset += table.months[m];
  offset += day - 1;

  const date = new Date(table.startsUtc + offset * 86400000);
  // Noon Nepal time: the listing states no hour, and noon is the reading that
  // cannot land the item on the wrong calendar day in either direction.
  return date.toISOString().slice(0, 10) + 'T12:00:00+05:45';
}

/* ---------------------------------------------------------------------------
   Reading a figure out of a bulletin
   ------------------------------------------------------------------------- */

/**
 * The confirmed death toll, read from the police bulletin itself.
 *
 * Kept for the callers that only want the toll. The shared reader in
 * _figures-core.js does the parsing, so the police bulletin and a newsroom
 * report are read by exactly the same rules, and the body is preferred over
 * the teaser because the body is what states the hour.
 */
export function tollFromPolice(items) {
  for (const item of items || []) {
    const text = [item.title, item.summary, item.body].filter(Boolean).join(' । ');
    const found = readFigures(text).filter(f => f.metric === 'dead');
    if (!found.length) continue;
    /* One bulletin states the same toll in its headline and its body; the
       body is the one that says which hour it counts up to, so it wins. */
    const best = found.map(f => ({ ...f, statedTime: statedHour(f.sentence) }))
      .sort((a, b) => (b.statedTime ? 1 : 0) - (a.statedTime ? 1 : 0))[0];
    return {
      dead: best.value,
      source: 'Nepal Police',
      url: item.url,
      statedTime: best.statedTime,
      date: item.time || null,
      sentence: best.sentence
    };
  }
  return null;
}

/* ---------------------------------------------------------------------------
   Plumbing
   ------------------------------------------------------------------------- */

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      'accept': 'text/html',
      'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
    }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function matches(text, words) {
  const lower = (text || '').toLowerCase();
  return words.some(word => lower.includes(word.toLowerCase()));
}

function cleanText(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
