import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { readDistricts } from '../functions/api/_figures-core.js';
import { latestDistricts } from '../functions/api/figures.js';
import { firstEarlierDetail, repairDetails } from '../src/figures-update.mjs';
import { planCards, coveredDays, usedUrls, nptDay, oneSentence, statesAToll, pruneStaleAutoCards } from '../src/briefings-update.mjs';

const BULLETIN = 'जसमध्ये रसुवामा ४५ जना, नुवाकोटमा १ सय ५५ जना, धादिङमा ५९ जना, ' +
  'चितवनमा ३ सय ४८ जना, गोरखामा ६८ जना, तनहुँमा ३८ जना, नवलपरासी पूर्वमा २ सय १७ जना र ' +
  'नवलपरासी पश्‍चिम १ सय ८८ जना र भारतमा भेटिएको (नवलपरासी पश्चिममा बुझाएको) १४ गरी ' +
  '१ हजार १ सय ३२ जनाको शव फेला परेको हो ।';

test('the district breakdown adds up to the total the same bulletin states', () => {
  const rows = readDistricts(BULLETIN);
  assert.equal(rows.reduce((sum, row) => sum + row.value, 0), 1132);
  assert.equal(rows[0].district, 'Chitwan');
  assert.equal(rows[0].value, 348);
});

/* The shape that actually reached the live site on 3 September 2026: the item
   is title + summary + body joined, the 220-character summary stops in the
   middle of the district run, and the body then repeats the headline total. */
const TRUNCATED_FEED_ITEM = [
  'भोटेकोशी बाढी अपडेट : १ हजार २ सय ८० जनाको शव फेला, २ जनाको उपचारको क्रममा मृत्यु',
  'काठमाडौं, रसुवाको भोटेकोशीमा आएको विनाशकारी बाढीका कारण बिहीबार राति २०:०० बजे सम्म ' +
    '१ हजार २ सय ८० जनाको शव फेला परेको छ । जसमध्ये रसुवामा १ सय ४० जना, नुवाकोटमा १ सय ८५ जना, ' +
    'धादिङमा ६० जना, चितवनमा ३ सय ५९ जना, गोरखामा',
  'भोटेकोशी बाढी अपडेट : १ हजार २ सय ८० जनाको शव फेला, २ जनाको उपचारको क्रममा मृत्यु । ' +
    'काठमाडौं, रसुवाको भोटेकोशीमा आएको विनाशकारी बाढीका कारण १ हजार २ सय ८० जनाको शव फेला परेको हो । ' +
    'जसमध्ये रसुवामा १ सय ४० जना, नुवाकोटमा १ सय ८५ जना, धादिङमा ६० जना, चितवनमा ३ सय ५९ जना, ' +
    'गोरखामा ७२ जना, तनहुँमा ३८ जना, नवलपरासी पूर्वमा २ सय १८ जना र नवलपरासी पश्‍चिम १ सय ९० जना र ' +
    'भारतमा भेटिएको (नवलपरासी पश्‍चिममा बुझाएको) १८ गरी १ हजार २ सय ८० जनाको शव फेला परेको हो ।'
].join(' ');

test('a district name left dangling by the summary cut does not read the headline total', () => {
  const rows = readDistricts(TRUNCATED_FEED_ITEM);
  const gorkha = rows.find(row => row.district === 'Gorkha');
  assert.equal(gorkha.value, 72, 'Gorkha was published as 1,280, the national total');
  assert.equal(rows.reduce((sum, row) => sum + row.value, 0), 1280,
    'the breakdown must add up to the total the same bulletin states');
});

test('a district that swallows the national total is dropped, clause or no clause', () => {
  const noClause = 'रसुवामा १ सय ४० जना, नुवाकोटमा १ सय ८५ जना, धादिङमा ६० जना, ' +
    'चितवनमा ३ सय ५९ जना, गोरखामा १ हजार २ सय ८० जना ।';
  const rows = readDistricts(noClause);
  assert.equal(rows.some(row => row.district === 'Gorkha'), false);
  assert.equal(rows.length, 4);
});

test('a bulletin with no breakdown yields nothing rather than a partial table', () => {
  assert.deepEqual(readDistricts('हालसम्म १ हजार जनाको शव फेला परेको छ ।'), []);
  assert.equal(latestDistricts([{ source: 'Nepal Police', time: '2026-09-02T17:00:00+05:45', summary: 'no breakdown' }]), null);
});

test('a counter never carries more than one archived detail', () => {
  const event = {
    stats: [{
      detail: 'Now: 5. Earlier detail (as of A): first. Earlier detail (as of B): second.',
      priorDetail: 'first. Earlier detail (as of B): second.'
    }]
  };
  assert.equal(repairDetails(event), true);
  assert.equal(event.stats[0].detail.match(/Earlier detail/g).length, 1);
  assert.equal(event.stats[0].priorDetail, 'first.');
  assert.equal(repairDetails(event), false, 'a repaired event is left alone on the next pass');
  assert.equal(firstEarlierDetail('plain'), 'plain');
});

test('the briefing filler covers a thin day and leaves a covered one alone', () => {
  const today = {
    posts: [
      { id: 'hand', title: 'Written by a person', time: '2026-09-01T10:00:00+05:45', sources: [{ url: 'https://example.com/a' }] },
      { id: 'h2', title: 'Also by a person', time: '2026-09-01T11:00:00+05:45', sources: [{ url: 'https://example.com/b' }] },
      { id: 'h3', title: 'And a third', time: '2026-09-01T12:00:00+05:45', sources: [{ url: 'https://example.com/c' }] }
    ]
  };
  const items = [
    { kind: 'press', source: 'The Kathmandu Post', title: 'A covered day gets nothing new', url: 'https://example.com/d', time: '2026-09-01T13:00:00+05:45', summary: 'x'.repeat(80) },
    { kind: 'press', source: 'The Kathmandu Post', title: 'An empty day is filled', url: 'https://example.com/e', time: '2026-08-31T13:00:00+05:45', summary: 'y'.repeat(80) },
    { kind: 'video', source: 'Kantipur TV', title: 'Video is never a briefing', url: 'https://example.com/f', time: '2026-08-31T14:00:00+05:45', summary: 'z'.repeat(80) },
    { kind: 'press', source: 'Some Blog Nobody Checked', title: 'An unvetted source is never a card', url: 'https://example.com/g', time: '2026-08-31T15:00:00+05:45', summary: 'w'.repeat(80) }
  ];
  const cards = planCards(items, { today, archive: [], now: Date.parse('2026-09-02T12:00:00Z') });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].sources[0].url, 'https://example.com/e');
  assert.equal(cards[0].auto, true);
});

test('a story already on the page is never published twice', () => {
  const today = { posts: [{ id: 'a', title: 'T', time: '2026-08-31T10:00:00+05:45', sources: [{ url: 'https://example.com/e' }] }] };
  const items = [{ kind: 'press', source: 'Onlinekhabar', title: 'Same story again', url: 'https://example.com/e#top', time: '2026-08-31T11:00:00+05:45', summary: 'q'.repeat(80) }];
  assert.equal(planCards(items, { today, archive: [], now: Date.parse('2026-09-02T12:00:00Z') }).length, 0);
  assert.equal(usedUrls(today, []).has('https://example.com/e'), true);
  assert.equal(coveredDays(today, []).get('2026-08-31'), 1);
});

test('a day is counted in Kathmandu time, not UTC', () => {
  assert.equal(nptDay('2026-08-30T20:00:00Z'), '2026-08-31');
  assert.equal(oneSentence('one. two. ' + 'x'.repeat(400)).length <= 241, true);
});

test('importing the briefing filler does not run it', () => {
  const source = readFileSync(new URL('../src/briefings-update.mjs', import.meta.url), 'utf8');
  assert.match(source, /const invoked = process\.argv\[1\]/);
  assert.match(source, /if \(invoked\) main\(\);/);
});

test('an automatic card never carries a figure that will move', () => {
  assert.equal(statesAToll('Bhotekoshi flood leaves 1,204 dead; 4,216 unaccounted for'), true);
  assert.equal(statesAToll('हालसम्म १ हजार जनाको शव फेला'), true);
  assert.equal(statesAToll('Ncell extends free voice and data in flood-hit areas'), false);

  const items = [{
    kind: 'press', source: 'Onlinekhabar', title: 'Death toll reaches 1,204',
    url: 'https://example.com/toll', time: '2026-08-31T10:00:00+05:45', summary: 'k'.repeat(80)
  }];
  assert.equal(planCards(items, { today: { posts: [] }, archive: [], now: Date.parse('2026-09-02T12:00:00Z') }).length, 0);
});

test('a card that already stated a figure is dropped, a hand-written one is kept', () => {
  const today = {
    posts: [
      { auto: true, title: 'Toll reaches 1,204', body: [] },
      { title: 'A person wrote this about 1,204 dead', body: [] },
      { auto: true, title: 'Ncell extends free data', body: ['No figures here.'] }
    ]
  };
  assert.equal(pruneStaleAutoCards(today), 1);
  assert.equal(today.posts.length, 2);
  assert.equal(pruneStaleAutoCards(today), 0, 'a pruned feed is left alone next time');
});
