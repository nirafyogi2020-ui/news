#!/usr/bin/env node
/* ============================================================================
   Post-build audit. Runs before every deploy.

   Checks the things that silently break a site's indexing: a duplicated title,
   a canonical pointing at the wrong URL, an internal link to a page that does
   not exist, a sitemap entry with no file behind it, an accidental noindex,
   malformed JSON-LD. Exits non-zero so a broken build never ships.
   ========================================================================= */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://nepaldisasterupdatelive.nxtimaginelabs.com';

const errors = [];
const warnings = [];

/* -- collect every generated HTML file -------------------------------------- */
const SKIP_DIRS = new Set(['.git', '.wrangler', 'node_modules', 'src', 'data', 'functions']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const pathOf = (file) => {
  const rel = file.slice(ROOT.length).replace(/\\/g, '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

const pages = files.map(f => ({ path: pathOf(f), file: f, html: readFileSync(f, 'utf8') }));
const known = new Set(pages.map(p => p.path));
/* Files served directly rather than as a page. */
for (const extra of ['/feed.xml', '/sitemap.xml', '/robots.txt', '/favicon.svg',
  '/favicon.ico', '/apple-touch-icon.png', '/favicon-96x96.png', '/icon-192.png',
  '/icon-512.png', '/logo.png', '/site.webmanifest',
  '/og-image.png', '/qr-pmo-nepal.png', '/today.json', '/event.json', '/updates.json',
  '/assets/site.css']) {
  known.add(extra);
}

const pick = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

const titles = new Map();
const descriptions = new Map();

for (const p of pages) {
  const is404 = p.path === '/404.html';
  const title = pick(p.html, /<title>([\s\S]*?)<\/title>/i);
  const desc = pick(p.html, /<meta name="description" content="([^"]*)"/i);
  const canonical = pick(p.html, /<link rel="canonical" href="([^"]*)"/i);
  const robots = pick(p.html, /<meta name="robots" content="([^"]*)"/i);
  const h1s = p.html.match(/<h1[\s>]/g) || [];

  if (!title) errors.push(`${p.path}: no <title>`);
  if (!desc) errors.push(`${p.path}: no meta description`);
  if (h1s.length !== 1) errors.push(`${p.path}: ${h1s.length} <h1> tags, expected exactly 1`);

  if (!is404) {
    if (!canonical) errors.push(`${p.path}: no canonical`);
    else if (canonical !== SITE + p.path) errors.push(`${p.path}: canonical is ${canonical}, expected ${SITE + p.path}`);
    if (robots && /noindex/i.test(robots)) errors.push(`${p.path}: has noindex — it will never rank`);

    if (title && titles.has(title)) errors.push(`duplicate <title> on ${p.path} and ${titles.get(title)}`);
    if (title) titles.set(title, p.path);
    if (desc && descriptions.has(desc)) errors.push(`duplicate description on ${p.path} and ${descriptions.get(desc)}`);
    if (desc) descriptions.set(desc, p.path);
  } else if (!robots || !/noindex/i.test(robots)) {
    errors.push('/404.html should carry noindex');
  }

  /* Open Graph */
  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!p.html.includes(`property="${prop}"`)) warnings.push(`${p.path}: missing ${prop}`);
  }

  /* JSON-LD must parse. Invalid JSON-LD is silently ignored by Google. */
  const blocks = p.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];
  if (!blocks.length) warnings.push(`${p.path}: no structured data`);
  for (const b of blocks) {
    const json = b.replace(/^<script type="application\/ld\+json">/, '').replace(/<\/script>$/, '');
    try {
      const parsed = JSON.parse(json);
      const nodes = parsed['@graph'] || [parsed];
      for (const n of nodes) {
        if (!n['@type']) errors.push(`${p.path}: JSON-LD node with no @type`);
        if (n.dateModified && n.datePublished && new Date(n.dateModified) < new Date(n.datePublished)) {
          errors.push(`${p.path}: dateModified is before datePublished`);
        }
      }
    } catch (e) {
      errors.push(`${p.path}: JSON-LD does not parse — ${e.message}`);
    }
  }

  /* Internal links must resolve. A 404 in the navigation wastes crawl budget
     and loses a reader who is looking for a helpline. */
  const hrefs = [...p.html.matchAll(/href="(\/[^"#?]*)"/g)].map(m => m[1]);
  for (const href of new Set(hrefs)) {
    if (href.startsWith('/api/')) continue;
    if (!known.has(href) && !existsSync(join(ROOT, href.replace(/^\//, '')))) {
      errors.push(`${p.path}: internal link to ${href} which does not exist`);
    }
  }

  /* Markup the browser actually renders: JavaScript template strings inside
     <script> are not part of the served document's structure. */
  const markup = p.html.replace(/<script[\s\S]*?<\/script>/g, '');

  /* Images need dimensions or they cause layout shift, and alt text or they
     are invisible to a screen reader and to image search. */
  for (const m of markup.matchAll(/<img\s([^>]*)>/g)) {
    const attrs = m[1];
    if (!/\salt=/.test(attrs)) warnings.push(`${p.path}: <img> without alt`);
    if (!/\swidth=/.test(attrs) || !/\sheight=/.test(attrs)) {
      warnings.push(`${p.path}: <img> without width/height, which causes layout shift`);
    }
  }

  /* House style, set out in PROMPT.md: no em dash, no en dash. A full stop or
     a comma instead. Warned rather than blocked, because a quoted headline
     from a source may legitimately contain one. */
  const visible = markup
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ');
  if (/[\u2013\u2014]/.test(visible)) {
    const n = (visible.match(/[\u2013\u2014]/g) || []).length;
    warnings.push(`${p.path}: ${n} em/en dash(es) in visible text, against house style`);
  }

  /* Heading order. A jump from h2 to h4 reads as a broken outline to a screen
     reader and gives Google a worse map of the page. */
  const levels = [...markup.matchAll(/<h([1-4])[\s>]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      warnings.push(`${p.path}: heading jumps from h${levels[i - 1]} to h${levels[i]}`);
      break;
    }
  }
}

/* -- hreflang ---------------------------------------------------------------
   Google only honours an alternate when the other page names this one back.
   A one-way hreflang is silently ignored, which is the kind of failure that
   never shows up until someone checks. */
const altMap = new Map();
for (const p of pages) {
  const alts = [...p.html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)]
    .map(m => ({ lang: m[1], href: m[2] }))
    .filter(a => a.lang !== 'x-default');
  if (alts.length) altMap.set(p.path, alts);
}
for (const [path, alts] of altMap) {
  if (!alts.some(a => a.href === SITE + path)) {
    errors.push(`${path}: declares hreflang alternates but no self-referencing one`);
  }
  for (const a of alts) {
    if (!a.href.startsWith(SITE + '/')) { errors.push(`${path}: hreflang points off-site: ${a.href}`); continue; }
    const other = a.href.slice(SITE.length);
    if (other === path) continue;
    if (!known.has(other)) { errors.push(`${path}: hreflang points at ${other} which does not exist`); continue; }
    const back = altMap.get(other);
    if (!back || !back.some(b => b.href === SITE + path)) {
      errors.push(`${path} <-> ${other}: hreflang is not reciprocal, so it will be ignored`);
    }
  }
}

/* -- sitemap ---------------------------------------------------------------- */
const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (new Set(locs).size !== locs.length) errors.push('sitemap contains duplicate URLs');
for (const loc of locs) {
  if (!loc.startsWith(SITE + '/')) { errors.push(`sitemap URL on wrong host: ${loc}`); continue; }
  if (loc.includes('#')) errors.push(`sitemap URL contains a fragment: ${loc}`);
  const path = loc.slice(SITE.length);
  if (!known.has(path)) errors.push(`sitemap lists ${path} but no file exists for it`);
}
for (const p of pages) {
  if (p.path === '/404.html') continue;
  if (!locs.includes(SITE + p.path)) errors.push(`${p.path} exists but is missing from the sitemap (orphan)`);
}

/* -- robots ----------------------------------------------------------------- */
const robotsTxt = readFileSync(join(ROOT, 'robots.txt'), 'utf8');
if (!robotsTxt.includes(`Sitemap: ${SITE}/sitemap.xml`)) errors.push('robots.txt does not reference the sitemap');
for (const bad of ['Disallow: /\n', 'Disallow: /assets', 'Disallow: /*.js', 'Disallow: /*.css']) {
  if (robotsTxt.includes(bad)) errors.push(`robots.txt blocks something it must not: ${bad.trim()}`);
}

/* -- secrets ---------------------------------------------------------------- */
/* Nothing that looks like an API key should ever reach a static file. */
const SECRET = /(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,})/;
for (const p of pages) {
  const m = p.html.match(SECRET);
  if (m) errors.push(`${p.path}: looks like a secret in the page source (${m[1].slice(0, 8)}…)`);
}
for (const f of ['event.json', 'today.json', 'src/content.mjs']) {
  const m = readFileSync(join(ROOT, f), 'utf8').match(SECRET);
  if (m) errors.push(`${f}: looks like a secret in a committed file`);
}

/* -- report ----------------------------------------------------------------- */
console.log(`checked ${pages.length} pages, ${locs.length} sitemap urls`);
if (warnings.length) {
  const shown = [...new Set(warnings)];
  console.log(`\n${shown.length} warning(s):`);
  for (const w of shown.slice(0, 20)) console.log('  ? ' + w);
  if (shown.length > 20) console.log(`  … and ${shown.length - 20} more`);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of [...new Set(errors)]) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log('\nall checks passed');
