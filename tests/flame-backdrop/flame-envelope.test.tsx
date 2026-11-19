import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ENVELOPE_PATH,
  FEATHER,
  EDGE_FALLOFF,
  envelopeBlurPixels,
  edgeFalloffAlpha
} from "@/components/gl/flame-backdrop/mask/profile";
import { FlameEditor as EnvelopeStudy } from "@/components/Devtools/flame-editor/flame-editor";

test("envelope is one broad closed organic field with asymmetric billows, not a ring or dome", () => {
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

test("Gaussian feather remains proportional to viewport height at every supported setting", () => {
  assert.equal(FEATHER.default, 6.5);
  assert.equal(envelopeBlurPixels(900, FEATHER.default), 58.5);
  assert.equal(envelopeBlurPixels(844, FEATHER.default), 54.86);
  assert.equal(envelopeBlurPixels(900, 0), 0);
  assert.equal(envelopeBlurPixels(900, FEATHER.max), 72);
  for (const invalid of [null, undefined, "", NaN, Infinity, -1, {}]) {
    assert.throws(() => envelopeBlurPixels(invalid as number, 4.5), /height/);
    assert.throws(() => envelopeBlurPixels(900, invalid as number), /feather/);
  }
  assert.throws(() => envelopeBlurPixels(0, 4.5), /height/);
  assert.throws(() => envelopeBlurPixels(900, FEATHER.max + 0.1), /feather/);
});

test("initial study renders material, with accessible mask, pause, feather and optional text controls", () => {
  const html = renderToStaticMarkup(createElement(EnvelopeStudy));
  assert.match(html, /data-envelope-render/);
  const mask = "/masks/flame-envelope.png";
  assert.ok(html.includes(`data-mask-source="${mask}"`));
});

test("edge falloff preserves opaque centers while monotonically reducing partial opacity", () => {
  assert.deepEqual(EDGE_FALLOFF, { min: 1, max: 4, step: 0.1, default: 2.2 });
  assert.equal(edgeFalloffAlpha(0, 2.2), 0);
  assert.equal(edgeFalloffAlpha(1, 2.2), 1);
  assert.ok(Math.abs(edgeFalloffAlpha(0.5, 2.2) - 0.217637640824031) < 1e-12);
  assert.equal(edgeFalloffAlpha(0.25, 1), 0.25);
  assert.equal(edgeFalloffAlpha(0.5, 4), 0.0625);
  let previous = 0;
  for (let index = 0; index <= 10000; index++) {
    const alpha = index / 10000;
    const value = edgeFalloffAlpha(alpha, 2.2);
    assert.ok(Number.isFinite(value) && value >= previous && value <= alpha);
    assert.ok(edgeFalloffAlpha(alpha, 4) <= value);
    previous = value;
  }
  for (const invalid of [null, undefined, "", {}, NaN, Infinity, -1, 1.01]) {
    assert.throws(() => edgeFalloffAlpha(invalid as number, 2.2), /alpha/);
  }
  for (const invalid of [
    null,
    undefined,
    "",
    {},
    NaN,
    Infinity,
    0,
    0.99,
    4.01
  ]) {
    assert.throws(() => edgeFalloffAlpha(0.5, invalid as number), /exponent/);
  }
});
