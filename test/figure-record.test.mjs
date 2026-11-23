/* The live figures are stored once, in event.json, and the generated pages
   read them from there. These tests hold that in place: the editorial module
   prints exactly what event.json says, a record the pages could not be built
   from is refused with the field named, and the figures job writes data files
   only, never source code. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as C from '../src/content.mjs';
import { figureRecord, nptIso, sourceLabel, STAT_LABELS, readTollTimeline } from '../src/figure-record.mjs';
import { saveEvent, earlierToll, recordTimeline } from '../src/figures-update.mjs';

const read = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const EVENT = JSON.parse(read('event.json'));
const count = label => Number(String(EVENT.stats.find(s => s.label === label).value).replace(/,/g, ''));
const clone = () => JSON.parse(JSON.stringify(EVENT));

test('the article pages print the counts event.json holds', () => {
  assert.equal(C.TOLL.deadNepal, count(STAT_LABELS.dead));
  assert.equal(C.TOLL.missing, count(STAT_LABELS.missing));
  assert.equal(C.TOLL.rescued, count(STAT_LABELS.rescued));
  assert.equal(C.TOLL.deadNepalEarlier, EVENT.tollEarlier.value);
});

test('each count carries the stamp and source of its own evidence', () => {
  assert.equal(C.TOLL_AS_OF, nptIso(EVENT.figures.dead.time));
  assert.equal(C.TOLL_SOURCE, sourceLabel(EVENT.figures.dead));
  assert.equal(C.MISSING_AS_OF, nptIso(EVENT.figures.missing.time));
  assert.equal(C.MISSING_SOURCE, sourceLabel(EVENT.figures.missing));
  assert.equal(C.RESCUE_AS_OF, nptIso(EVENT.figures.rescued.time));
  assert.equal(C.RESCUE_SOURCE, sourceLabel(EVENT.figures.rescued));
  assert.equal(C.TOLL_EARLIER_AS_OF, nptIso(EVENT.tollEarlier.time));
  assert.equal(C.TOLL_EARLIER_SOURCE, EVENT.tollEarlier.source);
  assert.equal(C.BODIES_AS_OF, nptIso(EVENT.districts.time));
  assert.equal(C.BODIES_SOURCE, EVENT.districts.source);
});

test('the district table is the breakdown event.json holds, in its order', () => {
  assert.deepEqual(C.BODIES_BY_DISTRICT, EVENT.districts.rows.map(r => [r.district, r.value]));
});

test('the timeline ends with the toll moves the job recorded', () => {
  const recorded = readTollTimeline();
  assert.deepEqual(C.TIMELINE.slice(C.TIMELINE.length - recorded.length), recorded);
});

test('no live count is written into the editorial source any more', () => {
  const src = read('src/content.mjs');
  for (const field of ['deadNepal', 'deadNepalEarlier', 'missing', 'rescued']) {
    assert.ok(!new RegExp(`\\b${field}:\\s*\\d`).test(src), `${field} is still a number in src/content.mjs`);
  }
  assert.ok(!/\b(?:TOLL|MISSING|RESCUE|BODIES)_AS_OF\s*=\s*'/.test(src), 'an "as of" stamp is still typed into src/content.mjs');
});

test('the figures job never rewrites source code', () => {
  const src = read('src/figures-update.mjs');
  assert.ok(!src.includes('content.mjs'), 'src/figures-update.mjs still names src/content.mjs');
  assert.ok(!/writeFileSync\([^)]*\.mjs/.test(src), 'src/figures-update.mjs writes a module file');
});

test('a counter that disagrees with its own evidence is refused, by name', () => {
  const event = clone();
  event.figures.dead = { ...event.figures.dead, value: event.figures.dead.value + 1 };
  assert.throws(() => figureRecord(event), /figures\.dead says/);
});

test('a missing counter, stamp or breakdown is refused rather than printed empty', () => {
  const noCounter = clone();
  noCounter.stats = noCounter.stats.filter(s => s.label !== STAT_LABELS.missing);
  assert.throws(() => figureRecord(noCounter), /no counter labelled "listed missing in Nepal"/);

  const badTime = clone();
  badTime.figures.rescued = { ...badTime.figures.rescued, time: 'yesterday' };
  assert.throws(() => figureRecord(badTime), /figures\.rescued\.time/);

  const noEarlier = clone();
  delete noEarlier.tollEarlier;
  assert.throws(() => figureRecord(noEarlier), /tollEarlier is missing/);

  const noDistricts = clone();
  noDistricts.districts = { ...noDistricts.districts, rows: [] };
  assert.throws(() => figureRecord(noDistricts), /districts\.rows is empty/);
});

test('the job will not save a record the build would refuse', () => {
  const dir = mkdtempSync(join(tmpdir(), 'figure-record-'));
  const file = join(dir, 'event.json');
  const bad = clone();
  bad.stats.find(s => s.label === STAT_LABELS.dead).value = '1,999';
  assert.throws(() => saveEvent(bad, file), /figures\.dead says/);
  assert.equal(existsSync(file), false, 'nothing was written');

  saveEvent(clone(), file);
  assert.equal(readFileSync(file, 'utf8'), read('event.json'));
});

test('a moved toll keeps the stamp of the toll it replaced', () => {
  const event = clone();
  const earlier = earlierToll(event, 1458);
  assert.deepEqual(earlier, {
    value: 1458,
    time: nptIso(event.figures.dead.time),
    source: sourceLabel(event.figures.dead)
  });
});

test('a moved toll is added to the timeline file once, and nothing else is', () => {
  const dir = mkdtempSync(join(tmpdir(), 'toll-timeline-'));
  const file = join(dir, 'toll-timeline.json');
  writeFileSync(file, '[]\n');
  const figures = { dead: { value: 1460, source: 'Nepal Police', time: '2026-10-20T08:15:00.000Z' } };
  const applied = [{ metric: 'dead', from: 1458, to: 1460 }];

  assert.equal(recordTimeline(applied, figures, file), true);
  assert.equal(recordTimeline(applied, figures, file), false, 'a second run adds nothing');
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(rows, [[
    '14:00 NPT, 20 October',
    "Nepal's confirmed death toll is reported at 1,460, up from 1,458, by Nepal Police."
  ]]);

  assert.equal(recordTimeline([{ metric: 'missing', from: 1, to: 2 }], figures, file), false,
    'only the toll is recorded in the timeline');
});
