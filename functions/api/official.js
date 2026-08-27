/**
 * GET /api/official
 *
 * Checks NDRRMA's own site (ndrrma.gov.np) for the newest press note or
 * publication that matches this flood, so the moment they index a new
 * situation report there, this site can point straight at the real PDF —
 * no manual re-checking needed.
 *
 * NDRRMA distributes numbered "Sthiti Pratibedan" (situation report) PDFs
 * fast, often to press/social channels first; their own site's structured
 * API can lag behind that by hours. This endpoint is the automatic side of
 * that gap: it watches for the moment the gap closes.
 *
 * Response shape:
 *   { updated, latest: { title, titleNe, date, pdf, kind } | null, errors: [] }
 */

const NDRRMA = 'https://ndrrma.gov.np/api/v1';
const CACHE_SECONDS = 900;

const KEYWORDS = [
  'rasuwa', 'bhotekoshi', 'bhote koshi', 'trishuli', 'timure', 'syabrubesi',
  'flood', 'sthiti', 'situation', 'baadhi', 'badhi',
  'रसुवा', 'भोटेकोशी', 'त्रिशूली', 'बाढी', 'स्थिति प्रतिवेदन'
];

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  let candidates = [];

  const [pressNotes, publications] = await Promise.all([
    getJson(`${NDRRMA}/pressnotenews/press-note/?limit=20`).catch(e => { errors.push('pressnote: ' + e.message); return null; }),
    getJson(`${NDRRMA}/publication/publications/?limit=20&ordering=-id`).catch(e => { errors.push('publication: ' + e.message); return null; })
  ]);

  if (pressNotes) candidates.push(...(pressNotes.results || []).map(row => normalise(row, 'press-note')));
  if (publications) candidates.push(...(publications.results || []).map(row => normalise(row, 'publication')));

  candidates = candidates
    .filter(item => item.title && matches(item.title + ' ' + item.titleNe, KEYWORDS))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    latest: candidates[0] || null,
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

function normalise(row, kind) {
  return {
    title: cleanTitle(row.title),
    titleNe: cleanTitle(row.title_ne),
    date: row.date || null,
    pdf: row.pdffile || row.file || null,
    kind
  };
}

function matches(text, words) {
  const lower = (text || '').toLowerCase();
  return words.some(word => lower.includes(word.toLowerCase()));
}

function cleanTitle(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      'accept': 'application/json',
      'user-agent': 'nepaldisasterupdatelive.nxtimaginelabs.com (hello@nxtimaginelabs.com)'
    }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
