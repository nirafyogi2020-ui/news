/**
 * GET /api/figures
 *
 * The death toll as Nepal Police themselves currently state it, next to the
 * figure the site's own counters were last edited to.
 *
 * Why this exists: the counters under the hero come from event.json, which a
 * person (or the hourly agent) edits. Between those edits the police can
 * publish a new bulletin, and for an hour the page then shows a toll that its
 * own sources have already overtaken. That is the single worst thing this site
 * can print, and it costs nothing to avoid: the police bulletin is public HTML
 * and this reads the number straight out of the sentence that states it.
 *
 * Nothing here writes to the repo and nothing here invents a figure. If the
 * bulletin does not state a toll in a sentence this recognises, `live` is null
 * and the page keeps showing the edited figure.
 *
 * Response shape:
 *   {
 *     updated,
 *     published: { dead, asOf, source } | null,   // what the page was built with
 *     live: { dead, statedTime, url, source, sentence } | null,
 *     ahead: boolean                              // live figure is higher
 *   }
 */

import { loadPoliceNews, tollFromPolice } from './police.js';

const CACHE_SECONDS = 300;

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const errors = [];
  let live = null;
  let published = null;

  try {
    live = tollFromPolice(await loadPoliceNews());
    if (live && live.statedTime) live.statedTime = live.statedTime.replace(/\s+/g, '');
  } catch (e) {
    errors.push('police: ' + e.message);
  }

  try {
    const url = new URL(request.url);
    const res = await fetch(`${url.origin}/event.json`, { cf: { cacheTtl: 60 } });
    if (res.ok) {
      const event = await res.json();
      const stat = (event.stats || []).find(s => s.label === 'confirmed dead');
      if (stat) {
        published = {
          dead: Number(String(stat.value).replace(/\D/g, '')) || null,
          asOf: event.asOf || null,
          source: event.asOfSource || null
        };
      }
    }
  } catch (e) {
    errors.push('event.json: ' + e.message);
  }

  /* Only ever used to raise a figure, never to lower one. A scrape that reads
     an older bulletin must not walk the number backwards on the page. */
  const ahead = !!(live && published && published.dead && live.dead > published.dead);

  const response = new Response(JSON.stringify({
    updated: new Date().toISOString(),
    published,
    live,
    ahead,
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
