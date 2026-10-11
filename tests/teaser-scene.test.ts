"use client";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { motionValue } from "motion/react";
import Scene, { subscribeViewport } from "../components/teaser/scene";
import {
  backdropTokens,
  resolveFooterComposition
} from "../lib/teaser/backdrop-tokens";
import { resolveFooterConfig } from "../components/flame-backdrop/footer";
import { artworkLayout } from "../components/flame-backdrop/layout";

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
      assert.match(html, /height:100%/);
      assert.match(html, /width:100%/);
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
    /config=\{\s*\{\s*composition: footerComposition,\s*\.\.\.\(props\.reducedMotion \? \{ ignition: \{ enabled: false \} \} : \{\}\)\s*\}\s*\}/
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

test("footer composition spans the viewport and raises the flame toward the invitation heading", () => {
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
  const css = readFileSync(
    new URL("../app/teaser.css", import.meta.url),
    "utf8"
  );
  const invitation = css.match(/\.invitation-section\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.doesNotMatch(
    invitation,
    /#000 65%/,
    "invitation overlay must not black out the newly tall flame"
  );
  assert.match(invitation, /linear-gradient/);
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
      reach >= 0.7 && reach <= 0.85,
      `${width}x${height}: nominal tips reach heading band`
    );
    assert.ok(layout.side * config.visual.ringRadius * 2 >= width);
    assert.equal(config.fire.plumeHeight, 0.25);
    assert.equal(config.fire.baseColor, "#155BFF");
    assert.equal(config.ignition.enabled, true);
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

test("footer viewport subscription is SSR safe and cleans up resize observation", () => {
  const source = readFileSync(
    new URL("../components/teaser/scene.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /useSyncExternalStore/);
  assert.match(source, /window\.addEventListener\("resize", onResize\)/);
  assert.match(source, /window\.removeEventListener\("resize", onResize\)/);
  assert.match(source, /\(\) => "1440:900"/);
  assert.match(source, /resolveFooterComposition\(width, height\)/);
});

test("viewport resize waits for the final drag event and cancels pending work on cleanup", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const target = new EventTarget();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: target
  });
  let notifications = 0;
  let cleanup: (() => void) | undefined;
  try {
    cleanup = subscribeViewport(() => {
      notifications += 1;
    });
    target.dispatchEvent(new Event("resize"));
    t.mock.timers.tick(100);
    assert.equal(
      notifications,
      0,
      "do not rebuild the renderer during an active resize drag"
    );
    target.dispatchEvent(new Event("resize"));
    t.mock.timers.tick(100);
    assert.equal(notifications, 0, "each event postpones the geometry update");
    t.mock.timers.tick(50);
    assert.equal(
      notifications,
      1,
      "settled resize triggers exactly one update"
    );
    target.dispatchEvent(new Event("resize"));
    cleanup();
    t.mock.timers.tick(1000);
    assert.equal(notifications, 1, "cleanup cancels the pending timer");
    target.dispatchEvent(new Event("resize"));
    t.mock.timers.tick(1000);
    assert.equal(notifications, 1, "cleanup removes the resize listener");
  } finally {
    cleanup?.();
    if (previousWindow)
      Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    t.mock.timers.reset();
  }
});
