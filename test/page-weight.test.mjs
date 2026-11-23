import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { frontPage, liveUpdates, mapPage, emergencyNumbers, contact, LIVEBLOG_SCHEMA_MAX } from '../src/pages.mjs';
import { fontCss, mailLink, CONTACT_EMAIL, emittedAssets } from '../src/template.mjs';

const event = JSON.parse(readFileSync(new URL('../event.json', import.meta.url), 'utf8'));

/* Forty briefings, one an hour, newest first, as the archive hands them over. */
const posts = Array.from({ length: 40 }, (_, i) => {
  const time = new Date(Date.UTC(2026, 10, 22, 12) - i * 3600e3).toISOString();
  const slug = `2026-11-22-post-${i}`;
  return { slug, url: `/updates/${slug}/`, title: `Flood briefing number ${i}`, time, body: [`Body of briefing ${i}.`], sources: [] };
});
const ctx = { event, today: { updated: posts[0].time, posts: [] }, modified: posts[0].time, buildDay: '2026-11-22', posts };

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
}
function head(html) { return html.slice(0, html.indexOf('</head>')); }

test('the live-updates page lists every briefing but puts only the newest in its structured data', () => {
  const pg = liveUpdates(ctx);
  const nodes = jsonLd(pg.html).flatMap(b => b['@graph'] || [b]);
  const blog = nodes.find(n => n['@type'] === 'LiveBlogPosting');
  assert.ok(blog, 'the page still carries a LiveBlogPosting');
  assert.equal(blog.liveBlogUpdate.length, LIVEBLOG_SCHEMA_MAX);
  assert.equal(LIVEBLOG_SCHEMA_MAX, 25);
  assert.equal(blog.liveBlogUpdate[0].url, 'https://nepaldisasterupdatelive.nxtimaginelabs.com' + posts[0].url, 'newest first');
  assert.ok(blog.liveBlogUpdate.every(u => u.datePublished && u.headline));
  assert.ok(new Date(blog.coverageEndTime) > new Date(posts[0].time));
  for (const p of posts) assert.ok(pg.html.includes(`href="${p.url}"`), `visible list keeps ${p.url}`);
});

test('Newsreader is asked for at one optical size, not the whole range', () => {
  const en = fontCss('en');
  assert.match(en, /family=Newsreader:opsz,wght@36,400;36,600&/);
  assert.doesNotMatch(en, /\d\.\.\d/, 'no axis range in the request');
  assert.doesNotMatch(en, /Devanagari/);
  assert.match(fontCss('ne'), /Noto\+Sans\+Devanagari/);
  const pg = liveUpdates(ctx);
  assert.ok(head(pg.html).includes(`<link href="${en}" rel="stylesheet">`), 'every page head uses the one font address');
  const css = readFileSync(new URL('../assets/site.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /font-variation-settings|font-optical-sizing/, 'nothing relies on the dropped axis');
});

test('the map page head no longer blocks on the Leaflet stylesheet', () => {
  const pg = mapPage(ctx);
  assert.doesNotMatch(head(pg.html), /leaflet\.css/);
  const js = emittedAssets().get('assets/route-map.js');
  assert.ok(js, 'the map page registered its script');
  assert.match(js, /css\.href = 'https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css'/);
  assert.match(js, /css\.integrity = 'sha256-/);
  assert.match(js, /css\.rel = 'stylesheet'/);
});

test('front page pictures do not repeat their caption, and toll changes are spoken', () => {
  const news = [{ title: 'Highway to Rasuwa reopens after landslide', url: 'https://kathmandupost.com/x', source: 'Kathmandu Post', time: '2026-11-22T02:00:00.000Z', kind: 'press', region: 'nepal', image: 'https://kathmandupost.com/x.jpg' }];
  const photos = Object.fromEntries(posts.slice(0, 3).map((p, i) =>
    [`updates-${p.slug}`, { file: `t${i}.jpg`, credit: 'Setopati', hash: `h${i}` }]));
  const html = frontPage(ctx, { news, photos, events: [event] }).html;
  const grid = html.slice(html.indexOf('class="fp-photos"'));
  assert.ok(grid.length > 20, 'the photo grid is on the page');
  for (const img of grid.slice(0, grid.indexOf('</section>')).match(/<img [^>]*>/g)) assert.match(img, /\salt=""/);
  assert.match(html, /<img src="https:\/\/kathmandupost\.com\/x\.jpg" alt=""/);
  assert.match(html, /<p id="fp-announce" class="visually-hidden" role="status"><\/p>/);
  const js = emittedAssets().get('assets/front.js');
  assert.match(js, /getElementById\('fp-announce'\)/);
});

test('dial buttons read as "100, Police", not "100Police"', () => {
  for (const html of [emergencyNumbers(ctx).html, liveUpdates(ctx).html]) {
    const dials = html.match(/<a class="(?:fp-)?dial" href="tel:[^"]+">[\s\S]*?<\/a>/g) || [];
    assert.ok(dials.length, 'the page has dial buttons');
    for (const d of dials) assert.match(d, /<\/b><span class="visually-hidden">, <\/span><span>/, d);
  }
});

test('the contact address is kept away from Cloudflare email obfuscation', () => {
  assert.equal(mailLink(), `<!--email_off--><a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><!--/email_off-->`);
  const html = contact(ctx).html;
  const links = html.match(/<a href="mailto:[^>]*>/g) || [];
  assert.ok(links.length >= 2);
  const unwrapped = html.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, '');
  assert.doesNotMatch(unwrapped, /mailto:/, 'every mailto link sits inside an email_off pair');
});
