/* ============================================================================
   Finding a real photograph for a briefing.

   Every briefing already cites the articles it was built from. This walks
   those articles, reads the picture each newsroom chose for its own social
   card, and keeps the best one. Nothing here invents a picture: if no source
   yields a usable photograph, the caller falls back to the drawn tile.

   The outlet is credited on the picture and its article is linked from the
   briefing. These are other people's photographs, used small, credited, and
   pointing back at the article they came from.

   Downloads are cached in assets/photos/ and committed, so the hourly agent
   fetches a given article once and never again.
   ========================================================================= */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const UA = 'Mozilla/5.0 (compatible; NepalDisasterUpdateLive/1.0; +https://nepaldisasterupdatelive.nxtimaginelabs.com/about/)';

const TIMEOUT_MS = 12000;
const MIN_BYTES = 12000;          // anything smaller is a logo or a spacer
const MAX_BYTES = 6 * 1024 * 1024;

/* Outlets whose pictures are usually the event itself rather than a stock
   portrait or a studio graphic. Tried first, in this order. */
const PREFERRED = [
  'reliefweb.int', 'icimod.org', 'kathmandupost.com', 'nepalnews.com',
  'setopati.com', 'thehimalayantimes.com', 'aljazeera.com', 'bbc.',
  'reuters.com', 'apnews.com', 'france24.com', 'nepalpolice.gov.np',
];

/* Never take a picture from these. Aggregators and syndication mirrors serve
   other people's photographs with their own watermark on top. */
const BLOCKED = ['legit.ng', 'freepressjournal.in', 'webindia123.com', 'deccanherald.com'];

/* Tried last. Not blocked, because their reporting is good and sometimes they
   are the only source with a picture, but they tile a repeating watermark
   across the whole frame and it looks like a screenshot of somebody else's
   website rather than a photograph on ours. */
const WATERMARKED = ['onlinekhabar.com', 'khabarhub.com', 'ratopati.com'];

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function rank(url) {
  const h = hostOf(url);
  if (WATERMARKED.some(w => h.includes(w))) return 900;
  const i = PREFERRED.findIndex(p => h.includes(p));
  return i === -1 ? PREFERRED.length : i;
}

async function get(url, asBuffer = false) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: asBuffer ? 'image/*' : 'text/html,*/*' },
    });
    if (!res.ok) return null;
    if (asBuffer) {
      const type = (res.headers.get('content-type') || '').toLowerCase();
      if (!/^image\/(jpeg|png|webp)/.test(type)) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < MIN_BYTES || buf.length > MAX_BYTES) return null;
      return { buf, type: type.split(';')[0] };
    }
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** The picture a newsroom chose for its own link preview. */
function socialImage(html, pageUrl) {
  if (!html) return '';
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      try { return new URL(m[1].replace(/&amp;/g, '&'), pageUrl).toString(); } catch { /* skip */ }
    }
  }
  return '';
}

/** A readable name for the outlet, for the credit line on the picture.
    og:site_name is often the outlet's full legal name with a tagline after a
    dash, which is too long for a corner of a picture, so it is cut at the
    first separator rather than truncated mid-word. */
function outletName(html, url) {
  const m = html && html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (m && m[1]) {
    const name = m[1].split(/\s+[-|\u2013\u2014:]\s+/)[0].trim();
    if (name && name.length <= 34) return name;
  }
  return NICE_NAME[hostOf(url)] || hostOf(url) || '';
}

/* Falling back to a hostname gives credits like "kathmandupost", which looks
   careless next to a photograph somebody was sent to take. */
const NICE_NAME = {
  'kathmandupost.com': 'The Kathmandu Post',
  'english.onlinekhabar.com': 'Onlinekhabar',
  'onlinekhabar.com': 'Onlinekhabar',
  'english.nepalnews.com': 'Nepalnews',
  'nepalnews.com': 'Nepalnews',
  'setopati.com': 'Setopati',
  'ratopati.com': 'Ratopati',
  'khabarhub.com': 'Khabarhub',
  'thehimalayantimes.com': 'The Himalayan Times',
  'reliefweb.int': 'UN OCHA / ReliefWeb',
  'icimod.org': 'ICIMOD',
  'nepalpolice.gov.np': 'Nepal Police',
  'aljazeera.com': 'Al Jazeera',
  'reuters.com': 'Reuters',
  'apnews.com': 'AP',
  'bbc.com': 'BBC',
  'bbc.co.uk': 'BBC',
  'cnn.com': 'CNN',
  'france24.com': 'France 24',
  'business-standard.com': 'Business Standard',
  'aninews.in': 'ANI',
  'dawn.com': 'Dawn',
};

/**
 * Pick a photograph for one briefing.
 *
 * @param {{name:string,url:string}[]} sources  the briefing's own citations
 * @param {string} slug        used for the cache filename
 * @param {string} photoDir    absolute path to assets/photos
 * @returns {Promise<{file:string,type:string,credit:string,article:string}|null>}
 */
export async function photoForSources(sources, slug, photoDir) {
  mkdirSync(photoDir, { recursive: true });
  const manifestPath = join(photoDir, 'index.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : {};

  /* Already found one for this briefing, and the file is still there. */
  const cached = manifest[slug];
  if (cached && existsSync(join(photoDir, cached.file))) return cached;

  const candidates = (sources || [])
    .map(s => s && s.url)
    .filter(u => u && /^https?:/.test(u) && !BLOCKED.some(b => hostOf(u).includes(b)))
    .sort((a, b) => rank(a) - rank(b));

  for (const article of candidates) {
    const html = await get(article);
    if (!html) continue;
    const imgUrl = socialImage(html, article);
    if (!imgUrl) continue;
    const img = await get(imgUrl, true);
    if (!img) continue;

    const ext = img.type === 'image/png' ? 'png' : img.type === 'image/webp' ? 'webp' : 'jpg';
    const file = `${slug}.${ext}`;
    writeFileSync(join(photoDir, file), img.buf);
    const record = { file, type: img.type, credit: outletName(html, article), article };
    manifest[slug] = record;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    return record;
  }

  return null;
}

export function loadPhoto(slug, photoDir) {
  const manifestPath = join(photoDir, 'index.json');
  if (!existsSync(manifestPath)) return null;
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { return null; }
  const rec = manifest[slug];
  if (!rec || !existsSync(join(photoDir, rec.file))) return null;
  return rec;
}

/** The picture as a data: URI, which is how it gets into the SVG. */
export function photoDataUri(rec, photoDir) {
  const buf = readFileSync(join(photoDir, rec.file));
  return `data:${rec.type};base64,${buf.toString('base64')}`;
}
