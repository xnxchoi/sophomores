import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasGrain } from "@/components/gl/canvas-grain";
import { SharedCanvas } from "@/components/gl/shared-canvas";
import { HAStoreProvider } from "@/providers/RP_Pro";

// The Hideaway's site grain (`estate.scss:161-171`) rides the one shared canvas layer (owner, 2026-11-16).

const root = resolve(import.meta.dirname, "../..");
const grains = (html: string) =>
  html.match(/<span[^>]*data-grain=""[^>]*>/g) ?? [];

test("the shared canvas layer carries one grain above the canvas", () => {
  const html = renderToStaticMarkup(
    <HAStoreProvider>
      <SharedCanvas eventSource={{ current: null }} />
    </HAStoreProvider>
  );
  const found = grains(html);
  assert.equal(found.length, 1);
  assert.ok(
    html.indexOf("data-grain") > html.indexOf("<canvas"),
    "the grain paints after the canvas"
  );
  const grain = found[0] ?? "";
  for (const utility of [
    "pointer-events-none",
    "absolute",
    "inset-0",
    "z-1",
    "bg-[url(/assets/noise.png)]",
    "bg-size-[160px_160px]",
    "mask-[url(/assets/noise.png)]",
    "mask-size-[160px_160px]",
    "mix-blend-saturation"
  ])
    assert.ok(grain.includes(utility), utility);
  assert.match(grain, /aria-hidden="true"/);
});

test("with the canvas gone the grain keeps a fixed, non-interactive layer of its own", () => {
  const grain =
    grains(renderToStaticMarkup(<CanvasGrain standalone />))[0] ?? "";
  for (const utility of [
    "fixed",
    "pointer-events-none",
    "inset-0",
    "z-1",
    "mix-blend-normal"
  ])
    assert.ok(
      grain.split('"').some((part) => part.split(" ").includes(utility)),
      utility
    );
  assert.equal(grain.includes("mix-blend-saturation"), false);
  assert.equal(/\babsolute\b/.test(grain), false);
});

test("the site frame falls back to the standalone grain", () => {
  const frame = readFileSync(
    resolve(root, "src/app/(site)/client-layout.tsx"),
    "utf8"
  );
  assert.match(
    frame,
    /<CanvasBoundary fallback=\{<CanvasGrain standalone \/>\}>/
  );
});

// Brought over byte for byte from The Hideaway's public/assets (read 2026-11-16).
const assets = {
  "assets/noise.png":
    "c0cda2212046c2ba929cf1f9107425f155d89e8d92672b84d977ef9a7e26cb04",
  "assets/papier.png":
    "95591af64bab30ebc0df0ea0bc7feca8516f8db5e9d331d3ccc5a62ccf25bea4",
  "assets/notch@2x.png":
    "e1c3aece17a708ae8794ee170246a79b5ec26a0bd92f2d5c92e764718c7a01c3",
  "assets/lottie-dark.lottie":
    "7f3ae632c4e81540da96924b9d2d7404d10ddc89458fd46ace95f1aff3169f0c",
  "assets/lottie-light.lottie":
    "2886837b22ede014c1a7a95c4e5272cb4298d3924a430074a784f00fb2a30e90",
  "assets/icons/estate-icons.svg":
    "402ddc93c225582f9b880fa5facc0a05b36807502ccbfd33ae9d6edbf0ba26cb",
  "assets/notch.png": "da9475ab5b37394f84c18c27f488dd14860d6cf72e7acb647f5dda52fca1c60e",
  "assets/textures/photograph/672a4022c04412b253b0af22_card-2_back@2x.png":
    "2d8977e402fff356374890614eee1260eb07dc08f8c32bca83554fdbd596772e",
  "assets/textures/photograph/card-2_front-clear@2x.png":
    "ef8e7d2593ceb6dbb9532b42d00d7e0d361bbee1c5e6f88ffa9a6d0e134f9f1b",
  "assets/textures/photograph/card-4_back-2@2x.png":
    "ab0bc5be5156f41801621eae48f58e4382c97a7a8b561868a66fc20f2cef6995",
  "assets/textures/photograph/card-4_front-clear@2x.png":
    "83deb83b401bbb3340a717cfc0d212f3c9b339267b6230bb6e7d8f5f8ff16e80"
} as const;

for (const [path, sha256] of Object.entries(assets)) {
  test(`public/${path} is The Hideaway's file`, () => {
    const bytes = readFileSync(resolve(root, "public", path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
  });
}
