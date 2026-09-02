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
 * Sources, in order of trust — the Feed tab offers all sources or Nepali
 * sources. Official, alert and quake items always show in both views because
 * they are primary sources, not press:
 *   Official   ReliefWeb (UN OCHA), GDACS (UN/EC), USGS
 *   Nepal      Kathmandu Post, Onlinekhabar, Ratopati, Nepalnews, Setopati,
 *              Nagarik News, Annapurna Post, Khabarhub, Nepal Police (their
 *              own site's news list, read directly — no Facebook, no API key)
 *   Global     Al Jazeera, BBC Asia, The Guardian (Nepal desk), NDTV World,
 *              France 24, Bing News aggregation
 *   Video      Direct feeds from named official YouTube channels. Search results
 *              are never used as Watch cards: an unrelated re-upload must not
 *              acquire a blue check merely because it mentioned this event.
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

const CACHE_SECONDS = 60;
/* The verified Watch list is cheap to read, so it can check often. */
const YT_FRESH_SECONDS = 60;      // 1 minute
const YT_BACKUP_SECONDS = 86400;  // 24 hours
const YT_CHANNEL_SECONDS = 30 * 24 * 60 * 60; // Channel metadata rarely changes.
/** Card summaries: keep the full text each feed publishes, cleaned to plain
 *  text, capped only to keep one card from running very long. */
const SUMMARY_MAX = 650;
const NEPAL_BOX = { minlat: 26.3, maxlat: 30.5, minlon: 80.0, maxlon: 88.3 };

/* These are channels whose ownership was checked directly. Add a channel only
   after checking its official site or verified YouTube identity. A short,
   accurate Watch list is better than a large list of anonymous re-uploads. */
const YT_TRUSTED_CHANNELS = [
  { id: 'UCMkrAY5yFo5eQ1SCj9aV28w', handle: '@NepalPoliceHQ', source: 'Nepal Police', region: 'nepal' },
  { id: 'UCFbLXmNbJzBlNoS9-t19q4Q', handle: '@NDRRMA', source: 'NDRRMA', region: 'nepal' },
  { id: 'UCTGVQIvtPu5kqNI5ABmN8Fw', handle: '@NepalTelevision', source: 'Nepal Television', region: 'nepal' },
  { id: 'UC3yDoaqQzOd1bNP74ZrGPTA', handle: '@KantipurTVHD', source: 'Kantipur TV', region: 'nepal' },
  { id: 'UCo4cuctdb-1YdZNgWEVZGwA', handle: '@onlinekhabarTV', source: 'Onlinekhabar TV', region: 'nepal' }
];

/* A Watch card needs both the affected place and the hazard. This prevents a
   general current-affairs video from appearing just because a channel wrote
   "Nepal" in its channel description. */
const VIDEO_PLACE = [
  'nepal', 'rasuwa', 'bhotekoshi', 'bhote koshi', 'trishuli', 'nuwakot',
  'timure', 'syabrubesi', 'langtang', 'gyirong', 'kyirong',
  'नेपाल', 'रसुवा', 'भोटेकोशी', 'भोटे कोशी', 'त्रिशूली', 'त्रिशुली',
  'नुवाकोट', 'तिमुरे', 'स्याफ्रुबेसी'
];
const VIDEO_HAZARD = [
  'flood', 'flash flood', 'glacial lake', 'landslide', 'avalanche', 'disaster',
  'बाढी', 'पहिरो', 'हिमताल', 'विपद्'
];
const VIDEO_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;

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
/* A hazard word is enough on its own for a Nepali newsroom: a flood or a
   landslide story there is this story or one like it. */
const TOPIC_HAZARD = [
  'flood', 'nuwakot', 'avalanche', 'landslide', 'inundat', 'swept',
  'rescue', 'disaster', 'relief', 'evacuat', 'hydropower',
  'बाढी', 'न्वाकोट', 'नुवाकोट', 'पहिरो', 'उद्धार', 'विपद्', 'राहत'
];
/* A casualty word is not. Every newsroom prints "died" and "missing" all day
   about traffic and crime, and those were landing in a flood feed. It counts
   only next to a place or a hazard. */
const TOPIC_CASUALTY = ['missing', 'बेपत्ता', 'मृत्यु', 'शव', 'घाइते'];
const TOPIC_GENERIC = TOPIC_HAZARD.concat(TOPIC_CASUALTY);
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
    fetchHimalayanTimes().catch(track(errors, 'himalayantimes')),
    fetchRisingNepal().catch(track(errors, 'risingnepal')),
    fetchNepalMinute().catch(track(errors, 'nepalminute')),
    fetchOnlinekhabarNepali().catch(track(errors, 'onlinekhabar-ne')),
    fetchAlJazeera().catch(track(errors, 'aljazeera')),
    fetchBbcAsia().catch(track(errors, 'bbc')),
    fetchGuardianNepal().catch(track(errors, 'guardian')),
    fetchNdtvWorld().catch(track(errors, 'ndtv')),
    fetchFrance24().catch(track(errors, 'france24')),
    fetchBingNews().catch(track(errors, 'bing')),
    loadPoliceNews().catch(track(errors, 'nepalpolice')),
    fetchYoutube(env, request, context).catch(track(errors, 'youtube'))
  ]);

  // The YouTube result carries its own check timestamp. Keep its items in the
  // normal feed pipeline so Watch can show whether a clip is old because its
  // publisher has not posted, not because this site stopped checking.
  const youtubeIndex = groups.length - 1;
  const youtubeFeed = normalizeYoutubeFeed(groups[youtubeIndex]);
  groups[youtubeIndex] = youtubeFeed.items;

  const seen = new Set();
  let items = [];

  for (const group of groups) {
    for (const item of group) {
      const safeItem = sanitizeItemUrls(item);
      if (!safeItem || !safeItem.title || !safeItem.url) continue;
      if (FLUFF.test(safeItem.title)) continue;
      // \p{L}/\p{N} (Unicode letter/number) rather than a-z0-9, so Devanagari
      // titles (Setopati, Nepal Police, ...) don't all collapse to the same
      // empty key and silently dedupe each other down to one survivor.
      const key = safeItem.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(safeItem);
    }
  }

  items.sort(byTimeDesc);

  verify(items);
  items = cluster(items);
  tagAuthority(items);

  /* The Watch tab is a grid people scroll, so it gets the whole de-duplicated
     result rather than the first screenful. Every returned item stays in
     strict newest-first order; source priority must never put an older item
     above a newer one. */
  const videos = items.filter(i => i.kind === 'video').slice(0, 150);
  const newestVideo = videos.slice().sort(byTimeDesc)[0] || null;
  const liveItems = items
    .filter(i => i.kind !== 'video')
    .sort(byTimeDesc)
    .slice(0, 100);
  const finalItems = liveItems.concat(videos).sort(byTimeDesc);

  await backfillImages(finalItems, 14);

  const updated = new Date().toISOString();
  const response = new Response(JSON.stringify({
    updated,
    items: finalItems,
    videoFeed: {
      provider: 'YouTube verified channels',
      checkedAt: youtubeFeed.checkedAt,
      newestAt: newestVideo && newestVideo.time ? newestVideo.time : null,
      count: videos.length,
      showingBackup: youtubeFeed.showingBackup,
      configured: youtubeFeed.configured,
      unavailable: youtubeFeed.unavailable,
      issues: youtubeFeed.issues,
      mode: 'verified-channels',
      channels: youtubeFeed.channels,
      considered: youtubeFeed.considered,
      rejected: youtubeFeed.rejected
    },
    economicLoss: findEconomicLoss(finalItems),
    reliefFund: findReliefFund(finalItems),
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

/** Newest first. Items with no usable timestamp sort last rather than posing
 *  as new. */
export function byTimeDesc(a, b) {
  const at = a.time ? new Date(a.time).getTime() : -Infinity;
  const bt = b.time ? new Date(b.time).getTime() : -Infinity;
  return bt - at;
}

/* Who published it, and how much weight that carries.
   - 'primary'  the body the figure actually comes from
   - 'trusted'  an established newsroom with an editor and a masthead
   - anything else gets no mark at all, rather than a mark that means nothing. */
const PRIMARY_SOURCES = [
  'Nepal Police', 'Nepal Army', 'NDRRMA', 'ReliefWeb (UN OCHA)',
  'GDACS (UN / EC)', 'USGS', 'ICIMOD'
];
const TRUSTED_SOURCES = [
  'Kathmandu Post', 'Onlinekhabar', 'Setopati', 'Nagarik News', 'Annapurna Post',
  'Nepalnews', 'Ratopati', 'Khabarhub', 'The Himalayan Times', 'The Rising Nepal',
  'Nepal Minute', 'Onlinekhabar (Nepali)', 'Nepal Television', 'Al Jazeera',
  'BBC News', 'The Guardian', 'NDTV', 'France 24', 'Reuters', 'Associated Press',
  'AFP'
];

/** Order the pinned block: the body that issued the figure first, then the
 *  other primary sources, newest first inside each step. */
function byPinRank(a, b) {
  const rank = item => {
    if (item.source === 'Nepal Police') return 0;
    if (PRIMARY_SOURCES.indexOf(item.source) !== -1) return 1;
    return 2;
  };
  return rank(a) - rank(b) || byTimeDesc(a, b);
}

function tagAuthority(items) {
  for (const item of items) {
    item.authority = PRIMARY_SOURCES.indexOf(item.source) !== -1 ? 'primary'
      : TRUSTED_SOURCES.indexOf(item.source) !== -1 ? 'trusted'
      : 'other';
  }
}

/** At most `max` items from any one source. Used on the pinned block so a
 *  single agency's document dump cannot own the top of the feed. */
function capPerSource(items, max) {
  const count = {};
  const out = [];
  for (const item of items) {
    const n = (count[item.source] || 0) + 1;
    count[item.source] = n;
    if (n <= max) out.push(item);
  }
  return out;
}

/* Numbers are what make two flood stories the same story. "469" in a Nepali
   headline is written ४६९, so both are folded to the same digits first. */
export function keyNumbers(title) {
  const latin = String(title || '').replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
  return new Set((latin.match(/\d{2,}/g) || []).filter(n => n.length >= 2));
}

/** Is the headline written in Devanagari? Used to keep the Nepali and English
 *  versions of one story as two cards, one for each set of readers. */
function devanagari(text) {
  return /[\u0900-\u097F]/.test(String(text || ''));
}

/** Names this event specifically, in either script. */
function onSameEvent(title) {
  return matches(String(title || '').toLowerCase(), TOPIC_STRONG);
}

export function sharedCount(a, b) {
  let n = 0;
  for (const v of a) if (b.has(v)) n++;
  return n;
}

/**
 * Folds the same story, reported by several newsrooms, into one card.
 *
 * Ten outlets carrying "death toll reaches 469" is one piece of news, not ten,
 * and printing it ten times made the feed look like a single source repeating
 * itself. The survivor is the version with a photograph, from the most
 * authoritative outlet, newest; the others become `alsoReported`, which is a
 * better trust signal than ten near-identical cards anyway.
 *
 * Only press items are folded. A police bulletin and a newspaper's write-up of
 * it are different things and both stay.
 */
function cluster(items) {
  const words = items.map(item => significantWords(item.title));
  const numbers = items.map(item => keyNumbers(item.title));
  const used = new Array(items.length).fill(false);
  const out = [];

  const sameStory = (i, j) => {
    const ti = items[i].time ? new Date(items[i].time).getTime() : null;
    const tj = items[j].time ? new Date(items[j].time).getTime() : null;
    if (ti && tj && Math.abs(ti - tj) > 12 * 3600 * 1000) return false;
    const overlap = jaccard(words[i], words[j]);
    if (overlap >= 0.42) return true;
    if (!sharedCount(numbers[i], numbers[j])) return false;
    if (overlap >= 0.15) return true;
    // Six Nepali headlines all carrying "४६९" are the same bulletin written six
    // ways, and word overlap barely fires across short Devanagari words. The
    // shared figure plus the same place name is enough. Only within one
    // script: the English write-up of a Nepali story is not a duplicate of it,
    // it is the version most readers here can read.
    return devanagari(items[i].title) === devanagari(items[j].title) &&
      onSameEvent(items[i].title) && onSameEvent(items[j].title);
  };

  for (let i = 0; i < items.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    if (items[i].kind !== 'press') { out.push(items[i]); continue; }

    const group = [items[i]];
    for (let j = i + 1; j < items.length; j++) {
      if (used[j] || items[j].kind !== 'press') continue;
      if (!group.some(member => sameStory(items.indexOf(member), j))) continue;
      used[j] = true;
      group.push(items[j]);
    }

    const score = item => (item.image ? 4 : 0) +
      (PRIMARY_SOURCES.indexOf(item.source) !== -1 ? 3 : 0) +
      (TRUSTED_SOURCES.indexOf(item.source) !== -1 ? 2 : 0) +
      ((item.summary || '').length > 200 ? 1 : 0);

    const best = group.slice().sort((a, b) => score(b) - score(a) || byTimeDesc(a, b))[0];
    const others = [];
    for (const member of group) {
      if (member === best) continue;
      if (member.source === best.source) continue;
      if (others.some(o => o.name === member.source)) continue;
      others.push({ name: member.source, url: member.url });
    }
    best.alsoReported = others;
    if (others.length) {
      best.verified = true;
      best.corroboratedBy = others.map(o => o.name);
    }
    out.push(best);
  }
  return out;
}

/**
 * A card with two lines of text and no picture looks like a stub. Feeds that
 * publish no image still have one on the article page, so for the first few
 * cards, and only those, the article's own link-preview image is read and
 * used. Anything slow, missing or not an image is skipped: no placeholder and
 * no guessed picture.
 */
async function backfillImages(items, limit) {
  const targets = items
    .filter(item => item.kind === 'press' && !item.image && item.url)
    .slice(0, limit);
  if (!targets.length) return;

  await Promise.all(targets.map(async item => {
    try {
      const res = await fetch(item.url, {
        headers: {
          'accept': 'text/html',
          'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
        },
        signal: AbortSignal.timeout(3500)
      });
      if (!res.ok) return;
      const html = (await res.text()).slice(0, 120000);
      const found =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
      if (!found) return;
      const url = decodeEntities(found[1]).trim();
      if (/^https?:\/\//i.test(url)) item.image = url;
    } catch (e) {
      /* an image is a nice-to-have; the card still works without one */
    }
  }));
}

/**
 * Keeps one newsroom from stacking up in the feed. A paper that publishes six
 * stories in the same minute used to fill the whole first screen, which reads
 * as spam rather than as coverage. This walks the time-ordered list and, at
 * each slot, takes the newest item whose source is not the one just placed.
 * Only the order changes; nothing is dropped and nothing is merged, so every
 * story is still one card with its own link.
 */
export function spread(items) {
  const pool = items.slice();
  const out = [];
  let lastSource = null;
  while (pool.length) {
    let pick = pool.findIndex(i => i.source !== lastSource);
    if (pick === -1) pick = 0;          // only one source left, keep going
    const [item] = pool.splice(pick, 1);
    out.push(item);
    lastSource = item.source;
  }
  return out;
}

/* ---------- sources ---------- */

/** ReliefWeb's public RSS, narrowed to Nepal (C170 is Nepal in their taxonomy). */
async function fetchReliefWeb() {
  const xml = await getText('https://reliefweb.int/updates/rss.xml?advanced-search=%28C170%29');
  // The RSS view ignores the country filter, so narrow it here instead.
  // A regional bulletin that merely mentions Nepal in its body ("Asia and the
  // Pacific: snapshot of El Nino") is not Nepal news, and it was crowding out
  // the real updates, so the country has to be in the headline itself.
  return parseRss(xml)
    .filter(item => matches(item.title, PLACE))
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

async function fetchHimalayanTimes() {
  const xml = await getText('https://thehimalayantimes.com/rssFeed/11');
  return onTopic(parseRss(xml), 'The Himalayan Times', 'nepal');
}

async function fetchRisingNepal() {
  const xml = await getText('https://risingnepaldaily.com/rss');
  return onTopic(parseRss(xml), 'The Rising Nepal', 'nepal');
}

async function fetchNepalMinute() {
  const xml = await getText('https://www.nepalminute.com/feed');
  return onTopic(parseRss(xml), 'Nepal Minute', 'nepal');
}

/* Onlinekhabar's Nepali edition. Its English site is a different newsroom
   output with a different story list, so both are worth reading. */
async function fetchOnlinekhabarNepali() {
  const xml = await getText('https://www.onlinekhabar.com/feed');
  return onTopic(parseRss(xml), 'Onlinekhabar (Nepali)', 'nepal');
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
 * Resolve each fixed, verified channel ID once, then read its uploads playlist
 * through YouTube's supported API. This replaces broad searches whose random
 * re-uploads were making Watch stale and unreliable.
 */
async function fetchYoutube(env, request, context) {
  const key = env && env.YOUTUBE_API_KEY;
  if (!key) return normalizeYoutubeFeed({
    items: [],
    checkedAt: new Date().toISOString(),
    configured: false,
    channels: YT_TRUSTED_CHANNELS.map(channel => channel.source)
  });

  const cache = caches.default;
  const base = request.url;
  const freshKey  = new Request(new URL('/__cache/youtube-trusted-v1-fresh', base).toString());
  const backupKey = new Request(new URL('/__cache/youtube-trusted-v1-backup', base).toString());

  const hit = await cache.match(freshKey);
  if (hit) return normalizeYoutubeFeed(await hit.json());

  try {
    const feed = await fetchTrustedYoutube(key, request, context);
    const result = {
      items: feed.items,
      checkedAt: new Date().toISOString(),
      showingBackup: false,
      configured: true,
      unavailable: false,
      issues: feed.issues,
      channels: YT_TRUSTED_CHANNELS.map(channel => channel.source)
    };
    context.waitUntil(cache.put(freshKey, cachedJson(result, YT_FRESH_SECONDS)));
    if (feed.items.length) {
      context.waitUntil(cache.put(backupKey, cachedJson(result, YT_BACKUP_SECONDS)));
    }
    return result;
  } catch (err) {
    // Show the last good verified list rather than unrelated search results.
    const old = await cache.match(backupKey);
    if (old) return { ...normalizeYoutubeFeed(await old.json()), showingBackup: true, unavailable: true };
    return normalizeYoutubeFeed({
      items: [],
      checkedAt: new Date().toISOString(),
      configured: true,
      unavailable: true,
      issues: [],
      channels: YT_TRUSTED_CHANNELS.map(channel => channel.source)
    });
  }
}

function normalizeYoutubeFeed(value) {
  if (Array.isArray(value)) {
    return {
      items: value,
      checkedAt: null,
      showingBackup: false,
      configured: true,
      unavailable: false,
      issues: [],
      channels: [],
      considered: value.length,
      rejected: []
    };
  }
  if (!value || !Array.isArray(value.items)) {
    return {
      items: [],
      checkedAt: null,
      showingBackup: false,
      configured: true,
      unavailable: false,
      issues: [],
      channels: [],
      considered: 0,
      rejected: []
    };
  }
  return {
    items: value.items,
    checkedAt: value.checkedAt || value.searchedAt || null,
    showingBackup: Boolean(value.showingBackup),
    configured: value.configured !== false,
    unavailable: Boolean(value.unavailable),
    issues: Array.isArray(value.issues) ? value.issues.slice(0, YT_TRUSTED_CHANNELS.length) : [],
    channels: Array.isArray(value.channels) ? value.channels : [],
    considered: Number.isFinite(value.considered) ? value.considered : 0,
    rejected: Array.isArray(value.rejected) ? value.rejected.slice(0, 5) : []
  };
}

function cachedJson(data, seconds) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, s-maxage=${seconds}`
    }
  });
}

async function fetchTrustedYoutube(key, request, context) {
  const settled = await Promise.allSettled(YT_TRUSTED_CHANNELS.map(async channel => {
    const identity = await resolveYoutubeChannel(channel, key, request, context);
    return fetchYoutubePlaylist(identity, channel, key);
  }));

  const parsed = settled
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);
  const videos = parsed.filter(video => isVideoOnTopic(video));
  if (!settled.some(result => result.status === 'fulfilled')) {
    const reasons = settled
      .filter(result => result.status === 'rejected')
      .map(result => result.reason && result.reason.message)
      .filter(Boolean);
    throw new Error('verified YouTube feeds returned no matching videos' +
      (reasons.length ? ': ' + reasons.join('; ').slice(0, 160) : ''));
  }

  const seen = new Set();
  const items = videos.filter(video => {
    const id = String(video.url || '').match(/[?&]v=([\w-]{6,15})/);
    if (!id || seen.has(id[1])) return false;
    seen.add(id[1]);
    return true;
  }).sort(byTimeDesc);
  const issues = settled.flatMap((result, index) => result.status === 'rejected'
    ? [YT_TRUSTED_CHANNELS[index].source + ' is temporarily unavailable'] : []);
  /* A channel that answers with videos none of which are about this event
     looks exactly like a channel that answered with nothing: no error, no
     items, an empty Watch tab. These two numbers separate the two cases in
     the response itself, so the next person does not have to guess. */
  const rejected = parsed
    .filter(video => !isVideoOnTopic(video))
    .slice(0, 5)
    .map(video => video.source + ': ' + video.title);
  return { items, issues, considered: parsed.length, rejected };
}

async function resolveYoutubeChannel(channel, key, request, context) {
  const cache = caches.default;
  const base = request.url;
  const cacheName = channel.id;
  const cacheKey = new Request(new URL('/__cache/youtube-channel-' + cacheName + '-v1', base).toString());
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();

  const url = 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet,contentDetails&id=' +
    encodeURIComponent(channel.id) + '&key=' + encodeURIComponent(key);
  const json = JSON.parse(await getText(url));
  const found = json.items && json.items[0];
  if (!found || found.id !== channel.id) throw new Error('trusted channel not found: ' + channel.handle);
  const uploads = found.contentDetails && found.contentDetails.relatedPlaylists &&
    found.contentDetails.relatedPlaylists.uploads;
  if (!uploads) throw new Error('trusted channel has no uploads playlist: ' + channel.handle);

  const thumbnails = found.snippet && found.snippet.thumbnails;
  const picture = thumbnails && (thumbnails.default || thumbnails.medium || thumbnails.high);
  const identity = {
    id: found.id,
    uploads,
    avatar: picture && picture.url ? picture.url : null
  };
  const saved = cache.put(cacheKey, cachedJson(identity, YT_CHANNEL_SECONDS));
  if (context && typeof context.waitUntil === 'function') context.waitUntil(saved);
  else await saved;
  return identity;
}

/** Read the uploads playlist for an immutable, verified channel ID. Unlike the
 * retired public Atom endpoint, this is the supported YouTube API path. */
async function fetchYoutubePlaylist(identity, channel, key) {
  const url = 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails' +
    '&maxResults=25&playlistId=' + encodeURIComponent(identity.uploads) +
    '&key=' + encodeURIComponent(key);
  const json = JSON.parse(await getText(url));
  return parseYoutubePlaylist(json, channel, identity);
}

export function parseYoutubePlaylist(json, channel, identity) {
  const out = [];
  for (const entry of json && Array.isArray(json.items) ? json.items : []) {
    const snippet = entry && entry.snippet ? entry.snippet : {};
    const videoId = entry && entry.contentDetails && entry.contentDetails.videoId ||
      snippet.resourceId && snippet.resourceId.videoId;
    if (!/^[\w-]{6,15}$/.test(videoId || '')) continue;
    const title = cleanVideoTitle(snippet.title);
    if (!title) continue;
    if (/^(private|deleted) video$/i.test(title)) continue;
    const published = entry.contentDetails && entry.contentDetails.videoPublishedAt || snippet.publishedAt;
    out.push({
      title,
      url: 'https://www.youtube.com/watch?v=' + videoId,
      source: channel.source,
      time: toIso(published),
      kind: 'video',
      region: channel.region,
      image: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
      avatar: identity && identity.avatar ? identity.avatar : null,
      summary: summarize(snippet.description, SUMMARY_MAX),
      sourceVerified: true
    });
  }
  return out;
}

export function isVideoOnTopic(video, now = Date.now()) {
  const text = (video.title || '') + ' ' + (video.summary || '');
  if (!matches(text, VIDEO_PLACE) || !matches(text, VIDEO_HAZARD)) return false;
  const published = video.time ? new Date(video.time).getTime() : NaN;
  return !Number.isFinite(published) || published >= now - VIDEO_MAX_AGE_MS;
}

/* YouTube titles are often a real headline followed by a wall of hashtags, or
   nothing but hashtags. Strip the hashtag run off the end; if that leaves
   nothing, turn the hashtags themselves into readable words so the card is
   not a blank line. */
function cleanVideoTitle(raw) {
  const text = cleanTitle(raw);
  const trimmed = text.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, '').trim();
  if (trimmed.length >= 12) return trimmed.replace(/\s*[|\-–]\s*$/, '').trim();

  const words = (text.match(/#[\p{L}\p{N}_]+/gu) || [])
    .map(tag => tag.slice(1).replace(/[_]+/g, ' ').trim())
    .filter(Boolean);
  const seen = new Set();
  const kept = [];
  for (const word of words) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(word);
    if (kept.length === 5) break;
  }
  const rebuilt = kept.join(', ');
  if (!rebuilt) return text.slice(0, 90);
  return rebuilt.charAt(0).toUpperCase() + rebuilt.slice(1);
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
      if (matches(text, TOPIC_HAZARD)) return true;
      return matches(text, TOPIC_CASUALTY) && matches(text, PLACE);
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
const AMOUNT = '(?:rs\\.?|npr|usd|us\\$|\\$|₹)\\s?[\\d,.]+\\s?(?:billion|bn|crore|million|lakh|trillion|अर्ब|करोड|लाख)?';

/* A money figure only counts as damage if a damage word sits right next to
   it. Without that test the first "Rs 1.1 million donated to the relief
   fund" headline was being shown as the cost of the disaster, which is the
   opposite of a loss. Donation, pledge, fund and aid wording is thrown out
   even when a damage word also appears in the sentence. */
const DAMAGE_WORD = /(damage|damages|destroyed|destruction|loss|losses|worth of damage|क्षति|नोक्सान)/i;
const MONEY_WORD  = /(donat|donation|contribut|pledg|relief fund|aid|grant|assistance|support|raised|collected|budget|allocat|releas|सहयोग|अनुदान|राहत कोष|दान)/i;

const MONEY_NEAR_DAMAGE = new RegExp(
  `${AMOUNT}[^.]{0,40}(?:damage|destroyed|destruction|loss|losses|क्षति|नोक्सान)` +
  `|(?:damage|destroyed|destruction|loss|losses|क्षति|नोक्सान)[^.]{0,40}${AMOUNT}`, 'i');

const MONEY_NEAR_RELIEF = new RegExp(
  `${AMOUNT}[^.]{0,40}(?:relief fund|disaster fund|for relief|in aid|assistance|राहत कोष)` +
  `|(?:relief fund|disaster fund|released|allocated|pledged|donated|राहत कोष)[^.]{0,40}${AMOUNT}`, 'i');

/* Rank by size, so a real headline total wins over a single small donation
   that happens to be mentioned first. */
const SCALE = { trillion: 1e12, billion: 1e9, bn: 1e9, अर्ब: 1e9, crore: 1e7, करोड: 1e7, million: 1e6, lakh: 1e5, लाख: 1e5 };

function magnitude(text) {
  const m = String(text).match(/([\d,.]+)\s?(trillion|billion|bn|crore|million|lakh|अर्ब|करोड|लाख)?/i);
  if (!m) return 0;
  const n = parseFloat(String(m[1]).replace(/,/g, '')) || 0;
  return n * (SCALE[String(m[2] || '').toLowerCase()] || 1);
}

function scanMoney(items, pattern, reject) {
  let best = null;
  for (const item of items) {
    const text = (item.title || '') + '. ' + (item.summary || '');
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (reject && reject.test(sentence)) continue;
      const match = sentence.match(pattern);
      if (!match) continue;
      const found = {
        text: match[0].trim(),
        size: magnitude(match[0]),
        source: item.source,
        url: item.url,
        title: item.title
      };
      if (!best || found.size > best.size) best = found;
    }
  }
  return best;
}

/** Cost of the damage. Never a donation. */
function findEconomicLoss(items) {
  return scanMoney(items, MONEY_NEAR_DAMAGE, MONEY_WORD);
}

/** Money released or pledged for relief. The other side of the ledger. */
function findReliefFund(items) {
  return scanMoney(items, MONEY_NEAR_RELIEF, DAMAGE_WORD);
}

export function significantWords(title) {
  return new Set(
    String(title || '').toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

export function jaccard(a, b) {
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
    item.verified = Boolean(item.sourceVerified) || item.kind === 'official' ||
      item.kind === 'alert' || item.kind === 'quake';
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

export async function getText(url) {
  const safeUrl = safeHttpsUrl(url);
  if (!safeUrl) throw new Error('refused non-HTTPS upstream URL');
  const res = await fetch(safeUrl, {
    signal: AbortSignal.timeout(12000),
    headers: {
      'accept': 'application/rss+xml, application/xml, application/json;q=0.9, */*;q=0.8',
      'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
    }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

/** Never send an upstream-controlled URL straight to a browser card. */
export function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.toString() : null;
  } catch (_) {
    return null;
  }
}

function sanitizeItemUrls(item) {
  if (!item || typeof item !== 'object') return null;
  const url = safeHttpsUrl(item.url);
  if (!url) return null;
  return {
    ...item,
    url,
    image: safeHttpsUrl(item.image),
    avatar: safeHttpsUrl(item.avatar)
  };
}

export function parseRss(xml) {
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
export function extractImage(block) {
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
export function summarize(text, max) {
  const clean = cleanTitle(text || '');
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function tag(block, name) {
  const match = block.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i'));
  if (!match) return '';
  return match[1].replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…')
    .replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018')
    .replace(/&ldquo;/g, '\u201c').replace(/&rdquo;/g, '\u201d')
    .replace(/&mdash;/g, ', ').replace(/&ndash;/g, '-')
    .replace(/&#(\d+);/g, (m, n) => {
      const code = Number(n);
      return code > 31 && code < 1114111 ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&amp;/g, '&');
}

/* Decode first, then strip tags, then decode again. Some feeds double-encode,
   so a single pass in the wrong order leaves visible markup in the card. */
export function cleanTitle(text) {
  let out = decodeEntities(String(text || ''));
  out = out.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  out = decodeEntities(out).replace(/<[^>]+>/g, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Not every feed carries a date. The Kathmandu Post publishes no pubDate but
 * does put the date in the article URL, so fall back to that. An item with no
 * recoverable date returns null and sorts last rather than posing as new.
 */
export function toIso(value, url) {
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
