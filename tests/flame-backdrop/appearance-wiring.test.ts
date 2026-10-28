import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FLAME_APPEARANCE } from "@/components/gl/flame-backdrop/appearance";
import {
  CENTER_FADE,
  EDGE_FALLOFF,
  FEATHER
} from "@/components/gl/flame-backdrop/mask/profile";
import { DEFAULT_MASK_URL } from "@/components/gl/flame-backdrop/field/parameters";
import { FIELD_VISIBILITY } from "@/components/gl/flame-backdrop/field/visibility";
import { createMaskTextureSession } from "@/components/gl/flame-backdrop/field/texture";
import { backdropTokens } from "../../lib/teaser/backdrop-tokens";
import {
  ASSET_SIZE,
  createMaskAssetSvg,
  createIllustratorSourceSvg
} from "../../scripts/flame-envelope-assets";
import { DataTexture } from "three";

const before = JSON.parse(
  readFileSync(
    new URL("./fixtures/appearance/mask-before.json", import.meta.url),
    "utf8"
  )
);

test("mask defaults and export dimensions have one owner without rebuilding the shipped PNG", () => {
  assert.equal(DEFAULT_MASK_URL, FLAME_APPEARANCE.mask.url);
  assert.deepEqual(ASSET_SIZE, {
    width: FLAME_APPEARANCE.mask.exportWidth,
    height: FLAME_APPEARANCE.mask.exportHeight
  });
  assert.equal(CENTER_FADE.smoothing, FLAME_APPEARANCE.mask.smoothing);
  assert.equal(CENTER_FADE.exponent, FLAME_APPEARANCE.mask.falloff);
  assert.equal(CENTER_FADE.centerLift, FLAME_APPEARANCE.mask.centerLift);
  assert.equal(EDGE_FALLOFF.min, FLAME_APPEARANCE.mask.minFalloff);
  assert.equal(EDGE_FALLOFF.max, FLAME_APPEARANCE.mask.maxFalloff);
  assert.deepEqual(CENTER_FADE, before.centerFade);
  for (const [name, value] of [
    [
      "maskSha256",
      readFileSync(
        new URL("../../public/masks/flame-envelope.png", import.meta.url)
      )
    ],
    ["maskSvgSha256", createMaskAssetSvg()],
    ["illustratorSvgSha256", createIllustratorSourceSvg()]
  ] as const)
    assert.equal(
      createHash("sha256").update(value).digest("hex"),
      before[name]
    );
});

test("runtime mask sampling consumes the centralized rendering settings", () => {
  const image = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  const session = createMaskTextureSession({
    onChange() {},
    onError() {},
    load(_url, ready) {
      ready(image);
      return image;
    }
  });
  session.setSource("/mask.png");
  assert.equal(image.minFilter, FLAME_APPEARANCE.rendering.maskMinFilter);
  assert.equal(image.magFilter, FLAME_APPEARANCE.rendering.maskMagFilter);
  assert.equal(
    image.generateMipmaps,
    FLAME_APPEARANCE.rendering.generateMipmaps
  );
  session.destroy();
});

test("presentation and inactive experiments are catalogued without activating them", () => {
  assert.equal(
    backdropTokens.footerVerticalStretch,
    FLAME_APPEARANCE.presentation.verticalStretch
  );
  assert.equal(
    backdropTokens.footerOpacity,
    FLAME_APPEARANCE.legacy.footerOpacity
  );
  assert.equal(
    FIELD_VISIBILITY.softnessScale,
    FLAME_APPEARANCE.legacy.visibilitySoftnessScale
  );
  assert.equal(
    FIELD_VISIBILITY.brightnessGain,
    FLAME_APPEARANCE.legacy.visibilityBrightnessGain
  );
  assert.equal(FEATHER.default, FLAME_APPEARANCE.legacy.beforeFeather);
  assert.equal(EDGE_FALLOFF.default, FLAME_APPEARANCE.legacy.beforeFalloff);
  const canvas = readFileSync(
    new URL("../../components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url),
    "utf8"
  );
  assert.match(canvas, /FLAME_APPEARANCE\.rendering/);
  assert.doesNotMatch(canvas, /resolveVisibleFieldConfig|FIELD_VISIBILITY/);
  const scene = readFileSync(
    new URL("../../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(scene, /footerOpacity/);
});
