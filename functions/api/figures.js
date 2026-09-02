/**
 * GET /api/figures
 *
 * The live figure board: what every source this site reads currently states
 * for the dead, the missing, the injured, the rescued and the personnel
 * deployed — next to the figures the page was last built with.
 *
 * Why this exists: the counters under the hero come from event.json, which is
 * edited. Between those edits a bulletin lands, a newsroom publishes it, and
 * for an hour the page shows a figure its own sources have already overtaken.
 * That is the single worst thing this site can print.
 *
 * How a figure is chosen: first wins. Every source in the list is either a
 * government body or an established newsroom, so there is no ranking by
 * trust — whoever publishes a figure first sets it. Same timestamp, the body
 * that issues the figure beats the newsroom relaying it. The board follows
 * the sources down as well as up, because a correction is news too.
 *
 * Nothing here writes to the repo and nothing here invents a figure. A metric
 * no source states is absent from the board rather than zero, and the page
 * keeps the figure it was built with.
 *
 * Response shape:
 *   {
 *     updated, checkedAt,
 *     published: { dead, missing, injured, rescued, asOf, source },
 *     board: { dead: { value, source, url, time, statedTime, sentence,
 *                      others: [...] }, missing: {...}, ... },
 *     changed: { dead: { from, to, direction } },
 *     sources: { counted, names, errors }
 *   }
 */

import { resolveBoard, METRICS, inBounds } from './_figures-core.js';
import { loadPoliceNews } from './police.js';

/* The board is the fastest-moving thing on the site, so it gets the shortest
   cache the upstream sources tolerate. Below about ten seconds the origin
   fetches stop being absorbed by the edge and start being rate limits on
   nepalpolice.gov.np and the newsroom feeds. The page polls every second and
   is served from this cache, so reader count does not change the load. */
const CACHE_SECONDS = 15;

/* Metric to the label the counters use in event.json. */
const STAT_LABELS = {
  dead: 'confirmed dead',
  missing: 'listed missing in Nepal',
  rescued: 'rescued so far'
};

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const url = new URL(request.url);
  const errors = [];

  const [items, published] = await Promise.all([
    gatherItems(url.origin, errors),
    loadPublished(url.origin).catch(e => { errors.push('event.json: ' + e.message); return null; })
  ]);

  /* What the page already publishes is the floor for each counter. A figure
     below it only wins if its sentence says it is a correction, which is what
     keeps a re-indexed day-one wire story from walking a counter backwards.
     A real correction still gets through, and the page labels it as one. */
  const board = resolveBoard(items, { floors: published || {} });
  const changed = diff(published, board);

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    checkedAt: new Date().toISOString(),
    published,
    board,
    changed,
    sources: {
      counted: items.length,
      names: [...new Set(items.map(i => i.source).filter(Boolean))].sort(),
      errors
    }
  }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      'access-control-allow-origin': '*'
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/**
 * Everything worth reading a figure out of, from one place.
 *
 * /api/news already fans out to every newsroom, wire and UN feed this site
 * follows and caches the result, so reading it here costs one subrequest
 * instead of twenty and never disagrees with what the feed shows. The police
 * bulletins are loaded directly on top, with their bodies, because that is
 * the one source whose full text carries the district breakdown.
 */
async function gatherItems(origin, errors) {
  const [news, police] = await Promise.all([
    fetchJson(`${origin}/api/news`).catch(e => { errors.push('news: ' + e.message); return null; }),
    loadPoliceNews().catch(e => { errors.push('police: ' + e.message); return null; })
  ]);

  const items = [];
  if (news && Array.isArray(news.items)) {
    for (const item of news.items) {
      if (item && item.kind !== 'video') items.push(item);
    }
  }
  if (police) items.push(...police);
  return items;
}

/** The figures the page was actually built with, read from event.json. */
async function loadPublished(origin) {
  const res = await fetch(`${origin}/event.json`, { cf: { cacheTtl: 30 } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const event = await res.json();

  const out = { asOf: event.asOf || null, source: event.asOfSource || null };
  for (const [metric, label] of Object.entries(STAT_LABELS)) {
    const stat = (event.stats || []).find(s => s && s.label === label);
    out[metric] = stat ? (Number(String(stat.value).replace(/\D/g, '')) || null) : null;
  }
  return out;
}

/**
 * What moved since the page was built, and which way.
 *
 * Direction is stated rather than assumed. A figure that goes down is a
 * correction, and the page says "corrected down" rather than quietly
 * swapping the number, so a reader who saw the higher figure an hour ago is
 * not left thinking they misread it.
 */
export function diff(published, board) {
  const changed = {};
  if (!published) return changed;
  for (const metric of METRICS) {
    const now = board[metric];
    const before = published[metric];
    if (!now || !inBounds(metric, now.value)) continue;
    if (!before || before === now.value) continue;
    changed[metric] = {
      from: before,
      to: now.value,
      direction: now.value > before ? 'up' : 'down'
    };
  }
  return changed;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}
