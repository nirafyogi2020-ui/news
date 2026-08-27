#!/usr/bin/env node
/* ============================================================================
   Static site generator.

   Reads today.json / event.json, keeps a permanent archive of every briefing
   ever published, and writes real crawlable HTML at real URLs plus a sitemap.

   Run it with `npm run build`, or let `./deploy.sh` run it for you. It has no
   dependencies and never touches index.html's own content — the dashboard
   stays exactly as it is.
   ========================================================================= */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, nptDay, nptLong } from './template.mjs';
import * as P from './pages.mjs';
import * as NE from './pages-ne.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE = join(ROOT, 'data', 'updates');

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

function write(relPath, contents) {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, contents);
  return relPath;
}

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/* ---------------------------------------------------------------------------
   The archive.

   today.json holds only the current day's briefings and is overwritten each
   time a new day is published. Anything that ever appeared there is copied
   into data/updates/ first, so its URL keeps working forever. A URL that
   disappears is worse than no URL at all.
   ------------------------------------------------------------------------- */
function syncArchive(today) {
  mkdirSync(ARCHIVE, { recursive: true });
  for (const post of today.posts || []) {
    if (!post || !post.title || !post.time) continue;
    const day = nptDay(post.time);
    const slug = `${day}-${slugify(post.id || post.title)}`;
    const file = join(ARCHIVE, `${slug}.json`);
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

function loadArchive() {
  if (!existsSync(ARCHIVE)) return [];
  return readdirSync(ARCHIVE)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(ARCHIVE, f), 'utf8')))
    .map(p => ({ ...p, url: `/updates/${p.slug}/` }))
    .sort((a, b) => new Date(b.time) - new Date(a.time));
}

/* ------------------------------------------------------------------------- */

const today = readJson('today.json');
const event = readJson('event.json');

syncArchive(today);
const posts = loadArchive();

/* dateModified reflects when the information last changed, not when the build
   ran. Regenerating the site does not make the news newer. */
const modified = [today.updated, event.asOf, ...posts.map(p => p.time)]
  .filter(Boolean)
  .sort()
  .pop();

const ctx = { posts, event, today, modified, buildDay: nptDay(modified) };

const pages = [
  P.nepalFloodHub(ctx),
  P.rasuwaEvent(ctx),
  P.liveUpdates(ctx),
  P.casualties(ctx),
  P.missingPersons(ctx),
  P.timeline(ctx),
  P.cause(ctx),
  P.damage(ctx),
  P.mapPage(ctx),
  P.emergencyNumbers(ctx),
  P.relief(ctx),
  P.hazardGuide(ctx),
  P.updateIndex(ctx),
  P.about(ctx),
  P.sources(ctx),
  P.contact(ctx),
  ...posts.map(p => P.updateArticle(p, ctx)),

  /* Nepali edition. Four hand-written pages, not a machine translation of the
     whole site — see src/pages-ne.mjs for why. */
  NE.neEvent(ctx),
  NE.neEmergency(ctx),
  NE.neMissing(ctx),
  NE.neRelief(ctx),
];

/* -- guard rails ----------------------------------------------------------- */
const seenPath = new Map();
const seenTitle = new Map();
const problems = [];
for (const pg of pages) {
  if (seenPath.has(pg.path)) problems.push(`duplicate path: ${pg.path}`);
  seenPath.set(pg.path, pg);
  if (seenTitle.has(pg.title)) problems.push(`duplicate <title> on ${pg.path} and ${seenTitle.get(pg.title)}`);
  seenTitle.set(pg.title, pg.path);
  if (pg.title.length > 75) problems.push(`title over 75 chars (${pg.title.length}): ${pg.path}`);
  if (pg.description.length > 200) problems.push(`description over 200 chars (${pg.description.length}): ${pg.path}`);
  if (pg.description.length < 70) problems.push(`description under 70 chars: ${pg.path}`);
  if (!pg.path.endsWith('/')) problems.push(`path must end in a slash: ${pg.path}`);
}

/* -- write ------------------------------------------------------------------ */
/* Remove generated directories first so a deleted page cannot linger. */
for (const dir of ['nepal-flood', 'nepal-disasters', 'updates', 'about', 'sources', 'contact', 'ne']) {
  rmSync(join(ROOT, dir), { recursive: true, force: true });
}

let count = 0;
for (const pg of pages) {
  write(`${pg.path.replace(/^\//, '')}index.html`, pg.html);
  count++;
}
write('404.html', P.notFound());

/* -- sitemap ---------------------------------------------------------------- */
const sitemapEntries = [
  {
    loc: `${SITE}/`,
    lastmod: nptDay(modified),
    changefreq: 'hourly',
    priority: '1.0',
    image: {
      loc: `${SITE}/og-image.png`,
      title: 'Nepal Disaster Update Live: Rasuwa flood updates, map and helplines',
    },
  },
  ...pages.map(pg => ({
    loc: SITE + pg.path,
    lastmod: pg.lastmod,
    changefreq: pg.changefreq,
    priority: pg.priority,
    /* Sitemap hreflang carries the same pairs as the <link> tags. Declaring
       them in both places is what Google's own documentation recommends. */
    alternates: pg.alternates || null,
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemapEntries.map(e => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>${(e.alternates || []).map(a =>
      `\n    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${SITE}${a.path}"/>`).join('')}${e.image ? `
    <image:image>
      <image:loc>${e.image.loc}</image:loc>
      <image:title>${e.image.title}</image:title>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>
`;
write('sitemap.xml', sitemap);

/* -- machine-readable index of this site's own briefings ---------------------
   /feed.xml reads this so the RSS feed leads with original content that has a
   real page here, rather than only linking out to other newsrooms. */
write('updates.json', JSON.stringify({
  updated: modified,
  site: SITE,
  updates: posts.map(p => ({
    url: p.url,
    title: p.title,
    time: p.time,
    summary: (p.body[0] || '').slice(0, 300),
    sources: (p.sources || []).map(s => s.name),
  })),
}, null, 2) + '\n');

/* -- robots ----------------------------------------------------------------- */
write('robots.txt', `# ${SITE}
# Everything here is public information about disasters in Nepal.
# Crawl it. Nothing is blocked: CSS, JavaScript and images all have to be
# fetchable or the pages cannot be rendered correctly.

User-agent: *
Allow: /
Disallow: /api/

# The JSON endpoints under /api/ are live aggregation of other people's feeds.
# They are public and usable, but they are data, not pages, so they are kept
# out of the index rather than crawled as thin content.

Sitemap: ${SITE}/sitemap.xml
`);

/* ---------------------------------------------------------------------------
   index.html post-processing.

   The dashboard fetches today.json in the browser. That is fine for a reader
   with JavaScript, and useless to anything reading the HTML as served, so the
   same briefings are written into the markup here between the ssr markers.
   The client-side renderer replaces them on load with the interactive version.

   Both rewrites are idempotent: they target markers and an attribute, never
   the previous run's output.
   ------------------------------------------------------------------------- */
function ssrTodayCards(list) {
  if (!list.length) {
    return '<p style="font-size:0.92rem; color:var(--text-muted);">No briefing has been published yet today. The <a href="/nepal-flood/rasuwa/live-updates/">live updates page</a> carries the raw newswire.</p>';
  }
  return list.map((post, i) => {
    const uid = `ssr-${post.slug}-${i}`;
    const stamp = nptLong(post.time);
    const sources = (post.sources || []).map(s =>
      s.url ? `<a href="${escAttr(s.url)}" target="_blank" rel="noopener nofollow">${escHtml(s.name || s.url)}</a>` : escHtml(s.name || '')
    ).join(', ');
    return `<article class="post-card today-card" data-title="${escAttr(post.title)}">`
      + `<p class="tc-stamp">${escHtml(stamp)}${post.revised ? ' <span class="rev">updated</span>' : ''}</p>`
      + '<div class="post-body">'
      + `<p class="tc-title">${escHtml(post.title)}</p>`
      + `<div class="post-summary clamped" id="${uid}" data-expand="${uid}">${post.body.map(b => `<p>${escHtml(b)}</p>`).join('')}</div>`
      + `<button class="tc-more" type="button" data-expand="${uid}">Read more</button>`
      + (sources ? `<div class="tc-sources"><b>Sources:</b> ${sources}</div>` : '')
      + '</div>'
      + `<div class="post-foot"><a class="post-btn" href="${escAttr(post.url)}">Full briefing</a></div>`
      + '</article>';
  }).join('') + `<p class="today-updated">Updated ${escHtml(nptLong(modified))}</p>`;
}

const escHtml = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (v) => escHtml(v).replace(/"/g, '&quot;');

let index = read('index.html');
const before = index;

const cards = ssrTodayCards(posts.slice(0, 6));
index = index.replace(
  /<!--ssr:today-->[\s\S]*?<!--\/ssr:today-->/g,
  () => `<!--ssr:today-->${cards}<!--/ssr:today-->`
);

/* dateModified must track the newest bulletin, not the time the build ran. */
index = index.replace(/"dateModified"\s*:\s*"[^"]*"/g, `"dateModified": "${modified}"`);

if (index !== before) {
  writeFileSync(join(ROOT, 'index.html'), index);
  console.log('index.html: server-rendered briefings + dateModified refreshed');
} else {
  console.log('index.html: already current');
}

/* -- report ----------------------------------------------------------------- */
console.log(`built ${count} pages + 404 + sitemap (${sitemapEntries.length} urls)`);
console.log(`archive: ${posts.length} briefings`);
console.log(`dateModified: ${modified}`);
if (problems.length) {
  console.error('\nPROBLEMS:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
