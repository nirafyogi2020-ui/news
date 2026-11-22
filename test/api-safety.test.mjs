import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toCount } from '../functions/api/incidents.js';
import { safeDocUrl } from '../functions/api/official.js';
import { pubDate } from '../functions/feed.xml.js';
import { isPublicWebUrl } from '../src/photo.mjs';

test('incident counts are whole numbers or null, never markup', () => {
  assert.equal(toCount(0), 0);
  assert.equal(toCount(12), 12);
  assert.equal(toCount('7'), 7);
  assert.equal(toCount(null), null);
  assert.equal(toCount(undefined), null);
  assert.equal(toCount(-1), null);
  assert.equal(toCount(2.5), null);
  assert.equal(toCount('<img src=x onerror=alert(1)>'), null);
  assert.equal(toCount('3 dead'), null);
  assert.equal(toCount({}), null);
});

test('official report link must be https on a Nepal government host', () => {
  const real = 'https://ndrrma.gov.np/mediafiles/publications/Monsoon_Summary_2083_M8SnPbM.pdf';
  assert.equal(safeDocUrl(real), real);
  assert.equal(safeDocUrl('javascript:alert(1)'), null);
  assert.equal(safeDocUrl('http://ndrrma.gov.np/a.pdf'), null);
  assert.equal(safeDocUrl('https://ndrrma.gov.np.evil.example/a.pdf'), null);
  assert.equal(safeDocUrl('https://evilgov.np/a.pdf'), null);
  assert.equal(safeDocUrl('/mediafiles/a.pdf'), null);
  assert.equal(safeDocUrl(null), null);
});

test('feed items with no real date carry no pubDate', () => {
  assert.equal(pubDate(null), '');
  assert.equal(pubDate(undefined), '');
  assert.equal(pubDate('not a date'), '');
  assert.match(pubDate('2026-11-22T10:00:00Z'), /<pubDate>Sun, 22 Nov 2026 10:00:00 GMT<\/pubDate>/);
});

test('the build fetches only public web hosts', () => {
  assert.equal(isPublicWebUrl('https://kathmandupost.com/national/a'), true);
  assert.equal(isPublicWebUrl('http://english.onlinekhabar.com/x.html'), true);
  for (const bad of ['http://localhost/', 'http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.16.0.1/', 'http://[::1]/', 'file:///etc/passwd',
    'http://2130706433/', 'http://0x7f000001/', 'http://printer.local/', 'https://user:pw@example.com/', 'not a url']) {
    assert.equal(isPublicWebUrl(bad), false, bad);
  }
});
