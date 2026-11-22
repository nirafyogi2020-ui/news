import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, statSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { syncArchive, loadArchive } from '../src/archive.mjs';

const today = {
  posts: [
    { id: 'river-rises', title: 'Trishuli rises again', time: '2026-11-22T03:15:00+05:45', body: 'One line', sources: [{ name: 'Police' }] },
    { id: 'older', title: 'Older briefing', time: '2026-11-21T20:00:00+05:45', body: ['a', 'b'] },
    { title: 'No time, skipped' },
  ],
};

test('a new briefing is archived and loads straight away, newest first', () => {
  const dir = mkdtempSync(join(tmpdir(), 'archive-'));
  try {
    assert.deepEqual(loadArchive(dir), []);
    syncArchive(today, dir);
    assert.deepEqual(readdirSync(dir).sort(),
      ['2026-11-21-older.json', '2026-11-22-river-rises.json']);
    const posts = loadArchive(dir);
    assert.deepEqual(posts.map(p => p.url), ['/updates/2026-11-22-river-rises/', '/updates/2026-11-21-older/']);
    assert.deepEqual(posts[0].body, ['One line']);
    assert.equal(posts[0].image, '');
    assert.equal(posts[0].revised, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unchanged briefing is not rewritten, so its date does not churn', () => {
  const dir = mkdtempSync(join(tmpdir(), 'archive-'));
  try {
    syncArchive(today, dir);
    const file = join(dir, '2026-11-22-river-rises.json');
    const old = new Date('2026-11-01T00:00:00Z');
    utimesSync(file, old, old);
    const before = readFileSync(file, 'utf8');
    syncArchive(today, dir);
    assert.equal(statSync(file).mtimeMs, old.getTime());
    syncArchive({ posts: [{ ...today.posts[0], revised: true }] }, dir);
    assert.notEqual(readFileSync(file, 'utf8'), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('og-build archives today before reading the archive', () => {
  const src = readFileSync(new URL('../src/og-build.mjs', import.meta.url), 'utf8');
  const sync = src.indexOf('syncArchive(today)');
  const load = src.indexOf('loadArchive()');
  assert.ok(sync > 0 && load > sync, 'og-build must call syncArchive(today) before loadArchive()');
});
