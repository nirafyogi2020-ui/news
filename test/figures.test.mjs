import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

import {
  nepaliNumber, readFigures, scopeOf, canSetCounter, pickFigure,
  resolveBoard, inBounds
} from '../functions/api/_figures-core.js';
import { bsDateToIso, extractBody, statedClock } from '../functions/api/police.js';
import { sumLosses } from '../functions/api/bipad.js';

/* --------------------------------------------------------------------------
   Nepali numerals

   Bulletins write the figure in words as often as digits, and the compound
   forms are where a naive reader silently loses the leading digits: "३ हजार ९
   सय १६" read as 916 rather than 3,916 is a wrong number on a disaster page,
   not a rounding error.
   ----------------------------------------------------------------------- */
test('reads Nepali compound numbers', () => {
  assert.equal(nepaliNumber('४ सय ६९'), 469);
  assert.equal(nepaliNumber('११ सय १४'), 1114);
  assert.equal(nepaliNumber('३ हजार ९ सय १६'), 3916);
  assert.equal(nepaliNumber('११ हजार ९ सय ९३'), 11993);
  assert.equal(nepaliNumber('२१ हजार ३ सय १४'), 21314);
  assert.equal(nepaliNumber('१०२७५'), 10275);
  assert.equal(nepaliNumber('कुनै अंक छैन'), null);
});

/* --------------------------------------------------------------------------
   Reading figures out of sentences
   ----------------------------------------------------------------------- */
test('reads each metric in both languages', () => {
  const en = readFigures(
    'A total of 1,114 bodies have been recovered. 3,916 people remain unaccounted for. ' +
    '292 were injured. A total of 11,993 have been rescued.'
  );
  const value = m => (en.find(f => f.metric === m) || {}).value;
  assert.equal(value('dead'), 1114);
  assert.equal(value('missing'), 3916);
  assert.equal(value('injured'), 292);
  assert.equal(value('rescued'), 11993);

  const ne = readFigures(
    'मृतक संख्या ११ सय १४ पुग्यो । सम्पर्कविहीन संख्या ३ हजार ९ सय १६ । ' +
    'हालसम्म ११ हजार ९ सय ९३ जनाको उद्धार । घाइते २ सय ९२ ।'
  );
  const neValue = m => (ne.find(f => f.metric === m) || {}).value;
  assert.equal(neValue('dead'), 1114);
  assert.equal(neValue('missing'), 3916);
  assert.equal(neValue('rescued'), 11993);
  assert.equal(neValue('injured'), 292);
});

test('money is never read as people', () => {
  const found = readFigures(
    'प्रधानमन्त्री दैवी प्रकोप उद्धार कोषमा ३५ लाख रुपैयाँ सहयोग । ' +
    'The fund holds Rs. 5.04 billion.'
  );
  assert.deepEqual(found.filter(f => f.metric === 'rescued'), []);
});

test('a bulletin serial number is not a death toll', () => {
  const found = readFigures('प्रहरी बुलेटिन नं. १०२७५ जारी');
  assert.deepEqual(found, []);
});

/* --------------------------------------------------------------------------
   Scope: the rule that keeps a district's share out of the national counter
   ----------------------------------------------------------------------- */
test('separates a stated total from one place’s share', () => {
  assert.equal(scopeOf('A total of 1,114 bodies have been recovered'), 'total');
  assert.equal(scopeOf('मृतक संख्या ११ सय १४ पुग्यो'), 'total');
  assert.equal(scopeOf('133 bodies recovered from areas affected by flood in Rasuwa'), 'local');
  assert.equal(scopeOf('रसुवाको टिमुरेदेखि घट्टे खोलासम्म भेटिए १०५ शव'), 'local');
  assert.equal(scopeOf('Over 1,000 dead in Nepal floods'), 'unknown');
});

test('a sub-count may never set a counter, whoever published it', () => {
  assert.equal(canSetCounter({ scope: 'local', source: 'NDRRMA' }), false);
  assert.equal(canSetCounter({ scope: 'total', source: 'Setopati' }), true);
  assert.equal(canSetCounter({ scope: 'unknown', source: 'NDTV' }), true);
});

/* --------------------------------------------------------------------------
   Choosing between candidates
   ----------------------------------------------------------------------- */
const at = (h) => `2026-09-02T${String(h).padStart(2, '0')}:00:00+05:45`;

test('the newest stated total wins, not the newest sentence', () => {
  const picked = pickFigure([
    { metric: 'dead', value: 105, scope: 'local', source: 'Khabarhub', time: at(13),
      sentence: 'रसुवाको टिमुरेदेखि भेटिए १०५ शव' },
    { metric: 'dead', value: 1114, scope: 'total', source: 'Onlinekhabar', time: at(10),
      sentence: 'A total of 1,114 bodies have been recovered' }
  ]);
  assert.equal(picked.value, 1114);
  // the sub-count is still shown, just never as the counter
  assert.ok(picked.others.some(o => o.value === 105 && o.scope === 'local'));
});

test('a re-dated older story cannot walk a counter backwards', () => {
  const stale = { metric: 'missing', value: 1400, scope: 'total', source: 'ReliefWeb (UN OCHA)',
    time: at(12), sentence: 'more than 1,400 still missing' };
  assert.equal(pickFigure([stale], { floor: 2502 }), null);
});

test('an explicit correction is allowed to lower a counter', () => {
  const picked = pickFigure([
    { metric: 'dead', value: 900, scope: 'total', source: 'NDRRMA', time: at(12),
      sentence: 'The death toll was revised down to 900 after duplicates were removed' }
  ], { floor: 1114 });
  assert.equal(picked.value, 900);
});

test('at the same moment the counted figure beats the rounded one', () => {
  const picked = pickFigure([
    { metric: 'missing', value: 4000, scope: 'unknown', source: 'NDTV', time: at(3),
      sentence: 'Nearly 4,000 missing' },
    { metric: 'missing', value: 3916, scope: 'unknown', source: 'NDTV', time: at(3),
      sentence: '3,916 missing' }
  ]);
  assert.equal(picked.value, 3916);
});

test('at the same moment the issuing body beats the newsroom relaying it', () => {
  const picked = pickFigure([
    { metric: 'dead', value: 1114, scope: 'total', source: 'Setopati', time: at(9), sentence: 'a total of 1,114' },
    { metric: 'dead', value: 1114, scope: 'total', source: 'NDRRMA', time: at(9), sentence: 'a total of 1,114' }
  ]);
  assert.equal(picked.source, 'NDRRMA');
});

test('a metric nobody states is absent, never zero', () => {
  const board = resolveBoard([
    { title: 'Roads reopen in Dhading', summary: 'Traffic is moving again.', source: 'Kathmandu Post', time: at(9) }
  ]);
  assert.equal(board.dead, undefined);
  assert.equal(board.rescued, undefined);
});

test('an absurd figure is dropped rather than published', () => {
  assert.equal(inBounds('dead', 900000), false);
  assert.equal(inBounds('dead', 1114), true);
  const board = resolveBoard([
    { title: 'A total of 900000 dead', source: 'NDRRMA', time: at(9) }
  ]);
  assert.equal(board.dead, undefined);
});

/* --------------------------------------------------------------------------
   Bikram Sambat dates

   The old parser was pinned to one month and returned nothing from Ashwin
   onwards, which would have quietly stripped the timestamp off every police
   bulletin from mid-September.
   ----------------------------------------------------------------------- */
test('converts BS dates across the year, not one month', () => {
  assert.equal(bsDateToIso('२०८३-०५-१०').slice(0, 10), '2026-08-26');
  assert.equal(bsDateToIso('२०८३-०५-१७').slice(0, 10), '2026-09-02');
  assert.equal(bsDateToIso('२०८३-०६-०१').slice(0, 10), '2026-09-17');
  assert.equal(bsDateToIso('२०८३-०१-०१').slice(0, 10), '2026-04-14');
});

test('an unmapped year gives no timestamp rather than a wrong one', () => {
  assert.equal(bsDateToIso('२०८४-०१-०१'), null);
  assert.equal(bsDateToIso('२०८३-०५-९९'), null);
  assert.equal(bsDateToIso('nonsense'), null);
});

test('a bulletin body is read past the listing teaser', () => {
  const body = extractBody(
    '<html><body><div class="news-detail"><p>आज दिउँसो २:०० बजेसम्म ' +
    '११ सय १४ जनाको मृत्यु भएको छ।</p></div></div></body></html>'
  );
  assert.ok(body.includes('११ सय १४'));
  const figures = readFigures(body);
  assert.equal(figures.find(f => f.metric === 'dead').value, 1114);
});

/* --------------------------------------------------------------------------
   BIPAD
   ----------------------------------------------------------------------- */
test('unfiled BIPAD loss records report as unfiled, not as zero deaths', () => {
  const totals = sumLosses([
    { peopleDeathCount: 0, peopleMissingCount: 0, peopleInjuredCount: 0 },
    { peopleDeathCount: 0, peopleMissingCount: 0, peopleInjuredCount: 0 }
  ]);
  assert.equal(totals.dead, 0);
  assert.equal(totals.filed, 0);
  assert.equal(totals.records, 2);
});

test('BIPAD sums the records that do carry figures', () => {
  const totals = sumLosses([
    { peopleDeathCount: 2, peopleInjuredCount: 5, infrastructureDestroyedHouseCount: 1 },
    { peopleDeathCount: 3, peopleInjuredCount: 0, infrastructureDestroyedHouseCount: 4 }
  ]);
  assert.equal(totals.dead, 5);
  assert.equal(totals.injured, 5);
  assert.equal(totals.housesDestroyed, 5);
  assert.equal(totals.filed, 2);
});

/* --------------------------------------------------------------------------
   Keeping the rest of the page in step with the figures

   A number that moves on its own is only half the job. The static pages read
   their figures from src/content.mjs, print them next to an "as of" line, and
   the whole site derives its "last modified" from today.json. Moving the
   number without moving those leaves the page stating a fresh figure over a
   three-day-old date, which is the failure this change exists to remove.
   ----------------------------------------------------------------------- */
import {
  replaceField, replaceString, readString, nptIso, nptStamp, addTimelineEntry
} from '../src/figures-update.mjs';

const CONTENT_SAMPLE = [
  "export const TOLL_AS_OF = '2026-08-30T14:00:00+05:45';",
  "export const TOLL_SOURCE = 'Nepal Police bulletin 10275, 2pm Sunday';",
  'export const TOLL = {',
  '  deadNepal: 768,',
  '  deadNepalEarlier: 752,',
  '};',
  '',
  'export const TIMELINE = [',
  "  ['14:00 NPT, 30 August', 'Nepal Police bulletin 10275 reports 768 bodies found in Nepal.'],",
  '];'
].join('\n');

test('moves one numeric field and nothing else', () => {
  const out = replaceField(CONTENT_SAMPLE, 'deadNepal', 1114);
  assert.ok(out.includes('deadNepal: 1114,'));
  assert.ok(out.includes('deadNepalEarlier: 752,'), 'the neighbouring field is untouched');
});

test('an unknown field is left alone rather than appended', () => {
  assert.equal(replaceField(CONTENT_SAMPLE, 'noSuchField', 5), CONTENT_SAMPLE);
  assert.equal(replaceString(CONTENT_SAMPLE, 'NO_SUCH_STAMP', 'x'), CONTENT_SAMPLE);
});

test('moves the "as of" stamp and the source name with the figure', () => {
  let out = replaceString(CONTENT_SAMPLE, 'TOLL_AS_OF', '2026-09-02T16:14:39+05:45');
  out = replaceString(out, 'TOLL_SOURCE', 'Onlinekhabar');
  assert.equal(readString(out, 'TOLL_AS_OF'), '2026-09-02T16:14:39+05:45');
  assert.equal(readString(out, 'TOLL_SOURCE'), 'Onlinekhabar');
});

test('timestamps are written in Nepal time, not somebody else’s clock', () => {
  assert.equal(nptIso('2026-09-02T10:29:39.000Z'), '2026-09-02T16:14:39+05:45');
  // same instant, just written the way the rest of the file writes it
  assert.equal(new Date(nptIso('2026-09-02T10:29:39.000Z')).toISOString(),
    '2026-09-02T10:29:39.000Z');
  assert.equal(nptStamp('2026-09-02T10:29:39.000Z'), '16:14 NPT, 2 September');
});

test('a moved toll is recorded in the timeline, once', () => {
  const figure = { source: 'Onlinekhabar', time: '2026-09-02T10:29:39.000Z' };
  const change = { from: 768, to: 1114 };

  const once = addTimelineEntry(CONTENT_SAMPLE, figure, change);
  assert.ok(once.includes('reported at 1,114'));
  assert.ok(once.includes('16:14 NPT, 2 September'));

  // running again must not grow the file
  const twice = addTimelineEntry(once, figure, change);
  assert.equal(twice, once);
});

test('the timeline row is valid JavaScript, quotes and all', async () => {
  const figure = { source: "Nepal's own bureau", time: '2026-09-02T10:29:39.000Z' };
  const out = addTimelineEntry(CONTENT_SAMPLE, figure, { from: 768, to: 1114 });
  const block = out.slice(out.indexOf('export const TIMELINE'));
  // eslint-disable-next-line no-new-func
  const rows = new Function('return ' + block.replace('export const TIMELINE =', '').replace(/;\s*$/, ''))();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.some(r => r[1].includes('1,114')));
});

/* --------------------------------------------------------------------------
   Four faults found by running the thing against a real bulletin

   Every one of these produced a plausible-looking wrong number, or wrote to
   the repository when nobody asked it to. They are the reason this file
   exists.
   ----------------------------------------------------------------------- */

test('a keyword does not reach across a comma for another clause’s number', () => {
  // A landslide headline in the sidebar of a police page. Read carelessly,
  // "६ जना घाइते, २९ जना बेपत्ता" gives 29 injured: the injured keyword
  // grabbing the missing count from the clause after it.
  const found = readFigures('बाढी तथा पहिरोमा परी ६ जनाको मृत्यु, ६ जना घाइते, २९ जना बेपत्ता');
  const value = m => found.filter(f => f.metric === m).map(f => f.value);
  assert.deepEqual(value('dead'), [6]);
  assert.deepEqual(value('injured'), [6], 'must not take 29 from the next clause');
  assert.deepEqual(value('missing'), [29]);
});

test('reads both spellings of "rescued" in Nepali', () => {
  // Nepal Police write उद्दार; the newsrooms write उद्धार. Only accepting one
  // silently dropped 6,907 rescued out of a bulletin that plainly stated it.
  const line = 'बाढी प्रभावित क्षेत्रहरूबाट ६ हजार ९ सय ७ जनाको उद्दार गरिएको छ ' +
    'भने हालसम्म बेपत्ता भएका ५ हजार १५ जनाको खोजी कार्य भइरहेको छ';
  const found = readFigures(line);
  assert.equal(found.find(f => f.metric === 'rescued').value, 6907);
  assert.equal(found.find(f => f.metric === 'missing').value, 5015);
  assert.equal(readFigures('११ हजार ९ सय ९३ जनाको उद्धार').find(f => f.metric === 'rescued').value, 11993);
});

test('a bulletin page is read inside its article, not whole', () => {
  // The sidebar of a real police page carried a different incident entirely.
  // Read as part of this bulletin its figures become candidates for this
  // event; they lose on later rules, but a number that survives only because
  // something else threw it out is one rule away from being published.
  const page = [
    '<html><body><nav>प्रहरी कन्ट्रोल : १००</nav>',
    '<div class="news-article"><p>बुधबार १७:०० बजे सम्म १ हजार १ सय ३२ जनाको शव फेला परेको छ।</p>',
    '<p>जसमध्ये चितवनमा ३ सय ४८ जना।</p></div></div>',
    '<aside><a>बाढी तथा पहिरोमा परी ६ जनाको मृत्यु, ६ जना घाइते, २९ जना बेपत्ता</a></aside>',
    '</body></html>'
  ].join('');

  const body = extractBody(page);
  assert.ok(body.includes('१ हजार १ सय ३२'), 'keeps the bulletin');
  assert.ok(body.includes('चितवनमा'), 'keeps the district breakdown');
  assert.ok(!body.includes('पहिरोमा'), 'drops the unrelated sidebar headline');

  const figures = readFigures(body);
  assert.equal(figures.find(f => f.metric === 'dead').value, 1132);
});

test('an unrecognised page yields no body rather than the wrong body', () => {
  assert.equal(extractBody('<html><body><p>१ हजार जना</p></body></html>'), null);
  assert.equal(extractBody(''), null);
});

test('importing the updater does not run it', async () => {
  // The update script writes event.json, src/content.mjs and today.json. It
  // used to do that on import, which meant the line at the top of this file
  // importing one helper out of it reached across the network and rewrote the
  // repository on whatever machine ran the tests. A figure reached a commit
  // that way, unreviewed.
  const before = readFileSync(new URL('../event.json', import.meta.url), 'utf8');
  await import('../src/figures-update.mjs');
  const after = readFileSync(new URL('../event.json', import.meta.url), 'utf8');
  assert.equal(after, before, 'importing the module must not touch the repository');
});

test('a bulletin is stamped with the hour it says it counts up to', () => {
  // The police listing carries a date and no clock, so an item is stamped
  // noon. The bulletin body says "बुधबार १७:०० बजे सम्म". Stamped noon, a 5pm
  // police bulletin loses first-wins to a 4:14pm newsroom item relaying an
  // older figure — which is how 1,132 from the bulletin lost to 1,114 from a
  // relay.
  assert.equal(statedClock('काठमाडौं, बुधबार १७:०० बजे सम्म १ हजार १ सय ३२ जनाको शव'), '17:00');
  assert.equal(statedClock('आज दिउँसो २:३० बजे सम्म'), '02:30');
  // a bare time with no बजे could be anything on the page
  assert.equal(statedClock('page updated 17:00'), null);
  assert.equal(statedClock(null), null);
  assert.equal(statedClock('२५:९९ बजे'), null);
});
