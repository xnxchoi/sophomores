"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { createElement } from "react";
import { motionValue } from "motion/react";
import Scene from "@/components/teaser/scene";
import {
  backdropTokens,
  resolveFooterComposition
} from "@/lib/teaser/backdrop-tokens";
import { resolveFooterConfig } from "@/components/gl/flame-backdrop/footer";
import { artworkLayout } from "@/components/gl/flame-backdrop/layout";

test("footer stays mounted and display-visible while its GPU is suspended", () => {
  for (const active of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(Scene, {
        progress: motionValue(1),
        active,
        footer: true
      })
    );
    assert.equal((html.match(/data-flame-field/g) ?? []).length, 1);
    assert.match(html, /h-full/);
    assert.doesNotMatch(
      html,
      /\shidden(?:=|\s|>)|display:none|class="[^"]*\bhidden\b/,
      "suspending the GPU must not hide the retained artwork"
    );
  }
  const source = readFileSync(
    new URL("../../src/components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /!props\.footer\s*&&\s*["']hidden["']/);
});

test("footer geometry adapts to desktop, tablet and mobile without changing flame material", () => {
  for (const [width, height] of [
    [1440, 900],
    [2560, 720],
    [390, 844],
    [390, 568],
    [768, 1024]
  ]) {
    const config = resolveFooterConfig({
      composition: resolveFooterComposition(width, height)
    });
    const layout = artworkLayout(width, height, config);
    const reach =
      ((config.visual.ringRadius + config.fire.plumeHeight) *
        layout.verticalSide) /
      height;
    assert.ok(
      width <= 767
        ? reach >= 0.25 && reach <= 0.45
        : reach >= 0.7 && reach <= 0.85,
      `${width}x${height}: nominal tips match the responsive invitation composition`
    );
    assert.ok(layout.side * config.visual.ringRadius * 2 >= width);
    assert.equal(config.fire.plumeHeight, 0.25);
    assert.equal(config.fire.baseColor, "#155BFF");
    assert.equal(config.ignition.enabled, true);
  }
});

test("phone ribbon proportions remain stable before the aurora lift", () => {
  for (const [width, height] of [
    [390, 844],
    [420, 912],
    [390, 568]
  ]) {
    const composition = resolveFooterComposition(width, height);
    const config = resolveFooterConfig({ composition });
    const layout = artworkLayout(width, height, config);
    const reach =
      (config.visual.ringRadius + config.fire.plumeHeight) *
      layout.verticalSide;
    assert.equal(
      composition.verticalScale,
      resolveFooterConfig().composition.verticalScale
    );
    assert.ok(
      reach / height >= 0.25 && reach / height <= 0.45,
      `${width}x${height}: flame stays in the lower part of the invitation`
    );
    assert.ok(layout.side * config.visual.ringRadius * 2 >= width);
    assert.equal(layout.centerY, height, "arc is anchored at the bottom");
  }
});

test("phone toolbar height changes leave the renderer configuration stable", () => {
  for (const width of [390, 420]) {
    const initial = resolveFooterComposition(width, 912);
    for (const height of [844, 780, 712, 640, 568]) {
      assert.deepEqual(resolveFooterComposition(width, height), initial);
    }
  }
});

test("footer geometry has safe fallback inputs and bounded extreme aspect ratios", () => {
  const expected = resolveFooterComposition(1440, 900);
  for (const [width, height] of [
    [0, 0],
    [-1, 900],
    [NaN, 900],
    [Infinity, 900],
    [1440, undefined],
    [null, 900],
    ["", 900]
  ]) {
    assert.deepEqual(
      resolveFooterComposition(width as number, height as number),
      expected
    );
  }
  for (const [width, height] of [
    [1, 10000],
    [10000, 1]
  ]) {
    const composition = resolveFooterComposition(width, height);
    assert.ok(
      composition.verticalScale >= 0.25 && composition.verticalScale <= 2
    );
  }
  assert.deepEqual(backdropTokens.footerComposition, {
    widthRatio: 1.2,
    heightRatio: 1.9
  });
});
