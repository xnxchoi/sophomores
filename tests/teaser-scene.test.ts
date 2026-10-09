"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { motionValue } from "motion/react";
import Scene from "../components/teaser/scene";

test("entry opacity wrapper never scales the backdrop canvas container", () => {
  const css = readFileSync(
    new URL("../app/teaser.css", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    css.match(/\.scene-entry\s*\{([^}]+)\}/)?.[1] ?? "",
    /transform\s*:/
  );
});

test("hero uses the approved FlameBackdrop; experimental flame footer stays unwired", () => {
  const source = readFileSync(
    new URL("../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /FlameBackdrop/);
  assert.doesNotMatch(source, /FlameFooterBackdrop/);
  assert.match(source, /footer-orb/);
  assert.doesNotMatch(source, /@react-three|ShaderMaterial|useFrame/);
  for (const footer of [false]) {
    const html = renderToStaticMarkup(
      createElement(Scene, {
        progress: motionValue(0),
        entryScale: motionValue(0.77),
        reducedMotion: true,
        active: true,
        footer
      })
    );
    assert.match(html, /data-flame-backdrop/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /height:100%/);
    assert.doesNotMatch(html, /scale\(0\.77\)/);
  }
});
