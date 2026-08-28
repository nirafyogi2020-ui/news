/**
 * GET /api/global
 *
 * The same live feed, for disasters anywhere in the world.
 *
 * The Nepal feed (/api/news) is deliberately narrow: it only carries this
 * event and its hazards. This one is the other half. Readers here follow one
 * disaster and then want to know what else is happening, and until now that
 * meant leaving the site.
 *
 * Sources are the same kind, at world scale:
 *   Official   ReliefWeb (UN OCHA) world updates, GDACS (UN/EC) alerts,
 *              USGS earthquakes of magnitude 5.5 and above
 *   Global     Al Jazeera, BBC World, The Guardian, France 24, NDTV
 *
 * A story only counts as a disaster story when a hazard word is in the
 * headline. "Storm" in the body of a political column is not news of a storm.
 *
 * Response shape matches /api/news, so the same card renderer draws both:
 *   { updated, items: [ { title, url, source, time, kind, region, image,
 *     summary, authority, alsoReported } ], errors: [] }
 */

import {
  getText, parseRss, cleanTitle, summarize, toIso,
  spread, byTimeDesc, significantWords, jaccard
} from './news.js';

const CACHE_SECONDS = 300;

/** What counts as a disaster. Headline only. */
const HAZARD = [
  'earthquake', 'quake', 'aftershock', 'tsunami', 'volcano', 'volcanic', 'eruption',
  'flood', 'flooding', 'floods', 'flash flood', 'glof', 'glacial lake', 'landslide',
  'mudslide', 'avalanche', 'cyclone', 'typhoon', 'hurricane', 'storm', 'tornado',
  'wildfire', 'bushfire', 'forest fire', 'drought', 'famine', 'heatwave', 'heat wave',
  'cold wave', 'blizzard', 'monsoon', 'evacuat', 'disaster', 'death toll', 'rescuers',
  'state of emergency', 'humanitarian crisis'
];

/** Words that mean the piece is about politics or money rather than an event. */
const NOT_AN_EVENT = /\b(stocks?|shares?|markets?|election campaign|box office|transfer window|premier league|film|movie|album)\b/i;

const PRIMARY_SOURCES = ['ReliefWeb (UN OCHA)', 'GDACS (UN / EC)', 'USGS'];
const TRUSTED_SOURCES = [
  'Al Jazeera', 'BBC News', 'The Guardian', 'France 24', 'NDTV',
  'Reuters', 'Associated Press', 'AFP'
];

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  const groups = await Promise.all([
    fetchReliefWebWorld().catch(track(errors, 'reliefweb')),
    fetchGdacsWorld().catch(track(errors, 'gdacs')),
    fetchBigQuakes().catch(track(errors, 'usgs')),
    fetchWire('https://www.aljazeera.com/xml/rss/all.xml', 'Al Jazeera').catch(track(errors, 'aljazeera')),
    fetchWire('https://feeds.bbci.co.uk/news/world/rss.xml', 'BBC News').catch(track(errors, 'bbc')),
    fetchWire('https://www.theguardian.com/world/rss', 'The Guardian').catch(track(errors, 'guardian')),
    fetchWire('https://www.france24.com/en/rss', 'France 24').catch(track(errors, 'france24')),
    fetchWire('https://feeds.feedburner.com/ndtvnews-world-news', 'NDTV').catch(track(errors, 'ndtv'))
  ]);

  const seen = new Set();
  let items = [];
  for (const group of groups) {
    for (const item of group) {
      if (!item.title || !item.url) continue;
      const key = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }

  items.sort(byTimeDesc);
  items = fold(items);
  for (const item of items) {
    item.authority = PRIMARY_SOURCES.indexOf(item.source) !== -1 ? 'primary'
      : TRUSTED_SOURCES.indexOf(item.source) !== -1 ? 'trusted' : 'other';
  }

  const primary = items.filter(i => i.kind !== 'press').slice(0, 3);
  const rest = items.filter(i => primary.indexOf(i) === -1);
  const finalItems = primary.concat(spread(rest)).slice(0, 80);

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    items: finalItems,
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

/** One story carried by four newsrooms is one story. Same rule as the Nepal
 *  feed: the fullest version survives and the rest become "also reported by". */
function fold(items) {
  const words = items.map(item => significantWords(item.title));
  const used = new Array(items.length).fill(false);
  const out = [];
  for (let i = 0; i < items.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    if (items[i].kind !== 'press') { out.push(items[i]); continue; }
    const group = [items[i]];
    for (let j = i + 1; j < items.length; j++) {
      if (used[j] || items[j].kind !== 'press') continue;
      if (jaccard(words[i], words[j]) < 0.42) continue;
      used[j] = true;
      group.push(items[j]);
    }
    const score = item => (item.image ? 4 : 0) +
      (TRUSTED_SOURCES.indexOf(item.source) !== -1 ? 2 : 0) +
      ((item.summary || '').length > 200 ? 1 : 0);
    const best = group.slice().sort((a, b) => score(b) - score(a) || byTimeDesc(a, b))[0];
    best.alsoReported = group
      .filter(m => m !== best && m.source !== best.source)
      .map(m => ({ name: m.source, url: m.url }));
    out.push(best);
  }
  return out;
}

async function fetchReliefWebWorld() {
  const xml = await getText('https://reliefweb.int/updates/rss.xml');
  // ReliefWeb carries the whole humanitarian system, funding announcements and
  // administrative notes included. Only the ones whose headline names a hazard
  // belong on a disaster page.
  return parseRss(xml)
    .filter(item => {
      const title = String(item.title || '').toLowerCase();
      return HAZARD.some(word => title.includes(word));
    })
    .slice(0, 12)
    .map(item => ({
    title: cleanTitle(item.title),
    url: item.link,
    source: 'ReliefWeb (UN OCHA)',
    time: toIso(item.pubDate, item.link),
    kind: 'official',
    region: 'global',
    image: item.image,
    summary: summarize(item.contentFull || item.description, 650)
  }));
}

async function fetchGdacsWorld() {
  const xml = (await getText('https://www.gdacs.org/xml/rss.xml')).slice(0, 300000);
  // GDACS colour-codes every alert it issues. Green means it expects little
  // humanitarian impact, and green alerts fire constantly: three green forest
  // fires were sitting above the day's real news. Orange and red only.
  return parseRss(xml)
    .filter(item => !/\bgreen\b/i.test(item.title || ''))
    .slice(0, 10)
    .map(item => ({
    title: cleanTitle(item.title),
    url: item.link,
    source: 'GDACS (UN / EC)',
    time: toIso(item.pubDate, item.link),
    kind: 'alert',
    region: 'global',
    image: item.image,
    summary: summarize(item.contentFull || item.description, 650)
  }));
}

/** Only quakes big enough to matter to people, anywhere in the world. */
async function fetchBigQuakes() {
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson' +
    '&orderby=time&minmagnitude=5.5&limit=8';
  const json = JSON.parse(await getText(url));
  return (json.features || []).map(feature => ({
    title: `Magnitude ${feature.properties.mag} earthquake: ${feature.properties.place}`,
    url: feature.properties.url,
    source: 'USGS',
    time: new Date(feature.properties.time).toISOString(),
    kind: 'quake',
    region: 'global',
    image: null,
    summary: null
  }));
}

async function fetchWire(url, source) {
  const xml = await getText(url);
  return parseRss(xml)
    .filter(item => {
      const title = String(item.title || '').toLowerCase();
      if (NOT_AN_EVENT.test(title)) return false;
      return HAZARD.some(word => title.includes(word));
    })
    .slice(0, 10)
    .map(item => ({
      title: cleanTitle(item.title),
      url: item.link,
      source,
      time: toIso(item.pubDate, item.link),
      kind: 'press',
      region: 'global',
      image: item.image,
      summary: summarize(item.contentFull || item.description, 650)
    }));
}

function track(errors, name) {
  return (e) => { errors.push(`${name}: ${e.message}`); return []; };
}
