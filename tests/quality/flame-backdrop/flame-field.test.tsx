import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FlameFooterBackdrop } from "@/components/gl/flame-backdrop/FlameFooterBackdrop";

const source = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

test("footer and durable editor share image-backed runtime without production study dependencies", () => {
  for (const file of ["renderer", "shader", "texture", "material"]) {
    assert.doesNotMatch(
      source(`src/components/gl/flame-backdrop/field/${file}.ts`),
      /from ['"][^'"]*(?:studies|devtools|teaser)/
    );
  }
  const footer = source("src/components/gl/flame-backdrop/FlameFooterBackdrop.tsx");
  const editor = source("src/components/Devtools/flame-editor/flame-editor.tsx");
  for (const text of [footer, editor])
    assert.match(text, /from ['"][^'"]*FieldCanvas['"]/);
  assert.doesNotMatch(footer, /<FlameBackdrop|footerMaterial/);
  assert.match(footer, /<FieldCanvas\s+ignition\b/);
  assert.doesNotMatch(editor, /<FieldCanvas\s+ignition\b/);
  assert.match(footer, /visible=\{visible\}/);
  assert.doesNotMatch(footer, /ReducedMotion/);
  assert.match(footer, /maskSource=\{maskSource\}/);
  const html = renderToStaticMarkup(
    createElement(FlameFooterBackdrop, {
      maskSource: "/masks/custom.svg",
      paused: true
    })
  );
  assert.match(html, /data-flame-backdrop/);
  assert.match(html, /data-flame-field/);
  assert.match(html, /aria-hidden="true"/);
  assert.doesNotMatch(html, /<video|<img/);
  const renderer = source("src/components/gl/flame-backdrop/FieldCanvas.tsx");
  assert.match(renderer, /canPlayField/);
  assert.match(renderer, /advanceFieldTime/);
});
