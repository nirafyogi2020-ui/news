/**
 * GET /api/bipad
 *
 * Nepal's own national disaster portal, bipadportal.gov.np, read through its
 * public JSON API. This is NDRRMA's system of record: every incident a local
 * body reports lands here with a hazard type, a location and a loss record
 * carrying dead, missing, injured, affected, houses, roads, bridges and
 * economic loss.
 *
 * What it is good for and what it is not:
 *
 * BIPAD logs incidents one municipality at a time. A national event like the
 * Rasuwa flood arrives as dozens of separate ward-level rows, and the loss
 * fields on the newest of those rows are frequently still zero while the
 * headline toll is already on every front page. So this is a *supplementary*
 * source: it contributes a figure only when it actually carries one, and the
 * fast-moving headline figures come from the bulletins and newsrooms in
 * /api/figures. Treating BIPAD as the headline source would make the site
 * slower and, while the rows sit at zero, wrong.
 *
 * What it is good for is the part no newsroom publishes: how many separate
 * incidents are open, where they are, and the infrastructure damage as the
 * government's own system has it.
 *
 * Response shape:
 *   { updated, window, incidents: { total, byHazard, newest },
 *     totals: { dead, missing, injured, affected, housesDestroyed, ... },
 *     scope, errors: [] }
 */

const API = 'https://bipadportal.gov.np/api/v1';

/* BIPAD is a reporting system, not a wire: rows arrive when a local body
   files them. Five minutes is well inside its own update rhythm and keeps
   this endpoint cheap. */
const CACHE_SECONDS = 300;

/* Hazards this site covers. BIPAD's own numeric ids. */
const HAZARDS = { 11: 'flood', 12: 'landslide', 10: 'fire', 13: 'earthquake' };

/* How far back to look. The event this site covers began 26 August 2026; a
   rolling window keeps the endpoint useful after it, without asking BIPAD for
   its entire history on every cache miss. */
const WINDOW_DAYS = 30;

/* Loss records are fetched one per incident, so this caps the fan-out. The
   newest incidents are the ones whose figures could still move. */
const LOSS_LOOKUPS = 40;

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  let data = emptyBoard();
  try {
    data = await loadBipad();
  } catch (e) {
    errors.push('bipad: ' + e.message);
  }

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    ...data,
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

export async function loadBipad(now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86400000)
    .toISOString().slice(0, 10);

  const list = await getJson(
    `${API}/incident/?limit=200&ordering=-incidentOn&incident_on__gt=${since}`
  );
  const incidents = (list.results || []).filter(row => row && row.approved !== false);

  const byHazard = {};
  for (const row of incidents) {
    const name = HAZARDS[row.hazard] || 'other';
    byHazard[name] = (byHazard[name] || 0) + 1;
  }

  /* Loss ids, newest first, de-duplicated: several incidents can point at the
     same loss record. */
  const lossIds = [];
  for (const row of incidents) {
    if (row.loss && lossIds.indexOf(row.loss) === -1) lossIds.push(row.loss);
    if (lossIds.length >= LOSS_LOOKUPS) break;
  }

  const losses = await Promise.all(
    lossIds.map(id => getJson(`${API}/loss/${id}/`).catch(() => null))
  );

  const totals = sumLosses(losses.filter(Boolean));

  return {
    window: { since, days: WINDOW_DAYS },
    incidents: {
      total: incidents.length,
      byHazard,
      newest: incidents.slice(0, 12).map(normaliseIncident)
    },
    totals,
    /* Deliberately not offered to the headline resolver.

       These totals are every filed incident in Nepal over the window, which
       is a different quantity from one event's toll. Letting them compete
       under the first-wins rule would let "17 injured across Nepal this
       month" overwrite an event's 292, purely because BIPAD's row carried a
       newer timestamp. The page shows this block on its own, labelled for
       what it is. */
    scope: `All hazards reported to BIPAD across Nepal in the last ${WINDOW_DAYS} days — not one event's toll.`
  };
}

export function sumLosses(losses) {
  const add = (key) => losses.reduce((n, l) => n + (Number(l && l[key]) || 0), 0);
  return {
    dead: add('peopleDeathCount'),
    missing: add('peopleMissingCount'),
    injured: add('peopleInjuredCount'),
    affected: add('peopleAffectedCount'),
    familiesAffected: add('familyAffectedCount'),
    familiesEvacuated: add('familyEvacuatedCount'),
    housesDestroyed: add('infrastructureDestroyedHouseCount'),
    housesAffected: add('infrastructureAffectedHouseCount'),
    roadsDestroyed: add('infrastructureDestroyedRoadCount'),
    bridgesDestroyed: add('infrastructureDestroyedBridgeCount'),
    electricityDestroyed: add('infrastructureDestroyedElectricityCount'),
    livestockDestroyed: add('livestockDestroyedCount'),
    economicLoss: add('infrastructureEconomicLoss') + add('agricultureEconomicLoss'),
    /* How many of the fetched loss records carried anything at all. When this
       is 0 the portal has rows but no filed figures yet, which the page says
       out loud rather than printing a confident zero. */
    filed: losses.filter(l => l && (
      l.peopleDeathCount || l.peopleMissingCount || l.peopleInjuredCount ||
      l.peopleAffectedCount || l.infrastructureDestroyedHouseCount
    )).length,
    records: losses.length
  };
}

function normaliseIncident(row) {
  return {
    id: row.id,
    title: row.title || null,
    titleNe: row.titleNe || null,
    hazard: HAZARDS[row.hazard] || 'other',
    at: row.incidentOn || null,
    reportedAt: row.reportedOn || null,
    point: row.point && row.point.coordinates ? row.point.coordinates : null
  };
}

function emptyBoard() {
  return {
    window: null,
    incidents: { total: 0, byHazard: {}, newest: [] },
    totals: sumLosses([]),
    scope: null
  };
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
