/* The dashboard's render-blocking stylesheet carries only what the first
   screen and the shared tabs need. The styles only the Map, Investigation
   and Watch tabs and the video player use are a second stamped file,
   preloaded in the head and switched on by the page script (LazyCode.css,
   section 2b of src/rasuwa-dashboard.html). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import vm from 'node:vm';
import { hashedName } from '../src/asset-names.mjs';

const ROOT = new URL('../', import.meta.url);
const SRC = readFileSync(new URL('src/rasuwa-dashboard.html', ROOT), 'utf8');
const BUILT_URL = new URL('nepal-flood/rasuwa/index.html', ROOT);
const BUILT = existsSync(BUILT_URL) ? readFileSync(BUILT_URL, 'utf8') : '';

/* Selectors that must live in the tabs file and nowhere in the main one. */
const TAB_ONLY = ['#flood-map{', '.leaflet-popup-content{', '.journey{', '.place-detail{', '.sat-shot{',
  '.inv-cite{', '.inv-jump{', '.shorts{', '.short-info{', '.short-sheet{', 'body.shorts-open{', '.map-explain{', '.tab-rule{'];

function builtSheets() {
  const main = BUILT.match(/<link rel="stylesheet" href="\/(assets\/v\/dashboard-main\.[0-9a-f]{12}\.css)">/);
  const tabs = BUILT.match(/<link rel="preload" as="style" href="\/(assets\/v\/dashboard-tabs\.[0-9a-f]{12}\.css)" data-lazy-css="tabs" fetchpriority="low">/);
  return { main, tabs };
}

test('the tab-only styles are a hashed file, preloaded between the two blocking stylesheets', { skip: !BUILT && 'page not built' }, () => {
  const { main, tabs } = builtSheets();
  assert.ok(main, 'the main stylesheet is linked');
  assert.ok(tabs, 'the tabs stylesheet is preloaded with data-lazy-css="tabs"');
  const css = readFileSync(new URL(tabs[1], ROOT), 'utf8');
  assert.equal(hashedName('assets/dashboard-tabs.css', css), tabs[1], 'its name carries its content hash');
  assert.doesNotMatch(BUILT, /<link rel="stylesheet" href="\/assets\/v\/dashboard-tabs\./, 'it never blocks the first paint');
  const at = (s) => BUILT.indexOf(s);
  assert.ok(at(main[0]) < at(tabs[0]), 'it sits after the main stylesheet');
  assert.ok(at(tabs[0]) < at('/assets/v/dashboard.'), 'and before /assets/dashboard.css, as its rules did');
  assert.doesNotMatch(BUILT, /<style data-lazy=/, 'no lazy style block is left inline');
  for (const sel of TAB_ONLY) assert.ok(css.includes('\n' + sel) || css.startsWith(sel), `${sel} is in the tabs file`);
});

test('the render-blocking dashboard stylesheet shrank and holds no tab-only rule', { skip: !BUILT && 'page not built' }, () => {
  const { main } = builtSheets();
  const css = readFileSync(new URL(main[1], ROOT), 'utf8');
  /* 171,901 bytes (31,132 gzipped) before the split of 24 Nov 2026. */
  assert.ok(css.length < 150000, `main stylesheet is ${css.length} bytes`);
  assert.ok(gzipSync(css, { level: 9 }).length < 28000, 'and under 28 KB gzipped');
  for (const sel of TAB_ONLY) assert.ok(!css.includes('\n' + sel) && !css.startsWith(sel), `${sel} left the main file`);
  assert.match(css, /\.tabpanel\[data-styles-wait\]\{visibility:hidden;\}/, 'a waiting tab is laid out but not painted');
  for (const sel of [':root{', ':root[data-theme="dark"]{']) {
    const blocks = css.split('\n').filter(l => l.startsWith(sel)).length;
    assert.ok(blocks <= 6, `${sel} is declared ${blocks} times`);
  }
});

test('the source keeps the tab styles in one data-lazy block right after the main one', () => {
  const blocks = SRC.match(/<style data-lazy="tabs">/g) || [];
  assert.equal(blocks.length, 1);
  assert.match(SRC, /<\/style>\n<style data-lazy="tabs">/);
  assert.ok(SRC.indexOf('var LazyCode = (function(){') < SRC.indexOf('var Tabs = (function(){'),
    'LazyCode is defined before Tabs, which opens a deep-linked tab as it starts');
});

/* ---- the page script, run against a small fake page ---------------------- */

function runTabs(hash) {
  const timers = [];
  const idle = [];
  const winListeners = {};
  const attrsOf = (o) => ({
    attrs: { ...o },
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; },
    setAttribute(n, v) { this.attrs[n] = String(v); },
    removeAttribute(n) { delete this.attrs[n]; },
    hasAttribute(n) { return n in this.attrs; },
    addEventListener() {},
  });
  const names = ['overview', 'today', 'live', 'video', 'map', 'investigation', 'help'];
  const panels = names.map(n => Object.assign(attrsOf({}), { id: 'panel-' + n, hidden: n !== 'overview' }));
  const buttons = names.map(n => attrsOf({ 'data-tab': n }));
  const link = {
    rel: 'preload', sheet: null, on: {},
    addEventListener(t, fn) { (this.on[t] ||= []).push(fn); },
    fire(t) { (this.on[t] || []).forEach(fn => fn()); },
  };
  const document = {
    readyState: 'interactive',
    getElementById(id) {
      if (id === 'dashboard-chunks') return { textContent: '{}' };
      return panels.find(p => p.id === id) || null;
    },
    querySelector(sel) { return sel === 'link[data-lazy-css="tabs"]' ? link : null; },
    querySelectorAll(sel) {
      if (sel === '[data-tab]') return buttons;
      if (sel === '.tabpanel') return panels;
      return [];
    },
    addEventListener() {},
    head: { appendChild() {} },
  };
  const ctx = {
    document,
    location: { hash },
    history: { replaceState(_s, _t, url) { ctx.location.hash = url; } },
    scrollTo() {},
    requestAnimationFrame(fn) { fn(); },
    requestIdleCallback(fn) { idle.push(fn); },
    setTimeout(fn, ms) { timers.push({ fn, ms }); return timers.length; },
    addEventListener(t, fn) { (winListeners[t] ||= []).push(fn); },
    Promise, Date, JSON,
  };
  ctx.window = ctx;
  const from = SRC.indexOf('var LazyCode = (function(){');
  const to = SRC.indexOf('/* =========================================================================\n   3b.');
  assert.ok(from > 0 && to > from, 'LazyCode and Tabs are found in the page script');
  vm.runInNewContext(SRC.slice(from, to) + '\nthis.LazyCode = LazyCode; this.Tabs = Tabs;', ctx);
  const runTimers = (upTo) => { for (const t of timers.splice(0)) if (t.ms <= upTo) t.fn(); else timers.push(t); };
  return { ctx, link, panel: (n) => panels.find(p => p.id === 'panel-' + n), timers, runTimers, idle, winListeners };
}
const tick = () => new Promise(r => setImmediate(r));

test('a reader on the Overview does not apply the tab styles until the page has loaded', async () => {
  const page = runTabs('');
  assert.equal(page.link.rel, 'preload');
  assert.equal(page.panel('overview').hidden, false);
  assert.equal(page.panel('overview').hasAttribute('data-styles-wait'), false);
  page.winListeners.load.forEach(fn => fn());
  assert.equal(page.idle.length, 1, 'after load it waits for an idle moment');
  page.idle[0]();
  assert.equal(page.link.rel, 'stylesheet', 'then switches the preload on');
});

test('opening the Map tab switches the styles on and paints the tab once they are in', async () => {
  const page = runTabs('');
  page.ctx.Tabs.show('map');
  const map = page.panel('map');
  assert.equal(map.hidden, false);
  assert.equal(page.link.rel, 'stylesheet');
  assert.equal(map.hasAttribute('data-styles-wait'), true, 'laid out but not painted yet');
  page.link.sheet = {};
  page.link.fire('load');
  await tick();
  assert.equal(map.hasAttribute('data-styles-wait'), false);
  assert.equal(page.ctx.LazyCode.styled('tabs'), true);
  page.ctx.Tabs.show('investigation');
  assert.equal(page.panel('investigation').hasAttribute('data-styles-wait'), false, 'a second tab shows at once');
  page.ctx.Tabs.show('help');
  assert.equal(page.panel('help').hasAttribute('data-styles-wait'), false, 'tabs without own styles never wait');
});

for (const tab of ['map', 'investigation', 'video']) {
  test(`a link straight to #${tab} asks for the styles as the page starts`, async () => {
    const page = runTabs('#' + tab);
    assert.equal(page.panel(tab).hidden, false);
    assert.equal(page.link.rel, 'stylesheet');
    assert.equal(page.panel(tab).hasAttribute('data-styles-wait'), true);
    page.link.sheet = {};
    page.runTimers(50);
    await tick();
    assert.equal(page.panel(tab).hasAttribute('data-styles-wait'), false, 'shown once the sheet is there');
  });
}

test('a slow stylesheet keeps a tab hidden for 1.5 s at most', async () => {
  const page = runTabs('#video');
  assert.equal(page.panel('video').hasAttribute('data-styles-wait'), true);
  page.runTimers(1500);
  assert.equal(page.panel('video').hasAttribute('data-styles-wait'), false);
  assert.equal(page.ctx.LazyCode.styled('tabs'), false, 'the styles are still on their way');
});

test('the video player code waits for the tab styles too', async () => {
  const page = runTabs('');
  let ready = false;
  page.ctx.LazyCode.load('shorts').then(() => { ready = true; });
  await tick();
  assert.equal(page.link.rel, 'stylesheet');
  assert.equal(ready, false, 'not before the styles are in');
  page.link.fire('load');
  await tick();
  assert.equal(ready, true);
  assert.match(SRC, /if\(window\.ShortsFeed && LazyCode\.styled\('tabs'\)\)/, 'a tap opens the player at once only when its styles are in');
});
