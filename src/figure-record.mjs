/* ============================================================================
   The live figures, read from one place.

   event.json is the only file that holds the current counts: the death toll,
   the missing list, the rescued count, the bulletin each one came from and
   when, the toll it moved up from, and the district breakdown. The figures job
   (src/figures-update.mjs) writes it; the hero, the article pages, the Nepali
   pages and the share images all read it through this module. No script
   rewrites source code to keep a second copy in step.

   The record is checked before anything uses it. A missing counter, a counter
   that disagrees with the evidence saved beside it, or a timestamp that does
   not parse stops the build with a message naming the field, instead of a page
   quietly printing a stale or empty number.

   The toll moves the job records for the event timeline live separately, in
   data/toll-timeline.json, so the history never sits inside the figure record.
   ========================================================================= */
import { readFileSync } from 'node:fs';

export const EVENT_FILE = new URL('../event.json', import.meta.url);
export const TIMELINE_FILE = new URL('../data/toll-timeline.json', import.meta.url);

/* Which counter in event.json each metric is, matched on the label the file
   uses. */
export const STAT_LABELS = {
  dead: 'confirmed dead',
  missing: 'listed missing in Nepal',
  rescued: 'rescued so far'
};

/**
 * The same instant written in Nepal time, which is the convention every
 * timestamp on the pages follows. A UTC "Z" stamp would parse identically and
 * read as somebody else's clock on a Nepali page.
 */
export function nptIso(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const npt = new Date(d.getTime() + (5 * 60 + 45) * 60000);
  return npt.toISOString().replace(/\.\d+Z$/, '') + '+05:45';
}

/** How a figure names itself on the page: who said it, and at what hour. */
export function sourceLabel(figure) {
  const when = figure.statedTime ? `, ${figure.statedTime}` : '';
  return `${figure.source}${when}`;
}

const isTime = value => typeof value === 'string' && isFinite(Date.parse(value));
const isText = value => typeof value === 'string' && value.trim() !== '';
const isCount = value => Number.isInteger(value) && value >= 0;

/**
 * Check the figure record in a parsed event.json and return it in the shape
 * the pages use. Throws, naming every problem, when it is not usable.
 */
export function figureRecord(event) {
  const problems = [];
  const out = { stamps: {} };
  const stats = (event && Array.isArray(event.stats)) ? event.stats : [];
  const figures = (event && event.figures) || {};

  for (const [metric, label] of Object.entries(STAT_LABELS)) {
    const stat = stats.find(s => s && s.label === label);
    if (!stat) { problems.push(`no counter labelled "${label}"`); continue; }
    const value = Number(String(stat.value).replace(/,/g, ''));
    if (!isCount(value) || value === 0) {
      problems.push(`counter "${label}" is "${stat.value}", not a count`);
      continue;
    }
    out[metric] = value;

    const figure = figures[metric];
    if (!figure) { problems.push(`figures.${metric} is missing`); continue; }
    if (figure.value !== value) {
      problems.push(`figures.${metric} says ${figure.value} but the "${label}" counter says ${stat.value}`);
    }
    if (!isTime(figure.time)) problems.push(`figures.${metric}.time "${figure.time}" does not parse`);
    if (!isText(figure.source)) problems.push(`figures.${metric}.source is empty`);
    out.stamps[metric] = { asOf: nptIso(figure.time), source: sourceLabel(figure) };
  }

  const earlier = event && event.tollEarlier;
  if (!earlier) {
    problems.push('tollEarlier is missing');
  } else {
    if (!isCount(earlier.value) || earlier.value === 0) problems.push(`tollEarlier.value "${earlier.value}" is not a count`);
    if (!isTime(earlier.time)) problems.push(`tollEarlier.time "${earlier.time}" does not parse`);
    if (!isText(earlier.source)) problems.push('tollEarlier.source is empty');
    out.earlier = { value: earlier.value, asOf: nptIso(earlier.time), source: earlier.source };
  }

  const districts = event && event.districts;
  const rows = districts && Array.isArray(districts.rows) ? districts.rows : [];
  if (!rows.length) {
    problems.push('districts.rows is empty');
  } else {
    rows.forEach((row, i) => {
      if (!row || !isText(row.district) || !isCount(row.value)) problems.push(`districts.rows[${i}] is not a district and a count`);
    });
    if (!isTime(districts.time)) problems.push(`districts.time "${districts.time}" does not parse`);
    if (!isText(districts.source)) problems.push('districts.source is empty');
    out.districts = {
      rows: rows.map(row => [row && row.district, row && row.value]),
      asOf: nptIso(districts.time),
      source: districts.source
    };
  }

  if (problems.length) {
    throw new Error('event.json figure record is not usable: ' + problems.join('; '));
  }
  return out;
}

/** The figure record as event.json holds it now. */
export function readFigureRecord() {
  return figureRecord(JSON.parse(readFileSync(EVENT_FILE, 'utf8')));
}

/** Check a list of timeline rows: each one a [when, text] pair of strings. */
export function timelineRows(rows) {
  if (!Array.isArray(rows) || !rows.every(r => Array.isArray(r) && r.length === 2 && isText(r[0]) && isText(r[1]))) {
    throw new Error('data/toll-timeline.json must be a list of [when, text] pairs');
  }
  return rows;
}

/** The toll moves the figures job has recorded, oldest first. */
export function readTollTimeline(file = TIMELINE_FILE) {
  return timelineRows(JSON.parse(readFileSync(file, 'utf8')));
}
