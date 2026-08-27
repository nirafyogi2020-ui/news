/**
 * GET /feed.xml
 *
 * RSS 2.0 feed of the live news items behind this page. Search engines and
 * news readers use it to discover updates quickly, which is the main reason
 * it exists.
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
  try {
    const res = await fetch(new URL('/api/news', request.url).toString());
    if (res.ok) items = (await res.json()).items || [];
  } catch (e) { /* an empty feed is better than a broken one */ }

  const entries = items.slice(0, 30).map(item => `
    <item>
      <title>${esc(item.title)}</title>
      <link>${esc(item.url)}</link>
      <guid isPermaLink="true">${esc(item.url)}</guid>
      <source url="${SITE}/">${esc(item.source)}</source>
      <pubDate>${new Date(item.time).toUTCString()}</pubDate>
      <description>${esc(item.source + ': ' + item.title)}</description>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Nepal Disaster Update Live</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Live updates on the 2026 Rasuwa and Nuwakot flood in Nepal: news, official incident records, maps and helplines.</description>
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
