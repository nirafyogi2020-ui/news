import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { isVideoOnTopic, parseYoutubeAtom, channelFeedUrl, safeHttpsUrl } from '../functions/api/news.js';

const channel = { id: 'UC-test', source: 'Nepal Television', region: 'nepal' };

test('verified Watch items come from the channel feed and keep the source', () => {
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?><feed>
    <entry>
      <yt:videoId>abc123def45</yt:videoId>
      <title>Rasuwa flood rescue update #Nepal</title>
      <published>${now}</published>
      <media:thumbnail url="https://i.ytimg.com/vi/abc123def45/hqdefault.jpg"/>
      <media:description>Flood rescue work near Bhotekoshi.</media:description>
    </entry>
    <entry>
      <yt:videoId>bad</yt:videoId>
      <title>Malformed id is skipped</title>
      <published>${now}</published>
    </entry>
  </feed>`;
  const items = parseYoutubeAtom(xml, channel);

  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'Nepal Television');
  assert.equal(items[0].url, 'https://www.youtube.com/watch?v=abc123def45');
  assert.equal(isVideoOnTopic(items[0], Date.now()), true);
});

test('the Watch feed needs no API key or account', () => {
  assert.equal(
    channelFeedUrl('UC-test'),
    'https://www.youtube.com/feeds/videos.xml?channel_id=UC-test'
  );
  const source = readFileSync(new URL('../functions/api/news.js', import.meta.url), 'utf8');
  assert.equal(source.includes('YOUTUBE_API_KEY'), false, 'no API key may be read any more');
  assert.equal(source.includes('googleapis.com'), false, 'no quota-capped endpoint may be called');
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
