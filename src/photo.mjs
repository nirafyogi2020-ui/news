/* ============================================================================
   Finding a real photograph for a briefing.

   Every briefing already cites the articles it was built from. This walks
   those articles, reads the picture each newsroom chose for its own social
   card, and keeps the best one. Nothing here invents a picture: if no source
   yields a usable photograph, the caller falls back to the drawn tile.

   The outlet is credited on the picture and its article is linked from the
   briefing. These are other people's photographs, used small, credited, and
   pointing back at the article they came from.

   Downloads are cached in assets/photos/ and committed, so the scheduled job
   fetches a given article once and never again.
   ========================================================================= */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* The pictures are shown 400 px wide on a card, yet newsrooms publish them at
   3,000 px and 4 MB. Each download is cut down to MAX_PHOTO_WIDTH and saved as
   a JPEG. resvg, the same rasteriser that draws the share pictures, decodes
   the download and scales it; it only writes PNG, so the small pure-JS
   jpeg-js encoder turns its pixels into a JPEG. If either is missing the
   picture is kept as it came, which is what happened before. */
let Resvg = null;
let jpeg = null;
try { ({ Resvg } = await import('@resvg/resvg-js')); } catch { Resvg = null; }
try { jpeg = (await import('jpeg-js')).default; } catch { jpeg = null; }

export const MAX_PHOTO_WIDTH = 1400;
export const PHOTO_QUALITY = 82;

/* A second, card-sized copy of each photograph. The cards are 300 to 640 CSS
   pixels wide, so a 1,400 px file is three to four times the bytes a phone
   can show; the 800 px copy covers a 400 px card on a 2x screen and a 640 px
   card on a laptop, and the browser picks between the two through srcset.
   The full-size file stays for the wide lead pictures and the share images. */
export const CARD_PHOTO_WIDTH = 800;

const UA = 'Mozilla/5.0 (compatible; NepalDisasterUpdateLive/1.0; +https://nepaldisasterupdatelive.nxtimaginelabs.com/about/)';

const TIMEOUT_MS = 12000;
const MIN_BYTES = 12000;          // anything smaller is a logo or a spacer
const MAX_BYTES = 6 * 1024 * 1024;

/** Width and height read from the file header, or null when it is not a
    picture format this understands. */
export function imageSize(buf) {
  if (!buf || buf.length < 30) return null;
  /* PNG: the IHDR chunk is always first. */
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  /* JPEG: walk the segments to the first start-of-frame marker. */
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  }
  /* WebP: RIFF container with one of three bitstream headers. */
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8X') return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/**
 * Cut a downloaded picture down to card size.
 *
 * Anything wider than MAX_PHOTO_WIDTH is scaled down; a PNG of any size is
 * re-encoded as a JPEG, since a photograph stored as PNG is several times the
 * weight for nothing a reader can see. WebP is left alone: resvg does not
 * decode it. When the tools are not installed the input comes back unchanged.
 *
 * @returns {{buf:Buffer,type:string}}
 */
export function shrinkPhoto(buf, type, maxWidth = MAX_PHOTO_WIDTH, quality = PHOTO_QUALITY) {
  const asIs = { buf, type };
  if (!Resvg || !jpeg) return asIs;
  if (type !== 'image/jpeg' && type !== 'image/png') return asIs;
  const size = imageSize(buf);
  if (!size || !size.width || !size.height) return asIs;
  if (size.width <= maxWidth && type === 'image/jpeg') return asIs;

  const width = Math.min(size.width, maxWidth);
  const height = Math.max(1, Math.round(size.height * width / size.width));
  /* The white rectangle underneath is for transparent PNGs: JPEG has no
     alpha, and without it the clear parts would come out black. */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
    + `<rect width="${width}" height="${height}" fill="#fff"/>`
    + `<image href="data:${type};base64,${buf.toString('base64')}" width="${width}" height="${height}" preserveAspectRatio="none"/>`
    + '</svg>';
  try {
    const rendered = new Resvg(svg).render();
    const out = jpeg.encode({ data: Buffer.from(rendered.pixels), width: rendered.width, height: rendered.height }, quality);
    if (!out || !out.data || out.data.length < 1000) return asIs;
    return { buf: Buffer.from(out.data), type: 'image/jpeg' };
  } catch {
    return asIs;
  }
}

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
    const raw = await get(imgUrl, true);
    if (!raw) continue;
    const img = shrinkPhoto(raw.buf, raw.type);

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

/** The card-sized copy's filename: "name.jpg" -> "name-800.jpg". */
export function cardVariantName(file) {
  return String(file).replace(/\.(jpe?g|png|webp)$/i, '') + `-${CARD_PHOTO_WIDTH}.jpg`;
}

/**
 * Write the card-sized copy of every photograph the manifest names, and
 * record its name and the original's size in the manifest, so the renderers
 * can write a srcset without opening the files.
 *
 * Skipped when the copy exists and is at least as new as its source, so a
 * routine build does no picture work. A photograph already at or under the
 * card width, or a WebP (resvg does not decode it), gets no copy and the
 * card shows the file as it is. Returns the number of copies written.
 */
export function ensureCardVariants(photoDir) {
  const manifestPath = join(photoDir, 'index.json');
  if (!existsSync(manifestPath)) return 0;
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { return 0; }
  let changed = false;
  let written = 0;
  for (const rec of Object.values(manifest)) {
    if (!rec || !rec.file) continue;
    const src = join(photoDir, rec.file);
    if (!existsSync(src)) continue;
    const buf = readFileSync(src);
    const size = imageSize(buf);
    if (!size || !size.width) continue;
    if (rec.width !== size.width || rec.height !== size.height) {
      rec.width = size.width; rec.height = size.height; changed = true;
    }
    const wants = size.width > CARD_PHOTO_WIDTH && rec.type !== 'image/webp' && Resvg && jpeg;
    if (!wants) {
      if (rec.card) { delete rec.card; changed = true; }
      continue;
    }
    const name = cardVariantName(rec.file);
    const out = join(photoDir, name);
    /* A fresh checkout writes every file within the same second, so a copy
       only counts as stale when its source is clearly newer. */
    const stale = !existsSync(out) || statSync(src).mtimeMs > statSync(out).mtimeMs + 5000;
    if (stale) {
      const small = shrinkPhoto(buf, rec.type, CARD_PHOTO_WIDTH);
      if (small.buf === buf) continue;
      writeFileSync(out, small.buf);
      written++;
    }
    if (rec.card !== name) { rec.card = name; changed = true; }
  }
  if (changed) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return written;
}

/**
 * The srcset for a card picture: the card-sized copy and the full file, each
 * with its width, or an empty string when there is only one file. `url`
 * turns a filename into the address the page uses (versioned or not).
 */
export function photoSrcset(rec, url = name => '/assets/photos/' + name) {
  if (!rec || !rec.card || !rec.width) return '';
  return `${url(rec.card)} ${CARD_PHOTO_WIDTH}w, ${url(rec.file)} ${rec.width}w`;
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
