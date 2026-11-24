import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

import { hashedName, sourceName, planPrune, HASHED_FILE, immutableRuleProblems, relativeCssUrls } from '../src/asset-names.mjs';
import { localAssets } from '../src/csp-rules.mjs';
import { scriptAsset, hashedAssets } from '../src/template.mjs';

const ROOT = new URL('../', import.meta.url);
const HEADERS = readFileSync(new URL('_headers', ROOT), 'utf8');

const sha12 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

test('a hashed name carries the hash of the content', () => {
  const code = 'console.log(1);\n';
  assert.equal(hashedName('assets/front.js', code), `assets/v/front.${sha12(code)}.js`);
  assert.equal(hashedName('assets/site.css', 'a{}'), `assets/v/site.${sha12('a{}')}.css`);
  assert.notEqual(hashedName('assets/front.js', code), hashedName('assets/front.js', code + ' '));
  assert.ok(HASHED_FILE.test(hashedName('assets/dashboard-app.js', code).slice('assets/v/'.length)));
  assert.equal(sourceName(hashedName('assets/dashboard-app.js', code)), 'assets/dashboard-app.js');
  assert.equal(sourceName('assets/front.js'), null);
  assert.throws(() => hashedName('assets/photo.jpg', 'x'));
});

test('a stylesheet with a relative url() is refused, since its copy sits one folder down', () => {
  assert.throws(() => hashedName('assets/site.css', "@font-face{src:url('fonts/A.ttf')}"), /relative url/);
  assert.throws(() => hashedName('assets/site.css', 'a{background:url(../x.png)}'), /relative url/);
  assert.doesNotThrow(() => hashedName('assets/site.css',
    "@font-face{src:url('/assets/fonts/A.ttf')}a{background:url(\"data:image/svg+xml,%3Csvg filter='url(%23n)'/%3E\")}b{x:url(https://e.org/y.png)}"));
});

test('a page script is linked by its hashed name, and that file is remembered', () => {
  const code = 'var testOnly = 1;\n';
  const tag = scriptAsset('test-only.js', code);
  const name = `assets/v/test-only.${sha12(code)}.js`;
  assert.equal(tag, `<script src="/${name}" defer></script>`);
  assert.equal(hashedAssets().get(name), code);
});

const A_NOW = 'assets/v/front.aaaaaaaaaaaa.js';
const A_OLD = 'assets/v/front.bbbbbbbbbbbb.js';
const A_RECENT = 'assets/v/front.cccccccccccc.js';
const A_NEW_UNLINKED = 'assets/v/wire.dddddddddddd.js';
const CSS_OLD_LINKED = 'assets/v/site.eeeeeeeeeeee.css';

test('pruning keeps linked and recent files and deletes only old unlinked hashed ones', () => {
  const { history, remove } = planPrune({
    history: {
      [A_OLD]: '2026-11-10',        // unlinked for 13 days: goes
      [A_RECENT]: '2026-11-20',     // unlinked for 3 days: stays
      [CSS_OLD_LINKED]: '2026-11-01', // linked again: stays, entry dropped
      'assets/v/gone.ffffffffffff.js': '2026-11-01', // no longer on disk: entry dropped
    },
    referenced: [A_NOW, CSS_OLD_LINKED],
    onDisk: [A_NOW, A_OLD, A_RECENT, A_NEW_UNLINKED, CSS_OLD_LINKED,
      'assets/front.js', 'assets/site.css', 'assets/v/front.js', 'assets/og/home.aaaaaaaaaaaa.js',
      'assets/v/x.aaaaaaaaaaaa.png', 'assets/v/deep/x.aaaaaaaaaaaa.js'],
    today: '2026-11-23',
  });
  assert.deepEqual(remove, [A_OLD]);
  assert.deepEqual(history, { [A_RECENT]: '2026-11-20', [A_NEW_UNLINKED]: '2026-11-23' });
});

test('hashed copies left directly in assets/ from before the move age out the same way', () => {
  const LEGACY_OLD = 'assets/front.bbbbbbbbbbbb.js';
  const LEGACY_NEW = 'assets/site.cccccccccccc.css';
  const { history, remove } = planPrune({
    history: { [LEGACY_OLD]: '2026-11-10' },
    referenced: [A_NOW],
    onDisk: [A_NOW, LEGACY_OLD, LEGACY_NEW, 'assets/front.js', 'assets/x.aaaaaaaaaaaa.png'],
    today: '2026-11-23',
  });
  assert.deepEqual(remove, [LEGACY_OLD]);
  assert.deepEqual(history, { [LEGACY_NEW]: '2026-11-23' });
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

test('_headers serves the hashed folder as immutable, after the short /assets/* rule', () => {
  assert.deepEqual(immutableRuleProblems(HEADERS), []);
  assert.match(HEADERS, /^\/assets\/v\/\*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable$/m);
  assert.match(HEADERS, /^\/assets\/\*\n  ! Cache-Control\n  Cache-Control: public, max-age=3600, stale-while-revalidate=86400$/m);
  // The checker catches the mistakes that would quietly undo it.
  const short = '/assets/*\n  ! Cache-Control\n  Cache-Control: public, max-age=3600\n';
  const immutable = '/assets/v/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31536000, immutable\n';
  assert.deepEqual(immutableRuleProblems(short + immutable), []);
  assert.equal(immutableRuleProblems(immutable + short).length, 1, 'immutable rule above /assets/* is overridden');
  assert.equal(immutableRuleProblems(short).length, 1, 'rule missing');
  assert.equal(immutableRuleProblems(short + immutable.replace('  ! Cache-Control\n', '')).length, 1, 'no detach');
});

/* The built pages, as committed: every own script and stylesheet they link
   is a hashed copy in assets/v/, present and matching its hash. */
const builtPages = () => {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(new URL(dir || './', ROOT), { withFileTypes: true })) {
      if (e.isDirectory()) { if (!/^(?:node_modules|\.git|assets|src|test|functions|data)$/.test(e.name)) walk(`${dir}${e.name}/`); }
      else if (e.name.endsWith('.html')) out.push(`${dir}${e.name}`);
    }
  };
  walk('');
  return out;
};

test('every page links its own scripts and stylesheets from assets/v/ only', () => {
  const pages = builtPages();
  assert.ok(pages.length > 20, `found ${pages.length} built pages`);
  let linked = 0;
  for (const page of pages) {
    const html = readFileSync(new URL(page, ROOT), 'utf8');
    for (const asset of localAssets(html)) {
      if (!/^assets\/.+\.(?:js|css)$/.test(asset)) continue;
      linked++;
      const src = sourceName(asset);
      assert.ok(src, `${page}: /${asset} is not a hashed copy in /assets/v/`);
      assert.ok(existsSync(new URL(asset, ROOT)), `${page}: /${asset} was not built`);
      assert.equal(hashedName(src, readFileSync(new URL(asset, ROOT), 'utf8')), asset, `${page}: /${asset} content does not match its hash`);
    }
    const chunks = html.match(/<script type="application\/json" id="dashboard-chunks">([\s\S]*?)<\/script>/);
    if (chunks) for (const url of Object.values(JSON.parse(chunks[1]))) {
      assert.match(url, /^\/assets\/v\/dashboard-[a-z]+\.[0-9a-f]{12}\.js$/, `${page}: lazy chunk ${url}`);
      assert.ok(existsSync(new URL(url.slice(1), ROOT)), `${page}: lazy chunk ${url} was not built`);
    }
  }
  assert.ok(linked > 20, `checked ${linked} links`);
});

test('no hashed stylesheet copy carries a relative url()', () => {
  const dir = new URL('assets/v/', ROOT);
  const css = readdirSync(dir).filter(n => n.endsWith('.css'));
  assert.ok(css.length >= 2, 'site and dashboard stylesheets are there');
  for (const n of css) assert.deepEqual(relativeCssUrls(readFileSync(new URL(n, dir), 'utf8')), [], n);
});

test('share picture addresses carry a hash of the picture, not its file date', async () => {
  const { ogFor } = await import('../src/template.mjs');
  const { createHash } = await import('node:crypto');
  const { readFileSync, utimesSync, statSync } = await import('node:fs');
  const file = new URL('../assets/og/about.png', import.meta.url);
  const want = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);
  assert.ok(ogFor('/about/').endsWith(`about.png?v=${want}`));
  const st = statSync(file);
  utimesSync(file, st.atime, new Date(st.mtimeMs + 60000)); // a fresh checkout's new date
  try { assert.ok(ogFor('/about/').endsWith(`about.png?v=${want}`)); }
  finally { utimesSync(file, st.atime, st.mtime); }
});
