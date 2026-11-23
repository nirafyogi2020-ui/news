import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { hashedName, planPrune, HASHED_FILE } from '../src/asset-names.mjs';
import { scriptAsset, hashedAssets } from '../src/template.mjs';

const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

test('a hashed name carries the hash of the content', () => {
  const code = 'console.log(1);\n';
  assert.equal(hashedName('assets/front.js', code), `assets/front.${sha12(code)}.js`);
  assert.equal(hashedName('assets/site.css', 'a{}'), `assets/site.${sha12('a{}')}.css`);
  assert.notEqual(hashedName('assets/front.js', code), hashedName('assets/front.js', code + ' '));
  assert.ok(HASHED_FILE.test(hashedName('assets/dashboard-app.js', code).slice('assets/'.length)));
  assert.throws(() => hashedName('assets/photo.jpg', 'x'));
});

test('a page script is linked by its hashed name, and that file is remembered', () => {
  const code = 'var testOnly = 1;\n';
  const tag = scriptAsset('test-only.js', code);
  const name = `assets/test-only.${sha12(code)}.js`;
  assert.equal(tag, `<script src="/${name}" defer></script>`);
  assert.equal(hashedAssets().get(name), code);
});

const A_NOW = 'assets/front.aaaaaaaaaaaa.js';
const A_OLD = 'assets/front.bbbbbbbbbbbb.js';
const A_RECENT = 'assets/front.cccccccccccc.js';
const A_NEW_UNLINKED = 'assets/wire.dddddddddddd.js';
const CSS_OLD_LINKED = 'assets/site.eeeeeeeeeeee.css';

test('pruning keeps linked and recent files and deletes only old unlinked hashed ones', () => {
  const { history, remove } = planPrune({
    history: {
      [A_OLD]: '2026-11-10',        // unlinked for 13 days: goes
      [A_RECENT]: '2026-11-20',     // unlinked for 3 days: stays
      [CSS_OLD_LINKED]: '2026-11-01', // linked again: stays, entry dropped
      'assets/gone.ffffffffffff.js': '2026-11-01', // no longer on disk: entry dropped
    },
    referenced: [A_NOW, CSS_OLD_LINKED],
    onDisk: [A_NOW, A_OLD, A_RECENT, A_NEW_UNLINKED, CSS_OLD_LINKED,
      'assets/front.js', 'assets/site.css', 'assets/og/home.aaaaaaaaaaaa.js', 'assets/x.aaaaaaaaaaaa.png'],
    today: '2026-11-23',
  });
  assert.deepEqual(remove, [A_OLD]);
  assert.deepEqual(history, { [A_RECENT]: '2026-11-20', [A_NEW_UNLINKED]: '2026-11-23' });
});

test('exactly seven days unlinked is kept, eight is deleted', () => {
  const run = (since) => planPrune({ history: { [A_OLD]: since }, referenced: [], onDisk: [A_OLD], today: '2026-11-23' });
  assert.deepEqual(run('2026-11-16').remove, []);
  assert.deepEqual(run('2026-11-15').remove, [A_OLD]);
});

test('pruning again with nothing new gives the same history, on any later day within the window', () => {
  const first = planPrune({ history: {}, referenced: [A_NOW], onDisk: [A_NOW, A_RECENT], today: '2026-11-20' });
  const again = planPrune({ history: first.history, referenced: [A_NOW], onDisk: [A_NOW, A_RECENT], today: '2026-11-23' });
  assert.deepEqual(again, first);
  assert.deepEqual(planPrune({ history: {}, referenced: [A_NOW], onDisk: [A_NOW], today: '2026-11-23' }),
    { history: {}, remove: [] }, 'nothing unlinked, nothing recorded');
});

test('a bad date in the history keeps the file rather than deleting it', () => {
  const { remove } = planPrune({ history: { [A_OLD]: 'garbage' }, referenced: [], onDisk: [A_OLD], today: '2026-11-23' });
  assert.deepEqual(remove, []);
});
