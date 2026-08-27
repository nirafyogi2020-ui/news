#!/usr/bin/env node
/* ============================================================================
   IndexNow ping.

   Tells Bing, Yandex and the other IndexNow participants that these URLs
   changed, instead of waiting for them to re-crawl on their own schedule.
   Google does not use IndexNow; for Google the sitemap plus Search Console is
   the route, and there is no API that makes it crawl sooner.

   This submits only URLs already listed in our own sitemap, which are public
   pages on our own domain. Nothing else is sent.
   ========================================================================= */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'nepaldisasterupdatelive.nxtimaginelabs.com';
const KEY = '9aa74a94cf3ce7732e22911aa095755e';

const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => m[1])
  .filter(u => u.startsWith(`https://${HOST}/`));

if (!urlList.length) {
  console.error('indexnow: no URLs in the sitemap, nothing to submit');
  process.exit(0);
}

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList,
};

try {
  const res = await fetch('https://api.indexnow.org/IndexNow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`indexnow: submitted ${urlList.length} urls, HTTP ${res.status}`);
  if (res.status === 403) console.error('indexnow: key file not reachable yet — retry after the deploy propagates');
} catch (e) {
  /* A failed ping costs nothing: the sitemap still gets crawled normally. */
  console.error('indexnow: ' + e.message + ' (ignored)');
}
