import { test } from 'node:test';
import assert from 'node:assert/strict';

import { serveFeed, knownImages, addFeedImages, backfillImages, getText } from '../functions/api/news.js';
import { isPublicWebUrl, fetchPublic } from '../functions/api/_public-url.js';

/* A stand-in for caches.default: enough of match/put/delete to drive serveFeed. */
function fakeCache() {
  const store = new Map();
  return {
    store,
    async match(req) {
      const hit = store.get(req.url);
      return hit ? new Response(hit.body, { headers: hit.headers }) : undefined;
    },
    async put(req, res) {
      store.set(req.url, { body: await res.text(), headers: Object.fromEntries(res.headers) });
    },
    async delete(req) { return store.delete(req.url); }
  };
}

function fakeContext() {
  const pending = [];
  return { pending, waitUntil: p => pending.push(p), settle: () => Promise.all(pending) };
}

const KEY = 'https://example.org/api/news';
const payload = n => ({ updated: 'u' + n, items: [{ kind: 'press', url: 'https://a.example/' + n, image: null }], errors: [] });

function seed(cache, body, builtAt) {
  cache.store.set(KEY, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-news-built': String(builtAt) }
  });
}

test('cold miss answers without waiting for pictures, then stores the copy with them', async () => {
  const cache = fakeCache();
  const ctx = fakeContext();
  let release;
  const gate = new Promise(r => { release = r; });
  let builds = 0;
  const res = await serveFeed(ctx, {
    cache, key: KEY, now: () => 1000,
    build: async () => { builds++; return payload(1); },
    addImages: async p => { await gate; p.items[0].image = 'https://img.example/1.jpg'; return true; }
  });
  assert.equal(builds, 1);
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(res.headers.get('cache-control'), 'public, max-age=30, s-maxage=60');
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.equal(res.headers.get('x-news-built'), null);
  assert.deepEqual(await res.json(), payload(1));   // answered while pictures still pending
  release();
  await ctx.settle();
  const stored = JSON.parse(cache.store.get(KEY).body);
  assert.equal(stored.items[0].image, 'https://img.example/1.jpg');
  assert.equal(cache.store.get(KEY).headers['x-news-built'], '1000');
});

test('fresh stored copy is served with no rebuild', async () => {
  const cache = fakeCache();
  const ctx = fakeContext();
  seed(cache, payload(1), 1000);
  const res = await serveFeed(ctx, {
    cache, key: KEY, now: () => 1000 + 59_000,
    build: async () => assert.fail('should not rebuild'), addImages: async () => false
  });
  assert.deepEqual(await res.json(), payload(1));
  assert.equal(res.headers.get('cache-control'), 'public, max-age=30, s-maxage=60');
  assert.equal(ctx.pending.length, 0);
});

test('stale copy is served at once and rebuilt once in the background', async () => {
  const cache = fakeCache();
  const ctx = fakeContext();
  const old = payload(1);
  old.items[0].url = 'https://a.example/2';
  old.items[0].image = 'https://img.example/kept.jpg';
  seed(cache, old, 1000);
  let builds = 0;
  let seenKnown = null;
  const opts = {
    cache, key: KEY, now: () => 1000 + 120_000,
    build: async () => { builds++; await new Promise(r => setTimeout(r, 10)); return payload(2); },
    addImages: async (p, known) => { seenKnown = known; return addFeedImages(p, known, async () => null); }
  };
  // The lock is best effort (the Cache API has no atomic insert), so the
  // second visitor arrives just after the first rebuild has started.
  const a = await serveFeed(ctx, opts);
  await new Promise(r => setTimeout(r, 2));
  const b = await serveFeed(ctx, opts);
  assert.deepEqual(await a.json(), old);
  assert.deepEqual(await b.json(), old);
  await ctx.settle();
  assert.equal(builds, 1, 'second visitor sees the refresh lock');
  assert.equal(seenKnown.get('https://a.example/2'), 'https://img.example/kept.jpg');
  const stored = JSON.parse(cache.store.get(KEY).body);
  assert.equal(stored.updated, 'u2');
  assert.equal(stored.items[0].image, 'https://img.example/kept.jpg', 'picture carried over, not refetched');
  assert.equal(cache.store.get(KEY).headers['x-news-built'], String(1000 + 120_000));
  assert.equal(cache.store.has(KEY + '?refreshing'), false, 'lock released');
});

test('a failed background rebuild keeps the stored copy', async () => {
  const cache = fakeCache();
  const ctx = fakeContext();
  seed(cache, payload(1), 1000);
  const res = await serveFeed(ctx, {
    cache, key: KEY, now: () => 1000 + 120_000,
    build: async () => { throw new Error('boom'); }, addImages: async () => false
  });
  assert.deepEqual(await res.json(), payload(1));
  await ctx.settle();
  assert.equal(JSON.parse(cache.store.get(KEY).body).updated, 'u1');
});

test('a copy past the stale limit is not served', async () => {
  const cache = fakeCache();
  const ctx = fakeContext();
  seed(cache, payload(1), 1000);
  const res = await serveFeed(ctx, {
    cache, key: KEY, now: () => 1000 + 3600_000,
    build: async () => payload(2), addImages: async () => false
  });
  assert.equal((await res.json()).updated, 'u2');
});

test('knownImages reads press pictures from the last feed only', () => {
  const body = JSON.stringify({ items: [
    { kind: 'press', url: 'https://a/1', image: 'https://i/1' },
    { kind: 'video', url: 'https://a/2', image: 'https://i/2' },
    { kind: 'press', url: 'https://a/3', image: null }
  ] });
  assert.deepEqual([...knownImages(body)], [['https://a/1', 'https://i/1']]);
  assert.equal(knownImages('not json').size, 0);
});

test('backfillImages keeps only https pictures and counts them', async () => {
  const items = [
    { kind: 'press', url: 'https://a/1', image: null },
    { kind: 'press', url: 'https://a/2', image: null },
    { kind: 'official', url: 'https://a/3', image: null }
  ];
  const pages = {
    'https://a/1': '<meta property="og:image" content="https://img/1.jpg?a=1&amp;b=2">',
    'https://a/2': '<meta property="og:image" content="http://img/2.jpg">'
  };
  const fetched = [];
  const n = await backfillImages(items, 14, async url => { fetched.push(url); return new Response(pages[url] || ''); });
  assert.equal(n, 1);
  assert.equal(items[0].image, 'https://img/1.jpg?a=1&b=2');
  assert.equal(items[1].image, null);
  assert.deepEqual(fetched, ['https://a/1', 'https://a/2']);
});

test('isPublicWebUrl refuses private and local addresses', () => {
  for (const bad of [
    'https://localhost/x', 'https://127.0.0.1/', 'https://10.1.2.3/', 'https://192.168.0.1/',
    'https://172.20.0.1/', 'https://169.254.169.254/latest', 'https://100.64.0.1/',
    'https://[::1]/', 'https://[fd00::1]/', 'https://2130706433/', 'https://0x7f.0.0.1/',
    'https://intranet/', 'https://printer.local/', 'https://u:p@example.com/', 'ftp://example.com/',
    'file:///etc/passwd', ''
  ]) assert.equal(isPublicWebUrl(bad), false, bad);
  for (const good of ['https://kathmandupost.com/a', 'http://example.org/', 'https://8.8.8.8/'])
    assert.equal(isPublicWebUrl(good), true, good);
});

/* fetchPublic and getText call the global fetch; swap it per test. */
async function withFetch(handler, fn) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, redirect: init && init.redirect }); return handler(url); };
  try { return await fn(calls); } finally { globalThis.fetch = real; }
}
const redirect = to => new Response(null, { status: 302, headers: { location: to } });

test('fetchPublic follows a public redirect by hand', async () => {
  await withFetch(url => url === 'https://a.example/x' ? redirect('/y') : new Response('ok'), async calls => {
    const res = await fetchPublic('https://a.example/x');
    assert.equal(await res.text(), 'ok');
    assert.deepEqual(calls, [
      { url: 'https://a.example/x', redirect: 'manual' },
      { url: 'https://a.example/y', redirect: 'manual' }
    ]);
  });
});

test('fetchPublic refuses a redirect to a private address before fetching it', async () => {
  await withFetch(() => redirect('http://169.254.169.254/latest/meta-data'), async calls => {
    await assert.rejects(fetchPublic('https://a.example/x'), /non-public/);
    assert.equal(calls.length, 1);
  });
});

test('fetchPublic refuses a private first address without fetching', async () => {
  await withFetch(() => assert.fail('no fetch'), async () => {
    await assert.rejects(fetchPublic('https://127.0.0.1/'), /non-public/);
  });
});

test('fetchPublic caps redirect hops', async () => {
  let n = 0;
  await withFetch(() => redirect('https://a.example/' + (++n)), async calls => {
    await assert.rejects(fetchPublic('https://a.example/0'), /too many redirects/);
    assert.equal(calls.length, 6);
  });
});

test('getText refuses a feed that redirects to a local address', async () => {
  await withFetch(() => redirect('https://localhost/feed'), async () => {
    await assert.rejects(getText('https://feeds.example.com/rss'), /non-public/);
  });
});
