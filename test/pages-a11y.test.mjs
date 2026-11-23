/* Accessibility rules for the generated article pages (src/pages.mjs,
   src/pages-ne.mjs, src/template.mjs, assets/site.css). Second review of
   23 Nov 2026: the pages the first review did not cover. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

import { relief, timeline, about, hazardGuide, emergencyNumbers, missingPersons, contact, foreignNationals, hazardPages, updateIndex, liveUpdates } from '../src/pages.mjs';
import { neEvent, neEmergency, neRelief, neMissing } from '../src/pages-ne.mjs';
import { markCurrent, markNewTab, NEW_TAB_TEXT } from '../src/template.mjs';

const CSS = readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
const event = JSON.parse(readFileSync(new URL('../event.json', import.meta.url), 'utf8'));
const time = '2026-11-22T12:00:00.000Z';
const posts = [{ slug: '2026-11-22-post', url: '/updates/2026-11-22-post/', title: 'Flood briefing', time, body: ['Body.'], sources: [] }];
const ctx = { event, today: { updated: time, posts: [] }, modified: time, buildDay: '2026-11-22', posts };

const html = pg => (typeof pg === 'string' ? pg : pg.html);
const pages = {
  relief: html(relief(ctx)), timeline: html(timeline(ctx)), about: html(about(ctx)), hazards: html(hazardGuide(ctx)), emergency: html(emergencyNumbers(ctx)),
  neHome: html(neEvent(ctx)), neEmergency: html(neEmergency(ctx)), neRelief: html(neRelief(ctx)),
};

function body(h) { return h.slice(h.indexOf('<body')); }
function ids(h) { return new Set([...h.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])); }

/* Relative luminance and contrast, WCAG 2.x. */
function lum(hex) {
  const c = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
function mix(a, b, p) { // color-mix(in srgb, a p, b)
  const A = a.slice(1).match(/../g).map(x => parseInt(x, 16)), B = b.slice(1).match(/../g).map(x => parseInt(x, 16));
  return '#' + A.map((v, i) => Math.round(v * p + B[i] * (1 - p)).toString(16).padStart(2, '0')).join('');
}
function token(block, name) { const m = block.match(new RegExp(`--${name}:(#[0-9a-fA-F]{6})`)); return m && m[1]; }

test('the sticky masthead cannot hide a focused link or the skip-link target', () => {
  const head = CSS.match(/\.sitehead-inner\{[^}]*height:(\d+)px/);
  const pad = CSS.match(/html\{[^}]*scroll-padding-top:(\d+)px/);
  assert.ok(head && pad, 'masthead height and scroll-padding are both set');
  assert.ok(+pad[1] >= +head[1] + 8, `scroll-padding-top ${pad[1]}px clears the ${head[1]}px masthead`);
});

test('dark faint text passes 4.5:1 on every surface, the red alert box included', () => {
  const dark = CSS.match(/:root\[data-theme="dark"\]\{([^}]*)\}/)[1];
  const faint = token(dark, 'text-faint'), critical = token(dark, 'critical');
  const surfaces = ['bg', 'surface', 'surface-2'].map(n => token(dark, n));
  const alertBox = mix(critical, token(dark, 'surface'), 0.07);
  for (const s of [...surfaces, alertBox]) assert.ok(ratio(faint, s) >= 4.5, `${faint} on ${s} is ${ratio(faint, s).toFixed(2)}:1`);
  const media = CSS.match(/@media \(prefers-color-scheme: dark\)\{\s*:root:not\(\[data-theme="light"\]\)\{([^}]*)\}/)[1];
  assert.equal(token(media, 'text-faint'), faint, 'both dark palettes agree');
});

test('drawn plus, minus and breadcrumb chevrons carry empty alt text', () => {
  for (const sel of ['.faq summary::after', '.faq details[open] summary::after', '.crumbs li+li::before']) {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rule = CSS.match(new RegExp(esc + '\\{([^}]*)\\}'));
    assert.ok(rule, `${sel} exists`);
    assert.match(rule[1], /content:"[^"]+"\s*\/\s*""/, `${sel} has content: "x" / ""`);
  }
});

test('the arrow and chevron inside a link are hidden from screen readers', () => {
  for (const [name, h] of Object.entries(pages)) {
    for (const a of body(h).matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
      const bare = a[1].replace(/<span aria-hidden="true">[^<]*<\/span>/g, '');
      assert.doesNotMatch(bare, /&#8599;|↗|&rsaquo;|›/, `${name}: ${a[0].slice(0, 120)}`);
    }
  }
});

test('the Nepali masthead link is named by its own Nepali words', () => {
  for (const name of ['neHome', 'neEmergency', 'neRelief']) {
    const brand = pages[name].match(/<a href="\/ne\/" class="brand"[^>]*>/);
    assert.ok(brand, `${name}: brand link present`);
    assert.doesNotMatch(brand[0], /aria-label=/, `${name}: no English label over Nepali text`);
  }
  const en = pages.relief.match(/<a href="\/" class="brand" aria-label="([^"]+)"[\s\S]*?<span class="brand-name">([^<]+)</);
  assert.ok(en && en[1].startsWith(en[2]), 'English label starts with the visible brand name');
});

test('every relief account table has a name, and it points at something on the page', () => {
  for (const name of ['relief', 'neRelief']) {
    const h = pages[name], known = ids(h);
    const tables = [...h.matchAll(/<table\b[^>]*>(<caption>)?/g)];
    assert.ok(tables.length >= 3, `${name}: tables found`);
    for (const t of tables) {
      const by = t[0].match(/aria-labelledby="([^"]+)"/);
      assert.ok(t[1] || by, `${name}: ${t[0]} has a caption or aria-labelledby`);
      if (by) assert.ok(known.has(by[1]), `${name}: #${by[1]} exists`);
    }
  }
  assert.match(pages.neRelief, /<td><span lang="en">Himalayan Bank/, 'English bank names are marked English on the Nepali page');
});

test('the timeline is an ordered list that keeps its semantics in Safari', () => {
  const tl = pages.timeline.match(/<ol class="timeline" role="list">([\s\S]*?)<\/ol>/);
  assert.ok(tl, 'timeline is <ol role="list">');
  assert.ok((tl[1].match(/<li class="tl-item">/g) || []).length > 10, 'each entry is a list item');
  assert.doesNotMatch(pages.timeline, /<div class="tl-item">/);
  assert.match(CSS, /\.timeline\{[^}]*list-style:none/);
});

test('the Related block is a named region, not loose content outside the landmarks', () => {
  const h = pages.about;
  assert.match(h, /<section class="related" aria-labelledby="related-title"><h2 id="related-title">/);
  assert.equal((h.match(/id="related-title"/g) || []).length, 1, 'one per page');
});

/* Round 3 (23 Nov 2026): findings 11, 14 and 16 of the second review. */
const stepPages = {
  missingPersons: html(missingPersons(ctx)), emergency: pages.emergency, hazards: pages.hazards, contact: html(contact(ctx)),
  foreignNationals: html(foreignNationals(ctx)), neEmergency: pages.neEmergency, neMissing: html(neMissing(ctx)),
  ...Object.fromEntries(hazardPages(ctx).map((pg, i) => [`hazard${i}`, html(pg)])),
};

test('no page links to itself without saying it is the current page', () => {
  const all = { ...pages, ...stepPages };
  for (const [name, h] of Object.entries(all)) {
    const path = h.match(/<link rel="canonical" href="https:\/\/[^/"]+(\/[^"]*)"/)[1];
    for (const tag of body(h).match(/<a\b[^>]*>/g)) {
      if (tag.includes(`href="${path}"`)) assert.match(tag, /aria-current="page"/, `${name}: ${tag}`);
    }
  }
});

test('the Nepali numbers page danger box points down the page, not back at itself', () => {
  const h = pages.neEmergency;
  assert.match(h, /<a href="#sabai-number">सबै आपतकालीन नम्बर र कुन कामका लागि हो<\/a>/);
  assert.match(h, /<h2 id="sabai-number">/);
  assert.match(pages.neHome, /<a href="\/ne\/aapatkalin-number\/">सबै आपतकालीन नम्बर र कुन कामका लागि हो<\/a>/, 'other pages keep the link');
});

test('markCurrent leaves script blocks byte for byte', () => {
  const src = '<a href="/x/">X</a><script>var s=\'<a href="/x/">\';</script><a href="/y/">Y</a>';
  assert.equal(markCurrent('/x/', src), '<a href="/x/" aria-current="page">X</a><script>var s=\'<a href="/x/">\';</script><a href="/y/">Y</a>');
});

test('numbered step boxes are ordered lists that look the same as before', () => {
  for (const [name, h] of Object.entries(stepPages)) {
    assert.doesNotMatch(h, /<div class="checklist">|<div class="check-row">/, `${name}: no div step boxes left`);
    const lists = [...h.matchAll(/<ol class="checklist" role="list">([\s\S]*?)<\/ol>/g)];
    assert.ok(lists.length >= 1, `${name}: has a step list`);
    for (const l of lists) {
      const rows = l[1].match(/<li class="check-row"><span class="mark">[^<]+<\/span><p>/g) || [];
      assert.ok(rows.length >= 2, `${name}: each step is a list item with its visible number`);
    }
  }
  assert.match(CSS, /\.checklist\{[^}]*margin:0 0 22px;[^}]*padding:0;[^}]*list-style:none/);
  assert.match(CSS, /\.check-row\{[^}]*margin:0;/, 'the global li margin does not reach the step rows');
});

/* Round 4, 23 Nov 2026: link underlines, archive cards, new-tab warning. */

test('the underline under a body-text link is at least 3:1 on every surface, light and dark', () => {
  const light = CSS.match(/:root\{([^}]*)\}/)[1];
  const dark = CSS.match(/:root\[data-theme="dark"\]\{([^}]*)\}/)[1];
  const media = CSS.match(/@media \(prefers-color-scheme: dark\)\{\s*:root:not\(\[data-theme="light"\]\)\{([^}]*)\}/)[1];
  for (const [name, block] of [['light', light], ['dark', dark], ['device dark', media]]) {
    const line = token(block, 'link-line');
    assert.ok(line, `${name}: --link-line is set`);
    const surfaces = ['bg', 'surface', 'surface-2'].map(n => token(block, n) || token(light, n));
    const alertBox = mix(token(block, 'critical') || token(light, 'critical'), token(block, 'surface') || token(light, 'surface'), 0.07);
    for (const s of [...surfaces, alertBox]) assert.ok(ratio(line, s) >= 3, `${name}: ${line} on ${s} is ${ratio(line, s).toFixed(2)}:1`);
  }
  assert.equal(token(media, 'link-line'), token(dark, 'link-line'), 'both dark palettes agree');
  assert.match(CSS, /\na\{color:var\(--text\); text-decoration-color:var\(--link-line\); text-underline-offset:2px;\}/);
  assert.match(CSS, /\.faint a, \.small a\{color:var\(--text-muted\); text-decoration-color:var\(--link-line\);\}/);
  assert.doesNotMatch(CSS, /text-decoration-color:var\(--border-strong\)/, 'no underline left at the old 1.7:1');
});

test('a briefing card has one link, and it is the headline alone', () => {
  const many = Array.from({ length: 3 }, (_, i) => ({ ...posts[0], slug: `p${i}`, url: `/updates/p${i}/`, title: `Briefing ${i}`, body: ['Lead line. '.repeat(30)] }));
  const c = { ...ctx, posts: many };
  for (const [name, pg] of [['archive', updateIndex(c)], ['live updates', liveUpdates(c)]]) {
    const cards = [...html(pg).matchAll(/<li><div class="postcard">([\s\S]*?)<\/div><\/li>/g)].map(m => m[1]);
    assert.equal(cards.length, 3, `${name}: every briefing is a card`);
    assert.doesNotMatch(html(pg), /<a class="postcard"/, `${name}: no whole-card link left`);
    cards.forEach((card, i) => {
      const links = card.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
      assert.equal(links.length, 1, `${name}: one link per card`);
      assert.equal(links[0], `<a href="/updates/p${i}/">Briefing ${i}</a>`, `${name}: the link wraps the headline text only`);
      assert.match(card, new RegExp(`^\\s*<time datetime="[^"]+">[^<]+</time>\\s*<h2><a href="/updates/p${i}/">`), `${name}: the time sits outside the link, before the headline`);
    });
  }
  assert.match(CSS, /\.postcard\{position:relative;/);
  assert.match(CSS, /\.postcard h2 a::after\{content:""; position:absolute; inset:0;/, 'the headline link still covers the card');
  assert.match(CSS, /\.postcard:hover\{border-color:var\(--border-strong\)/, 'hover look unchanged');
  assert.match(CSS, /\.postcard:has\(h2 a:focus-visible\)\{outline:2px solid var\(--text\)/, 'the focus ring goes round the card');
});

test('markNewTab adds the hidden note once, in the page language, and leaves scripts alone', () => {
  const src = '<a href="https://x.org/" target="_blank">X</a><a href="/y/">Y</a><script>var s=\'<a target="_blank">\';</script>';
  const en = markNewTab(src, 'en');
  assert.equal(en, '<a href="https://x.org/" target="_blank">X<span class="visually-hidden" lang="en"> (opens in a new tab)</span></a><a href="/y/">Y</a><script>var s=\'<a target="_blank">\';</script>');
  assert.equal(markNewTab(en, 'en'), en, 'running twice adds nothing');
  assert.match(markNewTab(src, 'ne'), /X<span class="visually-hidden" lang="ne"> \(नयाँ ट्याबमा खुल्छ\)<\/span><\/a>/);
  assert.equal(markNewTab('<a href="https://x.org/" target="_blank" aria-label="X">X</a>', 'en'), '<a href="https://x.org/" target="_blank" aria-label="X (opens in a new tab)">X</a>');
  assert.equal(markNewTab('<a href="https://x.org/" target="_blank" aria-hidden="true" tabindex="-1">X</a>', 'en'), '<a href="https://x.org/" target="_blank" aria-hidden="true" tabindex="-1">X</a>');
});

test('every link in the built pages that opens a new tab says so, in the page language', () => {
  const root = new URL('../', import.meta.url);
  const files = ['index.html', '404.html'];
  for (const dir of ['about', 'contact', 'ne', 'nepal-disasters', 'nepal-flood', 'sources', 'updates']) {
    if (!existsSync(new URL(dir, root))) continue;
    for (const f of readdirSync(new URL(dir, root), { recursive: true })) if (/(^|\/)index\.html$/.test(f)) files.push(`${dir}/${f}`);
  }
  let checked = 0, nepali = 0;
  for (const f of files) {
    const h = readFileSync(new URL(f, root), 'utf8');
    const lang = h.match(/<html lang="(en|ne)"/)[1];
    const note = `<span class="visually-hidden" lang="${lang}">${NEW_TAB_TEXT[lang]}</span>`;
    for (const part of h.split(/<script\b[\s\S]*?<\/script>/)) {
      for (const m of part.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
        if (!/\starget="?_blank/.test(m[1]) || /aria-hidden="true"/.test(m[1])) continue;
        checked++; if (lang === 'ne') nepali++;
        assert.ok(m[2].endsWith(note), `${f}: ${m[0].slice(0, 160)}`);
      }
    }
  }
  assert.ok(files.length > 300 && checked > 400 && nepali > 10, `${files.length} pages, ${checked} new-tab links, ${nepali} on Nepali pages`);
});

test('the newswire and front-page scripts write the note into their new-tab links', () => {
  const wire = readFileSync(new URL('../src/client/wire.js', import.meta.url), 'utf8');
  const front = readFileSync(new URL('../src/client/front.js', import.meta.url), 'utf8');
  assert.match(wire, /target="_blank"[^\n]*\+ esc\(i\.title\) \+ '<span class="visually-hidden" lang="en"> \(opens in a new tab\)<\/span><\/a>'/);
  assert.match(front, /a\.target = '_blank';[^\n]*\n[^\n]*nt\.lang = 'en'; nt\.textContent = ' \(opens in a new tab\)'; a\.appendChild\(nt\);/);
});
