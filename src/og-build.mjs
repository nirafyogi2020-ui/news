#!/usr/bin/env node
/* ============================================================================
   Builds the social preview pictures.

   One 1200x630 card per page, one per published briefing, plus a 1080x1920
   story card for Instagram and Facebook stories. Written as SVG, then
   rasterised to PNG because Facebook and X will not read an SVG.

   Rasterising uses macOS `sips`, which is on the author's machine and not on
   the cloud machine the hourly routine runs on. That is deliberate:

     - SVGs are rewritten on every build, anywhere.
     - PNGs are only rebuilt where a rasteriser exists, and are committed.
     - template.mjs uses a page's own PNG when the file is there and falls
       back to /og-image.png when it is not.

   So the routine can never publish a page pointing at a picture that does not
   exist, and it never needs a rasteriser of its own.

   Run: node src/og-build.mjs        (called by ./deploy.sh before the build)
   ========================================================================= */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

import { ogCard, ogStory, ogPhotoCard, ogPhotoThumb } from './og.mjs';
import { photoForSources, loadPhoto, photoDataUri } from './photo.mjs';
import { ogSlug } from './template.mjs';
import * as C from './content.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'og');
const PHOTOS = join(ROOT, 'assets', 'photos');

const event = JSON.parse(readFileSync(join(ROOT, 'event.json'), 'utf8'));

/* ---------------------------------------------------------------------------
   The rasteriser.

   resvg is preferred and is what the hourly cloud routine uses: it is handed
   the site's own font files, so a card drawn there looks the same as one drawn
   here. It is an optional dependency, so if the install ever fails the build
   falls back to macOS `sips`, and if there is nothing at all the SVGs are
   still written and the committed PNGs are left alone.
   ------------------------------------------------------------------------- */
const FONT_DIR = join(ROOT, 'assets', 'fonts');
const FONT_FILES = existsSync(FONT_DIR)
  ? readdirSync(FONT_DIR).filter(f => /\.(ttf|otf)$/i.test(f)).map(f => join(FONT_DIR, f))
  : [];

let Resvg = null;
try { ({ Resvg } = await import('@resvg/resvg-js')); } catch { Resvg = null; }

let sips = false;
if (!Resvg) {
  try { execFileSync('sips', ['--version'], { stdio: 'ignore' }); sips = true; } catch { sips = false; }
}
const rasteriser = Resvg ? 'resvg' : (sips ? 'sips' : null);

function rasterise(svg, svgPath, pngPath, width) {
  if (Resvg) {
    const img = new Resvg(svg, {
      fitTo: { mode: 'width', value: width },
      font: { fontFiles: FONT_FILES, loadSystemFonts: FONT_FILES.length === 0 },
    }).render().asPng();
    writeFileSync(pngPath, img);
    return;
  }
  execFileSync('sips', ['-s', 'format', 'png', svgPath, '--out', pngPath], { stdio: 'ignore' });
}

mkdirSync(OUT, { recursive: true });

let written = 0;
let rastered = 0;

function emit(slug, svg, width, height) {
  const svgPath = join(OUT, `${slug}.svg`);
  const pngPath = join(OUT, `${slug}.png`);
  const prev = existsSync(svgPath) ? readFileSync(svgPath, 'utf8') : null;
  const changed = prev !== svg;
  if (changed) {
    writeFileSync(svgPath, svg);
    written++;
  }
  if (!rasteriser) return;
  /* Re-rasterise when the SVG changed, or when the PNG is simply missing. */
  const stale = changed || !existsSync(pngPath)
    || statSync(pngPath).mtimeMs < statSync(svgPath).mtimeMs;
  if (!stale) return;
  rasterise(svg, svgPath, pngPath, width);
  rastered++;
}

const card = (slug, o) => emit(slug, ogCard(o), 1200, 630);
const story = (slug, o) => emit(slug, ogStory(o), 1080, 1920);
const photoCard = (slug, o) => emit(slug, ogPhotoCard(o), 1200, 630);
const photoThumb = (slug, o) => emit(slug, ogPhotoThumb(o), 800, 450);

/* ---------------------------------------------------------------------------
   The three headline figures, taken from the same place the pages take them
   so a share card can never disagree with the page it points at.
   ------------------------------------------------------------------------- */
const HEAD_STATS = [
  { value: String(C.TOLL.deadNepal), label: 'CONFIRMED DEAD' },
  { value: String(C.TOLL.missing), label: 'LISTED MISSING' },
  { value: String(C.DAMAGE.hydropowerProjects), label: 'HYDRO PROJECTS HIT' },
];

/* ---------------------------------------------------------------------------
   Home and story.
   ------------------------------------------------------------------------- */
card('home', {
  eyebrow: event.name || 'Nepal',
  title: event.headline || 'Nepal disaster update',
  sub: 'Live figures, the map, the helplines and the official relief fund. Every number is sourced.',
  live: event.status === 'active',
  stats: HEAD_STATS,
});

story('home-story', {
  eyebrow: event.name || 'Nepal',
  title: event.headline || 'Nepal disaster update',
  sub: 'Live figures, the map, the helplines and the official relief fund.',
  live: event.status === 'active',
  stats: HEAD_STATS,
});

/* ---------------------------------------------------------------------------
   One per page. The page title is written for a search result, which is
   longer than a share card wants, so the part after a colon or a pipe is
   dropped and the description becomes the supporting line.
   ------------------------------------------------------------------------- */
function cardTitle(title) {
  const t = String(title).split(' | ')[0];
  return t.length > 66 ? t.split(': ')[0] : t;
}

const P = await import('./pages.mjs');
const NE = await import('./pages-ne.mjs');

const today = JSON.parse(readFileSync(join(ROOT, 'today.json'), 'utf8'));
const archiveDir = join(ROOT, 'data', 'updates');
const posts = existsSync(archiveDir)
  ? readdirSync(archiveDir).filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(join(archiveDir, f), 'utf8')))
      .map(p => ({ ...p, url: `/updates/${p.slug}/` }))
      .sort((a, b) => new Date(b.time) - new Date(a.time))
  : [];

const ctx = { posts, event, today, modified: event.asOf, buildDay: '' };

const pages = [
  P.nepalFloodHub(ctx), P.rasuwaEvent(ctx), P.liveUpdates(ctx), P.casualties(ctx),
  P.missingPersons(ctx), P.timeline(ctx), P.cause(ctx), P.damage(ctx), P.mapPage(ctx),
  P.emergencyNumbers(ctx), P.relief(ctx), P.hazardGuide(ctx), P.updateIndex(ctx),
  P.hydropower(ctx), P.foreignNationals(ctx), ...P.hazardPages(ctx),
  P.about(ctx), P.sources(ctx), P.contact(ctx),
  NE.neEvent(ctx), NE.neEmergency(ctx), NE.neMissing(ctx), NE.neRelief(ctx),
];

/* The Nepali pages get Nepali labels on their figures. A Nepali headline over
   an English caption is the sort of half-translation that makes a site look
   automated. */
const HEAD_STATS_NE = [
  { value: String(C.TOLL.deadNepal), label: 'मृत्यु पुष्टि' },
  { value: String(C.TOLL.missing), label: 'बेपत्ता सूचीमा' },
];

for (const pg of pages) {
  const ne = pg.path.startsWith('/ne/');
  const isEvent = pg.path.startsWith('/nepal-flood/rasuwa/') || pg.path === '/ne/';
  card(ogSlug(pg.path), {
    eyebrow: ne ? 'नेपाल विपद् अपडेट' : (isEvent ? event.name : 'Nepal Disaster Update'),
    title: cardTitle(pg.title),
    sub: pg.description,
    live: isEvent && event.status === 'active',
    stats: isEvent ? (ne ? HEAD_STATS_NE : HEAD_STATS.slice(0, 2)) : [],
  });
}

/* Every briefing gets its own card, so a link posted to Facebook shows that
   briefing's headline rather than the site's.

   The picture is a real photograph taken from one of the briefing's own cited
   articles, credited to the outlet that published it. Only when no source
   yields a usable photograph does the drawn motif stand in. */
let withPhoto = 0;
for (const p of posts) {
  const slug = ogSlug(p.url);
  let photo = loadPhoto(slug, PHOTOS);
  if (!photo) {
    try { photo = await photoForSources(p.sources, slug, PHOTOS); } catch { photo = null; }
  }
  const href = photo ? photoDataUri(photo, PHOTOS) : '';
  if (photo) withPhoto++;

  /* Same layout with or without the photograph. With no usable source
     picture the card is simply typographic: this site does not draw its own
     illustration of a news event. */
  const shot = { eyebrow: 'Briefing', title: p.title, href, credit: photo ? photo.credit : '' };
  photoCard(slug, shot);
  photoThumb(`${slug}-thumb`, shot);

  story(`${slug}-story`, {
    eyebrow: 'Briefing',
    title: p.title,
    sub: (p.body && p.body[0] ? p.body[0] : '').slice(0, 130),
    live: false,
  });
}

console.log(
  `og: ${pages.length + posts.length + 1} cards, ${posts.length + 1} stories, ${posts.length} tiles` +
  ` · ${withPhoto}/${posts.length} briefings with a source photograph` +
  ` · ${written} svg rewritten · ` +
  (rasteriser ? `${rastered} png rasterised by ${rasteriser}` : 'no rasteriser here, png left as committed')
);
