"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { motionValue } from "motion/react";
import { compile } from "tailwindcss";
import { Invitation } from "@/components/teaser/narrative";
import Scene from "@/components/teaser/scene";
import {
  backdropTokens,
  resolveFooterComposition
} from "@/lib/teaser/backdrop-tokens";
import { resolveFooterConfig } from "@/components/gl/flame-backdrop/footer";
import { artworkLayout } from "@/components/gl/flame-backdrop/layout";

test("entry opacity wrapper never scales the backdrop canvas container", () => {
  const css = readFileSync(
    new URL("../../styles/teaser.css", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    css.match(/\.scene-entry\s*\{([^}]+)\}/)?.[1] ?? "",
    /transform\s*:/
  );
});

test("hero keeps the approved FlameBackdrop without the legacy orb", () => {
  const source = readFileSync(
    new URL("../../components/teaser/scene.tsx", import.meta.url),
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
    new URL("../../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /from "@\/components\/(?:gl\/)?flame-backdrop\/footer"/);
  const footerBranch = source.match(/<FlameFooterBackdrop([\s\S]*?)\/>/)?.[1];
  assert.ok(
    footerBranch,
    "contacts must select the dedicated footer component"
  );
  assert.doesNotMatch(footerBranch, /paused=|ReducedMotion/);
  assert.match(footerBranch, /visible=\{props\.active\}/);
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
    assert.match(html, /absolute/);
    assert.match(html, /inset-0/);
    assert.match(html, /h-full/);
    assert.match(html, /w-full/);
    assert.match(html, /pointer-events-none/);
    assert.doesNotMatch(html, /flame-hero-surface|transform:|<img|<video/);
  }
});

test("footer uses the shared field without the superseded ignition or material selection", () => {
  const source = readFileSync(
    new URL("../../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  const footer = source.match(/<FlameFooterBackdrop([\s\S]*?)\/>/)?.[1] ?? "";
  assert.doesNotMatch(footer, /ignition|footerMaterial|config=/);
  assert.doesNotMatch(footer, /ReducedMotion/);
});

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
    new URL("../../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(source, /!props\.footer\s*&&\s*["']hidden["']/);
});

test("footer belongs to the invitation rather than a navigation-selected fixed scene", () => {
  const source = readFileSync(
    new URL("../../components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /renderBackdrop=/);
  assert.match(source, /opacity:\s*sceneOpacity/);
  assert.doesNotMatch(source, /opacity:\s*isFooter\s*\?/);
  assert.doesNotMatch(
    source,
    /footer=\{isFooter\}/,
    "navigation chapter must not choose the footer scene's visibility"
  );
  const invitation = readFileSync(
    new URL("../../components/teaser/narrative.tsx", import.meta.url),
    "utf8"
  );
  assert.match(invitation, /useFooterPlayback\(ref\)/);
  assert.match(invitation, /renderBackdrop/);
  assert.match(invitation, /data-footer-backdrop/);
  assert.match(invitation, /overflow-clip/);
  assert.match(
    invitation,
    /\[clip-path:inset\(0\)\]/,
    "footer paint clips the fixed field without moving its viewport coordinate system"
  );
  assert.match(invitation, /fixed inset-0/);
  assert.doesNotMatch(invitation, /sticky top-0 h-svh/);
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
});

test("footer clip utility crops paint without creating a scrolling fixed-position containing block", async () => {
  const source = readFileSync(
    new URL("../../components/teaser/narrative.tsx", import.meta.url),
    "utf8"
  );
  const holder = source.match(
    /data-footer-backdrop[^>]*className="([^"]*)"/
  )?.[1];
  assert.ok(holder, "footer needs its section-local paint holder");
  const classes = holder.split(/\s+/);
  assert.ok(classes.includes("[clip-path:inset(0)]"));
  const compiler = await compile("@tailwind utilities;");
  const styles = compiler.build(classes);
  assert.match(styles, /clip-path:\s*inset\(0\)/);
  assert.doesNotMatch(
    styles,
    /(?:^|[;{])\s*(?:transform|filter|perspective|contain):/,
    "do not trap the fixed field inside a transformed scrolling containing block"
  );
});

test("footer playback prewarms 25vh before entry and pauses 25vh after exit", () => {
  const hook = readFileSync(
    new URL("../../hooks/use-footer-playback.ts", import.meta.url),
    "utf8"
  );
  assert.match(hook, /useScroll/);
  assert.match(
    hook,
    /["']start 125%["']/,
    "prewarm offset must be measured against viewport height, including portrait layouts"
  );
  assert.match(hook, /["']end -25%["']/);
  assert.match(hook, /useSyncExternalStore/);
  assert.match(
    hook,
    />\s*0\s*&&[^;\n]*<\s*1/,
    "the native render loop runs only inside the prewarm band"
  );
  assert.doesNotMatch(
    hook,
    /rootMargin|useInView|useChapterActivity|ChapterId/,
    "IO percentage margins resolve against width and nav activity is not playback authority"
  );
  const invitation = readFileSync(
    new URL("../../components/teaser/narrative.tsx", import.meta.url),
    "utf8"
  );
  assert.match(invitation, /footerPlayback\.visited/);
  assert.match(invitation, /renderBackdrop\?\.\(footerPlayback\.active\)/);
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
  const html = renderToStaticMarkup(
    createElement(Invitation, {
      onOpen: () => {},
      onActive: () => {}
    })
  );
  const classes = html
    .match(/<section[^>]*\bclass="([^"]*)"/)?.[1]
    .split(/\s+/);
  assert.ok(classes, "invitation section must render class names");
  assert.ok(classes.includes("relative"));
  const compiler = await compile("@tailwind utilities;");
  const invitation = compiler.build(classes);
  assert.doesNotMatch(
    invitation,
    /#000 65%/,
    "invitation overlay must not black out the newly tall flame"
  );
  assert.ok(
    classes.includes("bg-black/15"),
    "uniform light scrim, not a top blackout"
  );
  assert.doesNotMatch(invitation, /linear-gradient/);
  const experience = readFileSync(
    new URL("../../components/teaser/experience.tsx", import.meta.url),
    "utf8"
  );
  assert.match(experience, /fixed inset-0 z-0/);
  assert.match(experience, /<main className="[^"]*relative z-1/);
  assert.match(experience, /opacity:\s*sceneOpacity/);
  assert.equal(backdropTokens.footerOpacity, 0.85);
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

test("footer field owns resize without recreating the parent scene", () => {
  const source = readFileSync(
    new URL("../../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    source,
    /useSyncExternalStore|resolveFooterComposition\(width, height\)/
  );
  const fieldCanvasPath = existsSync(
    new URL("../../components/gl/flame-backdrop/FieldCanvas.tsx", import.meta.url)
  )
    ? "../../components/gl/flame-backdrop/FieldCanvas.tsx"
    : "../../components/flame-backdrop/FieldCanvas.tsx";
  const renderer = readFileSync(
    new URL(fieldCanvasPath, import.meta.url),
    "utf8"
  );
  assert.match(renderer, /useThree/);
  assert.doesNotMatch(renderer, /new ResizeObserver/);
});
