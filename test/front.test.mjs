import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  cleanHeadline, hasBannedWord, hasDash, isNepalDisasterHeadline, isRoadHeadline,
  frontNews, roadNews, frontTitle, tldrLines, daysSince, figureNumber,
} from '../src/front-rules.mjs';
import { frontPage, rasuwaDashboard, rasuwaBriefing } from '../src/pages.mjs';

const event = JSON.parse(readFileSync(new URL('../event.json', import.meta.url), 'utf8'));

/* -- house style on reprinted headlines ------------------------------------- */

test('an em dash becomes a comma and a joining en dash a hyphen', () => {
  assert.equal(cleanHeadline('Toll rises — police say 12 dead'), 'Toll rises, police say 12 dead');
  assert.equal(cleanHeadline('स्याफ्रुबेँसी–खाम्जिङ जोड्ने काठेपुल सञ्चालन'), 'स्याफ्रुबेँसी-खाम्जिङ जोड्ने काठेपुल सञ्चालन');
  assert.equal(hasDash(cleanHeadline('a – b')), false);
});

test('a headline that names the tooling is left out, not softened', () => {
  assert.equal(cleanHeadline('AI tool predicts floods in Nepal'), '');
  assert.equal(cleanHeadline('New model of the glacier collapse'), '');
  assert.equal(cleanHeadline('Village rebuilt after the flood'), 'Village rebuilt after the flood');
  assert.equal(hasBannedWord('Airport reopens'), false, 'the word has to stand alone');
  assert.equal(hasBannedWord('Modelling agency'), false);
});

test('disaster and road headlines are told apart from the rest of a newsroom feed', () => {
  assert.equal(isNepalDisasterHeadline('Mustang produces apples worth over Rs 1.14 billion'), false);
  assert.equal(isNepalDisasterHeadline('Flood, landslide trigger water shortage in Beni, Myagdi'), true);
  assert.equal(isNepalDisasterHeadline('मनाङमा वर्षा र हिमपातको सम्भावना'), true);
  assert.equal(isNepalDisasterHeadline('Spanish train crash death toll rises to 69 as rescuers search for victims'), false);
  assert.equal(isNepalDisasterHeadline('546 missing on the China side after the Rasuwa flood'), true);
  assert.equal(isRoadHeadline('Beni-Darbang-Muna road reconstruction estimated to cost Rs 70 million'), true);
  assert.equal(isRoadHeadline('Loss and Damage Fund approves grant'), false);
});

test('frontNews keeps Nepal press newest first, drops videos, duplicates and off-topic lines', () => {
  const items = [
    { title: 'Apples stranded in warehouses', url: 'https://a.example/1', source: 'A', time: '2026-10-29T04:40:29.000Z', kind: 'press', region: 'nepal' },
    { title: 'Floods block highway in Gorkha', url: 'https://a.example/2', source: 'A', time: '2026-10-29T05:00:00.000Z', kind: 'press', region: 'nepal' },
    { title: 'Floods block highway in Gorkha', url: 'https://a.example/2', source: 'A', time: '2026-10-29T05:00:00.000Z', kind: 'press', region: 'nepal' },
    { title: 'Flood rescue footage', url: 'https://youtube.com/watch?v=x', source: 'TV', time: '2026-10-30T05:00:00.000Z', kind: 'video', region: 'nepal' },
    { title: 'Flood in Brazil kills 12', url: 'https://b.example/3', source: 'B', time: '2026-10-30T06:00:00.000Z', kind: 'press', region: 'global' },
    { title: 'Landslide — two missing in Myagdi', url: 'https://a.example/4', source: 'A', time: '2026-10-30T01:00:00.000Z', kind: 'press', region: 'nepal', image: 'http://insecure.example/x.jpg' },
  ];
  const out = frontNews(items);
  assert.deepEqual(out.map(i => i.url), ['https://a.example/4', 'https://a.example/2']);
  assert.equal(out[0].title, 'Landslide, two missing in Myagdi');
  assert.equal(out[0].image, '', 'an http picture is not used');
  assert.deepEqual(roadNews(out).map(i => i.url), ['https://a.example/2']);
});

/* -- the words at the top ---------------------------------------------------- */

test('the front title carries the toll and stays under 75 characters', () => {
  const t = frontTitle(event);
  assert.ok(t.length < 75, t);
  assert.match(t, /\d/);
  assert.match(t, /^Nepal Disaster Update Live: /);
  const long = { ...event, name: 'An absurdly long event name that should never fit inside a search result title' };
  assert.ok(frontTitle(long).length < 75);
});

test('the three lines are built from the event and name the source', () => {
  const lines = tldrLines(event, '14 October 2026, 12:00 pm NPT');
  assert.equal(lines.length, 3);
  assert.equal(lines[0].k, 'What happened');
  assert.match(lines[1].t, /^Nepal Police: 1,456 confirmed dead and 5,285 listed missing in Nepal, as of 14 October 2026/);
  assert.match(lines[1].t, /Missing does not mean dead\.$/);
  assert.match(lines[2].t, /100 or 112/);
  for (const l of lines) { assert.equal(hasDash(l.t), false); assert.equal(hasBannedWord(l.t), false); }
});

test('days and figures parse as the page expects', () => {
  assert.equal(daysSince('2026-08-26T09:00:00+05:45', Date.parse('2026-08-26T12:00:00+05:45')), 1);
  assert.equal(daysSince('2026-08-26T09:00:00+05:45', Date.parse('2026-08-28T12:00:00+05:45')), 3);
  assert.equal(daysSince('not a date'), null);
  assert.equal(figureNumber('1,456'), 1456);
  assert.equal(figureNumber('Rs 18.14bn'), 1814);
  assert.equal(figureNumber(''), null);
});

/* -- the built pages --------------------------------------------------------- */

const ctx = {
  event,
  today: { updated: event.asOf, posts: [] },
  modified: event.asOf,
  buildDay: '2026-10-30',
  posts: [
    { slug: '2026-10-30-test', url: '/updates/2026-10-30-test/', title: 'Road to Syabrubesi reopens – police', time: '2026-10-30T01:00:00.000Z', body: ['x'], sources: [] },
    { slug: '2026-10-29-test', url: '/updates/2026-10-29-test/', title: 'A model village is generated', time: '2026-10-29T01:00:00.000Z', body: ['x'], sources: [] },
  ],
};
const news = [
  { title: 'Highway to Rasuwa reopens after landslide — police', url: 'https://kathmandupost.com/x', source: 'Kathmandu Post', time: '2026-10-30T02:00:00.000Z', kind: 'press', region: 'nepal', image: 'https://kathmandupost.com/x.jpg' },
  { title: 'AI predicts the next flood', url: 'https://example.com/ai', source: 'X', time: '2026-10-30T03:00:00.000Z', kind: 'press', region: 'nepal' },
];
const photos = {
  'updates-2026-08-27-rasuwa-flood': { file: 'updates-2026-08-27-rasuwa-flood.jpg', credit: 'ICIMOD' },
  'updates-2026-10-30-test': { file: 'test.jpg', credit: 'Setopati' },
  'updates-2026-10-29-test': { file: 'test2.jpg', credit: 'Setopati' },
};

test('the front page has one h1, a root canonical, the toll, and keeps the house rules', () => {
  const pg = frontPage(ctx, { news, photos, events: [event] });
  assert.equal(pg.path, '/');
  assert.ok(pg.title.length < 75);
  assert.ok(pg.description.length >= 70 && pg.description.length <= 200, pg.description);
  assert.equal((pg.html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(pg.html, /<link rel="canonical" href="https:\/\/nepaldisasterupdatelive\.nxtimaginelabs\.com\/">/);
  assert.match(pg.html, /data-live="dead">1,456</);
  assert.match(pg.html, /<a data-event-card href="\/nepal-flood\/rasuwa\/">/);
  assert.match(pg.html, /Photograph: ICIMOD/);
  assert.match(pg.html, /Highway to Rasuwa reopens after landslide, police/);
  assert.doesNotMatch(pg.html, /AI predicts/);
  assert.doesNotMatch(pg.html, /model village/);
  const visible = pg.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  assert.equal(hasDash(visible), false, 'no em or en dash in visible text');
  assert.equal(hasBannedWord(visible), false, 'no banned word in visible text');
  /* Red is for the dead only: the missing tile is not marked critical. */
  assert.match(pg.html, /<article class="fp-fig is-critical" data-metric="dead">/);
  assert.match(pg.html, /<article class="fp-fig" data-metric="missing">/);
});

test('an empty slot is left out rather than filled', () => {
  const pg = frontPage(ctx, { news: [], photos: {}, events: [event] });
  assert.doesNotMatch(pg.html, /id="latest"/);
  assert.doesNotMatch(pg.html, /id="photos"/);
  assert.doesNotMatch(pg.html, /Roads and access/);
  assert.match(pg.html, /id="figures"/);
  assert.match(pg.html, /id="help"/);
});

test('the dashboard metadata and the folded briefing describe the same page', () => {
  const d = rasuwaDashboard(ctx);
  assert.equal(d.path, '/nepal-flood/rasuwa/');
  assert.match(d.title, /^Nepal Flood Live: 1,456 dead, 5,285 missing in Rasuwa, 14 Oct$/);
  assert.ok(d.title.length < 75);
  assert.equal(d.html, null);
  assert.deepEqual(d.alternates.map(a => a.hreflang), ['en', 'ne']);
  const b = rasuwaBriefing(ctx);
  assert.match(b, /<h3>What happened<\/h3>/);
  assert.match(b, /<table class="data-table">/);
  assert.doesNotMatch(b, /<h1|<h2>What happened/);
});
