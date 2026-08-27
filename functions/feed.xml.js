/**
 * GET /feed.xml
 *
 * RSS 2.0 feed. Search engines and news readers use it to discover updates
 * quickly, which is the main reason it exists.
 *
 * Two kinds of item, in this order:
 *   1. This site's own written briefings, from /updates.json (generated at
 *      build time). These are original content and each has a real page.
 *   2. The aggregated newswire from /api/news — headlines linking out to the
 *      newsroom that published them.
 */

const SITE = 'https://nepaldisasterupdatelive.nxtimaginelabs.com';
const CACHE_SECONDS = 300;

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let items = [];
  let own = [];

  const [newsRes, ownRes] = await Promise.all([
    fetch(new URL('/api/news', request.url).toString()).catch(() => null),
    fetch(new URL('/updates.json', request.url).toString()).catch(() => null),
  ]);
  try { if (newsRes && newsRes.ok) items = (await newsRes.json()).items || []; }
  catch (e) { /* an empty feed is better than a broken one */ }
  try { if (ownRes && ownRes.ok) own = (await ownRes.json()).updates || []; }
  catch (e) { /* same */ }

  const ownEntries = own.slice(0, 40).map(u => `
    <item>
      <title>${esc(u.title)}</title>
      <link>${SITE}${esc(u.url)}</link>
      <guid isPermaLink="true">${SITE}${esc(u.url)}</guid>
      <pubDate>${new Date(u.time).toUTCString()}</pubDate>
      <description>${esc(u.summary || u.title)}</description>
    </item>`).join('');

  const wireEntries = items.slice(0, 30).map(item => `
    <item>
      <title>${esc(item.title)}</title>
      <link>${esc(item.url)}</link>
      <guid isPermaLink="true">${esc(item.url)}</guid>
      <source url="${SITE}/">${esc(item.source)}</source>
      <pubDate>${new Date(item.time).toUTCString()}</pubDate>
      <description>${esc(item.source + ': ' + item.title)}</description>
    </item>`).join('');

  const entries = ownEntries + wireEntries;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nepal Disaster Update Live</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Live updates on disasters in Nepal: written briefings, aggregated news, official incident records, maps and helplines.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${entries}
  </channel>
</rss>`;

  const response = new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': `public, max-age=300, s-maxage=${CACHE_SECONDS}`
    }
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
