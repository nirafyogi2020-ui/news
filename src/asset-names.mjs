/* Content-hashed file names for the site's own scripts and stylesheets.

   Pages used to link /assets/front.js?v=<hash>. Cloudflare Pages ignores the
   query string, and the edge keeps /assets/* for hours. During a deploy
   (23 Nov 2026) an edge served the new page while the script request reached
   a copy of the site that had not been updated yet; it answered with the old
   file, and the edge kept that old file under the new ?v= address, so the
   live site ran old code for hours.

   The hash is now in the file name: /assets/v/front.3f2a9c1b7e40.js. A copy
   of the site that does not have the file yet answers 404, which the edge
   does not keep, and the next load gets the right file.

   The hashed copies live in their own folder, assets/v/, because a file whose
   name carries its content's hash never changes, so _headers gives that
   folder a one-year immutable lifetime and a returning reader does not even
   ask for it again. Cloudflare's _headers patterns cannot pick hashed names
   out of the unhashed ones inside one folder (a splat "will greedily match
   all characters"), and the unhashed copies kept for old cached pages must
   keep the short cache, so the folder is the boundary. Every url() in the
   site's stylesheets is absolute (/assets/fonts/...) or data:, so a copy one
   folder down still finds them; hashedName refuses a stylesheet with a
   relative url() rather than ship one that breaks.

   Old hashed files stay for a while, because a reader's browser or the edge
   may still hold a page that links them. data/asset-history.json records the
   UTC day each one stopped being linked by a build; it is deleted once no
   page links it and that day is more than KEEP_DAYS ago. Only names of the
   form name.<12 hex>.js|css directly in assets/v/ are ever deleted, and,
   for the move to that folder (23 Nov 2026), the same names directly in
   assets/, where hashed copies were written before. */
import { createHash } from 'node:crypto';

export const KEEP_DAYS = 7;
export const HASHED_FILE = /^[a-z0-9-]+\.[0-9a-f]{12}\.(?:js|css)$/;
/** The folder the hashed copies are written to; _headers makes it immutable. */
export const HASHED_DIR = 'assets/v';
/** Where hashed copies were written before 23 Nov 2026, pruned the same way. */
export const LEGACY_HASHED_DIR = 'assets';

/** A url() in a stylesheet that resolves against the stylesheet's own folder. */
export const relativeCssUrls = (css) => [...String(css).matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*))\s*\)/g)]
  .map(m => (m[1] ?? m[2] ?? m[3]).trim()).filter(u => u && !/^(?:\/|data:|https?:|#)/i.test(u));

export const hash12 = (content) => createHash('sha256').update(content).digest('hex').slice(0, 12);

/** 'assets/site.css' + its text -> 'assets/v/site.<hash12>.css' */
export function hashedName(path, content) {
  const m = String(path).match(/^assets\/([a-z0-9-]+)\.(js|css)$/);
  if (!m) throw new Error(`hashedName: not a .js or .css file directly in assets/: ${path}`);
  if (m[2] === 'css') {
    const rel = relativeCssUrls(content);
    if (rel.length) throw new Error(`hashedName: ${path} has a relative url(${rel[0]}), which would break in ${HASHED_DIR}/; make it absolute`);
  }
  return `${HASHED_DIR}/${m[1]}.${hash12(content)}.${m[2]}`;
}

/** 'assets/v/site.<hash12>.css' -> 'assets/site.css' (null if not a hashed name) */
export function sourceName(hashed) {
  const m = String(hashed).match(/^assets\/v\/([a-z0-9-]+)\.[0-9a-f]{12}\.(js|css)$/);
  return m ? `assets/${m[1]}.${m[2]}` : null;
}

/** A hashed copy this module may delete: in assets/v/, or left in assets/. */
export const isPrunable = (file) => [HASHED_DIR, LEGACY_HASHED_DIR].some(dir =>
  file.startsWith(dir + '/') && HASHED_FILE.test(file.slice(dir.length + 1)));

const dayNumber = (day) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);

/**
 * Which old hashed files to delete, and the history to keep.
 *
 *   history     { 'assets/v/x.<hash>.js': 'YYYY-MM-DD' } from the last build:
 *               the day each file stopped being linked
 *   referenced  the hashed files this build's pages link ('assets/v/...')
 *   onDisk      the hashed files now in assets/v/ and, from before the move,
 *               in assets/ ('assets/v/...', 'assets/...')
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
    if (!isPrunable(file)) continue;
    if (linked.has(file)) continue;
    const since = history[file] || today;
    if (dayNumber(today) - dayNumber(since) > keepDays) remove.push(file);
    else next[file] = since;
  }
  return { history: next, remove };
}

/** _headers as its rules in file order: [{ pattern, lines }]. */
export function headerRules(text) {
  const rules = [];
  for (const raw of String(text).split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (/^\S/.test(raw)) rules.push({ pattern: raw.trim(), lines: [] });
    else if (rules.length) rules[rules.length - 1].lines.push(raw.trim());
  }
  return rules;
}

const patternMatches = (pattern, path) => new RegExp('^' + pattern
  .replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[A-Za-z]\w*/g, '[^/]+') + '$').test(path);

export const IMMUTABLE = 'Cache-Control: public, max-age=31536000, immutable';

/**
 * What is wrong with the _headers rules for the hashed copies, [] if nothing.
 * Cloudflare applies every matching rule in file order and joins repeated
 * headers with a comma; "! Cache-Control" drops only what earlier rules
 * added. So the /assets/v/* rule must come after /* and /assets/*, detach
 * their Cache-Control, set the immutable one, and no later rule may add
 * another; and /assets/* itself must stay short, for the unhashed copies.
 */
export function immutableRuleProblems(text) {
  const rules = headerRules(text);
  const problems = [];
  const at = rules.findIndex(r => r.pattern === `/${HASHED_DIR}/*`);
  if (at < 0) return [`_headers: no /${HASHED_DIR}/* rule; the hashed scripts and stylesheets would get the short cache`];
  const own = rules[at].lines;
  if (!own.includes('! Cache-Control')) problems.push(`_headers: /${HASHED_DIR}/* does not detach the Cache-Control set above it ("! Cache-Control")`);
  if (!own.includes(IMMUTABLE)) problems.push(`_headers: /${HASHED_DIR}/* does not set "${IMMUTABLE}"`);
  const sample = `/${HASHED_DIR}/front.0123456789ab.js`;
  rules.forEach((r, i) => {
    if (i === at || !patternMatches(r.pattern, sample)) return;
    const sets = r.lines.some(l => /^Cache-Control:/i.test(l));
    if (i > at && sets) problems.push(`_headers: ${r.pattern} comes after /${HASHED_DIR}/* and adds a second Cache-Control to the hashed files`);
  });
  const assets = rules.find(r => r.pattern === '/assets/*');
  if (assets && assets.lines.some(l => /^Cache-Control:.*immutable/i.test(l))) {
    problems.push('_headers: /assets/* is immutable, but the unhashed copies there are rewritten in place');
  }
  return problems;
}
