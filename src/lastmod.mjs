/* Honest last-modified dates for the sitemap.

   Every build used to give the hub and guide pages the time of the newest
   briefing, so /nepal-disasters/glof/ claimed a change several times a day
   while its text changed twice in a month. Google stops trusting a sitemap's
   lastmod when it moves without the page moving.

   A page's date now moves only when what a reader sees in it moves: the
   title, the description and the <main> text. The "Last checked" byline and
   the ?v= cache stamps are left out, because they change on every build.
   The fingerprint and the date it was first seen are kept in
   data/page-lastmod.json, which the build commits like any generated file. */
import { createHash } from 'node:crypto';

export function pageFingerprint(html) {
  const s = String(html || '');
  const title = (s.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const desc = (s.match(/<meta name="description" content="([^"]*)"/i) || [])[1] || '';
  const main = ((s.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || s)
    .replace(/<p class="byline">[\s\S]*?<\/p>/g, '')
    .replace(/\?v=\d+/g, '');
  return createHash('sha1').update(`${title}\n${desc}\n${main}`).digest('hex').slice(0, 16);
}

const toTime = (v) => { const t = new Date(v).getTime(); return Number.isFinite(t) ? t : 0; };

/**
 * The date to publish for one page, and the state entry to keep for it.
 * Unchanged fingerprint: the stored date stands. Changed: the page's own
 * candidate date if it is newer than the stored one (a new briefing on a
 * live page), otherwise the build time (a template or wording change).
 */
export function honestLastmod(prev, hash, candidate, now) {
  if (prev && prev.hash === hash && prev.lastmod) return { hash, lastmod: prev.lastmod };
  const cand = toTime(candidate);
  if (!prev) return { hash, lastmod: new Date(cand || toTime(now)).toISOString() };
  const lastmod = cand > toTime(prev.lastmod) ? cand : toTime(now);
  return { hash, lastmod: new Date(lastmod).toISOString() };
}
