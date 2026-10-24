"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { motionValue } from "motion/react";
import { compile } from "tailwindcss";
import { Invitation } from "../components/teaser/narrative";
import Scene from "../components/teaser/scene";
import {
  backdropTokens,
  resolveFooterComposition
} from "../lib/teaser/backdrop-tokens";
import { resolveFooterConfig } from "../components/flame-backdrop/footer";
import { artworkLayout } from "../components/flame-backdrop/layout";

test("entry opacity wrapper never scales the backdrop canvas container", () => {
  const css = readFileSync(
    new URL("../styles/teaser.css", import.meta.url),
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

test("contacts renders a full-viewport decorative aurora beneath the content", () => {
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
  assert.doesNotMatch(footerBranch, /paused=|ReducedMotion/);
  assert.match(
    footerBranch,
    /visible=\{Boolean\(props\.footer && props\.active\)\}/
  );
  assert.equal(backdropTokens.footerMaterial, "aurora");
  assert.equal(backdropTokens.footerEntrySeconds, 3.6);
  assert.doesNotMatch(
    footerBranch,
    /palette=|viewportActivation=|viewportThreshold=/,
    "preserve the approved footer art and first-entry ignition defaults"
  );

    for (const active of [false, true]) {
      const html = renderToStaticMarkup(
        createElement(Scene, {
          progress: motionValue(1),
          entryScale: motionValue(0.77),
          active,
          footer: true
        })
      );
      assert.match(html, /data-flame-backdrop/);
      assert.match(html, /aria-hidden="true"/);
      assert.match(html, /position:absolute/);
      assert.match(html, /bottom:0/);
      assert.match(html, /height:100%/);
      assert.match(html, /width:100%/);
      assert.match(html, /pointer-events:none/);
      assert.doesNotMatch(html, /flame-hero-surface|transform:|<img|<video/);
  }
});

test("footer uses the shared field without the superseded ignition or material selection", () => {
  const source = readFileSync(new URL("../components/teaser/scene.tsx", import.meta.url), "utf8");
  const footer = source.match(/<FlameFooterBackdrop([\s\S]*?)\/>/)?.[1] ?? "";
  assert.doesNotMatch(footer, /ignition|footerMaterial|config=/);
  assert.doesNotMatch(footer, /ReducedMotion/);
});

test("footer is lazily retained after contacts so active-time breathing survives chapter changes", () => {
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

test("shared ribbon layout remains while invitation scrim allows the lifted field", async () => {
  const config = resolveFooterConfig({
    composition: resolveFooterComposition(1440, 900)
  });
  const tall = artworkLayout(1440, 900, config);
  const previous = artworkLayout(1440, 580, resolveFooterConfig());
  assert.ok(
    tall.side * config.visual.ringRadius * 2 >= 1440,
    "footer arc must span the viewport width"
  );
  assert.ok(
    tall.verticalSide > previous.verticalSide * 1.3,
    "actual flame geometry must grow, not just its canvas host"
  );
  const tipY =
    tall.centerY -
    (config.visual.ringRadius + config.fire.plumeHeight) * tall.verticalSide;
  assert.ok(
    tipY <= 220,
    "flame tips reach the desktop invitation heading region"
  );
  const html = renderToStaticMarkup(createElement(Invitation, {
    onOpen: () => {},
    onActive: () => {}
  }));
  const classes = html.match(/<section[^>]*\bclass="([^"]*)"/)?.[1].split(/\s+/);
  assert.ok(classes, "invitation section must render class names");
  assert.ok(classes.includes("invitation-section"));
  const compiler = await compile("@tailwind utilities;");
  const invitation = compiler.build(classes);
  assert.doesNotMatch(
    invitation,
    /#000 65%/,
    "invitation overlay must not black out the newly tall flame"
  );
  assert.ok(classes.includes("bg-black/15"), "uniform light scrim, not a top blackout");
  assert.doesNotMatch(invitation, /linear-gradient/);
  const experience = readFileSync(new URL("../components/teaser/experience.tsx", import.meta.url), "utf8");
  assert.match(experience, /fixed inset-0 z-0/);
  assert.match(experience, /<main className="[^"]*relative z-1/);
  assert.match(experience, /isFooter\s*\? backdropTokens\.footerOpacity/);
  assert.equal(backdropTokens.footerOpacity, .85);
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
      width <= 767 ? reach >= 0.25 && reach <= 0.45 : reach >= 0.7 && reach <= 0.85,
      `${width}x${height}: nominal tips match the responsive invitation composition`
    );
    assert.ok(layout.side * config.visual.ringRadius * 2 >= width);
    assert.equal(config.fire.plumeHeight, 0.25);
    assert.equal(config.fire.baseColor, "#155BFF");
    assert.equal(config.ignition.enabled, true);
  }
});

test("phone ribbon proportions remain stable before the aurora lift", () => {
  for (const [width, height] of [[390, 844], [420, 912], [390, 568]]) {
    const composition = resolveFooterComposition(width, height);
    const config = resolveFooterConfig({ composition });
    const layout = artworkLayout(width, height, config);
    const reach = (config.visual.ringRadius + config.fire.plumeHeight) * layout.verticalSide;
    assert.equal(composition.verticalScale, resolveFooterConfig().composition.verticalScale);
    assert.ok(reach / height >= 0.25 && reach / height <= 0.45,
      `${width}x${height}: flame stays in the lower part of the invitation`);
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

test("footer field owns resize without recreating the parent scene", () => {
  const source = readFileSync(new URL("../components/teaser/scene.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /useSyncExternalStore|resolveFooterComposition\(width, height\)/);
  const renderer = readFileSync(new URL("../components/flame-backdrop/field/renderer.ts", import.meta.url), "utf8");
  assert.match(renderer, /new ResizeObserver\(resize\)/);
});
