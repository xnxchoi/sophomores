import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ENVELOPE_PATH } from "@/components/gl/flame-backdrop/mask/profile";
import { FlameEditor as EnvelopeStudy } from "@/components/Devtools/flame-editor/flame-editor";
import { createPreviousEnvelopeMaskUrl } from "@/components/gl/flame-backdrop/mask/svg";

test("initial study renders material, with accessible mask, pause, feather and optional text controls", () => {
  const html = renderToStaticMarkup(createElement(EnvelopeStudy));
  assert.match(html, /Flame field/);
  assert.match(html, /<option value="render" selected="">Render<\/option>/);
  assert.match(html, /<option value="mask">Mask<\/option>/);
  assert.match(html, /Pause motion/);
  const renderSurface =
    html.match(/<div[^>]*data-envelope-render[^>]*>/)?.[0] ?? "";
  assert.match(renderSurface, /absolute inset-0 h-full w-full/);
  assert.doesNotMatch(renderSurface, /\bhidden(?:=|\s|>)/);
  assert.match(html, /Accepted B \+ breathing reference/);
  assert.match(
    html,
    /aria-label="Edge smoothing"[^>]*type="range"[^>]*min="0"[^>]*max="2"[^>]*step="0.01"/
  );
  assert.match(html, /Show text/);
  assert.match(html, /aria-pressed="false"/);
  const source = readFileSync(
    new URL(
      "../../../src/components/Devtools/flame-editor/flame-editor.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.doesNotMatch(source, /Hide text/);
  assert.match(
    source,
    /data-sample-text\s+className="[^"]*relative[^"]*sm:fixed/
  );
  assert.doesNotMatch(html, /For Those Who Have Been Somewhere/);
  const mask = "/masks/flame-envelope.png";
  assert.ok(html.includes(`data-mask-source="${mask}"`));
  assert.doesNotMatch(html.match(/<canvas[^>]*>/)?.[0] ?? "", /mask-image:/);
  const debugMask = html.match(/<div[^>]*data-envelope-mask[^>]*>/)?.[0] ?? "";
  assert.match(debugMask, /bg-white/);
  assert.match(debugMask, /mask-mode:alpha/);
  assert.ok(debugMask.includes(`mask-image:url(&quot;${mask}&quot;)`));
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /Saved mask image/);
  assert.match(html, /Procedural editor/);
  assert.match(html, /accept="image\/png,image\/svg\+xml"/);
  assert.match(
    html,
    /<button[^>]*aria-label="Choose mask file"[^>]*class="(?=[^"]*text-white)(?=[^"]*tracking-normal)[^>]*>Choose file<\/button>/
  );
  assert.match(
    html,
    /data-mask-filename[^>]*class="(?=[^"]*break-all)(?=[^"]*tracking-normal)[^>]*>No file selected<\/span>/
  );
  assert.doesNotMatch(html.match(/<header[^>]*>/)?.[0] ?? "", /bg-black/);
});

test("previous fade remains available while new controls describe contour-wide fading", () => {
  const html = renderToStaticMarkup(createElement(EnvelopeStudy));
  const svg = decodeURIComponent(createPreviousEnvelopeMaskUrl(1440, 900));
  assert.match(
    svg,
    /<feGaussianBlur[^>]*\/>[\s\S]*<feComponentTransfer><feFuncA type="gamma" amplitude="1" exponent="2.2" offset="0"/
  );
  assert.doesNotMatch(svg, /feFunc[RGB]| opacity=|filter="opacity/);
  assert.match(
    html,
    /aria-label="Center falloff"[^>]*type="range"[^>]*min="1"[^>]*max="4"[^>]*step="0.01"[^>]*value="1.2"/
  );
  assert.match(
    html,
    /<button[^>]*aria-pressed="false"[^>]*>Show before<\/button>/
  );
  assert.match(html, /Saved mask image — 1.39% smoothing \/ 1.20 falloff/);
  assert.equal(
    createHash("sha256").update(ENVELOPE_PATH).digest("hex"),
    "e43f22b0db22ea5b208d19671cba9dc5a045e4de366af783a5823d3e6b2ad08b"
  );
});

test("study stays isolated from canonical renderer and global styles", () => {
  for (const path of [
    "src/components/Devtools/flame-editor/flame-editor.tsx",
    "src/components/gl/flame-backdrop/mask/profile.ts"
  ]) {
    const source = readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(
      source,
      /from ['"][^'"]*(?:historical-renderer|flame-backdrop\/renderer|motion)/
    );
    assert.doesNotMatch(
      source,
      /requestAnimationFrame|\.css['"]|filter:\s*['"]blur/
    );
  }
});
