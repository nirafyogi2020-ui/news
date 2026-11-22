/* ---------------------------------------------------------------------------
   The archive.

   today.json holds only the current day's briefings and is overwritten each
   time a new day is published. Anything that ever appeared there is copied
   into data/updates/ first, so its URL keeps working forever. A URL that
   disappears is worse than no URL at all.

   Both generators call this: og-build.mjs runs first and needs a new
   briefing's record on disk to draw its share card in the same run, and
   build.mjs needs it to write the briefing's page.
   ------------------------------------------------------------------------- */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { nptDay } from './template.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ARCHIVE = join(ROOT, 'data', 'updates');

export function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function syncArchive(today, dir = ARCHIVE) {
  mkdirSync(dir, { recursive: true });
  for (const post of (today && today.posts) || []) {
    if (!post || !post.title || !post.time) continue;
    const day = nptDay(post.time);
    const slug = `${day}-${slugify(post.id || post.title)}`;
    const file = join(dir, `${slug}.json`);
    const record = {
      slug,
      id: post.id || slug,
      title: post.title,
      time: post.time,
      body: Array.isArray(post.body) ? post.body : [String(post.body || '')],
      sources: post.sources || [],
      revised: !!post.revised,
      image: post.image || '',
    };
    /* Rewrite only when something actually changed, so an unchanged briefing
       keeps its file mtime and its lastmod does not churn in the sitemap. */
    let prev = null;
    if (existsSync(file)) { try { prev = JSON.parse(readFileSync(file, 'utf8')); } catch { prev = null; } }
    if (JSON.stringify(prev) !== JSON.stringify(record)) {
      writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
    }
  }
}

export function loadArchive(dir = ARCHIVE) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .map(p => ({ ...p, url: `/updates/${p.slug}/` }))
    .sort((a, b) => new Date(b.time) - new Date(a.time));
}
