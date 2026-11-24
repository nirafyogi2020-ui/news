/* Accessibility and polling rules for the Rasuwa dashboard
   (src/rasuwa-dashboard.html, built to nepal-flood/rasuwa/index.html).
   Review of 23 Nov 2026, findings 2, 4, 5, 6, 8, 9, 10 and 13. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const SRC = readFileSync(new URL('../src/rasuwa-dashboard.html', import.meta.url), 'utf8');
const BUILT_URL = new URL('../nepal-flood/rasuwa/index.html', import.meta.url);
const BUILT = existsSync(BUILT_URL) ? readFileSync(BUILT_URL, 'utf8') : '';
const pages = [['source', SRC], ...(BUILT ? [['built page', BUILT]] : [])];

const GRIDS = ['today-grid-home', 'today-grid', 'today-general-grid', 'live-recent-grid'];

function openTag(html, id) {
  const m = html.match(new RegExp(`<[a-z]+\\b[^>]*\\bid="${id}"[^>]*>`));
  return m ? m[0] : '';
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

test('story grids are not live regions; one status line speaks instead', () => {
  for (const [where, html] of pages) {
    for (const id of GRIDS) {
      const tag = openTag(html, id);
      assert.ok(tag, `${where}: #${id} is in the page`);
      assert.equal(attr(tag, 'aria-live'), null, `${where}: #${id} must not carry aria-live`);
      assert.equal(attr(tag, 'role'), null, `${where}: #${id} must not carry a live role`);
    }
    const note = openTag(html, 'news-note');
    assert.equal(attr(note, 'role'), 'status', `${where}: #news-note is the one status line`);
    assert.ok(html.indexOf('id="news-note"') < html.indexOf('<main'), `${where}: #news-note sits outside the tab panels`);
  }
  assert.match(SRC, /window\.NewsNote\s*=/, 'the page script defines NewsNote');
  assert.match(SRC, /' new stories'/, 'it says "N new stories"');
});

test('the briefing card switch is a complete tablist', () => {
  for (const [where, html] of pages) {
    const sw = html.match(/<div class="briefcard-switch" role="tablist"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(sw, `${where}: the switch is a tablist`);
    const tabs = [...sw[1].matchAll(/<button\b[^>]*>/g)].map(m => m[0]);
    assert.equal(tabs.length, 5, `${where}: five tabs`);
    const selected = tabs.filter(t => attr(t, 'aria-selected') === 'true');
    assert.equal(selected.length, 1, `${where}: one tab selected`);
    for (const t of tabs) {
      assert.equal(attr(t, 'role'), 'tab');
      const id = attr(t, 'id'), pane = attr(t, 'aria-controls');
      assert.ok(id && pane, `${where}: tab ${t} has an id and aria-controls`);
      assert.equal(attr(t, 'tabindex'), attr(t, 'aria-selected') === 'true' ? '0' : '-1', `${where}: roving tabindex on ${id}`);
      const panel = openTag(html, pane);
      assert.ok(panel, `${where}: #${pane} exists`);
      assert.equal(attr(panel, 'role'), 'tabpanel', `${where}: #${pane} is a tabpanel`);
      assert.equal(attr(panel, 'aria-labelledby'), id, `${where}: #${pane} is labelled by its tab`);
    }
  }
  const script = SRC.slice(SRC.indexOf('window.BriefCard = (function(){'));
  const body = script.slice(0, script.indexOf('</script>'));
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.ok(body.includes(`'${key}'`), `BriefCard handles ${key}`);
  assert.match(body, /setAttribute\('tabindex', on \? '0' : '-1'\)/, 'BriefCard moves the tab stop');
});

test('story cards are not turned into buttons, and nothing re-runs on a 2 s timer', () => {
  assert.doesNotMatch(SRC, /setAttribute\('role',\s*'button'\)/, 'no card gets role="button"');
  assert.doesNotMatch(SRC, /setInterval\(makeFocusable/, 'no makeFocusable timer');
  assert.doesNotMatch(SRC, /setInterval\(coverTextOnlyCards/, 'cover pass runs when cards are drawn, not on a timer');
  assert.match(SRC, /\.today-grid \.post-card \.tc-title a::after\{content:""; position:absolute; inset:0;/, 'the headline link covers the card');
  assert.match(SRC, /\.today-grid \.post-card :is\(\.post-foot, \.tc-sources, \.tc-more\)\{position:relative; z-index:2;\}/, 'links and Share sit above it');
});

test('polling pauses in a background tab and skips the load-time today.json fetch', () => {
  assert.match(SRC, /function poll\(\)\{\s*if\(document\.hidden\) return;/, 'the minute poll pauses while hidden');
  assert.doesNotMatch(SRC, /setInterval\(loadGlobal, 60 \* 1000\)/, 'the world feed is not polled behind the Overview');
  assert.match(SRC, /if\(document\.hidden \|\| Date\.now\(\) - shared < 75 \* 1000\) return;/, 'the ticker fallback pauses while hidden');
  assert.match(SRC, /function refreshToday\(\)\{\s*if\(document\.hidden\) return;/, 'the Today refresh pauses while hidden');
  assert.doesNotMatch(SRC, /\n  refreshToday\(\);\n/, 'no unconditional today.json fetch on load');
  assert.match(SRC, /window\.photoIndexJson \|\| fetch\('\/assets\/photos\/index\.json'/, 'the Today cards reuse the photo strip\'s manifest download');
});

test('font, motion, contrast and lazy QR fixes hold', () => {
  for (const [where, html] of pages) {
    const font = html.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/);
    assert.ok(font, `${where}: Google Fonts link`);
    assert.doesNotMatch(font[0], /6\.\.72/, `${where}: no optical-size range (131 KB variable font)`);
    assert.match(font[0], /family=Newsreader:ital,opsz,wght@0,36,400;0,36,500;0,36,600;1,36,500&/, `${where}: one fixed optical size, 36, as on the other pages`);
    for (const a of html.match(/<a href="mailto:[^"]*"/g) || []) {
      const at = html.indexOf(a);
      assert.ok(html.lastIndexOf('<!--email_off-->', at) > html.lastIndexOf('<!--/email_off-->', at), `${where}: ${a} is wrapped in email_off`);
    }
    for (const img of html.match(/<img[^>]*qr-pmo-nepal[^>]*>/g) || []) {
      assert.match(img, /loading="lazy"/, `${where}: the hidden donation QR waits until it is shown`);
    }
  }
  assert.doesNotMatch(SRC, /font-variation-settings[^;]*opsz/, 'nothing asks for the opsz axis');
  assert.match(SRC, /prefers-reduced-motion: reduce\)\{ html\{scroll-behavior:auto;\} \*, \*::before, \*::after\{animation-duration:0\.01ms !important; animation-iteration-count:1 !important;/);
  assert.match(SRC, /\.inv-jump a\.is-here\{background:var\(--alert\); color:#fff;\}/);
  assert.match(SRC, /\.inv-jump a\.is-here span\{color:#fff;\}/);
  assert.match(SRC, /\.chip-play\[aria-pressed="true"\]\{background:var\(--alert\);/);
});

/* Round 3 (23 Nov 2026): the decorative arrows, the dashboard's own footer
   link, and the numbered step boxes. */
const DASH_CSS = readFileSync(new URL('../assets/dashboard.css', import.meta.url), 'utf8');
const DASH_JS = readFileSync(new URL('../assets/dashboard.js', import.meta.url), 'utf8');
const GLYPH = /&#8599;|↗|&rsaquo;|›/;
const hideGlyphs = s => s.replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g, '');

test('no arrow or chevron inside a dashboard link is read aloud', async () => {
  const { renderInvestigation } = await import('../src/dashboard.mjs');
  const C = await import('../src/content.mjs');
  const event = JSON.parse(readFileSync(new URL('../event.json', import.meta.url), 'utf8'));
  const inv = renderInvestigation(event, C.SOURCE_GROUPS);
  const app = BUILT ? (() => {
    const m = BUILT.match(/src="\/(assets\/v\/dashboard-app\.[0-9a-f]+\.js)"/);
    return m ? readFileSync(new URL(`../${m[1]}`, import.meta.url), 'utf8') : '';
  })() : '';
  for (const [where, html] of [...pages, ['investigation block', inv], ...(app ? [['bundled script', app]] : [])]) {
    let links = 0;
    for (const a of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
      links++;
      assert.doesNotMatch(hideGlyphs(a[1]), GLYPH, `${where}: ${a[0].slice(0, 140)}`);
    }
    assert.ok(links > 0, `${where}: links found`);
  }
  assert.match(inv, /Open map <span aria-hidden="true">↗<\/span><\/a>/);
  assert.equal((DASH_JS.match(/↗/g) || []).length, 1, 'the live repaint draws its arrows only through the hidden-span helper');
  assert.match(DASH_JS, /setAttribute\('aria-hidden', 'true'\); s\.textContent = '↗'/);
});

test('a hidden arrow span picks up no styling meant for the label spans', () => {
  assert.match(DASH_CSS, /\.help-quick a>span\{/);
  assert.match(DASH_CSS, /\.field-guide>a>span\{/);
  assert.match(DASH_CSS, /\.help-top \.ht-qr figcaption>span\{display:none\}/);
  assert.match(SRC, /\.ht-qr figcaption>span\{/);
  assert.match(SRC, /\.inv-srcgroup li>span\{/);
  assert.doesNotMatch(DASH_CSS + SRC, /\.help-quick span\{|\.field-guide>a span\{|figcaption span\{|\.inv-srcgroup li span\{/);
});

test('the dashboard footer marks its own link as the current page', () => {
  for (const [where, html] of pages) {
    for (const tag of html.match(/<a\b[^>]*href="\/nepal-flood\/rasuwa\/"[^>]*>/g) || []) {
      assert.match(tag, /aria-current="page"/, `${where}: ${tag}`);
    }
  }
});

test('the dashboard step boxes are ordered lists with the old spacing', () => {
  for (const [where, html] of pages) {
    assert.doesNotMatch(html, /<div class="checklist">|<div class="check-row">/, `${where}: no div step boxes`);
    const lists = html.match(/<ol class="checklist" role="list">[\s\S]*?<\/ol>/g) || [];
    assert.equal(lists.length, 2, `${where}: missing-person and prepare steps`);
    for (const l of lists) assert.ok((l.match(/<li class="check-row"><span class="mark">\d\d<\/span>/g) || []).length >= 4);
  }
  assert.match(SRC, /\.checklist\{[^}]*margin:16px 0 0; padding:0; list-style:none;\}/);
  assert.match(SRC, /\.check-row\{[^}]*margin:0;/);
});

/* Round 4, 23 Nov 2026: link underlines and the new-tab warning. */
function lum(hex) {
  const c = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

test('the dashboard link underline is at least 3:1 on every surface, light and dark', () => {
  const css = SRC.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
  /* Every token block in page order, the later overrides included; the
     print block (":root, :root[data-theme=dark]") is not a theme. */
  const merge = re => {
    const t = {};
    for (const m of css.matchAll(re)) for (const d of m[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) t[d[1]] = d[2];
    return t;
  };
  const light = merge(/(?<![,\w\]])\s:root\{([^}]*)\}/g);
  const dark = { ...light, ...merge(/(?<!, ):root\[data-theme="dark"\]\{([^}]*)\}/g) };
  for (const [name, t] of [['light', light], ['dark', dark]]) {
    assert.ok(t['link-line'], `${name}: --link-line is set`);
    for (const s of ['bg', 'surface', 'surface-2']) {
      assert.ok(ratio(t['link-line'], t[s]) >= 3, `${name}: ${t['link-line']} on --${s} ${t[s]} is ${ratio(t['link-line'], t[s]).toFixed(2)}:1`);
    }
  }
  assert.match(css, /\ba\{color:var\(--text\); text-decoration-color:var\(--link-line\); text-underline-offset:2px;\}/);
  assert.doesNotMatch(css, /text-decoration-color:var\(--border-strong\)/, 'no underline left at the old 1.6:1');
});

test('links the dashboard scripts write into a new tab carry the hidden note', () => {
  const script = [...SRC.slice(SRC.indexOf('</main>')).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  assert.match(script, /var NEW_TAB_HTML = '<span class="visually-hidden" lang="en">' \+ NEW_TAB_TEXT \+ '<\/span>';/);
  let strings = 0, nodes = 0;
  /* Markup in strings: everything from target="_blank" to the next </a>. */
  for (const m of script.matchAll(/target="_blank"[\s\S]*?<\/a>/g)) {
    if (/^target="_blank"[^>]*aria-hidden="true"/.test(m[0])) continue; // the photo link, hidden from screen readers
    if (m[0].startsWith(`target="_blank" rel="noopener"' : ''`)) continue; // the "away" variable, checked below
    strings++;
    assert.match(m[0], /\+ NEW_TAB_HTML \+ '<\/a>/, m[0].slice(0, 160));
  }
  /* The " target=..." held in a variable, for a picture strip link. */
  assert.match(script, /'>' \+ inner \+ \(away \? NEW_TAB_HTML : ''\) \+ '<\/a>'/);
  /* Links built as nodes. */
  for (const m of script.matchAll(/(\w+)\.target = '_blank';[\s\S]{0,400}/g)) {
    nodes++;
    assert.match(m[0], new RegExp(`${m[1]}\\.appendChild\\(newTabNote\\(\\)\\)`), m[0].slice(0, 160));
  }
  assert.ok(strings >= 14 && nodes === 2, `${strings} string links, ${nodes} node links`);
});

test('the live repaint keeps the note, and search does not read it as a title', () => {
  assert.match(DASH_JS, /a\.append\('Source ',arrow\(\),newTab\(\)\)/);
  assert.match(DASH_JS, /a\.replaceChildren\(figure\.source\.split\(' · '\)\[0\]\+' ',arrow\(\),\.\.\.\(a\.target==='_blank'\?\[newTab\(\)\]:\[\]\)\)/);
  assert.match(DASH_JS, /if\(item\.external\)\{a\.target='_blank';a\.rel='noopener noreferrer';a\.append\(newTab\(\)\);\}/);
  assert.match(DASH_JS, /const title=linkText\(a\)\.trim\(\);/);
  assert.doesNotMatch(DASH_JS, /a\.textContent\.trim\(\)/);
});
