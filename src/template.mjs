/* ============================================================================
   Shared HTML shell for every generated page.

   One template so the masthead, breadcrumbs, footer, metadata and structured
   data stay identical across the site and cannot drift page to page.
   ========================================================================= */

import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://nepaldisasterupdatelive.nxtimaginelabs.com';
export const SITE_NAME = 'Nepal Disaster Update Live';
export const PUBLISHER = 'Nepal Disaster Update Live';
export const CONTACT_EMAIL = 'hello@nxtimaginelabs.com';

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ---------------------------------------------------------------------------
   Social preview pictures.

   Every page can have its own share card at /assets/og/<slug>.png, drawn by
   src/og-build.mjs. The card is only used when the file is actually there, so
   a build on a machine with no rasteriser still publishes a working picture
   rather than a broken link preview.
   ------------------------------------------------------------------------- */
const OG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'og');

/** "/nepal-flood/rasuwa/map/" -> "nepal-flood-rasuwa-map"; "/" -> "home" */
export function ogSlug(path) {
  const s = String(path || '/').replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
  return s || 'home';
}

/* Facebook, WhatsApp and X cache a preview picture against its URL and will
   happily keep showing a card with yesterday's death toll on it. The file's
   own modification time is appended so a redrawn card is a new URL to them. */
function ogVersion(file) {
  try { return String(Math.floor(statSync(file).mtimeMs / 1000)); } catch { return ''; }
}

export function ogFor(path) {
  const slug = ogSlug(path);
  const file = join(OG_ROOT, `${slug}.png`);
  if (!existsSync(file)) return `${SITE}/og-image.png`;
  return `${SITE}/assets/og/${slug}.png?v=${ogVersion(file)}`;
}

/** The vertical card, for people sharing a page to an Instagram story. */
export function ogStoryFor(path) {
  for (const slug of [`${ogSlug(path)}-story`, 'home-story']) {
    const file = join(OG_ROOT, `${slug}.png`);
    if (existsSync(file)) return `${SITE}/assets/og/${slug}.png?v=${ogVersion(file)}`;
  }
  return null;
}

/**
 * A site-relative picture under /assets/og/, with a version on it.
 *
 * The card thumbnails on the briefing tiles start life as a drawn placeholder
 * and are replaced by a real news photograph as soon as one is found in the
 * briefing's own sources. That replacement reuses the filename, and the
 * pictures are served with a four hour cache and a day of
 * stale-while-revalidate, so without a version a reader who visited before the
 * photograph landed keeps being shown the placeholder for up to a day.
 *
 * Returns an empty string when the file is not there, so the caller can leave
 * the picture out rather than point at a 404.
 */
export function assetVersioned(name) {
  const file = join(OG_ROOT, name);
  if (!existsSync(file)) return '';
  return `/assets/og/${name}?v=${ogVersion(file)}`;
}

/**
 * A site-relative asset URL carrying the file's modification time.
 *
 * The stylesheet has no content hash in its name and is served with an hour of
 * cache plus a day of stale-while-revalidate, so without this a design change
 * reaches a returning reader up to a day late, or not at all while they still
 * hold a cached copy. That is the same failure the ?v= on the share pictures
 * exists to prevent.
 */
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
export function siteAsset(path) {
  const file = join(ROOT_DIR, path.replace(/^\//, ''));
  const v = ogVersion(file);
  return v ? `${path}?v=${v}` : path;
}

/* Nepal keeps a +05:45 offset year round, so a fixed offset is exact here. */
const NPT_OFFSET_MIN = 345;

export function nptDate(iso) {
  const d = new Date(iso);
  return new Date(d.getTime() + (NPT_OFFSET_MIN + d.getTimezoneOffset()) * 60000);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/** "27 August 2026, 8:15 am NPT" is the format used across the site. */
export function nptLong(iso, withTime = true) {
  const d = nptDate(iso);
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return date;
  let h = d.getHours();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${date}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap} NPT`;
}

/** YYYY-MM-DD in Nepal time, for sitemap lastmod and article slugs. */
export function nptDay(iso) {
  const d = nptDate(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FLAG_SVG = `<svg viewBox="-4 -4 96 106" aria-hidden="true" focusable="false"><path d="M0 0 L78 44 L40 44 L72 90 L0 90 Z" fill="#DC143C" stroke="#003893" stroke-width="6" stroke-linejoin="round"/><path d="M20 14 L21.45 18.59 L25 15.34 L23.96 20.04 L28.66 19 L25.41 22.55 L30 24 L25.41 25.45 L28.66 29 L23.96 27.96 L25 32.66 L21.45 29.41 L20 34 L18.55 29.41 L15 32.66 L16.04 27.96 L11.34 29 L14.59 25.45 L10 24 L14.59 22.55 L11.34 19 L16.04 20.04 L15 15.34 L18.55 18.59 Z" fill="#fff"/><path d="M20 55 L21.6 60.01 L25.5 56.47 L24.38 61.62 L29.53 60.5 L25.99 64.4 L31 66 L25.99 67.6 L29.53 71.5 L24.38 70.38 L25.5 75.53 L21.6 71.99 L20 77 L18.4 71.99 L14.5 75.53 L15.62 70.38 L10.47 71.5 L14.01 67.6 L9 66 L14.01 64.4 L10.47 60.5 L15.62 61.62 L14.5 56.47 L18.4 60.01 Z" fill="#fff"/><circle cx="20" cy="24" r="4.6" fill="#DC143C"/><circle cx="23.4" cy="22.2" r="4.4" fill="#fff"/></svg>`;

/** Top navigation. Plain <a href> so crawlers follow it without running JS. */
const NAV = [
  { href: '/', label: 'Live dashboard', home: true },
  { href: '/nepal-flood/rasuwa/', label: 'Rasuwa flood' },
  { href: '/nepal-flood/rasuwa/live-updates/', label: 'Live updates' },
  { href: '/nepal-flood/rasuwa/map/', label: 'Map' },
  { href: '/nepal-flood/emergency-numbers/', label: 'Emergency numbers' },
  { href: '/nepal-flood/relief/', label: 'Donate' },
];

const NAV_NE = [
  { href: '/', label: 'लाइभ ड्यासबोर्ड', home: true },
  { href: '/ne/', label: 'रसुवा बाढी' },
  { href: '/ne/aapatkalin-number/', label: 'आपतकालीन नम्बर' },
  { href: '/ne/bepatta/', label: 'बेपत्ता' },
  { href: '/ne/rahat/', label: 'राहत' },
];

const FOOTER_NAV_NE = [
  { href: '/ne/', label: 'रसुवा बाढी, पूरा विवरण' },
  { href: '/ne/aapatkalin-number/', label: 'आपतकालीन नम्बर' },
  { href: '/ne/bepatta/', label: 'बेपत्ता व्यक्ति कसरी जनाउने' },
  { href: '/ne/rahat/', label: 'राहत र सहयोग' },
  { href: '/', label: 'English dashboard' },
  { href: '/nepal-flood/rasuwa/', label: 'Full briefing in English' },
];

/* Strings that appear in the page shell itself. */
const CHROME = {
  en: {
    skip: 'Skip to content',
    brand: 'Nepal Disaster Update',
    live: 'Live coverage',
    navLabel: 'Main',
    crumbLabel: 'Breadcrumb',
    allPages: 'All pages',
    livePill: 'Live coverage',
    archivePill: 'Archived event',
    foot1: `<strong>${SITE_NAME}</strong> is an independent volunteer briefing. It is not a government site and has no official status. No ads. No money is collected here: every giving link points at the Government of Nepal's own relief fund.`,
    foot2: `Where this site and an official source disagree, the official source is right. Found something wrong? Write to <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and it gets corrected or removed.`,
    foot3: `Contact: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> &middot; <a href="/sources/">Sources</a> &middot; <a href="/about/">About this project</a> &middot; <a href="${SITE}/feed.xml">RSS feed</a>`,
  },
  ne: {
    skip: 'मुख्य सामग्रीमा जानुहोस्',
    brand: 'नेपाल डिजास्टर अपडेट',
    live: 'प्रत्यक्ष',
    navLabel: 'मुख्य',
    crumbLabel: 'बाटो',
    allPages: 'सबै पृष्ठ',
    livePill: 'प्रत्यक्ष',
    archivePill: 'सङ्ग्रहित',
    foot1: 'यो एउटा स्वतन्त्र स्वयंसेवी ब्रिफिङ हो। यो सरकारी वेबसाइट होइन र यसको कुनै आधिकारिक हैसियत छैन। विज्ञापन छैन। यहाँ पैसा उठाइँदैन: दान गर्ने हरेक लिङ्क नेपाल सरकारकै कोषमा जान्छ।',
    foot2: `यो साइट र आधिकारिक स्रोतबीच फरक परे आधिकारिक स्रोत नै सही हो। केही गलत भेट्नुभयो? <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> मा लेख्नुहोस्, सच्याइन्छ वा हटाइन्छ।`,
    foot3: `सम्पर्क: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> &middot; <a href="/sources/">स्रोतहरू</a> &middot; <a href="/about/">परियोजनाबारे</a>`,
  },
};

const FOOTER_NAV = [
  { href: '/', label: 'Live dashboard' },
  { href: '/nepal-flood/', label: 'Nepal floods' },
  { href: '/nepal-flood/rasuwa/', label: 'Rasuwa flood 2026' },
  { href: '/nepal-flood/rasuwa/foreign-nationals/', label: 'Foreign nationals missing' },
  { href: '/nepal-flood/rasuwa/hydropower/', label: 'Hydropower damage' },
  { href: '/nepal-disasters/glof/', label: 'What a GLOF is' },
  { href: '/nepal-flood/rasuwa/live-updates/', label: 'Live updates' },
  { href: '/nepal-flood/rasuwa/casualties/', label: 'Casualties' },
  { href: '/nepal-flood/rasuwa/missing-persons/', label: 'Missing persons' },
  { href: '/nepal-flood/rasuwa/timeline/', label: 'Timeline' },
  { href: '/nepal-flood/rasuwa/cause/', label: 'What caused it' },
  { href: '/nepal-flood/rasuwa/damage/', label: 'Damage' },
  { href: '/nepal-flood/rasuwa/map/', label: 'Map' },
  { href: '/nepal-flood/emergency-numbers/', label: 'Emergency numbers' },
  { href: '/nepal-flood/relief/', label: 'Relief and donations' },
  { href: '/nepal-disasters/', label: 'Nepal disaster guide' },
  { href: '/updates/', label: 'Update archive' },
  { href: '/about/', label: 'About' },
  { href: '/sources/', label: 'Sources' },
  { href: '/contact/', label: 'Contact and corrections' },
];

/* The Organization and WebSite nodes are identical on every page, so they are
   emitted once here and referenced by @id from the per-page nodes. */
function orgGraph() {
  return [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: PUBLISHER,
      alternateName: 'Nepal Disaster Update',
      url: `${SITE}/`,
      email: CONTACT_EMAIL,
      logo: {
        '@type': 'ImageObject',
        '@id': `${SITE}/#logo`,
        url: `${SITE}/logo.png`,
        width: 512,
        height: 512,
        caption: PUBLISHER,
      },
      image: { '@id': `${SITE}/#logo` },
      parentOrganization: {
        '@type': 'Organization',
        name: 'NXT Imagine Labs',
        url: 'https://nxtimaginelabs.com/',
      },
      description:
        'An independent volunteer project that collects and cross-checks public information about disasters in Nepal: official bulletins, live news, maps and emergency contacts.',
      knowsLanguage: ['en', 'ne'],
      areaServed: { '@type': 'Country', name: 'Nepal' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: SITE_NAME,
      inLanguage: 'en',
      publisher: { '@id': `${SITE}/#organization` },
    },
  ];
}

function breadcrumbNode(crumbs, url) {
  if (!crumbs || crumbs.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href ? SITE + c.href : url,
    })),
  };
}

/**
 * Render a full page.
 *
 * @param {object} o
 * @param {string} o.path        Site-absolute path, always with a trailing slash.
 * @param {string} o.title       <title> text. Unique per page.
 * @param {string} o.description Meta description. Unique per page.
 * @param {string} o.h1
 * @param {string} [o.lede]
 * @param {Array}  [o.crumbs]    [{label, href}]. Last entry is the current page.
 * @param {string} o.body        Main article HTML.
 * @param {Array}  [o.schema]    Extra JSON-LD nodes, merged into one @graph.
 * @param {string} [o.published] ISO date the page's information was first published.
 * @param {string} [o.modified]  ISO date the page's information last changed.
 * @param {string} [o.statusPill] 'live' | 'archive' | null
 * @param {string} [o.updatedNote] Human "as of" line under the headline.
 * @param {string} [o.head]      Extra tags for <head>.
 * @param {string} [o.tail]      Extra markup before </body>.
 * @param {string} [o.ogImage]
 * @param {string} [o.section]   Nav item to mark aria-current.
 */
export function page(o) {
  const url = SITE + o.path;
  const ogImage = o.ogImage || ogFor(o.path);
  const ogStoryImage = ogStoryFor(o.path);
  const lang = o.lang === 'ne' ? 'ne' : 'en';
  const t = CHROME[lang];
  const nav = lang === 'ne' ? NAV_NE : NAV;
  const footNav = lang === 'ne' ? FOOTER_NAV_NE : FOOTER_NAV;

  const graph = orgGraph();
  const bc = breadcrumbNode(o.crumbs, url);
  if (bc) graph.push(bc);
  graph.push({
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: o.title,
    description: o.description,
    isPartOf: { '@id': `${SITE}/#website` },
    inLanguage: lang === 'ne' ? 'ne-NP' : 'en',
    ...(bc ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    ...(o.published ? { datePublished: o.published } : {}),
    ...(o.modified ? { dateModified: o.modified } : {}),
    primaryImageOfPage: { '@type': 'ImageObject', url: ogImage, width: 1200, height: 630 },
  });
  for (const node of o.schema || []) graph.push(node);

  const crumbHtml = o.crumbs && o.crumbs.length > 1
    ? `<nav class="crumbs" aria-label="${esc(t.crumbLabel)}"><ol>${o.crumbs.map((c, i) => {
        const last = i === o.crumbs.length - 1;
        return `<li>${last
          ? `<span aria-current="page">${esc(c.label)}</span>`
          : `<a href="${esc(c.href)}">${esc(c.label)}</a>`}</li>`;
      }).join('')}</ol></nav>`
    : '';

  const pill = o.statusPill === 'live'
    ? `<span class="pill pill-live"><i aria-hidden="true"></i>${esc(t.livePill)}</span>`
    : o.statusPill === 'archive'
      ? `<span class="pill pill-archive">${esc(t.archivePill)}</span>`
      : '';

  const navHtml = nav.map(n => {
    const cur = n.href === o.path ? ' aria-current="page"' : '';
    return `<a href="${n.href}"${cur}${n.home ? ' class="is-home"' : ''}>${esc(n.label)}</a>`;
  }).join('');

  /* hreflang pairs are emitted only where a genuine translation exists. A
     self-referencing alternate on a page with no counterpart is noise. */
  const alt = o.alternates && o.alternates.length
    ? o.alternates.map(a => `<link rel="alternate" hreflang="${a.hreflang}" href="${SITE}${a.path}">`).join('\n') +
      `\n<link rel="alternate" hreflang="x-default" href="${SITE}${o.alternates.find(a => a.hreflang === 'en') ? o.alternates.find(a => a.hreflang === 'en').path : o.path}">`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang === 'ne' ? 'ne' : 'en'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
${alt}
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<!-- The phone paints its address bar with this, so a dark-mode reader does not
     get a white bar above a near-black page. -->
<meta name="theme-color" content="#f9f9f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0d0d" media="(prefers-color-scheme: dark)">
<!-- The dashboard's theme switch writes the reader's choice to localStorage.
     These pages honour it before first paint, so following a link off the
     dashboard does not flash the other theme. With no stored choice nothing is
     set and the stylesheet's prefers-color-scheme rule decides. -->
<script>
(function(){
  try{
    var c = localStorage.getItem('theme-choice');
    if(c === 'dark' || c === 'light'){
      document.documentElement.setAttribute('data-theme', c);
      var bars = document.querySelectorAll('meta[name="theme-color"]');
      for(var i = 0; i < bars.length; i++){
        bars[i].setAttribute('content', c === 'dark' ? '#0d0d0d' : '#f9f9f7');
      }
    }
  }catch(e){}
})();
</script>
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE_NAME)}, live feed" href="${SITE}/feed.xml">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:locale" content="${lang === 'ne' ? 'ne_NP' : 'en_US'}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(o.ogImageAlt || SITE_NAME)}">
${o.published ? `<meta property="article:published_time" content="${esc(o.published)}">` : ''}
${o.modified ? `<meta property="article:modified_time" content="${esc(o.modified)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${siteAsset('/assets/site.css')}">
${o.head || ''}
<script>
/* Theme is chosen on the dashboard and stored locally; honour it here too so
   moving between the dashboard and these pages does not flash a new colour. */
(function(){try{var t=localStorage.getItem('nduTheme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}
else if((t==='system'||!t)&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches&&t==='system'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();
</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>
</head>
<body>
<a href="#main" class="skip-link">${esc(t.skip)}</a>

<header class="sitehead">
  <div class="sitehead-inner">
    <a href="${lang === 'ne' ? '/ne/' : '/'}" class="brand" aria-label="${esc(SITE_NAME)}">
      <span class="brand-mark">${FLAG_SVG}</span>
      <span class="brand-text">
        <span class="brand-name">${esc(t.brand)}</span>
        <span class="brand-live"><i aria-hidden="true"></i>${esc(t.live)}</span>
      </span>
    </a>
    <nav class="headnav" aria-label="${esc(t.navLabel)}">${navHtml}</nav>
  </div>
</header>

<div class="shell">
${crumbHtml}
<main id="main">
<article>
<header class="pagehead">
  ${pill ? `<p class="status-row">${pill}${o.extraPills || ''}</p>` : (o.extraPills ? `<p class="status-row">${o.extraPills}</p>` : '')}
  <h1>${o.h1}</h1>
  ${o.lede ? `<p class="lede measure">${o.lede}</p>` : ''}
</header>
${o.updatedNote ? `<p class="byline">${o.updatedNote}</p>` : ''}
${o.body}
</article>
</main>
</div>

<footer>
  <div class="shell">
    <nav aria-label="${esc(t.allPages)}"><ul class="footnav">${footNav.map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('')}</ul></nav>
    <p>${t.foot1}</p>
    <p>${t.foot2}</p>
    <p class="faint">${t.foot3}</p>
  </div>
</footer>
${o.tail || ''}
</body>
</html>
`;
}

/** Related-pages block, rendered at the foot of an article. */
export function related(title, items) {
  if (!items.length) return '';
  return `<section class="related"><h2>${esc(title)}</h2><div class="cards">${items.map(i =>
    `<a class="card" href="${esc(i.href)}"><h3>${esc(i.title)}</h3><p>${esc(i.text)}</p><span class="go">Read ${esc(i.verb || 'more')} &rsaquo;</span></a>`
  ).join('')}</div></section>`;
}

/** FAQ block plus the matching FAQPage node. The two cannot drift apart. */
export function faqBlock(items) {
  const html = `<div class="faq">${items.map((q, i) =>
    `<details${i === 0 ? ' open' : ''}><summary>${esc(q.q)}</summary><div class="faq-body">${q.a}</div></details>`
  ).join('')}</div>`;
  const node = {
    '@type': 'FAQPage',
    mainEntity: items.map(q => ({
      '@type': 'Question',
      name: q.q,
      acceptedAnswer: { '@type': 'Answer', text: stripTags(q.a) },
    })),
  };
  return { html, node };
}

export function stripTags(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rsquo;/g, '’')
    .replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ').trim();
}
