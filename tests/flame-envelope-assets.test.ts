import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { CENTER_FADE, ENVELOPE_PATH } from '../flame-backdrop/mask/profile';
import { createEnvelopeMaskUrl } from '../flame-backdrop/mask/svg';
import { ASSET_SIZE, createMaskAssetSvg, createIllustratorSourceSvg, reusableGradientStops } from '../scripts/flame-envelope-assets';

test('saved mask uses approved values and exactly the live SVG generator', () => {
  assert.equal(CENTER_FADE.smoothing, 1.39);
  assert.equal(CENTER_FADE.exponent, 1.20);
  assert.deepEqual(ASSET_SIZE, { width: 2880, height: 1800 });
  assert.equal(createMaskAssetSvg(), decodeURIComponent(createEnvelopeMaskUrl(2880, 1800, 1.39, 1.20, false, .18).split(',')[1]));
  assert.match(createMaskAssetSvg(), /stdDeviation="25.02"/);
});

test('Illustrator source retains expanded same-shape paths and separate native reusable fill', () => {
  const svg = createIllustratorSourceSvg();
  assert.match(svg, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg version="1\.1"/);
  assert.match(svg, /id="approved-contour-mask"/);
  assert.match(svg, /id="reusable-gradient-fill"/);
  assert.match(svg, /id="reusable-opacity-gradient"/);
  assert.match(svg, /fill="url\(#reusable-opacity-gradient\)"/);
  assert.ok(svg.includes(ENVELOPE_PATH));
  assert.doesNotMatch(svg, /<use\b|<image\b|href="https?:/);
  assert.ok((svg.match(/data-contour-scale=/g) ?? []).length >= 128);
  const stops = reusableGradientStops();
  assert.equal(stops[0].opacity, 1);
  assert.equal(stops.at(-1)?.opacity, 0);
  stops.slice(1).forEach((stop, index) => assert.ok(stop.opacity <= stops[index].opacity));
});

test('exported PNG is transparent RGBA at approved resolution with transparent outer rows', async () => {
  const path = new URL('../public/masks/flame-envelope.png', import.meta.url);
  const image = sharp(await readFile(path));
  const meta = await image.metadata();
  assert.equal(meta.width, ASSET_SIZE.width);
  assert.equal(meta.height, ASSET_SIZE.height);
  assert.equal(meta.channels, 4);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
  for (let x = 0; x < info.width; x++) {
    assert.equal(alpha(x, 0), 0);
    assert.equal(alpha(x, info.height - 1), 0);
  }
  assert.ok(alpha(Math.floor(info.width / 2), Math.floor(info.height * .62)) > 245);
});


test('durable export manifest records the approved defaults and actual asset hashes', async () => {
  const { createHash } = await import('node:crypto');
  const manifest = JSON.parse(await readFile(new URL('../design/flame-envelope/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.smoothingPercentHeight, 1.39);
  assert.equal(manifest.centerFalloff, 1.2);
  assert.equal(manifest.centerLift, .18);
  for (const extension of ['png', 'svg']) {
    const bytes = await readFile(new URL(`../public/masks/flame-envelope.${extension}`, import.meta.url));
    assert.equal(manifest[`${extension}Sha256`], createHash('sha256').update(bytes).digest('hex'));
  }
  const illustrator = await readFile(new URL('../design/flame-envelope/flame-envelope-illustrator.svg', import.meta.url), 'utf8');
  assert.equal(illustrator, createIllustratorSourceSvg());
  assert.match(illustrator, /12.51px/);
});
