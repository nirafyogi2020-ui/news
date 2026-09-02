#!/usr/bin/env node
/**
 * The automatic counter update.
 *
 * Reads the live figure board, compares it with event.json, and writes the
 * counters that have actually moved. Run by .github/workflows/figures.yml on a
 * schedule and by hand with `npm run figures`.
 *
 * This is a plain script. It contains no model, calls no model, and costs
 * nothing per run beyond the fetches. That is the point of it: keeping the
 * numbers current is mechanical work and should not need anybody, or
 * anything, to think about it.
 *
 * What it will not do:
 *   - invent a figure. It writes only what a named source stated, with a URL.
 *   - touch prose. `detail` text, story cards and headlines stay as written,
 *     except for the one sentence naming the source of each counter.
 *   - write anything when the board is empty or the site is unreachable. A
 *     failed run leaves the file exactly as it found it and exits 0, because a
 *     scraper outage is not a reason to fail a build.
 *
 * Exit codes: 0 always, unless the repo state itself is broken. It prints
 * `changed=true|false` for the workflow to read.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENT = join(ROOT, 'event.json');
const CONTENT = join(ROOT, 'src', 'content.mjs');
const TODAY = join(ROOT, 'today.json');

const SITE = process.env.SITE_ORIGIN ||
  'https://nepaldisasterupdatelive.nxtimaginelabs.com';

/* Which counter in event.json each metric belongs to, matched on the label
   the file already uses. A label that is not present is skipped rather than
   created: adding a counter is an editorial decision, not this script's. */
const STAT_LABELS = {
  dead: 'confirmed dead',
  missing: 'listed missing in Nepal',
  rescued: 'rescued so far'
};

/* The static article pages read their figures from the TOLL block in
   src/content.mjs, not from event.json. Both files therefore have to move
   together: the site's own audit fails the build when the hero counter and
   the article pages disagree, which is the correct behaviour and the reason
   this script writes both. */
const TOLL_FIELDS = { dead: 'deadNepal', missing: 'missing', rescued: 'rescued' };

/* Every figure on the static pages is printed next to an "as of" line and the
   name of whoever published it. Moving the number without moving those two is
   worse than not moving it at all: the page then states a fresh figure over a
   stale timestamp, which is the specific failure this whole change exists to
   remove. Each metric therefore owns the constants that describe it. */
const STAMP_FIELDS = {
  dead:    [['TOLL_AS_OF', 'TOLL_SOURCE'], ['BODIES_AS_OF', 'BODIES_SOURCE']],
  missing: [['MISSING_AS_OF', 'MISSING_SOURCE']],
  rescued: [['RESCUE_AS_OF', 'RESCUE_SOURCE']]
};

/* A single run will not move a counter by more than this multiple of its
   current value. A parser fault or a garbled bulletin that produced, say,
   90,000 dead would clear every other check in the chain; this is the last
   one. A jump beyond it is reported and left for a person. */
const MAX_JUMP = 3;

async function main() {
  const board = await fetchBoard();
  if (!board) {
    report(false, 'figure board unavailable — event.json untouched');
    return;
  }

  const raw = readFileSync(EVENT, 'utf8');
  const event = JSON.parse(raw);
  const stats = event.stats || [];

  const applied = [];
  const skipped = [];

  for (const [metric, label] of Object.entries(STAT_LABELS)) {
    const figure = board.board && board.board[metric];
    if (!figure || !Number.isFinite(figure.value)) continue;

    const stat = stats.find(s => s && s.label === label);
    if (!stat) { skipped.push(`${metric}: no counter labelled "${label}"`); continue; }

    const current = Number(String(stat.value).replace(/\D/g, '')) || 0;
    if (current === figure.value) continue;

    if (current > 0 && figure.value > current * MAX_JUMP) {
      skipped.push(`${metric}: ${current} → ${figure.value} is more than ${MAX_JUMP}× — left for a person`);
      continue;
    }

    /* The editorial detail under a counter is the most valuable prose on the
       page — the district breakdown, the caveats, the "out of contact does
       not mean dead". Overwriting it every time a number moved would strip
       the page of exactly what makes it worth reading.

       So it is kept once, verbatim, in `priorDetail`, together with the "as
       of" it was true at. From then on the detail is the live sentence
       followed by that earlier text, explicitly dated, so it reads as history
       rather than as a claim about the current figure. Kept once, never
       re-wrapped, so it cannot grow without limit. */
    if (!stat.priorDetail && stat.detail) {
      stat.priorDetail = stat.detail;
      stat.priorAsOf = event.asOf || null;
    }

    stat.value = figure.value.toLocaleString('en-US');
    stat.detail = sourceSentence(figure, current, stat.priorDetail, stat.priorAsOf);
    applied.push({ metric, from: current, to: figure.value, source: figure.source });
  }

  if (!applied.length) {
    report(false, skipped.length ? 'no counter moved. ' + skipped.join('; ') : 'no counter moved');
    return;
  }

  /* The "as of" line under the counters has to move with them, or the page
     states a fresh figure over a stale timestamp. */
  const newest = applied
    .map(a => board.board[a.metric])
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0];
  if (newest && newest.time) event.asOf = newest.time;
  if (newest && newest.source) {
    event.asOfSource = newest.statedTime
      ? `${newest.source}, ${newest.statedTime}`
      : newest.source;
  }

  writeFileSync(EVENT, JSON.stringify(event, null, 2) + '\n');
  syncContent(applied, board.board);
  syncToday(applied, board.board);

  for (const a of applied) {
    console.log(`  ${a.metric}: ${a.from} → ${a.to}  (${a.source})`);
  }
  if (skipped.length) for (const s of skipped) console.log('  skipped ' + s);
  report(true, `${applied.length} counter${applied.length === 1 ? '' : 's'} updated`);
}

/**
 * Move the same figures in src/content.mjs.
 *
 * A targeted replacement of one numeric field at a time, anchored on the
 * field name, so nothing else in a 58,000-character editorial file can be
 * touched by accident. A field that is not found is left alone and reported
 * rather than appended.
 *
 * `deadNepalEarlier` carries the previous toll so the prose can say "up
 * from"; it moves to what the dead figure used to be.
 */
export function syncContent(applied, figures) {
  let text;
  try {
    text = readFileSync(CONTENT, 'utf8');
  } catch (e) {
    console.log('  content.mjs: ' + e.message);
    return false;
  }

  const before = text;
  for (const change of applied) {
    const figure = (figures && figures[change.metric]) || {};
    const field = TOLL_FIELDS[change.metric];
    if (field) text = replaceField(text, field, change.to);

    if (change.metric === 'dead') {
      /* The "how the toll has moved" row keeps the figure it was published
         with, so it has to carry the stamp that figure was published with
         too. Both are read before either is overwritten. */
      text = replaceField(text, 'deadNepalEarlier', change.from);
      text = replaceString(text, 'TOLL_EARLIER_AS_OF', readString(before, 'TOLL_AS_OF'));
      text = replaceString(text, 'TOLL_EARLIER_SOURCE', readString(before, 'TOLL_SOURCE'));
    }

    for (const [asOfField, sourceField] of STAMP_FIELDS[change.metric] || []) {
      if (figure.time) text = replaceString(text, asOfField, nptIso(figure.time));
      if (figure.source) text = replaceString(text, sourceField, sourceLabel(figure));
    }

    if (change.metric === 'dead') text = addTimelineEntry(text, figure, change);
  }

  if (text === before) return false;
  writeFileSync(CONTENT, text);
  console.log('  src/content.mjs kept in step');
  return true;
}

/** Read the current value of an `export const NAME = '...'` string. */
export function readString(text, name) {
  const m = text.match(new RegExp('\\b' + name + "\\s*=\\s*'([^']*)'"));
  return m ? m[1] : null;
}

/** Replace one `export const NAME = '...'` string, and nothing else. */
export function replaceString(text, name, value) {
  if (value == null) return text;
  const pattern = new RegExp("(\\b" + name + "\\s*=\\s*')[^']*(')");
  if (!pattern.test(text)) {
    console.log(`  content.mjs has no ${name} — left alone`);
    return text;
  }
  return text.replace(pattern, '$1' + String(value).replace(/'/g, "\\'") + '$2');
}

/** How a figure names itself on the page: who said it, and at what hour. */
export function sourceLabel(figure) {
  const when = figure.statedTime ? `, ${figure.statedTime}` : '';
  return `${figure.source}${when}`;
}

/**
 * Add one row to the timeline of the event.
 *
 * The timeline is the page's record of how the toll moved, and it is the part
 * a reader scrolls to understand whether the number is still climbing. A
 * counter that moves without a timeline row leaves the page asserting a jump
 * it never shows its working for.
 *
 * One row per figure, never a duplicate: if the timeline already carries this
 * figure the text is left exactly as it is, so repeated runs cannot grow the
 * file. The wording is a fixed template with the source's own name in it —
 * this script does not write prose, it writes a record.
 */
export function addTimelineEntry(text, figure, change) {
  const marker = '\nexport const TIMELINE = [';
  const start = text.indexOf(marker);
  if (start === -1) return text;
  const end = text.indexOf('\n];', start);
  if (end === -1) return text;

  const block = text.slice(start, end);
  const line =
    `Nepal's confirmed death toll is reported at ${change.to.toLocaleString('en-US')}, ` +
    `up from ${change.from.toLocaleString('en-US')}, by ${figure.source || 'the published report'}.`;

  /* Already recorded, by this script or by an editor. */
  if (block.includes(`reported at ${change.to.toLocaleString('en-US')}`)) return text;

  const stamp = nptStamp(figure.time);
  const row = `  ['${stamp}', ${JSON.stringify(line)}],\n`;
  return text.slice(0, end + 1) + row + text.slice(end + 1);
}

/**
 * The same instant written in Nepal time, which is the convention every
 * timestamp in content.mjs already follows. A UTC "Z" stamp would parse
 * identically and read as somebody else's clock on a Nepali page.
 */
export function nptIso(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const npt = new Date(d.getTime() + (5 * 60 + 45) * 60000);
  return npt.toISOString().replace(/\.\d+Z$/, '') + '+05:45';
}

/** "14:00 NPT, 30 August", the format the timeline already uses. */
export function nptStamp(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Latest report';
  const opts = { timeZone: 'Asia/Kathmandu' };
  const time = d.toLocaleTimeString('en-GB', { ...opts, hour: '2-digit', minute: '2-digit' });
  const day = d.toLocaleDateString('en-GB', { ...opts, day: 'numeric', month: 'long' });
  return `${time} NPT, ${day}`;
}

/**
 * Keep today.json current.
 *
 * Two things happen here, and neither of them writes a story.
 *
 * `updated` moves, because the whole site derives its "last modified" from
 * the newest of today.json, event.json and the briefings — and the structured
 * data that tells search engines the coverage is still running is three days
 * past that. A page whose figures move while its date does not is a page that
 * reads as abandoned.
 *
 * And one briefing card, always the same card, carries the current figures.
 * It is rewritten in place rather than added to, so a counter that moves six
 * times in an afternoon leaves one accurate card and not six near-identical
 * ones. Everything an editor has written stays untouched.
 */
export function syncToday(applied, figures) {
  let today;
  try {
    today = JSON.parse(readFileSync(TODAY, 'utf8'));
  } catch (e) {
    console.log('  today.json: ' + e.message);
    return false;
  }

  const dead = figures && figures.dead;
  const newest = applied
    .map(a => (figures[a.metric] || {}).time)
    .filter(Boolean)
    .sort()
    .pop() || new Date().toISOString();

  today.updated = newest;

  const posts = today.posts || (today.posts = []);
  const lines = applied.map(a => {
    const f = figures[a.metric] || {};
    const label = { dead: 'confirmed dead', missing: 'listed missing', rescued: 'rescued' }[a.metric] || a.metric;
    return `${label}: ${a.to.toLocaleString('en-US')}, ` +
      `${a.to > a.from ? 'up from' : 'corrected down from'} ${a.from.toLocaleString('en-US')}` +
      `${f.source ? `, reported by ${f.source}` : ''}.`;
  });

  const card = {
    id: LIVE_CARD_ID,
    title: dead
      ? `Latest reported figures: ${dead.value.toLocaleString('en-US')} confirmed dead`
      : 'Latest reported figures',
    time: newest,
    image: '',
    body: [
      'These figures are read automatically from the published reports as they ' +
      'appear, and are not written or checked by hand. ' + lines.join(' '),
      'Where a report describes one district or one stretch of river rather than ' +
      'the national figure, it is not used here. Out of contact does not mean dead.'
    ],
    sources: dedupeSources(applied.map(a => figures[a.metric]).filter(Boolean)),
    revised: true
  };

  const at = posts.findIndex(p => p && p.id === LIVE_CARD_ID);
  if (at === -1) posts.unshift(card); else posts[at] = card;

  writeFileSync(TODAY, JSON.stringify(today, null, 2) + '\n');
  console.log('  today.json updated' + (at === -1 ? ' (live figures card added)' : ''));
  return true;
}

/* The one card this script owns. Always rewritten, never duplicated. */
const LIVE_CARD_ID = 'latest-reported-figures';

function dedupeSources(figures) {
  const out = [];
  for (const f of figures) {
    if (!f || !f.url || !f.source) continue;
    if (out.some(s => s.url === f.url)) continue;
    out.push({ name: f.source, url: f.url });
  }
  return out;
}

/** Replace `name: <number>` once, leaving everything else untouched. */
export function replaceField(text, name, value) {
  const pattern = new RegExp('(\\b' + name + ':\\s*)\\d+');
  if (!pattern.test(text)) {
    console.log(`  content.mjs has no ${name} field — left alone`);
    return text;
  }
  return text.replace(pattern, '$1' + value);
}

/**
 * The one sentence of prose this script owns: what the number is, who stated
 * it, and when. It replaces the previous detail for that counter, because a
 * detail describing an old figure is worse than a short accurate one.
 */
export function sourceSentence(figure, previous, priorDetail, priorAsOf) {
  const when = figure.statedTime ? ` at ${figure.statedTime}` : '';
  const moved = previous
    ? ` Up from ${previous.toLocaleString('en-US')}.`.replace('Up from', figure.value < previous ? 'Corrected down from' : 'Up from')
    : '';
  let text = `${figure.source || 'Source'}${when}: ${figure.value.toLocaleString('en-US')}.${moved} ` +
    `Read automatically from the published report, not edited by hand.` +
    (figure.url ? ` Source: ${figure.url}` : '');

  if (priorDetail) {
    const dated = priorAsOf ? ` (as of ${priorAsOf})` : '';
    text += ` Earlier detail${dated}, kept for the breakdown and the caveats and not describing the current figure: ${priorDetail}`;
  }
  return text;
}

async function fetchBoard() {
  try {
    const res = await fetch(`${SITE}/api/figures`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return data && data.board ? data : null;
  } catch (e) {
    console.log('  figure board: ' + e.message);
    return null;
  }
}

function report(changed, message) {
  console.log(message);
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: 'a' });
  }
}

main().catch(err => {
  console.error('figures-update failed: ' + err.message);
  report(false, 'failed — event.json untouched');
});
