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
  syncContent(applied);

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
export function syncContent(applied) {
  let text;
  try {
    text = readFileSync(CONTENT, 'utf8');
  } catch (e) {
    console.log('  content.mjs: ' + e.message);
    return false;
  }

  const before = text;
  for (const change of applied) {
    const field = TOLL_FIELDS[change.metric];
    if (!field) continue;
    text = replaceField(text, field, change.to);
    if (change.metric === 'dead') {
      text = replaceField(text, 'deadNepalEarlier', change.from);
    }
  }

  if (text === before) return false;
  writeFileSync(CONTENT, text);
  console.log('  src/content.mjs kept in step');
  return true;
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
