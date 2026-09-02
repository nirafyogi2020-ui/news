import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  nepaliNumber, readFigures, scopeOf, canSetCounter, pickFigure,
  resolveBoard, inBounds
} from '../functions/api/_figures-core.js';
import { bsDateToIso, extractBody } from '../functions/api/police.js';
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
