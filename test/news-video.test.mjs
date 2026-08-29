import assert from 'node:assert/strict';
import test from 'node:test';

import { isVideoOnTopic, parseYoutubePlaylist, safeHttpsUrl } from '../functions/api/news.js';

const channel = { source: 'Nepal Television', region: 'nepal' };
const identity = { avatar: 'https://example.org/avatar.jpg' };

test('verified Watch items use the uploads playlist and preserve the source', () => {
  const now = new Date().toISOString();
  const items = parseYoutubePlaylist({
    items: [{
      snippet: {
        title: 'Rasuwa flood rescue update #Nepal',
        description: 'Flood rescue work near Bhotekoshi.',
        publishedAt: now,
        resourceId: { videoId: 'abc123def45' }
      },
      contentDetails: { videoId: 'abc123def45', videoPublishedAt: now }
    }]
  }, channel, identity);

  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'Nepal Television');
  assert.equal(items[0].url, 'https://www.youtube.com/watch?v=abc123def45');
  assert.equal(isVideoOnTopic(items[0], Date.now()), true);
});

test('Watch rejects unrelated or stale videos from a verified channel', () => {
  const now = Date.now();
  assert.equal(isVideoOnTopic({
    title: 'Evening entertainment programme',
    summary: 'Nepal television',
    time: new Date(now).toISOString()
  }, now), false);
  assert.equal(isVideoOnTopic({
    title: 'Rasuwa flood update',
    summary: '',
    time: new Date(now - 22 * 24 * 60 * 60 * 1000).toISOString()
  }, now), false);
});

test('upstream card links must use HTTPS', () => {
  assert.equal(safeHttpsUrl('https://example.org/update'), 'https://example.org/update');
  assert.equal(safeHttpsUrl('http://example.org/update'), null);
  assert.equal(safeHttpsUrl('javascript:alert(1)'), null);
});
