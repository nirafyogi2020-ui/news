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
  spread, byTimeDesc, significantWords, jaccard, safeHttpsUrl
} from './news.js';

const CACHE_SECONDS = 60;

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
const NOT_AN_EVENT = /\b(stocks?|shares?|markets?|election campaign|box office|transfer window|premier league|film|movie|album|faces? (?:an )?(?:inquiry|investigation)|inquiry (?:into|over)|diverted (?:wildfire |disaster )?(?:resources?|funds?)|misused (?:wildfire |disaster )?(?:resources?|funds?))\b/i;

const PRIMARY_SOURCES = [
  'ReliefWeb (UN OCHA)', 'GDACS (UN / EC)', 'USGS', 'U.S. National Weather Service'
];
const TRUSTED_SOURCES = [
  'Al Jazeera', 'BBC News', 'The Guardian', 'France 24', 'NDTV',
  'Reuters', 'Associated Press', 'AFP', 'Xinhua', 'Agência Brasil'
];

const BRAZIL_HAZARD = [
  'enchente', 'inundação', 'alagamento', 'deslizamento', 'tempestade',
  'ciclone', 'seca', 'queimada', 'incêndio', 'terremoto', 'desastre',
  'chuva forte', 'chuvas intensas'
];
const US_ALERT_HAZARD = /flood|hurricane|tornado|tsunami|wildfire|fire weather|landslide|winter storm|blizzard|ice storm|severe thunderstorm|extreme heat|extreme cold/i;

/** A headline must describe the event itself, not an investigation that happens
 * to use a disaster word. This keeps policy stories out of the live feed. */
export function isDisasterWireHeadline(title) {
  const text = String(title || '').toLowerCase();
  return !NOT_AN_EVENT.test(text) && HAZARD.some(word => text.includes(word));
}

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
    fetchWire('https://feeds.feedburner.com/ndtvnews-world-news', 'NDTV').catch(track(errors, 'ndtv')),
    fetchWire('https://english.news.cn/rss/', 'Xinhua').catch(track(errors, 'xinhua')),
    fetchNepalLocal(request).catch(track(errors, 'nepal')),
    fetchBrazilLocal().catch(track(errors, 'brazil')),
    fetchUnitedStatesAlerts().catch(track(errors, 'united-states'))
  ]);

  const seen = new Set();
  let items = [];
  for (const group of groups) {
    for (const item of group) {
      const safeItem = sanitizeWorldItem(item);
      if (!safeItem || !safeItem.title || !safeItem.url) continue;
      const key = safeItem.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(safeItem);
    }
  }

  items.sort(byTimeDesc);
  items = fold(items);
  for (const item of items) {
    item.authority = item.authority || (PRIMARY_SOURCES.indexOf(item.source) !== -1 ? 'primary'
      : TRUSTED_SOURCES.indexOf(item.source) !== -1 ? 'trusted' : 'other');
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
    .filter(item => isDisasterWireHeadline(item.title))
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

/** Nepal is included as its own live location, using the existing source-checked
 * feed rather than fetching its publishers again. */
async function fetchNepalLocal(request) {
  const url = new URL('/api/news', request.url);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12000),
    headers: { accept: 'application/json' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  return (Array.isArray(data.items) ? data.items : [])
    // The World page's Nepal view is for local and official coverage. Foreign
    // wire headlines remain in World, where competing cross-border totals are
    // not presented as Nepal's local confirmed figure.
    .filter(item => item && item.kind !== 'video' &&
      (item.region === 'nepal' || item.authority === 'primary'))
    .slice(0, 30)
    .map(item => ({ ...item, country: 'nepal' }));
}

/** Brazil's public broadcaster is a named, national source. Filter its broad
 * feed locally so ordinary politics and sport do not appear as a disaster. */
async function fetchBrazilLocal() {
  const xml = await getText('https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml');
  return parseRss(xml)
    .filter(item => isBrazilDisasterHeadline(item.title))
    .slice(0, 12)
    .map(item => ({
      title: cleanTitle(item.title),
      url: item.link,
      source: 'Agência Brasil',
      time: toIso(item.pubDate, item.link),
      kind: 'press',
      region: 'global',
      country: 'brazil',
      image: item.image,
      summary: summarize(item.contentFull || item.description, 650)
    }));
}

function isBrazilDisasterHeadline(title) {
  const text = String(title || '').toLowerCase();
  return BRAZIL_HAZARD.some(word => text.includes(word));
}

/** The National Weather Service publishes structured, active U.S. alerts.
 * These are primary alerts, not news reporting, so no number is rewritten. */
async function fetchUnitedStatesAlerts() {
  const json = JSON.parse(await getText(
    'https://api.weather.gov/alerts/active?status=actual&message_type=alert&severity=Severe'
  ));
  return (json.features || [])
    .map(feature => {
      const props = feature && feature.properties ? feature.properties : {};
      const event = cleanTitle(props.event || '');
      if (!US_ALERT_HAZARD.test(event)) return null;
      const area = cleanTitle(props.areaDesc || 'United States');
      const title = cleanTitle(props.headline || (event + ': ' + area));
      return {
        title,
        // `web` is often the NWS home page on HTTP. The per-alert API URL is
        // HTTPS, specific to this alert, and preserves the site's safe-link rule.
        url: feature.id || props.web,
        source: 'U.S. National Weather Service',
        time: toIso(props.sent || props.effective || props.onset),
        kind: 'alert',
        region: 'global',
        country: 'united-states',
        image: null,
        summary: summarize(props.description || props.instruction, 650)
      };
    })
    .filter(Boolean)
    .slice(0, 30);
}

function sanitizeWorldItem(item) {
  if (!item || typeof item !== 'object') return null;
  const url = safeHttpsUrl(item.url);
  if (!url) return null;
  return {
    ...item,
    url,
    image: safeHttpsUrl(item.image),
    country: item.country || 'global'
  };
}

function track(errors, name) {
  return (e) => { errors.push(`${name}: ${e.message}`); return []; };
}
