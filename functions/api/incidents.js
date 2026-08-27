/**
 * GET /api/incidents
 *
 * Nepal's own official incident log, from the BIPAD portal run by the
 * National Disaster Risk Reduction and Management Authority (NDRRMA).
 * This is government open data: verified, approved incident records with
 * place, date, hazard type and casualty counts.
 *
 * Fetched server-side so the browser is not blocked by CORS, and so the
 * portal is hit once per cache window rather than once per visitor.
 *
 * Response shape:
 *   { updated, items: [ { title, titleNe, hazard, date, lat, lng,
 *                         dead, missing, injured, url } ], errors: [] }
 */

const BIPAD = 'https://bipadportal.gov.np/api/v1';
const CACHE_SECONDS = 300;
const WINDOW_DAYS = 21;
const MAX_ITEMS = 40;
const LOSS_LOOKUPS = 24;

let hazardCache = null;

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  let items = [];

  try {
    items = await loadIncidents();
  } catch (e) {
    errors.push('bipad: ' + e.message);
  }

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    items,
    errors
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=60, s-maxage=${CACHE_SECONDS}`,
      'access-control-allow-origin': '*'
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function loadIncidents() {
  const from = new Date(Date.now() - WINDOW_DAYS * 864e5).toISOString().slice(0, 10);
  const url = `${BIPAD}/incident/?limit=${MAX_ITEMS}&ordering=-incident_on&incident_on__gt=${from}`;

  const [listing, hazards] = await Promise.all([getJson(url), loadHazards()]);
  const rows = (listing.results || []).filter(row => row.approved !== false);

  // Casualty counts live on a separate record, so pull the ones we will show.
  const losses = await Promise.all(
    rows.slice(0, LOSS_LOOKUPS).map(row =>
      row.loss ? getJson(`${BIPAD}/loss/${row.loss}/`).catch(() => null) : Promise.resolve(null)
    )
  );

  return rows.map((row, i) => {
    const loss = losses[i] || {};
    const coords = (row.point && row.point.coordinates) || [];
    return {
      title: cleanPlace(row.title),
      titleNe: row.titleNe || '',
      hazard: hazards[String(row.hazard)] || 'Incident',
      date: row.incidentOn || row.reportedOn || row.createdOn,
      lat: coords[1] ?? null,
      lng: coords[0] ?? null,
      dead: loss.peopleDeathCount ?? null,
      missing: loss.peopleMissingCount ?? null,
      injured: loss.peopleInjuredCount ?? null,
      url: `https://bipadportal.gov.np/incidents/${row.id}`
    };
  });
}

async function loadHazards() {
  if (hazardCache) return hazardCache;
  const data = await getJson(`${BIPAD}/hazard/?limit=100`);
  const rows = data.results || data;
  hazardCache = {};
  rows.forEach(row => { hazardCache[String(row.id)] = row.title; });
  return hazardCache;
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

/** Portal titles read "Flood at Somewhere Rural Municipality-1"; trim the boilerplate. */
function cleanPlace(title) {
  return String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/ Rural Municipality-/g, ' Rural Municipality ward ')
    .replace(/ Municipality-/g, ' Municipality ward ')
    .replace(/ Metropolitan City-/g, ' Metropolitan City ward ')
    .replace(/ Submetropolitan City-/g, ' Sub-metropolitan City ward ')
    .trim();
}
