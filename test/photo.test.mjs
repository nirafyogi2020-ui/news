import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { imageSize, shrinkPhoto, MAX_PHOTO_WIDTH } from '../src/photo.mjs';

let Resvg = null;
try { ({ Resvg } = await import('@resvg/resvg-js')); } catch { Resvg = null; }

const PHOTOS = new URL('../assets/photos/', import.meta.url).pathname;

/* A plain test picture: a wide PNG drawn by the same rasteriser the job uses,
   so the test needs no binary fixture in the repository. */
function testPng(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`
    + `<rect width="${width}" height="${height}" fill="#3a6ea5"/>`
    + `<circle cx="${width / 2}" cy="${height / 2}" r="${height / 3}" fill="#f2b134"/></svg>`;
  return Buffer.from(new Resvg(svg).render().asPng());
}

test('the header reader gets the size of a PNG, a JPEG and the three kinds of WebP', { skip: !Resvg && 'resvg not installed' }, () => {
  assert.deepEqual(imageSize(testPng(640, 360)), { width: 640, height: 360 });

  const jpg = readdirSync(PHOTOS).find(f => f.endsWith('.jpg'));
  const size = imageSize(readFileSync(join(PHOTOS, jpg)));
  assert.ok(size && size.width > 0 && size.height > 0, 'a real card photograph reads');

  const riff = (kind, body) => Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBP' + kind), body, Buffer.alloc(16)]);
  const vp8 = Buffer.alloc(14); vp8.writeUInt16LE(1920, 10); vp8.writeUInt16LE(1080, 12);
  assert.deepEqual(imageSize(riff('VP8 ', vp8)), { width: 1920, height: 1080 });
  const vp8l = Buffer.alloc(9); vp8l.writeUInt32LE((799) | ((599) << 14), 5);
  assert.deepEqual(imageSize(riff('VP8L', vp8l)), { width: 800, height: 600 });
  const vp8x = Buffer.alloc(14); vp8x.writeUIntLE(2559, 8, 3); vp8x.writeUIntLE(1439, 11, 3);
  assert.deepEqual(imageSize(riff('VP8X', vp8x)), { width: 2560, height: 1440 });

  assert.equal(imageSize(Buffer.from('<html>not a picture at all, just text</html>')), null);
});

test('a wide download comes out at most 1,400 px wide, as a JPEG, keeping its shape', { skip: !Resvg && 'resvg not installed' }, () => {
  const big = testPng(2800, 1400);
  const out = shrinkPhoto(big, 'image/png');
  assert.equal(out.type, 'image/jpeg');
  assert.equal(out.buf[0], 0xff, 'JPEG magic');
  assert.equal(out.buf[1], 0xd8);
  assert.deepEqual(imageSize(out.buf), { width: MAX_PHOTO_WIDTH, height: 700 });
});

test('a JPEG that is already small is kept exactly as it came', { skip: !Resvg && 'resvg not installed' }, () => {
  const small = shrinkPhoto(testPng(600, 400), 'image/png').buf;
  const again = shrinkPhoto(small, 'image/jpeg');
  assert.equal(again.type, 'image/jpeg');
  assert.ok(again.buf.equals(small), 'no second encoding pass');
});

test('a WebP is passed through untouched, since the rasteriser cannot read it', () => {
  const webp = Buffer.concat([Buffer.from('RIFF\0\0\0\0WEBPVP8 '), Buffer.alloc(40)]);
  const out = shrinkPhoto(webp, 'image/webp');
  assert.equal(out.type, 'image/webp');
  assert.ok(out.buf.equals(webp));
});

test('every card photograph the site points at is within the width limit', () => {
  const manifest = JSON.parse(readFileSync(join(PHOTOS, 'index.json'), 'utf8'));
  const wide = Object.values(manifest)
    .map(r => r.file)
    .filter(f => existsSync(join(PHOTOS, f)))
    .filter(f => {
      const s = imageSize(readFileSync(join(PHOTOS, f)));
      return s && s.width > MAX_PHOTO_WIDTH;
    });
  assert.deepEqual(wide, []);
});
