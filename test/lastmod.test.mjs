import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pageFingerprint, honestLastmod } from '../src/lastmod.mjs';
import { isAutomaticCard } from '../src/pages.mjs';

const page = (main, byline = 'Last checked 7:43 am', v = 1) =>
  `<title>T</title><meta name="description" content="D"><link href="/a.css?v=${v}">` +
  `<main id="main"><p class="byline">${byline}</p>${main}</main><aside>rail ${v}</aside>`;

test('fingerprint ignores the byline, cache stamps and the rail', () => {
  assert.equal(pageFingerprint(page('<p>Same text</p>', 'Last checked 6:57 am', 1)),
    pageFingerprint(page('<p>Same text</p>', 'Last checked 7:43 am', 2)));
  assert.notEqual(pageFingerprint(page('<p>Same text</p>')), pageFingerprint(page('<p>New text</p>')));
});

test('an unchanged page keeps its date however new the briefings are', () => {
  const prev = { hash: 'abc', lastmod: '2026-11-07T06:24:16.000Z' };
  assert.equal(honestLastmod(prev, 'abc', '2026-11-22T01:58:15.000Z', '2026-11-22T02:00:00.000Z').lastmod,
    '2026-11-07T06:24:16.000Z');
});

test('a changed page takes the newer briefing time, or the build time', () => {
  const prev = { hash: 'abc', lastmod: '2026-11-07T06:24:16.000Z' };
  assert.equal(honestLastmod(prev, 'def', '2026-11-22T01:58:15.000Z', '2026-11-22T02:00:00.000Z').lastmod,
    '2026-11-22T01:58:15.000Z');
  assert.equal(honestLastmod(prev, 'def', '2026-11-01', '2026-11-22T02:00:00.000Z').lastmod,
    '2026-11-22T02:00:00.000Z');
  assert.equal(honestLastmod(undefined, 'def', '2026-11-20', '2026-11-22T02:00:00.000Z').lastmod,
    '2026-11-20T00:00:00.000Z');
});

test('relay and figures cards are automatic, written briefings are not', () => {
  assert.ok(isAutomaticCard({ id: 'auto-2026-11-22-ef6afd09' }));
  assert.ok(isAutomaticCard({ id: 'latest-reported-figures', slug: '2026-10-14-latest-reported-figures' }));
  assert.ok(isAutomaticCard({ slug: '2026-10-14-latest-reported-figures' }));
  assert.ok(!isAutomaticCard({ id: 'barrier-lake-burst', slug: '2026-08-29-barrier-lake-burst' }));
  assert.ok(!isAutomaticCard({ id: 'damage-cost' }));
});
