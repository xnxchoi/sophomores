import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ENVELOPE_PATH, FEATHER, EDGE_FALLOFF, envelopeBlurPixels, edgeFalloffAlpha } from '../components/flame-backdrop/mask/profile';
import { FlameEditor as EnvelopeStudy } from '../components/devtools/flame-editor/flame-editor';
import { createPreviousEnvelopeMaskUrl } from '../components/flame-backdrop/mask/svg';

test('envelope is one broad closed organic field with asymmetric billows, not a ring or dome', () => {
  assert.equal((ENVELOPE_PATH.match(/M/g) ?? []).length, 1);
  assert.match(ENVELOPE_PATH, /Z$/);
  assert.ok((ENVELOPE_PATH.match(/C/g) ?? []).length >= 7);
  const numbers = ENVELOPE_PATH.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const x = numbers.filter((_, index) => index % 2 === 0);
  const y = numbers.filter((_, index) => index % 2 === 1);
  assert.ok(Math.min(...x) < 0 && Math.max(...x) > 100);
  assert.ok(Math.min(...y) >= 27 && Math.min(...y) <= 32);
  assert.ok(Math.max(...y) >= 93 && Math.max(...y) <= 97);
  assert.match(ENVELOPE_PATH, /82 83/); // Shallow offset lower-right indentation.
});

test('Gaussian feather remains proportional to viewport height at every supported setting', () => {
  assert.equal(FEATHER.default, 6.5);
  assert.equal(envelopeBlurPixels(900, FEATHER.default), 58.5);
  assert.equal(envelopeBlurPixels(844, FEATHER.default), 54.86);
  assert.equal(envelopeBlurPixels(900, 0), 0);
  assert.equal(envelopeBlurPixels(900, FEATHER.max), 72);
  for (const invalid of [null, undefined, '', NaN, Infinity, -1, {}]) {
    assert.throws(() => envelopeBlurPixels(invalid as number, 4.5), /height/);
    assert.throws(() => envelopeBlurPixels(900, invalid as number), /feather/);
  }
  assert.throws(() => envelopeBlurPixels(0, 4.5), /height/);
  assert.throws(() => envelopeBlurPixels(900, FEATHER.max + .1), /feather/);
});

test('initial study renders material, with accessible mask, pause, feather and optional text controls', () => {
  const html = renderToStaticMarkup(createElement(EnvelopeStudy));
  assert.match(html, /Flame field/);
  assert.match(html, /<option value="render" selected="">Render<\/option>/);
  assert.match(html, /<option value="mask">Mask<\/option>/);
  assert.match(html, /Pause motion/);
  const renderSurface = html.match(/<div[^>]*data-envelope-render[^>]*>/)?.[0] ?? '';
  assert.match(renderSurface, /absolute inset-0 h-full w-full/);
  assert.doesNotMatch(renderSurface, /\bhidden(?:=|\s|>)/);
  assert.match(html, /href="\/studies\/flame-reference"/);
  assert.match(html, /aria-label="Edge smoothing"[^>]*type="range"[^>]*min="0"[^>]*max="2"[^>]*step="0.01"/);
  assert.match(html, /Show text/);
  assert.match(html, /aria-pressed="false"/);
  const source = readFileSync(new URL('../components/devtools/flame-editor/flame-editor.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /Hide text/);
  assert.match(source, /data-sample-text className="[^"]*relative[^"]*sm:fixed/);
  assert.doesNotMatch(html, /For Those Who Have Been Somewhere/);
  const mask = '/masks/flame-envelope.png';
  assert.ok(html.includes(`data-mask-source="${mask}"`));
  assert.doesNotMatch(html.match(/<canvas[^>]*>/)?.[0] ?? '', /mask-image:/);
  const debugMask = html.match(/<div[^>]*data-envelope-mask[^>]*>/)?.[0] ?? '';
  assert.match(debugMask, /bg-white/);
  assert.match(debugMask, /mask-mode:alpha/);
  assert.ok(debugMask.includes(`mask-image:url(&quot;${mask}&quot;)`));
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /Saved mask image/);
  assert.match(html, /Procedural editor/);
  assert.match(html, /accept="image\/png,image\/svg\+xml"/);
  assert.match(html, /<button[^>]*aria-label="Choose mask file"[^>]*class="[^"]*text-white[^"]*tracking-normal[^>]*>Choose file<\/button>/);
  assert.match(html, /data-mask-filename[^>]*class="[^"]*break-all[^"]*tracking-normal[^>]*>No file selected<\/span>/);
  assert.doesNotMatch(html.match(/<header[^>]*>/)?.[0] ?? '', /bg-black/);
});

test('edge falloff preserves opaque centers while monotonically reducing partial opacity', () => {
  assert.deepEqual(EDGE_FALLOFF, { min: 1, max: 4, step: .1, default: 2.2 });
  assert.equal(edgeFalloffAlpha(0, 2.2), 0);
  assert.equal(edgeFalloffAlpha(1, 2.2), 1);
  assert.ok(Math.abs(edgeFalloffAlpha(.5, 2.2) - .217637640824031) < 1e-12);
  assert.equal(edgeFalloffAlpha(.25, 1), .25);
  assert.equal(edgeFalloffAlpha(.5, 4), .0625);
  let previous = 0;
  for (let index = 0; index <= 10000; index++) {
    const alpha = index / 10000;
    const value = edgeFalloffAlpha(alpha, 2.2);
    assert.ok(Number.isFinite(value) && value >= previous && value <= alpha);
    assert.ok(edgeFalloffAlpha(alpha, 4) <= value);
    previous = value;
  }
  for (const invalid of [null, undefined, '', {}, NaN, Infinity, -1, 1.01]) {
    assert.throws(() => edgeFalloffAlpha(invalid as number, 2.2), /alpha/);
  }
  for (const invalid of [null, undefined, '', {}, NaN, Infinity, 0, .99, 4.01]) {
    assert.throws(() => edgeFalloffAlpha(.5, invalid as number), /exponent/);
  }
});

test('previous fade remains available while new controls describe contour-wide fading', () => {
  const html = renderToStaticMarkup(createElement(EnvelopeStudy));
  const svg = decodeURIComponent(createPreviousEnvelopeMaskUrl(1440, 900));
  assert.match(svg, /<feGaussianBlur[^>]*\/>[\s\S]*<feComponentTransfer><feFuncA type="gamma" amplitude="1" exponent="2.2" offset="0"/);
  assert.doesNotMatch(svg, /feFunc[RGB]| opacity=|filter="opacity/);
  assert.match(html, /aria-label="Center falloff"[^>]*type="range"[^>]*min="1"[^>]*max="4"[^>]*step="0.01"[^>]*value="1.2"/);
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>Show before<\/button>/);
  assert.match(html, /Saved mask image — 1.39% smoothing \/ 1.20 falloff/);
  assert.equal(createHash('sha256').update(ENVELOPE_PATH).digest('hex'), 'e43f22b0db22ea5b208d19671cba9dc5a045e4de366af783a5823d3e6b2ad08b');
});

test('study stays isolated from canonical renderer and global styles', () => {
  for (const path of ['app/(site)/studies/flame-envelope/page.tsx', 'components/devtools/flame-editor/flame-editor.tsx', 'components/flame-backdrop/mask/profile.ts']) {
    const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from ['"][^'"]*(?:historical-renderer|flame-backdrop\/renderer|motion)/);
    assert.doesNotMatch(source, /requestAnimationFrame|\.css['"]|filter:\s*['"]blur/);
  }
});
