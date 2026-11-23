// The header reaches the notification inbox, whose server action loads the Payload config: map it first.
import "../fixtures/notification-action-mapping";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { capHeaderScroll, getHeaderScrollProgress, getNextHeaderScrubPosition } from "@/components/shell/site-header";

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
