import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { imageSize, shrinkPhoto, ensureCardVariants, cardVariantName, photoSrcset, MAX_PHOTO_WIDTH, CARD_PHOTO_WIDTH } from '../src/photo.mjs';

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

test('the card-sized copy is written once, named in the manifest, and left alone when up to date', { skip: !Resvg && 'resvg not installed' }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'photos-'));
  try {
    writeFileSync(join(dir, 'wide.jpg'), shrinkPhoto(testPng(1400, 700), 'image/png').buf);
    writeFileSync(join(dir, 'small.jpg'), shrinkPhoto(testPng(600, 400), 'image/png').buf);
    writeFileSync(join(dir, 'index.json'), JSON.stringify({
      wide: { file: 'wide.jpg', type: 'image/jpeg', credit: 'Test' },
      small: { file: 'small.jpg', type: 'image/jpeg', credit: 'Test' },
      gone: { file: 'missing.jpg', type: 'image/jpeg', credit: 'Test' },
    }));

    assert.equal(ensureCardVariants(dir), 1, 'one copy for the one wide picture');
    const manifest = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
    assert.equal(manifest.wide.card, 'wide-800.jpg');
    assert.deepEqual([manifest.wide.width, manifest.wide.height], [1400, 700]);
    assert.deepEqual(imageSize(readFileSync(join(dir, 'wide-800.jpg'))), { width: CARD_PHOTO_WIDTH, height: 400 });
    assert.equal(manifest.small.card, undefined, 'a picture already at card size gets no copy');
    assert.deepEqual([manifest.small.width, manifest.small.height], [600, 400]);
    assert.equal(manifest.gone.card, undefined);

    assert.equal(ensureCardVariants(dir), 0, 'nothing to do the second time');

    /* A source replaced later gets a fresh copy. */
    const later = new Date(Date.now() + 60000);
    utimesSync(join(dir, 'wide.jpg'), later, later);
    assert.equal(ensureCardVariants(dir), 1);

    assert.equal(cardVariantName('a.webp'), 'a-800.jpg');
    assert.equal(photoSrcset(manifest.wide), '/assets/photos/wide-800.jpg 800w, /assets/photos/wide.jpg 1400w');
    assert.equal(photoSrcset(manifest.small), '');
    assert.equal(photoSrcset(manifest.wide, n => '/x/' + n + '?v=1'), '/x/wide-800.jpg?v=1 800w, /x/wide.jpg?v=1 1400w');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every referenced photograph wider than the card has its card-sized copy filed', () => {
  const manifest = JSON.parse(readFileSync(join(PHOTOS, 'index.json'), 'utf8'));
  const problems = [];
  for (const [slug, rec] of Object.entries(manifest)) {
    if (!rec.file || !existsSync(join(PHOTOS, rec.file))) continue;
    const size = imageSize(readFileSync(join(PHOTOS, rec.file)));
    if (!size) continue;
    if (rec.width !== size.width || rec.height !== size.height) problems.push(`${slug}: manifest size differs from the file`);
    if (size.width > CARD_PHOTO_WIDTH && rec.type !== 'image/webp') {
      if (rec.card !== cardVariantName(rec.file)) { problems.push(`${slug}: no card copy named`); continue; }
      if (!existsSync(join(PHOTOS, rec.card))) { problems.push(`${slug}: ${rec.card} missing`); continue; }
      const small = imageSize(readFileSync(join(PHOTOS, rec.card)));
      if (!small || small.width !== CARD_PHOTO_WIDTH) problems.push(`${slug}: ${rec.card} is ${small && small.width} wide`);
    } else if (rec.card) {
      problems.push(`${slug}: names a card copy it does not need`);
    }
  }
  assert.deepEqual(problems, []);
});
