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
import * as C from './content.mjs';
import * as I from './investigation.mjs';
import { isDisasterWireHeadline } from '../functions/api/global.js';

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

/* The world feed, fetched once per build so /global/ carries real text for a
   crawler and for a reader with JavaScript off. The live version refreshes in
   the browser. A build must never fail because a news feed is slow, so this
   falls back to the last snapshot on disk, and to an empty list before there
   has ever been one. */
const SNAPSHOT = join(ROOT, 'data', 'global-snapshot.json');
const GLOBAL_FEED_URL = process.env.NEPAL_GLOBAL_FEED_URL ||
  'https://nepaldisasterupdatelive.nxtimaginelabs.com/api/global';
function safeGlobalItems(items) {
  return (items || []).filter(item =>
    item && item.title && item.url &&
    // Nepal and Brazil are already narrowed by their own named-source
    // collectors. Preserve their non-English headlines in the static fallback.
    (item.kind !== 'press' || item.country === 'nepal' || item.country === 'brazil' ||
      isDisasterWireHeadline(item.title))
  );
}

/* Reserve a small current set for every location in the built fallback. Without
   this, a busy Nepal feed can fill all 24 snapshot slots and make Brazil, the
   United States or the wider world look empty until JavaScript refreshes it. */
function snapshotGlobalItems(items) {
  const filtered = safeGlobalItems(items);
  const reserved = [];
  const used = new Set();
  for (const country of ['nepal', 'brazil', 'united-states', 'global']) {
    let kept = 0;
    for (const item of filtered) {
      if (item.country !== country || used.has(item.url)) continue;
      reserved.push(item);
      used.add(item.url);
      kept++;
      if (kept === 6) break;
    }
  }
  const selected = reserved.concat(filtered.filter(item => !used.has(item.url)).slice(0, 24 - reserved.length));
  return selected.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
}

async function loadGlobalItems() {
  try {
    const res = await fetch(GLOBAL_FEED_URL, {
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const items = snapshotGlobalItems(json.items);
    if (items.length) {
      writeFileSync(SNAPSHOT, JSON.stringify({ updated: json.updated, items }, null, 2) + '\n');
      return items;
    }
  } catch (e) {
    console.log(`global snapshot: live fetch failed (${e.message}), using the last one`);
  }
  if (existsSync(SNAPSHOT)) {
    try { return snapshotGlobalItems(JSON.parse(readFileSync(SNAPSHOT, 'utf8')).items); } catch { return []; }
  }
  return [];
}
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
for (const dir of ['nepal-flood', 'nepal-disasters', 'updates', 'about', 'sources', 'contact', 'global', 'ne']) {
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


/* -- the Investigation tab's ledgers ----------------------------------------
   src/investigation.mjs states each figure once and names the briefing it
   came from by slug. This resolves those slugs against the archive that has
   just been loaded, so every row in the ledger carries the headline, the
   timestamp and the outward source links the briefing itself carries — and a
   correction to a briefing corrects the ledger with it.

   A slug that no longer resolves is a build error worth seeing rather than a
   citation that quietly prints nothing, so it is reported and the row is
   published with `source: null`, which the page renders as "citation missing"
   instead of as a fact with nothing behind it. */
function citeRows(rows) {
  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const missing = [];
  const out = rows.map(row => {
    const post = bySlug.get(row.from);
    if (!post) { missing.push(row.from); return { ...row, source: null }; }
    return {
      ...row,
      source: {
        title: post.title,
        url: post.url,
        time: post.time,
        outlets: (post.sources || []).map(s => ({ name: s.name, url: s.url }))
      }
    };
  });
  if (missing.length) {
    console.log(`  investigation: ${missing.length} citation(s) do not resolve: ${missing.join(', ')}`);
  }
  return out;
}

/* How the confirmed toll moved, read out of the timeline the site already
   keeps rather than typed again. Every row in C.TIMELINE that states a
   national figure is stamped with the hour it applies to; those are the
   points, and the chart is drawn from them. A row that states no figure, or
   states one for a single district, contributes nothing. */
function tollSeries() {
  const MONTHS = ['January','February','March','April','May','June','July',
    'August','September','October','November','December'];
  const YEAR = new Date(C.EVENT && C.EVENT.started ? C.EVENT.started : Date.now())
    .getUTCFullYear();

  const points = [];
  for (const [when, text] of C.TIMELINE) {
    /* "17:00 NPT, 28 August" / "Evening, 26 August" / "Friday, 28 August" */
    const day = /(\d{1,2})\s+([A-Z][a-z]+)/.exec(when);
    if (!day) continue;
    const month = MONTHS.indexOf(day[2]);
    if (month < 0) continue;
    const clock = /(\d{1,2}):(\d{2})/.exec(when);
    const hour = clock ? Number(clock[1]) : 12;
    const minute = clock ? Number(clock[2]) : 0;
    /* Nepal is UTC+5:45. Stored as an instant so the page can format it in
       whatever zone it is showing. */
    const at = Date.UTC(YEAR, month, Number(day[1]), hour - 5, minute - 45);

    /* Only sentences that state a national count of the dead in Nepal.

       Tibet keeps its own toll and the timeline records it — "China's state
       media raise the Tibet side death toll to 5" — which is a real figure
       for a different country, and reading it as a point on Nepal's curve
       drew the line down to 5 in the middle of the week. */
    if (/tibet side|china side|in tibet|xizang/i.test(text)) continue;

    /* Order matters. "alongside the 489 toll" puts the figure before the
       word, and a rule that reads forward from "toll" would take the first
       number of the district list that follows it instead — 186, not 489.
       Every capture starts with a digit, or "toll further, to 547" captures
       the comma. */
    const m =
      /\bthe\s+(\d[\d,]*)\s+toll\b/i.exec(text)
      || /(?:confirmed\s+)?toll[^.\d]{0,40}?(\d[\d,]*)/i.exec(text)
      || /(\d[\d,]*)\s+bodies(?:\s+and\s+human\s+remains)?\s+(?:found|recovered)/i.exec(text);
    if (!m) continue;
    const value = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(value) || value <= 0 || value > 100000) continue;

    /* Who said so, where the sentence names them. */
    const who = /(Nepal Police|NDRRMA|Nepalnews|Nepal News|Onlinekhabar|Nagarik News|ABC News|Kathmandu Post|Prime Minister’s Office)/i.exec(text);
    points.push({ at, value, source: who ? who[1] : null, when });
  }

  /* One point per instant, highest wins where two bodies published different
     figures for the same hour — the page says so in the note under the chart
     rather than silently averaging them. */
  const byInstant = new Map();
  for (const p of points) {
    const seen = byInstant.get(p.at);
    if (!seen || p.value > seen.value) byInstant.set(p.at, p);
  }
  /* This is a count of bodies recovered, so it cannot fall. A point below the
     running maximum is a figure from a body that had not caught up yet, not a
     drop in the toll, and plotting it puts a notch in a line that never
     notched. The chart's caption says this is what it is showing. */
  let high = 0;
  return [...byInstant.values()]
    .sort((a, b) => a.at - b.at)
    .filter(p => { if (p.value < high) return false; high = p.value; return true; });
}

const investigation = {
  updated: modified,
  site: SITE,
  /* Stated once here so the page can say what it is looking at without
     repeating the event's name in four places. */
  event: { name: event.name, started: event.started, where: event.where },
  aid: citeRows(I.AID),
  destroyed: citeRows(I.DESTROYED),
  unaccounted: citeRows(I.UNACCOUNTED),
  unknowns: I.UNKNOWNS,
  causes: C.CAUSES,
  hydropower: C.DAMAGE.hydropower.map(([name, where, note]) => ({ name, where, note })),
  reliefReleased: C.DAMAGE.reliefBreakdown.map(([where, amount]) => ({ where, amount })),
  tollSeries: tollSeries(),
  places: C.PLACES,
  sourceGroups: C.SOURCE_GROUPS
};
write('investigation.json', JSON.stringify(investigation, null, 2) + '\n');
console.log(`investigation.json: ${investigation.aid.length} aid rows, `
  + `${investigation.destroyed.length} damage rows, `
  + `${investigation.unaccounted.length} unaccounted groups, `
  + `${investigation.tollSeries.length} toll points`);

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
/* Who took each photograph, from the manifest og-build writes beside the
   files it downloads. The card prints it under the summary, so nothing on the
   page is a picture with no name against it. */
const PHOTO_INDEX = (() => {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'assets', 'photos', 'index.json'), 'utf8'));
  } catch { return {}; }
})();

function ssrTodayCards(list) {
  if (!list.length) {
    return '<p style="font-size:0.92rem; color:var(--text-muted);">No briefing has been published yet today. The <a href="/nepal-flood/rasuwa/live-updates/">live updates page</a> carries the raw newswire.</p>';
  }
  const cards = list.map((post, i) => {
    const uid = `ssr-${post.slug}-${i}`;
    const stamp = nptLong(post.time);
    const sourceNames = (post.sources || []).map(s => s.name).filter(Boolean);
    const sources = (post.sources || []).map(s =>
      s.url ? `<a href="${escAttr(s.url)}" target="_blank" rel="noopener nofollow">${escHtml(s.name || s.url)}</a>` : escHtml(s.name || '')
    ).join(', ');
    const ogName = post.url.replace(/^\/|\/$/g, '').replace(/\//g, '-');
    /* Versioned, so the day a drawn placeholder is replaced by a real
       photograph the readers who already have the placeholder cached see the
       photograph too. */
    const thumb = assetVersioned(`${ogName}-thumb.png`);
    const story = assetVersioned(`${ogName}-story.png`);
    const shot = PHOTO_INDEX[ogName] && PHOTO_INDEX[ogName].credit;
    /* The photographer's name, and nothing else. It used to read "Photograph:
       Nepal News · via Nepal Disaster Update", which credits this site under a
       picture on this site, on every card in the river: two lines of grey
       small-caps to say one thing a reader already knows. */
    const credit = !thumb ? ''
      : shot ? `Photograph: ${shot}`
      : `Graphic${sourceNames[0] ? `: figures from ${sourceNames[0]}` : ''}`;
    return `<article class="post-card today-card${thumb ? '' : ' no-photo'}" data-title="${escAttr(post.title)}"`
      + ` data-permalink="${escAttr(post.url)}"`
      + (story ? ` data-story="${escAttr(story)}"` : '') + '>'
      + (thumb
        ? '<div class="tc-media">'
          + `<a class="post-photo-link" href="${escAttr(post.url)}" tabindex="-1" aria-hidden="true">`
          + `<img class="post-photo" loading="lazy" decoding="async" width="800" height="450"`
          + ` src="${escAttr(thumb)}" alt=""></a>`
          + '</div>'
        : '')
      + '<div class="post-body">'
      + `<p class="tc-kicker">${escHtml(stamp)}${post.revised ? ' <span class="rev">updated</span>' : ''}</p>`
      + `<p class="tc-title"><a href="${escAttr(post.url)}">${escHtml(post.title)}</a></p>`
      + `<div class="post-summary clamped" id="${uid}" data-expand="${uid}">${post.body.map(b => `<p>${escHtml(b)}</p>`).join('')}</div>`
      + (credit ? `<p class="tc-credit">${escHtml(credit)}</p>` : '')
      + (sources ? `<div class="tc-sources"><b>Sources:</b> ${sources}</div>` : '')
      + '</div>'
      + `<div class="post-foot"><a class="post-btn" href="${escAttr(post.url)}">Full briefing</a>`
      + '<button class="post-btn" type="button" data-share="1">Share</button></div>'
      + '</article>';
  }).join('');
  /* The same river the client renderer draws, so the markup a crawler is
     served and the markup a reader ends up with are the same shape. */
  return `<div class="river">${cards}</div>`
    + `<p class="today-updated">Updated ${escHtml(nptLong(modified))}</p>`;
}

/* ---------------------------------------------------------------------------
   The two tables that used to be typed by hand.

   "Confirmed dead, and where" carried a district breakdown from the police
   bulletin of 27 August, and "Damage and rescue, official numbers" carried
   the NDRRMA update of 30 August. Both were still on the page days later,
   under a hero that had already moved on — the page contradicting itself in
   two places at once. Both are now written from event.json, which is the file
   the scheduled reader keeps current, so neither can drift from the counters
   again.
   ------------------------------------------------------------------------ */

/** The counter event.json holds for a label, or null. */
function statFor(label) {
  return (event.stats || []).find(s => s && s.label === label) || null;
}

/* Both wordings, because a counter written by an older pass still says
   "Earlier detail" where a new one says "Earlier note". */
const EARLIER = /Earlier (?:detail|note)\b/;

/** A counter's prose with the archived earlier text cut off — that clause is
 *  useful in the tile panel, and far too long for a table cell. */
function shortDetail(stat) {
  const text = String((stat && stat.detail) || '');
  const at = text.search(EARLIER);
  return (at === -1 ? text : text.slice(0, at)).replace(/\s*Source:\s*https?:\S+/g, '').trim();
}

function ssrTollNepal() {
  const dead = statFor('confirmed dead');
  const missing = statFor('listed missing in Nepal');
  const d = event.districts;

  const intro = 'The flood started in Rasuwa, but the water carried people far downstream. '
    + (missing ? `${missing.value} people are still listed missing. ` : '')
    + 'A district here is where a body was found, not where the person was from.';

  const rows = d && Array.isArray(d.rows) && d.rows.length
    ? d.rows.map(r => `<tr><td>${escHtml(r.district)}</td><td class="num-cell">${escHtml(Number(r.value).toLocaleString('en-US'))}</td></tr>`).join('')
    : '';

  const stamp = d && d.time ? nptLong(d.time) : '';
  /* The breakdown and the headline are two different counts of the same
     thing, taken at two different moments by two different bodies, so they
     are almost never equal — and a reader who notices the gap deserves to be
     told which way it runs rather than left to wonder which number is wrong.
     The old wording only ever explained a headline that was higher. */
  const headline = dead ? Number(String(dead.value).replace(/\D/g, '')) : null;
  const total = d ? Number(d.total || 0) : 0;
  const gap = Number.isFinite(headline) && headline && total
    ? (headline > total
        ? `The headline figure above is higher, at ${headline.toLocaleString('en-US')}: it takes the newest national total any source has published, and this bulletin is the newest one broken down by district.`
        : headline < total
          ? `The headline figure above is lower, at ${headline.toLocaleString('en-US')}: it takes the newest national total any source has published, and this police bulletin counts ${(total - headline).toLocaleString('en-US')} more.`
          : 'The headline figure above is the same total, from the same count.')
    : '';
  const note = rows
    ? `${escHtml(d.source || 'Nepal Police')} bulletin${stamp ? ', ' + escHtml(stamp) : ''}, `
      + `totalling ${escHtml(total.toLocaleString('en-US'))}, which is the same total the bulletin itself states. `
      + escHtml(gap)
    : 'No district breakdown has been published yet today. The national figure above stands.';

  return '<details open>'
    + '<summary>'
    + '<span class="toll-flag" aria-hidden="true"><svg class="flag" style="width:18px;height:22px"><use href="#np-flag"></use></svg></span>'
    + 'Nepal'
    + `<span class="toll-n critical">${escHtml(dead ? dead.value : '—')}</span>`
    + '</summary>'
    + '<div class="accord-body">'
    + `<p style="margin-bottom:10px;">${escHtml(intro)}</p>`
    + (rows
      ? '<div class="table-scroll"><table class="data-table toll-table" id="toll-districts">'
        + '<thead><tr><th>District</th><th>Bodies recovered</th></tr></thead>'
        + `<tbody>${rows}</tbody></table></div>`
      : '')
    + `<p style="font-size:0.78rem; color:var(--text-faint); margin:8px 0 0;" id="toll-districts-note">${note}</p>`
    + '</div></details>';
}

/* Every counter the page holds, in one table, straight from the same file the
   tiles read. The day counter is skipped: it is computed at render time and
   is not a reported figure. */
function ssrOfficial() {
  const stats = (event.stats || []).filter(s => s && s.icon !== 'day' && s.value !== 'auto:day');
  if (!stats.length) return '<p class="measure">No official figures are published yet.</p>';

  const rows = stats.map(s =>
    `<tr><td>${escHtml(s.label)}</td><td class="num-cell">${escHtml(s.value)}</td>`
    + `<td>${escHtml(shortDetail(s))}</td></tr>`
  ).join('');

  return `<p class="measure" style="margin-top:6px; color:var(--text-muted); font-size:0.93rem;">`
    + 'The same figures as the counters at the top of this page, from the same file, so the two cannot disagree'
    + (event.asOf ? `. Last moved ${escHtml(nptLong(event.asOf))}` : '')
    + (event.asOfSource ? `, from ${escHtml(event.asOfSource)}` : '') + '.</p>'
    + '<div class="table-scroll"><table class="data-table stat-table">'
    + '<thead><tr><th>Figure</th><th>Count</th><th>What the source said</th></tr></thead>'
    + `<tbody>${rows}</tbody></table></div>`
    + '<p style="margin-top:14px; font-size:0.78rem; color:var(--text-faint);">'
    + 'Search and rescue is still running, so every number here can change. '
    + 'Tap any counter at the top of the page for the sentence it came from. '
    + '<span id="official-check-status"></span></p>';
}

const escHtml = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (v) => escHtml(v).replace(/"/g, '&quot;');

let index = read('index.html');
const before = index;

/* ---------------------------------------------------------------------------
   The Investigation tab, rendered on the server.

   The rest of the site answers "what is happening". This answers "how do you
   know", and it is the one part of the site where every claim has to arrive
   already carrying its citation. So it is built here rather than fetched and
   drawn by the browser: the ledgers, the curve and the tables are in the HTML
   a crawler reads and a reader with a dead connection still gets, and the
   page's own script only repaints the two panels that are genuinely live —
   the board and the district table — from /api/figures.
   ------------------------------------------------------------------------- */
function invHead(n, kicker, title, note, why) {
  return `<div class="inv-head"><span class="inv-num">${escHtml(n)}</span>`
    + `<div><p class="inv-kicker">${escHtml(kicker)}</p>`
    + `<h3>${escHtml(title)}</h3>`
    + (note ? `<p class="inv-note">${note}</p>` : '')
    + (why ? `<details class="inv-why"><summary>Why it&rsquo;s set out this way</summary><p>${why}</p></details>` : '')
    + '</div></div>';
}

/* One citation line: this site's own briefing, then the outlets it read. */
function invCite(source) {
  if (!source) {
    return '<p class="inv-cite inv-cite-missing">Citation missing: the briefing this row '
      + 'was drawn from is no longer in the archive.</p>';
  }
  /* A briefing that drew on six reports from the same newsroom listed that
     newsroom six times. One entry per outlet, in the order it first appears,
     and the first URL is the one linked. */
  const seen = new Set();
  const outlets = (source.outlets || [])
    .filter(o => o && o.name && !seen.has(o.name) && seen.add(o.name))
    .map(o => o.url
      ? `<a href="${escAttr(o.url)}" target="_blank" rel="noopener nofollow">${escHtml(o.name)}</a>`
      : escHtml(o.name))
    .join(', ');
  return '<p class="inv-cite">'
    + `<a class="inv-cite-post" href="${escAttr(source.url)}">${escHtml(source.title)}</a>`
    + `<span class="inv-cite-when">${escHtml(nptLong(source.time))}</span>`
    + (outlets ? `<span class="inv-cite-out">Reported by ${outlets}</span>` : '')
    + '</p>';
}

/* The curve of the confirmed toll. Drawn as an inline SVG so it needs no
   library, no script and no second request, and so it is still a picture in a
   feed reader or a print-out. */
function invCurve(series) {
  if (series.length < 3) return '';
  const W = 720, H = 260, L = 46, R = 14, T = 16, B = 34;
  const t0 = series[0].at, t1 = series[series.length - 1].at;
  const vMax = Math.max(...series.map(p => p.value));
  /* Round the ceiling up to something a reader can read off the axis. */
  const step = vMax > 800 ? 400 : vMax > 300 ? 200 : 100;
  const top = Math.ceil(vMax / step) * step;

  const x = t => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = v => T + (1 - v / top) * (H - T - B);

  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.at).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const area = `${line}L${x(t1).toFixed(1)},${y(0).toFixed(1)}L${x(t0).toFixed(1)},${y(0).toFixed(1)}Z`;

  const gridlines = [];
  for (let v = 0; v <= top; v += step) {
    gridlines.push(`<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="inv-grid"/>`
      + `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" class="inv-axis" text-anchor="end">${v.toLocaleString('en-US')}</text>`);
  }

  /* One tick per calendar day in Nepal time, not per data point: the points
     bunch up on the days the police published four bulletins. Labels are kept
     short ("2 Sep") and any that would sit within 52px of the last one drawn
     is dropped, so the axis never overlaps itself. */
  const MONTH_ABBR = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' };
  const days = [];
  let lastDay = '';
  let lastLabelX = -Infinity;
  for (const p of series) {
    const day = nptDay(new Date(p.at).toISOString());
    if (day === lastDay) continue;
    lastDay = day;
    const px = x(p.at);
    if (px - lastLabelX < 52) continue;
    lastLabelX = px;
    const label = nptLong(new Date(p.at).toISOString(), false)
      .replace(/ \d{4}$/, '')
      .replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/, (m) => MONTH_ABBR[m]);
    days.push(`<text x="${px.toFixed(1)}" y="${H - 10}" class="inv-axis" text-anchor="middle">${escHtml(label)}</text>`);
  }

  const dots = series.map(p =>
    `<circle cx="${x(p.at).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.4" class="inv-dot">`
    + `<title>${escHtml(p.value.toLocaleString('en-US'))} confirmed dead, ${escHtml(p.when)}`
    + (p.source ? `, ${escHtml(p.source)}` : '') + '</title></circle>').join('');

  const first = series[0], last = series[series.length - 1];
  return '<figure class="inv-chart">'
    + `<svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet" `
    + `aria-label="The confirmed death toll from ${escAttr(first.value.toLocaleString('en-US'))} on `
    + `${escAttr(first.when)} to ${escAttr(last.value.toLocaleString('en-US'))} on ${escAttr(last.when)}.">`
    + gridlines.join('')
    + `<path d="${area}" class="inv-area"/><path d="${line}" class="inv-line"/>`
    + dots + days.join('')
    + '</svg>'
    + '<figcaption>Every point is a figure a named body published, at the hour it applies to. '
    + 'Hover or tap a point for the source. The line only rises because this is a count of bodies '
    + 'recovered: where a slower body was still publishing an older, lower figure, it is left off '
    + 'rather than drawn as a fall.'
    + '</figcaption></figure>';
}

/* The board, server-rendered from the same event.json the hero uses. The
   page's script repaints it from /api/figures a second later; this is what a
   crawler and a reader with no JavaScript get. */
function invBoard() {
  const rows = (event.stats || []).map(stat => {
    const detail = String(stat.detail || '');
    /* "since the flood" carries the token "auto:day", which the dashboard's
       own script resolves against the reader's clock. Printed raw it read as
       "auto:day" in the Count column. */
    const shown = stat.value === 'auto:day'
      ? (daysSince(event.started) ? `Day ${daysSince(event.started)}` : 'Day 1')
      : stat.value;
    /* The updater writes "Source: <url>" into the detail, and archives the
       previous editorial note behind "Earlier detail (as of …)". Split them:
       the live sentence is the claim, the archived one is context and must
       not be read as describing the current figure. */
    const urlMatch = /Source:\s*(https?:\/\/\S+)/.exec(detail);
    const url = urlMatch ? urlMatch[1] : null;
    const cut = detail.search(EARLIER);
    /* Every citation URL comes out of both halves, not just the first: the
       archived clause carries one too, and it was being printed as a bare
       address in the middle of the sentence. */
    const strip = t => t.replace(/\s*Source:\s*https?:\/\/\S+/g, '').trim();
    const now = strip(cut > -1 ? detail.slice(0, cut) : detail);
    const earlier = cut > -1 ? strip(detail.slice(cut)) : '';
    let host = '';
    try { if (url) host = new URL(url).hostname.replace(/^www\./, ''); } catch { host = ''; }
    return '<tr>'
      + `<td class="inv-b-label">${escHtml(stat.label)}</td>`
      + `<td class="num-cell inv-b-value${stat.tone === 'critical' ? ' critical' : ''}">${escHtml(shown)}</td>`
      /* Three separate slots, because the page's own script repaints the
         first two from /api/figures a moment later and must not take the
         archived note down with them. */
      + '<td class="inv-b-said">'
      + `<span class="inv-b-sentence">${escHtml(now) || 'No sentence recorded.'}</span>`
      + (url ? `<a class="inv-b-src" href="${escAttr(url)}" target="_blank" rel="noopener nofollow">${escHtml(host)} &#8599;</a>` : '<span class="inv-b-src"></span>')
      + (earlier ? `<details class="inv-earlier"><summary>What this counter said before</summary><p>${escHtml(earlier)}</p></details>` : '')
      + '</td></tr>';
  }).join('');

  return invHead('01', 'The board', 'Every number on this site, and the sentence it came from',
      `Last moved ${escHtml(nptLong(event.asOf))}, from ${escHtml(event.asOfSource || 'the sources')}.`,
      'Every figure carries the report it came from, and the figures other newsrooms are publishing for the same thing. Where they disagree, the board takes the newest figure stated as a national total.')
    + '<div class="inv-live" id="inv-live-note"><span class="livedot" aria-hidden="true"></span>'
    + '<span id="inv-checked">Checking the sources&hellip;</span></div>'
    + '<div class="table-scroll"><table class="data-table inv-board" id="inv-board-table">'
    + '<thead><tr><th>Figure</th><th>Count</th><th>What the source said, and where</th></tr></thead>'
    + `<tbody>${rows}</tbody></table></div>`;
}

function invDistricts() {
  const d = event.districts;
  if (!d || !Array.isArray(d.rows) || !d.rows.length) return '';
  const total = d.rows.reduce((sum, r) => sum + r.value, 0);
  const max = Math.max(...d.rows.map(r => r.value));
  const rows = d.rows.map(r => {
    const share = total ? (r.value / total * 100) : 0;
    return '<tr>'
      + `<td>${escHtml(r.district)}</td>`
      + `<td class="inv-bar-cell"><span class="inv-bar"><i style="width:${(r.value / max * 100).toFixed(1)}%"></i></span></td>`
      + `<td class="num-cell">${escHtml(r.value.toLocaleString('en-US'))}</td>`
      + `<td class="num-cell inv-share">${share.toFixed(1)}%</td>`
      + '</tr>';
  }).join('');
  return invHead('03', 'Recovery', 'Where the dead were found',
      'A district here is where a body was found, not where the person was from.',
      'The flood started in Rasuwa; the water then carried people the length of the Trishuli and into the Narayani, which is why most were recovered far downstream.')
    + '<div class="table-scroll"><table class="data-table inv-dist" id="inv-dist-table">'
    + '<thead><tr><th>District</th><th class="inv-bar-head">Share of bodies recovered</th><th>Bodies</th><th>Share</th></tr></thead>'
    + `<tbody>${rows}</tbody></table></div>`
    + `<p class="inv-foot" id="inv-dist-note">${escHtml(d.source || 'Nepal Police')} bulletin`
    + (d.time ? `, ${escHtml(nptLong(d.time))}` : '')
    + `, totalling ${escHtml(total.toLocaleString('en-US'))}, which is the same total the bulletin itself states. `
    + `<a href="${escAttr(d.url || 'https://nepalpolice.gov.np/')}" target="_blank" rel="noopener nofollow">Read the bulletin &#8599;</a></p>`;
}

/* The descent. Seven places between the ice and the last reported damage,
   with the height each one sits at, drawn as the profile the water actually
   fell down. The map tab has these as pins on a map; a map cannot show a drop
   of four and a half kilometres, and the drop is the reason a valley 60 km
   downstream was hit by something that started as a landslide. */
function invDescent(places) {
  const stops = places.map(p => ({
    name: p.name,
    country: p.country,
    text: p.text,
    /* "~5,000 m" / "~460 m" */
    elev: Number(String(p.elev || '').replace(/[^\d]/g, '')) || null
  })).filter(p => p.elev);
  if (stops.length < 3) return '';

  /* The axis labels here carry a unit — "5,000 m" — so the gutter has to be
     wider than the toll chart's, or the first digit is cut off by the
     viewBox. */
  const W = 720, H = 250, L = 78, R = 44, T = 20, B = 58;
  const top = Math.ceil(Math.max(...stops.map(s => s.elev)) / 1000) * 1000;
  const x = i => L + (i / (stops.length - 1)) * (W - L - R);
  const y = v => T + (1 - v / top) * (H - T - B);

  const line = stops.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.elev).toFixed(1)}`).join('');
  const area = `${line}L${x(stops.length - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;

  const grid = [];
  for (let v = 0; v <= top; v += 1000) {
    grid.push(`<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="inv-grid"/>`
      + `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" class="inv-axis" text-anchor="end">${v.toLocaleString('en-US')} m</text>`);
  }

  const dots = stops.map((s, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(s.elev).toFixed(1)}" r="4" class="inv-dot">`
    + `<title>${escHtml(s.name)}, ${escHtml(s.country)}, about ${escHtml(s.elev.toLocaleString('en-US'))} m</title></circle>`).join('');

  /* Short labels under the axis: the first word of the name is the one a
     reader recognises, and seven full names at this width would collide. */
  const labels = stops.map((s, i) => {
    const short = s.name.split(/[,/]/)[0].split(' ').slice(0, 2).join(' ');
    return `<text x="${x(i).toFixed(1)}" y="${H - 30}" class="inv-axis" text-anchor="middle"`
      + ` transform="rotate(-24 ${x(i).toFixed(1)} ${H - 30})">${escHtml(short)}</text>`;
  }).join('');

  const rows = stops.map(s =>
    '<article class="inv-stop">'
    + `<p class="inv-stop-h">${escHtml(s.elev.toLocaleString('en-US'))} m</p>`
    + `<h4>${escHtml(s.name)}</h4>`
    + `<p class="inv-card-by">${escHtml(s.country)}</p>`
    + `<p class="inv-card-note">${escHtml(s.text)}</p>`
    + '</article>').join('');

  const drop = stops[0].elev - stops[stops.length - 1].elev;
  return invHead('04', 'The descent', 'Down the valley, place by place',
      `A drop of about ${escHtml(drop.toLocaleString('en-US'))} metres between the ice and the furthest reported damage.`,
      'This is why a landslide on the Tibetan side was still moving houses 60 km inside Nepal: on ground this steep the water never had to slow down.')
    + '<figure class="inv-chart">'
    + `<svg viewBox="0 0 ${W} ${H}" role="img" preserveAspectRatio="xMidYMid meet" `
    + `aria-label="The river's height falling from about ${escAttr(stops[0].elev.toLocaleString('en-US'))} metres `
    + `at the source area to about ${escAttr(stops[stops.length - 1].elev.toLocaleString('en-US'))} metres at `
    + `${escAttr(stops[stops.length - 1].name)}.">`
    + grid.join('')
    + `<path d="${area}" class="inv-area"/><path d="${line}" class="inv-line"/>`
    + dots + labels
    + '</svg>'
    + '<figcaption>Heights are approximate. Hover or tap a point for the place it marks.'
    + '</figcaption></figure>'
    + `<div class="inv-stops">${rows}</div>`;
}

function invUnaccounted(rows) {
  const cards = rows.map(r =>
    '<article class="inv-card">'
    + `<p class="inv-card-fig">${escHtml(r.figure)}</p>`
    + `<h4>${escHtml(r.group)}</h4>`
    + `<p class="inv-card-by">Counted by ${escHtml(r.counter)}</p>`
    + `<p class="inv-card-note">${escHtml(r.detail)}</p>`
    + invCite(r.source)
    + '</article>').join('');
  return invHead('05', 'The missing', 'Who is still unaccounted for, and who is counting them',
      '<strong>These do not add up, and they are not meant to.</strong> Out of contact does not mean dead.',
      'Each row counts a different population with a different cut-off; several are an association&rsquo;s or an embassy&rsquo;s own estimate rather than a police figure, and they overlap. Summing them would produce a number nobody has published.')
    + `<div class="inv-cards">${cards}</div>`;
}

function invAid(rows) {
  const money = rows.filter(r => r.kind === 'money');
  const other = rows.filter(r => r.kind !== 'money');

  /* Grouped by currency, and scaled only within a currency. Converting a euro
     pledge and a rupee pledge onto one axis would invent a total and an
     exchange rate that no source published. */
  const byCurrency = new Map();
  for (const r of money) {
    if (!r.currency || !r.value) continue;
    if (!byCurrency.has(r.currency)) byCurrency.set(r.currency, []);
    byCurrency.get(r.currency).push(r);
  }
  const groups = [...byCurrency.entries()].map(([currency, list]) => {
    const max = Math.max(...list.map(r => r.value));
    const bars = list.sort((a, b) => b.value - a.value).map(r =>
      '<div class="inv-aid-row">'
      + `<div class="inv-aid-who"><b>${escHtml(r.giver)}</b>`
      + `<span class="inv-aid-tag inv-tag-${escAttr(r.origin)}">${r.origin === 'domestic' ? 'Inside Nepal' : 'From abroad'}</span></div>`
      + `<div class="inv-aid-bar"><i style="width:${(r.value / max * 100).toFixed(1)}%"></i></div>`
      + `<div class="inv-aid-amt">${escHtml(r.stated)}</div>`
      + `<div class="inv-aid-what">${escHtml(r.what)}${invCite(r.source)}</div>`
      + '</div>').join('');
    return `<div class="inv-aid-group"><p class="inv-aid-cur">Stated in ${escHtml(currency)}</p>${bars}</div>`;
  }).join('');

  const rest = other.concat(money.filter(r => !r.currency || !r.value)).map(r =>
    '<article class="inv-card inv-card-tight">'
    + `<p class="inv-card-fig inv-card-fig-sm">${escHtml(r.stated)}</p>`
    + `<h4>${escHtml(r.giver)}</h4>`
    + `<p class="inv-card-note">${escHtml(r.what)}</p>`
    + invCite(r.source)
    + '</article>').join('');

  return invHead('06', 'Aid', 'What has been sent, by whom, and what it was for',
      'Each row carries the figure its giver stated, in the currency they stated it in. Bars compare within a currency only.',
      'There is no combined total: adding a euro pledge to a rupee deposit would produce a headline figure nobody published, and a wrong one the moment a rate moved.')
    + `<div class="inv-aid">${groups}</div>`
    + '<h4 class="inv-sub">Help that is not money</h4>'
    + `<div class="inv-cards">${rest}</div>`;
}

function invDamage(rows, hydro, relief) {
  const cards = rows.map(r =>
    '<article class="inv-card">'
    + `<p class="inv-card-fig">${escHtml(r.figure)}</p>`
    + `<h4>${escHtml(r.what)}</h4>`
    + `<p class="inv-card-note">${escHtml(r.detail)}</p>`
    + invCite(r.source)
    + '</article>').join('');

  const hydroRows = hydro.map(h =>
    `<tr><td>${escHtml(h.name)}</td><td>${escHtml(h.where)}</td><td>${escHtml(h.note)}</td></tr>`).join('');
  const reliefRows = relief.map(r =>
    `<tr><td>${escHtml(r.where)}</td><td class="num-cell">${escHtml(r.amount)}</td></tr>`).join('');

  return invHead('07', 'Damage', 'What the flood destroyed',
      'Every figure here is preliminary, and the people who published them said so.',
      'Four districts were still being surveyed when the headline damage estimate was given, and it covers roads and bridges only. Hydropower and private property are not in it.')
    + `<div class="inv-cards">${cards}</div>`
    + '<h4 class="inv-sub">The hydropower corridor, project by project</h4>'
    + '<div class="table-scroll"><table class="data-table">'
    + '<thead><tr><th>Project</th><th>District</th><th>What is reported</th></tr></thead>'
    + `<tbody>${hydroRows}</tbody></table></div>`
    + '<h4 class="inv-sub">Public money released, by destination</h4>'
    + '<div class="table-scroll"><table class="data-table">'
    + '<thead><tr><th>Where</th><th>Amount</th></tr></thead>'
    + `<tbody>${reliefRows}</tbody></table></div>`;
}

function invCauses(causes) {
  const items = causes.map((c, i) =>
    `<li class="inv-cause inv-cause-${i}">`
    + `<span class="inv-rank">${escHtml(c.rank)}</span>`
    + `<h4>${escHtml(c.title)}</h4>`
    + `<p>${escHtml(c.text)}</p></li>`).join('');
  return invHead('08', 'Cause', 'What is claimed, ranked by how well it is supported',
      'No government has confirmed a cause. These are the explanations on the table, ordered by how far the evidence currently carries them.',
      'The order is a reading of what the cited bodies have said, not a finding of its own.')
    + `<ol class="inv-causes">${items}</ol>`;
}

function invUnknowns(list) {
  const items = list.map(u =>
    `<div class="inv-unknown"><h4>${escHtml(u.q)}</h4><p>${escHtml(u.a)}</p></div>`).join('');
  return invHead('09', 'Gaps', 'What nobody has published',
      'A missing figure is a finding too. These are the questions no source has answered.')
    + `<div class="inv-unknowns">${items}</div>`;
}

function invSources(groups) {
  const blocks = groups.map(g =>
    '<div class="inv-srcgroup">'
    + `<h4>${escHtml(g.title)}</h4>`
    + `<p class="inv-card-note">${escHtml(g.note)}</p>`
    + '<ul>' + g.links.map(([url, name, what]) =>
        `<li><a href="${escAttr(url)}" target="_blank" rel="noopener nofollow">${escHtml(name)} &#8599;</a>`
        + (what ? `<span>${escHtml(what)}</span>` : '') + '</li>').join('')
    + '</ul></div>').join('');
  return invHead('10', 'Sources', 'Everything this site reads, and what it reads it for',
      'The counters are resolved across all of these at once. '
      + '<span id="inv-source-count"></span>')
    + `<div class="inv-srcs">${blocks}</div>`;
}

function ssrInvestigation() {
  const s = investigation;
  return '<div class="inv">'
    + '<section class="inv-sec" id="inv-board">' + invBoard() + '</section>'
    + '<section class="inv-sec" id="inv-curve">'
      + invHead('02', 'The count', 'How the confirmed toll moved, hour by hour',
          `From ${escHtml(s.tollSeries[0] ? s.tollSeries[0].value.toLocaleString('en-US') : '')} on the evening of the flood `
          + `to ${escHtml(s.tollSeries.length ? s.tollSeries[s.tollSeries.length - 1].value.toLocaleString('en-US') : '')} now, `
          + `across ${escHtml(String(s.tollSeries.length))} published figures from `
          + `${escHtml(String(new Set(s.tollSeries.map(p => p.source).filter(Boolean)).size))} named bodies.`,
          'The line only rises because this counts bodies recovered. Where a slower source was still publishing an older, lower figure, that point is left off rather than drawn as a fall.')
      + invCurve(s.tollSeries)
    + '</section>'
    + '<section class="inv-sec" id="inv-dist">' + invDistricts() + '</section>'
    + '<section class="inv-sec" id="inv-descent">' + invDescent(s.places) + '</section>'
    + '<section class="inv-sec" id="inv-missing">' + invUnaccounted(s.unaccounted) + '</section>'
    + '<section class="inv-sec" id="inv-aid">' + invAid(s.aid) + '</section>'
    + '<section class="inv-sec" id="inv-damage">' + invDamage(s.destroyed, s.hydropower, s.reliefReleased) + '</section>'
    + '<section class="inv-sec" id="inv-cause">' + invCauses(s.causes) + '</section>'
    + '<section class="inv-sec" id="inv-gaps">' + invUnknowns(s.unknowns) + '</section>'
    + '<section class="inv-sec" id="inv-sources">' + invSources(s.sourceGroups) + '</section>'
    + '</div>';
}

index = index.replace(
  /<!--ssr:investigation-->[\s\S]*?<!--\/ssr:investigation-->/,
  () => `<!--ssr:investigation-->${ssrInvestigation()}<!--/ssr:investigation-->`
);

index = index.replace(
  /<!--ssr:toll-nepal-->[\s\S]*?<!--\/ssr:toll-nepal-->/g,
  () => `<!--ssr:toll-nepal-->${ssrTollNepal()}<!--/ssr:toll-nepal-->`
);
index = index.replace(
  /<!--ssr:official-->[\s\S]*?<!--\/ssr:official-->/g,
  () => `<!--ssr:official-->${ssrOfficial()}<!--/ssr:official-->`
);

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
  /(<meta (?:property="og:image"|property="og:image:secure_url"|name="twitter:image") content=")[^"]*(")/g,
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
/* "Updated 3 September 2026, 10:21 pm NPT" is 38 characters. The ticker's
   header sits in a 285px column on the dashboard, where that wraps and leaves
   "NPT" alone on a second line — which is what the header has been showing.
   Same facts, month abbreviated, and it fits on one line. */
function nptCompact(iso) {
  return nptLong(iso)
    .replace(/^(\d+) ([A-Za-z]{3})[a-z]* (\d{4}), /, '$1 $2 $3 \u00b7 ');
}

function ssrTicker(list) {
  if (!list.length) return '';
  const head = `<div class="ticker-head"><span class="tk-dot" aria-hidden="true"></span>`
    + `<h2>Latest updates</h2>`
    + `<span class="tk-when">Updated ${escHtml(nptCompact(modified))}</span></div>`;
  const items = list.map(p => {
    const first = (p.body && p.body[0]) || '';
    const sum = first.length > 155 ? first.slice(0, 155).replace(/\s+\S*$/, '') + '…' : first;
    return `<li><time datetime="${escAttr(p.time)}">${escHtml(nptCompact(p.time))}</time>`
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
   The standing right rail.

   Desktop only in the layout, but rendered on the server all the same: it is
   the toll and the newest headlines, and both belong in the HTML a crawler
   reads. Everything here is derived from the same event.json and the same
   archive as the hero and the ticker, so the rail cannot quietly disagree
   with the page beside it.
   ------------------------------------------------------------------------- */
function railFigures() {
  const wanted = ['dead', 'missing', 'people'];
  const picked = [];
  for (const icon of wanted) {
    const st = (event.stats || []).find(x => x.icon === icon && !picked.includes(x));
    if (st) picked.push(st);
  }
  if (!picked.length) return '';
  const rows = picked.map(st =>
    '<div class="rail-fig">'
    + `<span class="rf-n${st.tone === 'critical' ? ' critical' : ''}">${escHtml(st.value)}</span>`
    + `<span class="rf-l">${escHtml(st.label)}</span>`
    + '</div>'
  ).join('');
  const note = `<p class="rail-note">${escHtml(event.asOfSource || 'Latest bulletin')}, `
    + `${escHtml(nptLong(event.asOf))}. <a href="#numbers-title">Every figure, and where it came from</a></p>`;
  return rows + note;
}
index = index.replace(
  /<!--ssr:railfig-->[\s\S]*?<!--\/ssr:railfig-->/,
  () => `<!--ssr:railfig-->${railFigures()}<!--/ssr:railfig-->`
);

function railLatest(list) {
  return list.map(p =>
    `<li><time datetime="${escAttr(p.time)}">${escHtml(nptLong(p.time))}</time>`
    + `<a href="${escAttr(p.url)}">${escHtml(p.title)}</a></li>`
  ).join('');
}
index = index.replace(
  /<!--ssr:raillatest-->[\s\S]*?<!--\/ssr:raillatest-->/,
  () => `<!--ssr:raillatest-->${railLatest(posts.slice(0, 5))}<!--/ssr:raillatest-->`
);
index = index.replace(
  /(<span class="rail-when" id="rail-latest-when">)[\s\S]*?(<\/span>)/,
  (_m, a, b) => a + escHtml(nptLong(modified)) + b
);

/* The standing state in the left rail, under the contents list. */
{
  const d = daysSince(event.started);
  index = index.replace(
    /(<dd id="ts-day">)[\s\S]*?(<\/dd>)/,
    (_m, a, b) => a + `Day ${d || 1}` + b
  );
  index = index.replace(
    /(<dd id="ts-updated">)[\s\S]*?(<\/dd>)/,
    (_m, a, b) => a + escHtml(nptLong(modified)) + b
  );
}

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
