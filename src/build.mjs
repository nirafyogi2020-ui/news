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

import { SITE, nptDay, nptLong, ogFor, ogStoryFor, assetVersioned } from './template.mjs';
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
  ...P.hazardPages(ctx),
  P.hydropower(ctx),
  P.foreignNationals(ctx),
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
Sitemap: ${SITE}/news-sitemap.xml
Sitemap: ${SITE}/sitemap-index.xml
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
    const ogName = post.url.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    /* Versioned, so the day a drawn placeholder is replaced by a real
       photograph the readers who already have the placeholder cached see the
       photograph too. */
    const thumb = assetVersioned(`${ogName}-thumb.png`);
    const story = assetVersioned(`${ogName}-story.png`);
    return `<article class="post-card today-card" data-title="${escAttr(post.title)}"`
      + ` data-permalink="${escAttr(post.url)}"`
      + (story ? ` data-story="${escAttr(story)}"` : '') + '>'
      + '<div class="tc-media">'
      + (thumb
        ? `<a class="post-photo-link" href="${escAttr(post.url)}" tabindex="-1" aria-hidden="true">`
          + `<img class="post-photo" loading="lazy" decoding="async" width="800" height="450"`
          + ` src="${escAttr(thumb)}" alt=""></a>`
        : '')
      + `<p class="tc-stamp">${escHtml(stamp)}${post.revised ? ' <span class="rev">updated</span>' : ''}</p>`
      + '</div>'
      + '<div class="post-body">'
      + `<p class="tc-title"><a href="${escAttr(post.url)}">${escHtml(post.title)}</a></p>`
      + `<div class="post-summary clamped" id="${uid}" data-expand="${uid}">${post.body.map(b => `<p>${escHtml(b)}</p>`).join('')}</div>`
      + `<button class="tc-more" type="button" data-expand="${uid}">Read more</button>`
      + (sources ? `<div class="tc-sources"><b>Sources:</b> ${sources}</div>` : '')
      + '</div>'
      + `<div class="post-foot"><a class="post-btn" href="${escAttr(post.url)}">Full briefing</a>`
      + '<button class="post-btn" type="button" data-share="1">Share</button></div>'
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

/* The same versioned picture URLs the cards above use, handed to the client
   renderer so its cards and the server-rendered ones point at the same files.
   Without this it rebuilds the URLs itself, unversioned, and a reader whose
   browser cached a drawn placeholder never sees the photograph that replaced
   it. */
const ogVersions = {};
for (const post of posts.slice(0, 12)) {
  const ogName = post.url.replace(/^\/|\/$/g, '').replace(/\//g, '-');
  for (const kind of ['thumb', 'story']) {
    const name = `${ogName}-${kind}.png`;
    const url = assetVersioned(name);
    if (url) ogVersions[name] = url;
  }
}
index = index.replace(
  /<!--ssr:ogv-->[\s\S]*?<!--\/ssr:ogv-->/,
  () => `<!--ssr:ogv-->${JSON.stringify(ogVersions)}<!--/ssr:ogv-->`
);

/* dateModified must track the newest bulletin, not the time the build ran. */
index = index.replace(/"dateModified"\s*:\s*"[^"]*"/g, `"dateModified": "${modified}"`);

/* The arrival pop-up quotes the death toll, so it is written from event.json
   rather than typed into the markup where it goes quietly out of date. */
const leadStat = (event.stats || []).find(st => st.icon === 'dead') || null;
const modalLede = [
  event.lede || '',
  leadStat ? `${event.asOfSource || 'The latest bulletin'}: ${leadStat.value} ${leadStat.label}, as of ${nptLong(event.asOf)}.` : '',
].filter(Boolean).join(' ');
index = index.replace(
  /<!--ssr:modal-lede-->[\s\S]*?<!--\/ssr:modal-lede-->/,
  () => `<!--ssr:modal-lede-->${escHtml(modalLede)}<!--/ssr:modal-lede-->`
);

/* ---------------------------------------------------------------------------
   The fallback figure grid.

   The grid is normally rendered in the browser from event.json. The markup in
   index.html is what shows when that fetch has not finished or cannot run at
   all: a crawler that does not execute the fetch, a reader with JavaScript
   off, a network blip. It used to be typed by hand, so it sat at 289 dead and
   826 missing while event.json said 359 and 910, and anyone who saw it got a
   figure two bulletins out of date with nothing saying so.

   It is now drawn here from the same file the client uses, with the same
   markup the client's tile() produces, so the two cannot disagree.
   ------------------------------------------------------------------------- */
const STAT_ICONS = {
  dead:    '<path d="M12 21s-7-4.35-9.5-9C1 8.5 3 4.5 7 4.5c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6 4 4.5 7.5-1 2-3 4-5 5.5"></path><path d="M4.5 12.5h4l1.5-3 2.5 6 1.5-3h5"></path>',
  missing: '<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path><path d="M10.5 7.5v3l2 1.5"></path>',
  power:   '<path d="M3 21V11l5 3V11l5 3V8l8 4v9z"></path><path d="M3 21h18"></path><path d="M13 8V4l3-1v4"></path>',
  people:  '<circle cx="9" cy="8" r="3"></circle><path d="M3.5 19v-1c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5v1"></path><path d="M16 5.5a3 3 0 0 1 0 5.8"></path><path d="M17.5 13.2c2 .6 3.5 2 3.5 4.3V19"></path>',
  day:     '<rect x="3.5" y="5" width="17" height="16" rx="2.5"></rect><path d="M3.5 10h17"></path><path d="M8 3v4M16 3v4"></path>',
  money:   '<ellipse cx="12" cy="6" rx="7" ry="3"></ellipse><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"></path><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"></path>',
  relief:  '<rect x="2.5" y="6" width="19" height="12" rx="2.5"></rect><circle cx="12" cy="12" r="2.6"></circle><path d="M6 9.5v5M18 9.5v5"></path>',
  home:    '<path d="M3.5 11.2 12 4l8.5 7.2"></path><path d="M6 10.2V20h12v-9.8"></path>',
  quake:   '<path d="M2 12h3l2.5-7 4 14 3-9 2 2h5"></path>',
};

/* "auto:day" is resolved in the browser against the clock. Here it is resolved
   against the build time, which is the best this markup can do and is right on
   the day it is published. */
function daysSince(iso) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1);
}

function numGrid() {
  const stats = event.stats || [];
  if (!stats.length) return '';
  return stats.map(st => {
    let value = st.value;
    if (value === 'auto:day') {
      const d = daysSince(event.started);
      value = d ? `Day ${d}` : 'Day 1';
    }
    const cls = `n${st.tone === 'critical' ? ' critical' : ''}${st.small ? ' small' : ''}`;
    return `<button class="stat"${st.id ? ` id="${escAttr(st.id)}-stat"` : ''}`
      + ` data-detail="${escAttr(st.detail || '')}">`
      + '<span class="stat-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
      + ' stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'
      + (STAT_ICONS[st.icon] || STAT_ICONS.home) + '</svg></span>'
      + `<span class="${cls}"${st.id ? ` id="${escAttr(st.id)}-value"` : ''}>${escHtml(value)}</span>`
      + `<span class="l">${escHtml(st.label || '')}</span>`
      + `<span class="bar"><i style="width:${Number(st.bar) || 0}%"></i></span>`
      + '</button>';
  }).join('');
}
index = index.replace(
  /<!--ssr:numgrid-->[\s\S]*?<!--\/ssr:numgrid-->/,
  () => `<!--ssr:numgrid-->${numGrid()}<!--/ssr:numgrid-->`
);

/* The hero's day chip, the last hand-typed figure on the page. */
{
  const d = daysSince(event.started);
  index = index.replace(
    /(<span class="chip-meta" id="hero-day">)[\s\S]*?(<\/span>)/,
    (_m, a, b) => a + `Day ${d || 1}` + b
  );
}

/* The heading and its note come from the same file, for the same reason. */
index = index.replace(
  /(<h2 class="block-title" id="numbers-title">)[\s\S]*?(<\/h2>)/,
  (_m, a, b) => a + escHtml(event.numbersTitle || 'Where the numbers stand') + b
);
index = index.replace(
  /(<p class="numblock-sub" id="numbers-sub">)[\s\S]*?(<\/p>)/,
  (_m, a, b) => a + escHtml(
    `${event.numbersNote || ''}${event.asOf ? ` · as of ${nptLong(event.asOf)}` : ''}`
      + `${event.asOfSource ? ` · ${event.asOfSource}` : ''}`
  ) + b
);

/* ---------------------------------------------------------------------------
   The headline figures in the hero.

   Server-rendered rather than fetched, because a reader arriving on a phone on
   a slow connection should see the toll in the first paint. Three figures, no
   more: the ones people search for. The rest stay in the full table below.
   ------------------------------------------------------------------------- */
function heroFigures() {
  const wanted = ['dead', 'missing', 'people'];
  const picked = [];
  for (const icon of wanted) {
    const st = (event.stats || []).find(x => x.icon === icon && !picked.includes(x));
    if (st) picked.push(st);
  }
  if (!picked.length) return '';
  const cells = picked.map(st =>
    '<div class="hf-stat">'
    + `<span class="hf-n${st.tone === 'critical' ? ' critical' : ''}">${escHtml(st.value)}</span>`
    + `<span class="hf-l">${escHtml(st.label)}</span>`
    + '</div>'
  ).join('');
  const note = `${escHtml(event.asOfSource || 'Latest bulletin')}, ${escHtml(nptLong(event.asOf))}. `
    + '<a href="#numbers-title">Every figure and where it came from</a>';
  return `<div class="hf-row">${cells}</div><p class="hf-note">${note}</p>`;
}
index = index.replace(
  /<!--ssr:herofig-->[\s\S]*?<!--\/ssr:herofig-->/,
  () => `<!--ssr:herofig-->${heroFigures()}<!--/ssr:herofig-->`
);

/* ---------------------------------------------------------------------------
   The homepage title and description.

   These are what a reader actually sees in a search result, and they are the
   whole of the decision to click or to click the BBC instead. A fixed title
   like "Rasuwa Flood 2026 Toll, Map & Helplines" promises a number without
   giving one, so it loses to any headline that has the number in it.

   So they are written from event.json on every build, the same file the
   figures on the page come from. They cannot go stale relative to the page,
   because they are the page's own numbers.
   ------------------------------------------------------------------------- */
const statBy = (icon) => (event.stats || []).find(st => st.icon === icon) || null;
const dead = statBy('dead');
const missing = (event.stats || []).find(st => st.icon === 'missing');
const asOfShort = nptLong(event.asOf);

/* Google truncates a title around 60-65 characters. The figures go first
   because that is the part that survives the truncation. */
const headParts = [];
if (dead) headParts.push(`${dead.value} dead`);
if (missing) headParts.push(`${missing.value} missing`);
/* "27 August 2026, 5:00 pm NPT" cut back to "27 Aug", which is as much date
   as fits in a title and as much as a reader needs to see it is today's. */
const asOfDay = asOfShort.replace(/^(\d+)\s+(\w{3})\w*.*$/, '$1 $2');
const homeTitle = headParts.length
  ? `Nepal Flood Live: ${headParts.join(', ')} in Rasuwa, ${asOfDay}`
  : `Nepal Disaster Update Live: ${event.headline}`;

/* The description is the snippet. It answers the question the searcher typed
   rather than describing the website, and it says when it was last checked,
   because on a running disaster recency is the reason to pick one result. */
const homeDesc = [
  dead && missing
    ? `${event.asOfSource || 'Officials'}: ${dead.value} confirmed dead and ${missing.value} listed missing after the ${event.name}.`
    : event.lede,
  'Toll by district, rescue and helpline numbers, an interactive map of the valley, and the official relief fund.',
  `Updated ${asOfShort}.`,
].filter(Boolean).join(' ');

index = index.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escHtml(homeTitle)}</title>`);
index = index.replace(
  /(<meta name="description" content=")[^"]*(")/i,
  (_m, a, b) => a + escAttr(homeDesc) + b
);
index = index.replace(
  /(<meta property="og:title" content=")[^"]*(")/i,
  (_m, a, b) => a + escAttr(homeTitle) + b
);
for (const re of [
  /(<meta property="og:description" content=")[^"]*(")/i,
  /(<meta name="twitter:description" content=")[^"]*(")/i,
]) {
  index = index.replace(re, (_m, a, b) => a + escAttr(homeDesc) + b);
}
index = index.replace(
  /(<meta name="twitter:title" content=")[^"]*(")/i,
  (_m, a, b) => a + escAttr(homeTitle) + b
);

/* The share card. It is redrawn with the current figures on it, so the URL
   carries a version and Facebook stops serving a cached card with an old
   death toll. Both the og: and twitter: tags point at the same picture. */
const homeCard = ogFor('/');
const homeStory = ogStoryFor('/');
index = index.replace(
  /(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*(")/g,
  (_m, a, b) => a + homeCard + b
);
index = index.replace(
  /(<meta property="og:image:alt" content=")[^"]*(")/,
  (_m, a, b) => a + escAttr(`${event.headline || SITE}: live figures, map, helplines and the official relief fund`) + b
);
/* The vertical card, so a story-format share has something to pull. */
if (homeStory) {
  const tag = `<meta name="ndu:story-image" content="${escAttr(homeStory)}">`;
  index = /<meta name="ndu:story-image"[^>]*>/.test(index)
    ? index.replace(/<meta name="ndu:story-image"[^>]*>/, tag)
    : index.replace('<meta name="twitter:card"', tag + '\n<meta name="twitter:card"');
}


/* ---------------------------------------------------------------------------
   The live ticker.

   Search results for a breaking event are ordered partly by how recently a
   page actually changed, and a page whose newest visible thing is a card grid
   gives a crawler nothing to timestamp. This writes the last few briefings as
   a reverse-chronological list with a real <time> on each line, directly under
   the hero, in plain server-rendered HTML.

   It is the same archive the cards below come from, so it can never disagree
   with them, and it adds no new claims of its own.
   ------------------------------------------------------------------------- */
function ssrTicker(list) {
  if (!list.length) return '';
  const head = `<div class="ticker-head"><span class="tk-dot" aria-hidden="true"></span>`
    + `<h2>Latest updates</h2>`
    + `<span class="tk-when">Updated ${escHtml(nptLong(modified))}</span></div>`;
  const items = list.map(p => {
    const first = (p.body && p.body[0]) || '';
    const sum = first.length > 155 ? first.slice(0, 155).replace(/\s+\S*$/, '') + '…' : first;
    return `<li><time datetime="${escAttr(p.time)}">${escHtml(nptLong(p.time))}</time>`
      + `<a href="${escAttr(p.url)}">${escHtml(p.title)}</a>`
      + (sum ? `<p class="tk-sum">${escHtml(sum)}</p>` : '')
      + '</li>';
  }).join('');
  return head + `<ol>${items}</ol>`
    + `<p class="tk-foot"><a class="deeplink" href="/nepal-flood/rasuwa/live-updates/">Every update, newest first</a></p>`;
}

index = index.replace(
  /<!--ssr:ticker-->[\s\S]*?<!--\/ssr:ticker-->/,
  () => `<!--ssr:ticker-->${ssrTicker(posts.slice(0, 5))}<!--/ssr:ticker-->`
);

/* ---------------------------------------------------------------------------
   LiveBlogPosting on the front page.

   The front page is the URL people actually land on for this event, and until
   now it described itself as a NewsArticle: a thing written once. This says
   what it really is — coverage that is still running — and lists each briefing
   as a timestamped update inside it.

   coverageEndTime is required-in-practice and has to be in the future while
   coverage is live, otherwise the page reads as finished. It is set a few days
   ahead of the newest bulletin and moves forward with every build; when the
   briefings stop, it stops moving and the coverage correctly reads as closed.
   ------------------------------------------------------------------------- */
const ORG_REF = { '@id': `${SITE}/#organization` };
const coverageEnd = new Date(new Date(modified).getTime() + 3 * 86400 * 1000).toISOString();

const liveBlog = {
  '@context': 'https://schema.org',
  '@type': 'LiveBlogPosting',
  '@id': `${SITE}/#liveblog`,
  headline: homeTitle,
  description: homeDesc,
  url: `${SITE}/`,
  inLanguage: 'en',
  isAccessibleForFree: true,
  datePublished: '2026-08-26T12:00:00+05:45',
  dateModified: modified,
  coverageStartTime: event.startDate || '2026-08-26T09:00:00+05:45',
  coverageEndTime: coverageEnd,
  /* The one-paragraph "what is this event" that Google asks live coverage to
     carry, so an update read on its own still makes sense. */
  backstory: event.lede || '',
  image: [`${SITE}${ogFor('/').replace(SITE, '')}`],
  author: ORG_REF,
  publisher: ORG_REF,
  mainEntityOfPage: { '@id': `${SITE}/#webpage` },
  about: [{ '@id': `${SITE}/#event` }],
  liveBlogUpdate: posts.slice(0, 25).map(p => ({
    '@type': 'BlogPosting',
    '@id': SITE + p.url + '#post',
    url: SITE + p.url,
    headline: p.title,
    datePublished: p.time,
    dateModified: p.time,
    articleBody: (p.body || []).join(' ').slice(0, 600),
    author: ORG_REF,
    publisher: ORG_REF,
  })),
};

/* The markers sit outside the <script>, not inside it: an HTML comment inside
   a JSON-LD block makes the block invalid JSON, and an invalid block is
   ignored in silence. */
index = index.replace(
  /<!--ssr:liveblog-->[\s\S]*?<!--\/ssr:liveblog-->/,
  () => '<!--ssr:liveblog--><script type="application/ld+json" id="liveblog-schema">'
    + JSON.stringify(liveBlog, null, 1).replace(/</g, '\\u003c')
    + '</script><!--/ssr:liveblog-->'
);

/* ---------------------------------------------------------------------------
   Freshness tags.

   og:updated_time and article:modified_time are what the social crawlers and
   several news aggregators read to decide how old a link is. They carry the
   newest bulletin time, the same value as dateModified, so nothing here claims
   the page is newer than the news on it.
   ------------------------------------------------------------------------- */
for (const [prop, val] of [
  ['og:updated_time', modified],
  ['article:published_time', '2026-08-26T12:00:00+05:45'],
  ['article:modified_time', modified],
]) {
  const re = new RegExp(`(<meta property="${prop}" content=")[^"]*(")`);
  index = index.replace(re, (_m, a, b) => a + escAttr(val) + b);
}

/* news_keywords is the short list a news crawler reads as "what is this page
   about". It is built from the event rather than typed, so a change of event
   changes it too. */
const newsKeywords = [
  event.name,
  `${event.name} live`,
  'Nepal flood',
  'Nepal flood live updates',
  'Nepal flood death toll',
  ...(event.keywords || []),
].filter(Boolean).join(', ');
index = index.replace(
  /(<meta name="news_keywords" content=")[^"]*(")/,
  (_m, a, b) => a + escAttr(newsKeywords) + b
);

/* -- Google News sitemap ------------------------------------------------------
   A separate sitemap in the news namespace, holding only what was published in
   the last 48 hours. Google News reads this one for breaking coverage and
   ignores anything older, so it is deliberately short rather than a copy of
   the main sitemap. Articles that age out here stay in the ordinary sitemap and
   in the index; they are simply no longer being offered as breaking news.

   `news:publication_date` is the time the briefing was first published, never
   the time the build ran. Giving a build time here is the classic way a site
   gets its news sitemap ignored. */
const NEWS_WINDOW_HOURS = 48;
const newsCutoff = Date.now() - NEWS_WINDOW_HOURS * 3600 * 1000;

const newsItems = [
  /* The live front page counts as a news item in its own right: it is the URL
     that carries the running coverage and the one people search for. */
  {
    loc: `${SITE}/`,
    title: homeTitle,
    date: modified,
  },
  {
    loc: `${SITE}/nepal-flood/rasuwa/live-updates/`,
    title: 'Rasuwa flood: live updates',
    date: modified,
  },
  ...posts
    .filter(p => new Date(p.time).getTime() >= newsCutoff)
    .map(p => ({ loc: SITE + p.url, title: p.title, date: p.time })),
].filter(e => new Date(e.date).getTime() >= newsCutoff);

const xmlEsc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

write('news-sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsItems.map(e => `  <url>
    <loc>${e.loc}</loc>
    <news:news>
      <news:publication>
        <news:name>Nepal Disaster Update Live</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(e.date).toISOString()}</news:publication_date>
      <news:title>${xmlEsc(e.title)}</news:title>
    </news:news>
  </url>`).join('\n')}
</urlset>
`);

/* A sitemap index, so one URL in Search Console covers both files. */
write('sitemap-index.xml', `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap.xml</loc><lastmod>${new Date(modified).toISOString()}</lastmod></sitemap>
  <sitemap><loc>${SITE}/news-sitemap.xml</loc><lastmod>${new Date(modified).toISOString()}</lastmod></sitemap>
</sitemapindex>
`);

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
