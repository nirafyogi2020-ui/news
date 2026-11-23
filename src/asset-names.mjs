/* Content-hashed file names for the site's own scripts and stylesheets.

   Pages used to link /assets/front.js?v=<hash>. Cloudflare Pages ignores the
   query string, and the edge keeps /assets/* for hours. During a deploy
   (23 Nov 2026) an edge served the new page while the script request reached
   a copy of the site that had not been updated yet; it answered with the old
   file, and the edge kept that old file under the new ?v= address, so the
   live site ran old code for hours.

   The hash is now in the file name: /assets/front.3f2a9c1b7e40.js. A copy of
   the site that does not have the file yet answers 404, which the edge does
   not keep, and the next load gets the right file.

   Old hashed files stay for a while, because a reader's browser or the edge
   may still hold a page that links them. data/asset-history.json records the
   UTC day each one stopped being linked by a build; it is deleted once no
   page links it and that day is more than KEEP_DAYS ago. Only names of the
   form name.<12 hex>.js|css directly in assets/ are ever deleted. */
import { createHash } from 'node:crypto';

export const KEEP_DAYS = 7;
export const HASHED_FILE = /^[a-z0-9-]+\.[0-9a-f]{12}\.(?:js|css)$/;

export const hash12 = (content) => createHash('sha256').update(content).digest('hex').slice(0, 12);

/** 'assets/site.css' + its text -> 'assets/site.<hash12>.css' */
export function hashedName(path, content) {
  const m = String(path).match(/^(.*\/)?([a-z0-9-]+)\.(js|css)$/);
  if (!m) throw new Error(`hashedName: not a .js or .css name: ${path}`);
  return `${m[1] || ''}${m[2]}.${hash12(content)}.${m[3]}`;
}

const dayNumber = (day) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);

/**
 * Which old hashed files to delete, and the history to keep.
 *
 *   history     { 'assets/x.<hash>.js': 'YYYY-MM-DD' } from the last build:
 *               the day each file stopped being linked
 *   referenced  the hashed files this build's pages link ('assets/...')
 *   onDisk      the hashed files now in assets/ ('assets/...')
 *   today       this build's UTC day, 'YYYY-MM-DD'
 *
 * A linked file is never deleted and has no entry. An unlinked file gets
 * today's date the first time it is seen unlinked, and is deleted once that
 * date is more than keepDays old. The result only changes when a file stops
 * or starts being linked or is deleted, so a rebuild with nothing new gives
 * the same history back.
 */
export function planPrune({ history = {}, referenced, onDisk, today, keepDays = KEEP_DAYS }) {
  const linked = new Set(referenced);
  const next = {};
  const remove = [];
  for (const file of [...new Set(onDisk)].sort()) {
    const name = file.replace(/^assets\//, '');
    if (!file.startsWith('assets/') || name.includes('/') || !HASHED_FILE.test(name)) continue;
    if (linked.has(file)) continue;
    const since = history[file] || today;
    if (dayNumber(today) - dayNumber(since) > keepDays) remove.push(file);
    else next[file] = since;
  }
  return { history: next, remove };
}
