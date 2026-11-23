#!/usr/bin/env node
import { loadSituation, applySituation } from '../functions/api/_situation.js';
import { verifiedBoard, consistentDistricts } from '../functions/api/_verified-board.js';
/**
 * The automatic counter update.
 *
 * Reads the sources, compares what they state with event.json, and writes the
 * counters that have actually moved. Run by .github/workflows/figures.yml on a
 * schedule and by hand with `npm run figures`.
 *
 * This is a plain script. It costs
 * nothing per run beyond the fetches. That is the point of it: keeping the
 * numbers current is mechanical work and should not need anybody, or
 * anything, to think about it.
 *
 * What it will not do:
 *   - invent a figure. It writes only what a named source stated, with a URL.
 *   - touch prose. `detail` text, story cards and headlines stay as written,
 *     except for the one sentence naming the source of each counter.
 *   - write anything when no source states a figure, or the sources are
 *     unreachable. A failed run leaves every file exactly as it found it and
 *     exits 0, because a scraper outage is not a reason to fail a build.
 *   - depend on the deployed copy of the site to tell it the figures. It runs
 *     the same resolver the endpoint runs, in-process, so it works before the
 *     code it updates has ever been deployed.
 *
 * Exit codes: 0 always, unless the repo state itself is broken. It prints
 * `changed=true|false` for the workflow to read.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveBoard, METRICS } from '../functions/api/_figures-core.js';
import { latestDistricts } from '../functions/api/figures.js';
import { loadPoliceNews } from '../functions/api/police.js';
import {
  STAT_LABELS, TIMELINE_FILE, figureRecord, nptIso, sourceLabel, readTollTimeline
} from './figure-record.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENT = join(ROOT, 'event.json');
const TODAY = join(ROOT, 'today.json');

const SITE = process.env.SITE_ORIGIN ||
  'https://nepaldisasterupdatelive.nxtimaginelabs.com';

/* Which counter each metric belongs to is matched on the label event.json
   already uses (STAT_LABELS, in src/figure-record.mjs). A label that is not
   present is skipped rather than created: adding a counter is an editorial
   decision, not this script's.

   event.json is the only file that holds the live figures. The article pages,
   the Nepali pages and the share images read it through src/figure-record.mjs,
   so moving a number here moves it everywhere on the next build, with its
   "as of" stamp and source, and no source code is rewritten to keep a copy in
   step. */

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

  const responseMoved = !!board.response && JSON.stringify(board.response) !== JSON.stringify(event.response);
  if(responseMoved)event.response=board.response;
  const applied = [];
  const skipped = [];
  let evidenceMoved = false;

  for (const [metric, label] of Object.entries(STAT_LABELS)) {
    const figure = board.board && board.board[metric];
    if (!figure || !Number.isFinite(figure.value)) continue;

    const stat = stats.find(s => s && s.label === label);
    if (!stat) { skipped.push(`${metric}: no counter labelled "${label}"`); continue; }

    const current = Number(String(stat.value).replace(/\D/g, '')) || 0;
    if (current === figure.value) {
      /* The same count from a newer bulletin is still new evidence. Save it,
         so the "as of" line it moves points at a source the file holds. */
      if (keepNewerEvidence(event, metric, figure)) evidenceMoved = true;
      continue;
    }

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
    /* An earlier version of this script captured the prose after it had
       already been wrapped once, so some counters carry a chain of "Earlier
       detail" clauses rather than a single one. Trimming on every pass keeps
       exactly the first, which is the hand-written breakdown worth keeping,
       and repairs the counters that already grew a second. */
    stat.priorDetail = firstEarlierDetail(stat.priorDetail);

    event.figures ||= {};
    /* The toll it moved up from, with the stamp that toll was published
       with, for the "how the toll has moved" row and the "up from" wording.
       Read before the figure it describes is replaced. */
    if (metric === 'dead') event.tollEarlier = earlierToll(event, current);
    event.figures[metric] = figure;
    stat.value = figure.value.toLocaleString('en-US');
    stat.detail = sourceSentence(figure, current, stat.priorDetail, stat.priorAsOf);
    applied.push({ metric, from: current, to: figure.value, source: figure.source });
  }

  /* The district breakdown under the toll is read from the same police
     bulletin the total comes from, so the table and the counter can never
     state two different things. It moves on its own schedule: a bulletin
     often restates the districts without moving the national figure, and
     that is still a change worth publishing. */
  const districtsMoved = applyDistricts(event, board.districts);
  const repaired = repairDetails(event);
  /* A bulletin can confirm the same number again. That is still new evidence,
     and it must move the page's "as of" line. Otherwise a new story card
     makes the audit correctly stop the whole publisher before it can commit. */
  const freshnessMoved = refreshAsOf(event, board.board);

  if (!applied.length && !districtsMoved && !repaired && !freshnessMoved && !responseMoved && !evidenceMoved) {
    report(false, skipped.length ? 'no counter moved. ' + skipped.join('; ') : 'no counter moved');
    return;
  }

  if (!applied.length) {
    saveEvent(event);
    report(true, districtsMoved ? 'district breakdown updated' : freshnessMoved ? 'figure freshness updated' : evidenceMoved ? 'newer source for an unchanged figure' : 'counter detail repaired');
    return;
  }

  /* The "as of" line under the counters has to move with them, or the page
     states a fresh figure over a stale timestamp. */
  const newest = applied
    .map(a => board.board[a.metric])
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))[0];
  /* Only ever forward: a change that arrives late, from an older bulletin,
     must not pull the "as of" line back behind evidence already shown. */
  if (newest && newest.time && !(Date.parse(newest.time) <= Date.parse(event.asOf))) {
    event.asOf = newest.time;
    if (newest.source) {
      event.asOfSource = newest.statedTime
        ? `${newest.source}, ${newest.statedTime}`
        : newest.source;
    }
  }

  saveEvent(event);
  recordTimeline(applied, board.board);
  syncToday(applied, board.board);

  for (const a of applied) {
    console.log(`  ${a.metric}: ${a.from} → ${a.to}  (${a.source})`);
  }
  if (skipped.length) for (const s of skipped) console.log('  skipped ' + s);
  report(true, `${applied.length} counter${applied.length === 1 ? '' : 's'} updated`);
}

/**
 * Advance the shared "as of" line when a named source has re-confirmed a
 * published figure. This changes no number. It records when the page last had
 * evidence for the numbers it is showing, which is what the audit checks.
 */
/** Save a same-count figure when it is newer than the evidence on file. */
export function keepNewerEvidence(event, metric, figure) {
  const saved = event.figures && event.figures[metric];
  const after = Date.parse(figure && figure.time);
  if (!isFinite(after)) return false;
  if (saved && saved.value === figure.value && Date.parse(saved.time) >= after) return false;
  event.figures ||= {};
  event.figures[metric] = figure;
  return true;
}

export function refreshAsOf(event, figures) {
  const candidates = Object.values(figures || [])
    .filter(f => f && f.time && !isNaN(new Date(f.time).getTime()))
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  const newest = candidates[0];
  if (!newest) return false;
  const before = Date.parse(event && event.asOf);
  const after = Date.parse(newest.time);
  if (!isFinite(after) || (isFinite(before) && after <= before)) return false;
  event.asOf = newest.time;
  event.asOfSource = newest.statedTime
    ? `${newest.source}, ${newest.statedTime}`
    : newest.source || event.asOfSource;
  return true;
}

/**
 * Write the district breakdown into event.json, and say whether it moved.
 *
 * A bulletin that states no breakdown leaves the last good one standing: an
 * empty table would read as "nobody was found anywhere", which is the same
 * class of mistake as printing a zero for a figure nobody stated.
 */
export function applyDistricts(event, districts) {
  if (!districts || !Array.isArray(districts.rows) || districts.rows.length < 2) return false;
  const before = JSON.stringify((event.districts && event.districts.rows) || []);
  const after = JSON.stringify(districts.rows);
  if (before === after) return false;
  event.districts = districts;
  return true;
}

/**
 * Write event.json, but only a record the pages can build from.
 *
 * The same check the build runs is run here first. A record it would refuse
 * (a counter that disagrees with its own evidence, a stamp that does not
 * parse) is never written: the run fails with the reason and every file stays
 * as it was, rather than committing a state that stops the next build.
 */
export function saveEvent(event, file = EVENT) {
  figureRecord(event);
  writeFileSync(file, JSON.stringify(event, null, 2) + '\n');
}

/** The toll a new figure replaces, with the stamp and source it carried. */
export function earlierToll(event, value) {
  const prior = event.figures && event.figures.dead;
  if (prior && prior.time && prior.source) {
    return { value, time: nptIso(prior.time), source: sourceLabel(prior) };
  }
  return { value, time: nptIso(event.asOf), source: event.asOfSource || 'the published report' };
}

/**
 * Record a moved toll in data/toll-timeline.json, which the event timeline
 * appends after its hand-written rows.
 */
export function recordTimeline(applied, figures, file = TIMELINE_FILE) {
  const change = applied.find(a => a.metric === 'dead');
  if (!change) return false;
  let rows;
  try {
    rows = readTollTimeline(file);
  } catch (e) {
    console.log('  toll timeline: ' + e.message);
    return false;
  }
  const next = addTimelineEntry(rows, (figures && figures.dead) || {}, change);
  if (next === rows) return false;
  writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  console.log('  toll timeline: one row added');
  return true;
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
export function addTimelineEntry(rows, figure, change) {
  const to = change.to.toLocaleString('en-US');
  const from = change.from.toLocaleString('en-US');
  /* A correction downwards is written as one; it is not an increase. */
  const movement = change.to > change.from ? `up from ${from}`
    : change.to < change.from ? `down from ${from}`
    : `unchanged from ${from}`;
  const line =
    `Nepal's confirmed death toll is reported at ${to}, ` +
    `${movement}, by ${figure.source || 'the published report'}.`;

  /* Already recorded for this bulletin time. Keyed by time as well as count,
     so a later return to an earlier count is still recorded. */
  const stamp = nptStamp(figure.time);
  const recorded = rows.some(([when, text]) =>
    when === stamp && text.includes(`reported at ${to},`));
  if (recorded) return rows;

  return [...rows, [stamp, line]];
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

  /* A late-found bulletin can be older than the newest story. Never go back. */
  if (!(Date.parse(today.updated) >= Date.parse(newest))) today.updated = newest;

  const posts = today.posts || (today.posts = []);
  /* Written as sentences, not as a colon-separated list. This card is the
     most-read thing on the page and it was reading like a log line. */
  const WORDING = {
    dead: 'The confirmed death toll in Nepal',
    missing: 'The number of people listed missing',
    rescued: 'The number of people rescued'
  };
  const lines = applied.map(a => {
    const f = figures[a.metric] || {};
    const subject = WORDING[a.metric] || a.metric;
    const verb = a.to > a.from ? 'has risen to' : 'has been corrected down to';
    return `${subject} ${verb} ${a.to.toLocaleString('en-US')}, from ` +
      `${a.from.toLocaleString('en-US')}` +
      `${f.source ? `, ${f.source} reports` : ''}.`;
  });

  const card = {
    id: LIVE_CARD_ID,
    title: dead
      ? `Latest reported figures: ${dead.value.toLocaleString('en-US')} confirmed dead`
      : 'Latest reported figures',
    time: newest,
    image: '',
    /* Keep the lead factual and source-led. Operational caveats belong in the
       reporting process, not in the reader-facing news card. */
    body: [lines.join(' ')],
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

/**
 * The one sentence of prose this script owns: what the number is, who stated
 * it, and when. It replaces the previous detail for that counter, because a
 * detail describing an old figure is worse than a short accurate one.
 */
/**
 * Cut a counter's detail back to one "Earlier detail" clause.
 *
 * An earlier version of this script captured the prose after it had already
 * been wrapped once, so two counters carry the clause twice — the same
 * breakdown printed under itself, each copy dated differently. Keeping the
 * first is right: it is the one the live sentence is followed by. Runs on
 * every pass, including passes where no counter moved, because the counters
 * that grew a second clause are precisely the ones that stopped moving.
 */
/* The clause was called "Earlier detail" before it was reworded to "Earlier
   note"; a counter written by an older pass still carries the old label, so
   every splitter matches both. Getting this wrong is silent: the split simply
   fails to find its marker and the archived prose, citation URL and all, is
   printed as though it described the current figure. */
const EARLIER = /Earlier (?:detail|note)\b/;

export function repairDetails(event) {
  let changed = false;
  for (const stat of (event && event.stats) || []) {
    if (!stat) continue;
    const prior = firstEarlierDetail(stat.priorDetail);
    if (prior !== stat.priorDetail) { stat.priorDetail = prior; changed = true; }
    const detail = String(stat.detail || '');
    const first = detail.search(EARLIER);
    if (first === -1) continue;
    const rest = detail.slice(first + 1);
    const second = rest.search(EARLIER);
    if (second === -1) continue;
    stat.detail = detail.slice(0, first + 1 + second).trim();
    changed = true;
  }
  return changed;
}

export function firstEarlierDetail(text) {
  if (!text) return text;
  const at = String(text).search(EARLIER);
  return at === -1 ? text : String(text).slice(0, at).trim();
}

export function sourceSentence(figure, previous, priorDetail, priorAsOf) {
  const when = figure.statedTime ? ` at ${figure.statedTime}` : '';
  const moved = previous
    ? ` Up from ${previous.toLocaleString('en-US')}.`.replace('Up from', figure.value < previous ? 'Corrected down from' : 'Up from')
    : '';
  /* Source, figure, and what it moved from. The sentence used to end with a
     line about the figure having been read by a program rather than a person;
     a reader wants to know who published the number, not who typed it. */
  let text = `${figure.source || 'Source'}${when}: ${figure.value.toLocaleString('en-US')}.${moved}`.trim() +
    (figure.url ? ` Source: ${figure.url}` : '');

  if (priorDetail) {
    /* A reader gets the Nepal-time stamp the rest of the page uses, not the
       raw ISO string this field is stored as. */
    const dated = priorAsOf ? `, ${nptStamp(priorAsOf)}` : '';
    text += ` Earlier note${dated}, describing a previous figure: ${priorDetail}`;
  }
  return text;
}

/**
 * Build the figure board here, from the sources, rather than asking the
 * deployed site for it.
 *
 * The first version of this called the site's own /api/figures. That was a
 * loop: the endpoint only returns a board once the new code is deployed, and
 * the deploy only carries new figures once this script has run. On the first
 * run against the live site it did exactly what that loop implies — read an
 * older shape, find no board, and correctly change nothing, for ever.
 *
 * So the resolver is imported and run in-process, over the same two inputs the
 * endpoint uses: the site's aggregated news feed, which is already deployed
 * and stable, and the police bulletins read directly. The rules that decide a
 * figure live in one module and are applied identically in both places, so the
 * page and this script can never disagree about what a source said.
 */
async function fetchBoard() {
  const published = readPublished();

  const [news, police] = await Promise.all([
    fetchJson(`${SITE}/api/news`).catch(e => { console.log('  news: ' + e.message); return null; }),
    loadPoliceNews({ deep: true }).catch(e => { console.log('  police: ' + e.message); return null; })
  ]);

  const items = [];
  if (news && Array.isArray(news.items)) {
    for (const item of news.items) if (item && item.kind !== 'video') items.push(item);
  }
  if (police) items.push(...police);

  if (!items.length) return null;

  /* What the page already publishes is the floor for each counter: a lower
     figure only wins if its sentence says it is a correction. */
  const report = await loadSituation(items, published);
  const baseline = applySituation(published, report);
  const board = verifiedBoard(items, baseline);

  const districts = consistentDistricts(latestDistricts(items), baseline.districts, board.dead);
  const stated = METRICS.filter(m => board[m]).length;
  console.log(`  read ${items.length} reports from ${new Set(items.map(i => i.source).filter(Boolean)).size} sources; ${stated} figure(s) stated`);

  return { board, published, districts, response: baseline.response };
}

/** The figures event.json currently carries. */
function readPublished() {
  try {
    const event = JSON.parse(readFileSync(EVENT, 'utf8'));
    const out = { asOf: event.asOf, figures: event.figures, districts: event.districts, response: event.response };
    for (const [metric, label] of Object.entries(STAT_LABELS)) {
      const stat = (event.stats || []).find(s => s && s.label === label);
      if (stat) out[metric] = Number(String(stat.value).replace(/\D/g, '')) || 0;
    }
    return out;
  } catch (e) {
    return {};
  }
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function report(changed, message) {
  console.log(message);
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`, { flag: 'a' });
  }
}

/* Only when this file is run as a command.
 *
 * Without this guard, importing the module runs the whole update as a side
 * effect — which means the test file that imports one helper out of it would
 * reach across the network and rewrite event.json, the toll timeline and
 * today.json on whatever machine ran `npm test`. That is not a hypothetical:
 * it happened here, and a figure reached a commit without anybody having
 * looked at it. A script that writes to the repository has to be impossible
 * to trigger by importing. */
const runDirectly = process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (runDirectly) {
  main().catch(err => {
    console.error('figures-update failed: ' + err.message);
    report(false, 'failed — nothing written');
  });
}
