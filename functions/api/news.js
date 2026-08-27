/**
 * GET /api/news
 *
 * Live news aggregator for the Rasuwa / Bhotekoshi flood page.
 *
 * Runs as a Cloudflare Pages Function so the browser never deals with CORS,
 * and so each upstream feed is hit once per cache window rather than once per
 * visitor. Every source below was checked from Cloudflare's own network:
 * some publishers that answer a home connection refuse datacentre traffic,
 * so anything unreachable from here was dropped rather than left to fail.
 *
 * Sources, in order of trust — region tags let the Feed tab filter to
 * "Nepali sources" or "Global sources" (official/alert/quake items always
 * show regardless of that filter, since they're primary sources, not press):
 *   Official   ReliefWeb (UN OCHA), GDACS (UN/EC), USGS
 *   Nepal      Kathmandu Post, Onlinekhabar, Ratopati, Nepalnews, Setopati,
 *              Nagarik News, Annapurna Post, Khabarhub, Nepal Police (their
 *              own site's news list, read directly — no Facebook, no API key)
 *   Global     Al Jazeera, BBC Asia, The Guardian (Nepal desk), NDTV World,
 *              France 24, Bing News aggregation
 *   Video      YouTube search (real videos, free API key, no app-review wait —
 *              set YOUTUBE_API_KEY as a Cloudflare secret to turn this on)
 *
 * Fluff filter: diplomatic "expresses deep sorrow / offers condolences"
 * statements are dropped outright — they carry no rescue/casualty/damage
 * information, which is what this page exists to surface fast.
 *
 * Verification: an item is marked verified when it comes from an official/alert/quake
 * source (ReliefWeb, GDACS, USGS), or when two or more independent press newsrooms are
 * reporting the same thing (titles overlap enough on distinctive words). Anything else
 * is left unverified rather than guessed at — see corroboratedBy on each item.
 *
 * Response shape:
 *   { updated, items: [ { title, url, source, time, kind, region, image, summary,
 *     verified, corroboratedBy } ], errors: [] }
 */

import { loadPoliceNews } from './police.js';

const CACHE_SECONDS = 120;
/** Card summaries: keep the full text each feed publishes, cleaned to plain
 *  text, capped only to keep one card from running very long. */
const SUMMARY_MAX = 650;
const NEPAL_BOX = { minlat: 26.3, maxlat: 30.5, minlon: 80.0, maxlon: 88.3 };

/** Only keep press items that are actually about this event or its hazards.
 *  Nepali-script sources publish in Devanagari, so the real keywords they'd
 *  use are included too — matching plain English words against a Nepali
 *  headline would just never fire.
 *
 *  Split into STRONG (specific enough on its own — a place name, an agency,
 *  a named hazard) and GENERIC (words like "missing" or "relief" that show
 *  up in unrelated news constantly). A big international wire feed carries
 *  everything from Australian transit policy to French tornadoes, so a
 *  GENERIC-only match there is worthless noise; it only counts once paired
 *  with "nepal" appearing too. Nepali-language newsrooms are exempt from
 *  that pairing since their whole output is Nepal by definition. */
const TOPIC_STRONG = [
  'rasuwa', 'bhotekoshi', 'bhote koshi', 'trishuli', 'timure',
  'syabrubesi', 'langtang', 'gyirong', 'kyirong', 'glof', 'glacial lake',
  'ndrrma', 'himalaya',
  'रसुवा', 'भोटेकोशी', 'भोटे कोशी', 'त्रिशूली', 'त्रिशुली', 'तिमुरे',
  'स्याफ्रुबेसी', 'हिमताल'
];
const TOPIC_GENERIC = [
  'flood', 'nuwakot', 'avalanche', 'landslide', 'inundat', 'swept', 'missing',
  'rescue', 'disaster', 'relief', 'evacuat', 'hydropower',
  'बाढी', 'न्वाकोट', 'नुवाकोट', 'पहिरो', 'बेपत्ता', 'उद्धार', 'विपद्', 'राहत',
  'मृत्यु', 'शव', 'घाइते'
];
const TOPIC = TOPIC_STRONG.concat(TOPIC_GENERIC);

/** GDACS carries the whole world; these words mark the entries we want. */
const PLACE = [
  'nepal', 'rasuwa', 'bhotekoshi', 'trishuli', 'langtang',
  'gyirong', 'kyirong', 'tibet', 'himalaya'
];

/** Condolence/sympathy statements carry no rescue or casualty information —
 *  not what this page is for, so they're dropped rather than shown. */
const FLUFF = /expresses?\s+(deep\s+)?(sorrow|condolences?|grief|sympath\w*)|extends?\s+(its\s+|his\s+|her\s+)?condolences?|offers?\s+condolences?|\bmourns\b|prayers?\s+(are|go)\s+(out\s+)?with|stands?\s+in\s+solidarity|solidarity\s+with\s+nepal/i;

export async function onRequestGet(context) {
  const { request, env } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  const groups = await Promise.all([
    fetchReliefWeb().catch(track(errors, 'reliefweb')),
    fetchGdacs().catch(track(errors, 'gdacs')),
    fetchQuakes().catch(track(errors, 'usgs')),
    fetchKathmanduPost().catch(track(errors, 'kathmandupost')),
    fetchOnlinekhabar().catch(track(errors, 'onlinekhabar')),
    fetchRatopati().catch(track(errors, 'ratopati')),
    fetchNepalnews().catch(track(errors, 'nepalnews')),
    fetchSetopati().catch(track(errors, 'setopati')),
    fetchNagarik().catch(track(errors, 'nagarik')),
    fetchAnnapurna().catch(track(errors, 'annapurna')),
    fetchKhabarhub().catch(track(errors, 'khabarhub')),
    fetchAlJazeera().catch(track(errors, 'aljazeera')),
    fetchBbcAsia().catch(track(errors, 'bbc')),
    fetchGuardianNepal().catch(track(errors, 'guardian')),
    fetchNdtvWorld().catch(track(errors, 'ndtv')),
    fetchFrance24().catch(track(errors, 'france24')),
    fetchBingNews().catch(track(errors, 'bing')),
    loadPoliceNews().catch(track(errors, 'nepalpolice')),
    fetchYoutube(env).catch(track(errors, 'youtube'))
  ]);

  const seen = new Set();
  let items = [];

  for (const group of groups) {
    for (const item of group) {
      if (!item.title || !item.url) continue;
      if (FLUFF.test(item.title)) continue;
      // \p{L}/\p{N} (Unicode letter/number) rather than a-z0-9, so Devanagari
      // titles (Setopati, Nepal Police, ...) don't all collapse to the same
      // empty key and silently dedupe each other down to one survivor.
      const key = item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }

  items.sort((a, b) => {
    const at = a.time ? new Date(a.time).getTime() : -Infinity;
    const bt = b.time ? new Date(b.time).getTime() : -Infinity;
    return bt - at;
  });

  verify(items);

  // Official/primary sources (governments, UN bodies) are few in number and
  // are worth guaranteeing a spot even if their timestamp is a few hours
  // older than the newest press wire — a straight chronological cap would
  // otherwise let a wave of fresh wire stories quietly bury the one Nepal
  // Police update for the day.
  const officialFirst = items.filter(i => i.kind !== 'press');
  const pressOnly = items.filter(i => i.kind === 'press');
  const finalItems = officialFirst.concat(pressOnly).slice(0, 100);
  finalItems.sort((a, b) => {
    const at = a.time ? new Date(a.time).getTime() : -Infinity;
    const bt = b.time ? new Date(b.time).getTime() : -Infinity;
    return bt - at;
  });

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    items: finalItems,
    economicLoss: findEconomicLoss(finalItems),
    errors
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=30, s-maxage=${CACHE_SECONDS}`,
      'access-control-allow-origin': '*'
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/* ---------- sources ---------- */

/** ReliefWeb's public RSS, narrowed to Nepal (C170 is Nepal in their taxonomy). */
async function fetchReliefWeb() {
  const xml = await getText('https://reliefweb.int/updates/rss.xml?advanced-search=%28C170%29');
  // The RSS view ignores the country filter, so narrow it here instead.
  return parseRss(xml)
    .filter(item => matches(item.title + ' ' + item.description, PLACE))
    .slice(0, 10)
    .map(item => ({
    title: cleanTitle(item.title),
    url: item.link,
    source: 'ReliefWeb (UN OCHA)',
    time: toIso(item.pubDate, item.link),
    kind: 'official',
    region: 'global',
    image: item.image,
    summary: summarize(item.contentFull || item.description, SUMMARY_MAX)
  }));
}

async function fetchGdacs() {
  // The worldwide feed is large; the newest entries sit at the top of it.
  const xml = (await getText('https://www.gdacs.org/xml/rss.xml')).slice(0, 300000);
  return parseRss(xml)
    .filter(item => matches(item.title + ' ' + item.description, PLACE))
    .slice(0, 6)
    .map(item => ({
      title: cleanTitle(item.title),
      url: item.link,
      source: 'GDACS (UN / EC)',
      time: toIso(item.pubDate, item.link),
      kind: 'alert',
      region: 'global',
      image: item.image,
      summary: summarize(item.contentFull || item.description, SUMMARY_MAX)
    }));
}

async function fetchQuakes() {
  const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time' +
    '&minmagnitude=3.5&limit=6&starttime=2026-08-20' +
    `&minlatitude=${NEPAL_BOX.minlat}&maxlatitude=${NEPAL_BOX.maxlat}` +
    `&minlongitude=${NEPAL_BOX.minlon}&maxlongitude=${NEPAL_BOX.maxlon}`;

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

async function fetchKathmanduPost() {
  const xml = await getText('https://kathmandupost.com/rss');
  return onTopic(parseRss(xml), 'Kathmandu Post', 'nepal');
}

async function fetchOnlinekhabar() {
  const xml = await getText('https://english.onlinekhabar.com/feed');
  return onTopic(parseRss(xml), 'Onlinekhabar', 'nepal');
}

async function fetchRatopati() {
  const xml = await getText('https://english.ratopati.com/feed');
  return onTopic(parseRss(xml), 'Ratopati', 'nepal');
}

async function fetchNepalnews() {
  const xml = await getText('https://english.nepalnews.com/feed/');
  return onTopic(parseRss(xml), 'Nepalnews', 'nepal');
}

async function fetchSetopati() {
  const xml = await getText('https://www.setopati.com/feed');
  return onTopic(parseRss(xml), 'Setopati', 'nepal');
}

async function fetchNagarik() {
  const xml = await getText('https://www.nagariknews.nagariknetwork.com/feed');
  return onTopic(parseRss(xml), 'Nagarik News', 'nepal');
}

async function fetchAnnapurna() {
  const xml = await getText('https://www.annapurnapost.com/rss');
  return onTopic(parseRss(xml), 'Annapurna Post', 'nepal');
}

async function fetchKhabarhub() {
  const xml = await getText('https://www.khabarhub.com/feed');
  return onTopic(parseRss(xml), 'Khabarhub', 'nepal');
}

async function fetchAlJazeera() {
  const xml = await getText('https://www.aljazeera.com/xml/rss/all.xml');
  return onTopic(parseRss(xml), 'Al Jazeera', 'global', { strict: true });
}

async function fetchBbcAsia() {
  const xml = await getText('https://feeds.bbci.co.uk/news/world/asia/rss.xml');
  return onTopic(parseRss(xml), 'BBC News', 'global', { strict: true });
}

async function fetchGuardianNepal() {
  const xml = await getText('https://www.theguardian.com/world/nepal/rss');
  return onTopic(parseRss(xml), 'The Guardian', 'global', { strict: true });
}

async function fetchNdtvWorld() {
  const xml = await getText('https://feeds.feedburner.com/ndtvnews-world-news');
  return onTopic(parseRss(xml), 'NDTV', 'global', { strict: true });
}

async function fetchFrance24() {
  const xml = await getText('https://www.france24.com/en/rss');
  return onTopic(parseRss(xml), 'France 24', 'global', { strict: true });
}

async function fetchBingNews() {
  const query = encodeURIComponent('Nepal flood Rasuwa Bhotekoshi Trishuli');
  const xml = await getText(`https://www.bing.com/news/search?q=${query}&format=RSS`);

  return parseRss(xml).slice(0, 18).map(item => ({
    title: cleanTitle(item.title),
    url: item.link,
    source: item.sourceName || 'News',
    time: toIso(item.pubDate, item.link),
    kind: 'press',
    region: 'global',
    image: item.image,
    summary: summarize(item.contentFull || item.description, SUMMARY_MAX)
  }));
}

/**
 * YouTube Data API v3 search, free with a self-serve API key (no app review,
 * unlike Facebook's Page Public Content Access). Off entirely — no request,
 * no error — until YOUTUBE_API_KEY is set as a Cloudflare secret; it isn't
 * a source anyone has to wait on approval for, so absence just means "not
 * configured yet," not "broken."
 */
async function fetchYoutube(env) {
  const key = env && env.YOUTUBE_API_KEY;
  if (!key) return [];

  const query = encodeURIComponent('Rasuwa Bhotekoshi Trishuli flood Nepal');
  const url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video' +
    `&order=date&maxResults=24&relevanceLanguage=en&q=${query}&key=${key}`;

  const json = JSON.parse(await getText(url));
  const found = (json.items || []).filter(item => item.id && item.id.videoId && item.snippet);

  // One extra call gets the channel logos for every channel in the result.
  // The full-screen player shows the uploader's own picture rather than
  // initials in a grey circle; this costs 1 quota unit for the whole batch.
  const avatars = await channelAvatars(found, key);

  return found.map(item => {
      const s = item.snippet;
      const text = s.title + ' ' + (s.channelTitle || '');
      return {
        title: cleanTitle(s.title),
        url: 'https://www.youtube.com/watch?v=' + item.id.videoId,
        source: s.channelTitle || 'YouTube',
        time: s.publishedAt || null,
        kind: 'video',
        region: /[ऀ-ॿ]/.test(text) ? 'nepal' : 'global',
        image: 'https://i.ytimg.com/vi/' + item.id.videoId + '/hqdefault.jpg',
        avatar: avatars[s.channelId] || null,
        summary: summarize(s.description, SUMMARY_MAX)
      };
    });
}

/* Channel pictures, keyed by channel id. Never fatal: if the call fails the
   player falls back to the uploader's initials. */
async function channelAvatars(items, key) {
  const ids = [];
  items.forEach(item => {
    const id = item.snippet.channelId;
    if (id && ids.indexOf(id) === -1) ids.push(id);
  });
  if (!ids.length) return {};
  try {
    const url = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&id=' +
      ids.slice(0, 50).join(',') + '&key=' + key;
    const json = JSON.parse(await getText(url));
    const out = {};
    (json.items || []).forEach(ch => {
      const t = ch.snippet && ch.snippet.thumbnails;
      const pic = t && (t.default || t.medium || t.high);
      if (pic && pic.url) out[ch.id] = pic.url;
    });
    return out;
  } catch (err) {
    return {};
  }
}

/* ---------- helpers ---------- */

function track(errors, name) {
  return err => { errors.push(name + ': ' + err.message); return []; };
}

function onTopic(items, source, region, opts) {
  var strict = opts && opts.strict;
  return items
    .filter(item => {
      var text = item.title + ' ' + item.description;
      // On a broad wire feed, only the HEADLINE counts as real signal — a
      // passing mention buried in an unrelated live-blog's body text does
      // not make that live-blog a flood story.
      if (strict) return matches(item.title, TOPIC_STRONG) ||
        (matches(item.title, TOPIC_GENERIC) && matches(item.title, ['nepal']));
      if (matches(text, TOPIC_STRONG)) return true;
      return matches(text, TOPIC_GENERIC);
    })
    .slice(0, 8)
    .map(item => ({
      title: cleanTitle(item.title),
      url: item.link,
      source,
      time: toIso(item.pubDate, item.link),
      kind: 'press',
      region: region || 'nepal',
      image: item.image,
      summary: summarize(item.contentFull || item.description, SUMMARY_MAX)
    }));
}

const STOPWORDS = new Set([
  'the','a','an','of','in','on','at','to','for','and','or','is','are','was','were',
  'has','have','had','with','from','by','as','that','this','it','its','after','over',
  'into','than','more','least','about','amid','amidst','says','said','new','how'
]);

/**
 * No government or agency has published a total economic-loss figure for
 * this flood yet (checked directly — nothing on NDRRMA's site, nothing in
 * any newsroom pulled above). Rather than estimate one ourselves, this
 * scans every item already fetched for a real reported money figure paired
 * with a damage/loss word, in English or Nepali, and surfaces the first
 * one found, credited and linked. Returns null — not a guess — when
 * nothing has actually been reported yet.
 */
const MONEY_NEAR_LOSS = /(rs\.?|npr|usd|\$|₹)\s?[\d,.]+\s?(billion|crore|million|lakh|अर्ब|करोड|लाख)|(billion|crore|million|lakh|अर्ब|करोड|लाख)[^.]{0,25}(damage|loss|losses|क्षति|नोक्सान)|(damage|loss|losses|क्षति|नोक्सान)[^.]{0,25}(billion|crore|million|lakh|अर्ब|करोड|लाख)/i;

function findEconomicLoss(items) {
  for (const item of items) {
    const text = (item.title || '') + '. ' + (item.summary || '');
    const match = text.match(MONEY_NEAR_LOSS);
    if (match) {
      return {
        text: match[0].trim(),
        source: item.source,
        url: item.url,
        title: item.title
      };
    }
  }
  return null;
}

function significantWords(title) {
  return new Set(
    String(title || '').toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / (a.size + b.size - shared);
}

/**
 * Marks each item verified/unverified in place.
 * - Official/alert/quake items (ReliefWeb, GDACS, USGS): always verified, they are the
 *   primary source, not a report about one.
 * - Press items: verified only when a different newsroom is reporting essentially the
 *   same story (title word-overlap above threshold) within a 48h window. `corroboratedBy`
 *   lists which other sources independently carried it, so readers can see the evidence.
 */
function verify(items) {
  const words = items.map(item => significantWords(item.title));
  for (const item of items) {
    item.corroboratedBy = [];
    item.verified = item.kind === 'official' || item.kind === 'alert' || item.kind === 'quake';
  }
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind !== 'press') continue;
    const ti = items[i].time ? new Date(items[i].time).getTime() : null;
    for (let j = 0; j < items.length; j++) {
      if (i === j || items[j].source === items[i].source) continue;
      const tj = items[j].time ? new Date(items[j].time).getTime() : null;
      if (ti && tj && Math.abs(ti - tj) > 48 * 3600 * 1000) continue;
      if (jaccard(words[i], words[j]) >= 0.4) {
        if (!items[i].corroboratedBy.includes(items[j].source)) {
          items[i].corroboratedBy.push(items[j].source);
        }
      }
    }
    if (items[i].corroboratedBy.length >= 1) items[i].verified = true;
  }
}

function matches(text, words) {
  const lower = (text || '').toLowerCase();
  return words.some(word => lower.includes(word));
}

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      'accept': 'application/rss+xml, application/xml, application/json;q=0.9, */*;q=0.8',
      'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
    }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function parseRss(xml) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);

  for (const block of blocks) {
    items.push({
      title: tag(block, 'title'),
      link: tag(block, 'link'),
      description: tag(block, 'description'),
      // Many feeds carry the full article body in content:encoded; prefer it
      // so the card summary is the whole story, not a one-line teaser.
      contentFull: tag(block, 'content:encoded'),
      pubDate: tag(block, 'pubDate'),
      // Bing tags each result with the publisher that ran it
      sourceName: cleanTitle(tag(block, 'News:Source') || tag(block, 'source')),
      image: extractImage(block)
    });
  }
  return items.filter(item => item.title && item.link);
}

/** Pull a real photo out of whatever the feed carries: media tags, an enclosure, or an
 *  <img> inside the article body. Newsrooms that don't include one get no image, not a
 *  guessed one. */
function extractImage(block) {
  let match = block.match(/<media:(?:thumbnail|content)[^>]*\surl=["']([^"']+)["']/i);
  if (match) return match[1];
  match = block.match(/<enclosure[^>]*\surl=["']([^"']+)["'][^>]*\stype=["']image\/[^"']*["']/i)
       || block.match(/<enclosure[^>]*\stype=["']image\/[^"']*["'][^>]*\surl=["']([^"']+)["']/i);
  if (match) return match[1];
  match = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match) return match[1];
  return null;
}

/** Short, plain-text summary for a card, not the raw HTML/CDATA the feed carries. */
function summarize(text, max) {
  const clean = cleanTitle(text || '');
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function tag(block, name) {
  const match = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  if (!match) return '';
  return match[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function cleanTitle(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Not every feed carries a date. The Kathmandu Post publishes no pubDate but
 * does put the date in the article URL, so fall back to that. An item with no
 * recoverable date returns null and sorts last rather than posing as new.
 */
function toIso(value, url) {
  if (value) {
    const date = new Date(value);
    if (!isNaN(date)) return date.toISOString();
  }
  const fromUrl = String(url || '').match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  if (fromUrl) {
    const date = new Date(`${fromUrl[1]}-${fromUrl[2]}-${fromUrl[3]}T12:00:00+05:45`);
    if (!isNaN(date)) return date.toISOString();
  }
  return null;
}
