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
      /* The listing carries no clock time, so the item is stamped noon. The
         bulletin itself usually says which hour it counts up to — "बुधबार
         १७:०० बजे सम्म" — and that hour decides whether it is newer than a
         newsroom report of the same day.

         This is not cosmetic. A 5pm police bulletin stamped noon loses the
         first-wins comparison to a newsroom that published at 4:14pm relaying
         an older figure, and the page then shows the older number while the
         newer one sits in the bulletin it was read from. Seen exactly that
         way: 1,132 from the bulletin losing to 1,114 from a relay. */
      const hour = statedClock(item.body);
      if (hour) {
        item.time = item.time ? item.time.slice(0, 11) + hour + ':00+05:45' : item.time;
        item.dateOnly = false;
      }
    }));
  }

  return top;
}

/**
 * The readable text of one bulletin page.
 *
 * Scoped to the article container, and that scoping is not cosmetic. Nepal
 * Police pages carry a sidebar of other headlines, and those headlines are
 * about other incidents: one of them read "6 dead, 6 injured, 29 missing" in a
 * landslide elsewhere in the country. Read as part of this bulletin those
 * become candidate figures for this event. They lose on the rules in
 * _figures-core.js, but a figure that only survives because a later rule threw
 * it out is one rule away from being published, so it should never be read in
 * the first place.
 *
 * If the container cannot be found the page is skipped rather than read whole,
 * for the same reason: no body is better than the wrong body. The listing
 * teaser still stands.
 */
export function extractBody(html) {
  const source = String(html || '');
  const scoped =
    source.match(/<div[^>]+class="[^"]*news-article[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    source.match(/<div[^>]+class="[^"]*(?:news-detail|detail-content|editor-content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    source.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (!scoped) return null;

  const text = cleanText(
    scoped[1]
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|li|br|h[1-6])>/gi, ' । ')
  );
  return text ? text.slice(0, 4000) : null;
}

/**
 * The hour a bulletin says it counts up to: "बुधबार १७:०० बजे सम्म".
 *
 * Only a time written next to बजे ("o'clock") counts. A bare "17:00" elsewhere
 * on the page could be anything, and a guessed hour is worse than the noon it
 * would replace.
 */
export function statedClock(body) {
  if (!body) return null;
  const m = latinDigits(body).match(/(\d{1,2})\s*:\s*(\d{2})\s*बजे/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!(hour >= 0 && hour <= 23) || !(minute >= 0 && minute <= 59)) return null;
  return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
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

/**
 * Fetch a page, retrying a server-side failure once.
 *
 * nepalpolice.gov.np returns a 502 often enough to matter — it did so twice
 * while this was being written. Without a retry a transient one drops the most
 * authoritative source in the list for that whole run, and the figure board
 * falls back to whichever newsroom is relaying an older bulletin. One short
 * retry costs nothing and recovers almost all of them.
 *
 * A 404 is not retried: it is an answer, not a failure.
 */
async function getText(url, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
      }
    });
  } catch (e) {
    if (attempt < RETRIES) return retry(url, attempt);
    throw e;
  }
  if (!res.ok) {
    if (res.status >= 500 && attempt < RETRIES) return retry(url, attempt);
    throw new Error('HTTP ' + res.status);
  }
  return res.text();
}

const RETRIES = 2;

function retry(url, attempt) {
  return new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)))
    .then(() => getText(url, attempt + 1));
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
