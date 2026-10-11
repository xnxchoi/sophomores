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

test("hero keeps the approved FlameBackdrop without the legacy orb", () => {
  const source = readFileSync(
    new URL("../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /FlameBackdrop/);
  assert.doesNotMatch(source, /footer-orb|FooterOrb/);
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

test("contacts renders the approved decorative flame footer at the viewport bottom", () => {
  const source = readFileSync(
    new URL("../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /from "@\/components\/flame-backdrop\/footer"/);
  const footerBranch = source.match(/<FlameFooterBackdrop([\s\S]*?)\/>/)?.[1];
  assert.ok(
    footerBranch,
    "contacts must select the dedicated footer component"
  );
  assert.match(footerBranch, /paused=\{props\.reducedMotion\}/);
  assert.match(
    footerBranch,
    /visible=\{Boolean\(props\.footer && props\.active\)\}/
  );
  assert.match(footerBranch, /respectReducedMotion/);
  assert.doesNotMatch(
    footerBranch,
    /palette=|viewportActivation=|viewportThreshold=/,
    "preserve the approved footer art and first-entry ignition defaults"
  );

  for (const reducedMotion of [false, true]) {
    for (const active of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(Scene, {
          progress: motionValue(1),
          entryScale: motionValue(0.77),
          reducedMotion,
          active,
          footer: true
        })
      );
      assert.match(html, /data-flame-backdrop/);
      assert.match(html, /aria-hidden="true"/);
      assert.match(html, /position:absolute/);
      assert.match(html, /bottom:0/);
      assert.match(html, /height:clamp\(300px, 42vw, 580px\)/);
      assert.match(html, /pointer-events:none/);
      assert.doesNotMatch(html, /flame-hero-surface|transform:|<img|<video/);
    }
  }
});

test("app still mode settles footer ignition without changing the animated preset", () => {
  const source = readFileSync(
    new URL("../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    source,
    /config=\{\s*props\.reducedMotion \? \{ ignition: \{ enabled: false \} \} : undefined\s*\}/
  );
});

test("footer is lazily retained after contacts so once-only ignition survives chapter changes", () => {
  const source = readFileSync(
    new URL("../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    source,
    /const \[footerVisited, setFooterVisited\] = useState\(false\)/
  );
  assert.match(
    source,
    /if \(props\.footer && !footerVisited\) setFooterVisited\(true\)/
  );
  assert.match(source, /footerVisited && \([\s\S]*?<FlameFooterBackdrop/);
  assert.match(source, /display: props\.footer \? undefined : "none"/);
  const html = renderToStaticMarkup(
    createElement(Scene, {
      progress: motionValue(0),
      reducedMotion: false,
      active: true,
      footer: false
    })
  );
  assert.equal(
    (html.match(/data-flame-backdrop/g) ?? []).length,
    1,
    "initial hero must not allocate a footer renderer"
  );
  assert.doesNotMatch(html, /height:clamp/);
});
