// The header reaches the notification inbox, whose server action loads the Payload config: map it first.
import "../fixtures/notification-action-mapping";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  capHeaderScroll,
  createLerpGuard,
  getHeaderScrollProgress,
  getNextHeaderScrubPosition,
  headerDoneAction,
  headerInnerOffsets,
  headerInnerTranslate,
  headerInternalOpacity,
  headerLogoY,
  headerRowY,
  headerSectionTranslate
} from "@/components/shell/site-header";
import { siteLayer } from "@/constants/site-layers";

// The header follows The Hideaway's scroll scrub. Tests can't import the reference folder (hideaway-boundary), so
// its constants are read from the source and its formula is rebuilt from them.
const root = resolve(import.meta.dirname, "../..");
const hideawayMotion = readFileSync(resolve(root, "src/hideaway/components/Shells/Header/headerMotion.ts"), "utf8");
const hideawayClient = readFileSync(resolve(root, "src/hideaway/components/Shells/Header/HeaderClient.tsx"), "utf8");
const header = readFileSync(resolve(root, "src/components/shell/site-header.tsx"), "utf8");

test("the scrub formula equals The Hideaway's", () => {
  const distance = Number(/HEADER_SCROLL_DISTANCE = (\d+)/.exec(hideawayMotion)?.[1]);
  const amount = Number(/amount = ([\d.]+)/.exec(hideawayMotion)?.[1]);
  assert.equal(distance, 350);
  assert.equal(amount, 0.08);
  assert.match(hideawayClient, /c > 50 \? \(tweenNumber\.current = c - 50\)/);
  const progress = (scroll: number) => Math.min(1, Math.max(0, scroll / distance));
  for (const scroll of [-50, 0, 1, 49.5, 175, 349, 350, 351, 700, 5000]) {
    assert.equal(getHeaderScrollProgress(scroll), progress(scroll));
    for (const current of [0, 0.3, 1]) {
      const lerp = (1 - amount) * current + progress(scroll) * amount;
      assert.ok(Math.abs(getNextHeaderScrubPosition({ currentScrub: current, latestScroll: scroll }) - lerp) < 1e-12);
    }
  }
  assert.match(header, /tweenNumber\.current = c > HEADER_START_OFFSET \? c - HEADER_START_OFFSET : 0/);
});

test("the footer cap still clamps from md up", () => {
  const desktop = { pageEnd: 1800, innerHeight: 800, innerWidth: 1280 };
  assert.equal(capHeaderScroll(400, desktop), 400);
  assert.equal(capHeaderScroll(1300, desktop), 1000);
  // Footerless pages end at Infinity.
  assert.equal(capHeaderScroll(1300, { ...desktop, pageEnd: Number.POSITIVE_INFINITY }), 1300);
  // Below md the footer scrolls with the page: no cap.
  assert.equal(capHeaderScroll(1300, { ...desktop, innerWidth: 767 }), 1300);
  // A page whose own content can't move the header isn't capped, so the header doesn't freeze.
  assert.equal(capHeaderScroll(300, { ...desktop, pageEnd: 840 }), 300);
});

test("leaving a page resets the hover reveal", () => {
  const bye = /const animateBye = useEffectEvent\(\(\) => \{([\s\S]*?)\n {2}\}\);/.exec(header)?.[1] ?? "";
  assert.match(bye, /clearTimeout\(hoverTimer\.current\)/);
  assert.match(bye, /setHovered\(false\)/);
  assert.match(bye, /setHeaderVisibility\(true\)/);
  assert.match(header, /if \(stage === "leaving"\) setTimeout\(animateBye, 50\)/);
});

test("the open header is a flat 249, above the menu body (248)", () => {
  assert.equal(siteLayer.headerOpen, 249);
  assert.match(header, /const zIndex = useTransform\(\(\) => \(navState\.get\(\) \? siteLayer\.headerOpen : siteLayer\.header\)\)/);
});

test("wipe, typed leave and the menu map as The Hideaway's headerDone does", () => {
  // HeaderClient.tsx:452-474: wipe first, then the open menu, then a typed leave (720 ms), else animate-to-previous.
  assert.match(hideawayClient, /if \(isWipeTransition\.get\(\)\) \{[\s\S]*?"transition-wipe"[\s\S]*?if \(navState\.get\(\)\) \{[\s\S]*?"animate-to-full"[\s\S]*?typeof transitionOutType\.get\(\) === "string"[\s\S]*?setTimeout\(enableScrollAnimation, 720\)/);
  assert.equal(headerDoneAction({ wipe: true, navOpen: true, outType: "CURTAIN" }), "transition-wipe");
  assert.equal(headerDoneAction({ wipe: false, navOpen: true, outType: "FADE" }), "animate-to-full");
  assert.equal(headerDoneAction({ wipe: false, navOpen: false, outType: "FADE" }), "typed-leave");
  assert.equal(headerDoneAction({ wipe: false, navOpen: false, outType: null }), "animate-to-previous");
  assert.match(header, /setTimeout\(enable, 720\)/);
  assert.match(header, /\}, \[open, outType, headerTransition, wipe\]\);/);
});

test("slide and fade map as The Hideaway's header transitions do", () => {
  // HeaderClient.tsx:195-232.
  assert.match(hideawayClient, /return tv !== "slide" \|\| isVisibility \? 0 : \(100 as number\);/);
  assert.match(hideawayClient, /return latestValue !== "fade" && latestValue !== "slide" && vis \? 0 \+ 1 : 0;/);
  assert.match(hideawayClient, /const ty = iss \? \(vis \? 0 : -100\) : 0;[\s\S]*?delay: iss \? 0\.4 : 0,\s*duration: iss \? 0\.4 : 0\.1/);
  for (const variant of ["slide", "fade", null] as const) {
    for (const visible of [true, false]) {
      assert.equal(headerSectionTranslate(variant, visible), variant !== "slide" || visible ? 0 : 100);
      assert.equal(headerInternalOpacity(variant, visible), variant !== "fade" && variant !== "slide" && visible ? 1 : 0);
      const iss = variant === "slide";
      assert.deepEqual(headerInnerTranslate(variant, visible), { y: iss ? (visible ? 0 : -100) : 0, delay: iss ? 0.4 : 0, duration: iss ? 0.4 : 0.1 });
    }
  }
});

test("the menu-time offsets and the mark's vertical position follow The Hideaway's formulas", () => {
  // HeaderClient.tsx:235-240 and 310-325.
  assert.match(hideawayClient, /return scft < 0 \? scft : mb \? -50 : -25 - scb \* 25;/);
  assert.match(hideawayClient, /navState\.get\(\) \? -left\.get\(\) : 0/);
  assert.match(hideawayClient, /return \(1 - progress\) \* initialInnerLeft\.get\(\);/);
  assert.match(hideawayClient, /return \(1 - progress\) \* initialInnerRight\.get\(\);/);
  for (const scrub of [0, 0.2, 0.5, 1]) {
    const early = Math.min(1, scrub / 0.4);
    assert.equal(headerLogoY(0, false, scrub), -25 - scrub * 25);
    assert.equal(headerLogoY(0, true, scrub), -50);
    assert.equal(headerLogoY(-30, false, scrub), -30);
    for (const navOpen of [true, false]) {
      assert.deepEqual(headerInnerOffsets({ navOpen, left: 10, right: 10, early, scrub }), {
        left: (1 - early) * (navOpen ? -10 : 0),
        right: (1 - scrub) * (navOpen ? -10 : 0)
      });
    }
  }
});

test("keyboard focus and the open menu (#24) win over a slide or fade", () => {
  // revealed = keyboard focus or the open menu; visible is then true too.
  for (const variant of ["slide", "fade"] as const) {
    assert.equal(headerInternalOpacity(variant, true, true), 1, `${variant} + reveal: opaque`);
    assert.equal(headerSectionTranslate(variant, true, true), 0, `${variant} + reveal: not slid`);
    assert.equal(headerRowY(-100, true), 0, `${variant} + reveal: row in place`);
  }
  // Neither trigger: The Hideaway's values.
  assert.equal(headerInternalOpacity("slide", false, false), 0);
  assert.equal(headerSectionTranslate("slide", false, false), 100);
  assert.equal(headerInternalOpacity("slide", true, false), 0);
  assert.equal(headerRowY(-100, false), -100);
  assert.match(header, /const revealed = focused \|\| open;/);
  assert.match(header, /const internalOpacity = useTransform\(\(\) => \(revealState\.get\(\) \? 1 : springOpacity\.get\(\)\)\);/);
  assert.match(header, /const sectionTranslate = useTransform\(\(\) => \(revealState\.get\(\) \? 0 : springTranslate\.get\(\)\)\);/);
});

test("starting a tween stops the lerp's scheduled writer", () => {
  const guard = createLerpGuard();
  let writes = 0;
  const lerp = guard.writer(() => writes++);
  lerp();
  assert.equal(writes, 1);
  guard.cancel(); // what stopLerp does before a tween
  lerp();
  lerp();
  assert.equal(writes, 1);
  // A newer lerp also retires the older writer.
  const older = guard.writer(() => writes++);
  const newer = guard.writer(() => writes++);
  older();
  newer();
  assert.equal(writes, 2);
  // Every tween start calls stopLerp first: the menu/typed-leave tween, the leave tween and the mount/resize tween.
  assert.match(header, /running\.current = null;\n {4}stopLerp\(\);\n {4}if \(transitionType === "transition-wipe"\) return;/);
  assert.match(header, /running\.current\?\.stop\(\);\n {4}stopLerp\(\);\n {4}running\.current = animate\(scrubPosition, 0,/);
  assert.match(header, /stopLerp\(\);\n {4}animate\(scrubPosition, \[0, target\]/);
});
