import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { scrollSmoothing } from "@/lib/motion-tokens";

const studySource = readFileSync(
  new URL("../../../src/components/Warp/index.tsx", import.meta.url),
  "utf8"
)
  // Source wiring is insensitive to formatter whitespace and numeric spelling.
  .replace(/\s+/g, " ")
  .replace(/\b0\.(\d+)/g, ".$1")
  .replace(/\(\s+/g, "(")
  .replace(/\s+\)/g, ")")
  .replace(/,\s*\)/g, ")")
  .replace(/\((\w+)\)\s*=>/g, "$1 =>");

// These contracts check library wiring, not physical wheel feel or browser timing.
test("source contract: Warp borrows the site-wide Lenis and restores it", () => {
  // One scroller per page: a second root Lenis fought SiteScroll and snapped
  // the page forward mid-warp.
  assert.match(studySource, /import \{ useLenis \} from "lenis\/react"/);
  assert.doesNotMatch(studySource, /ReactLenis/);
  assert.match(
    studySource,
    /import\s*\{\s*scrollSmoothing\s*\}\s*from\s*"@\/lib\/motion-tokens"/
  );
  assert.match(studySource, /const WARP_WHEEL_GAIN = \.45;/);
  // The slower wheel and smoothing belong to the warp intro only; after the
  // handoff the Hero and chapters scroll at the site's normal speed.
  assert.match(studySource, /if \(!lenis \|\| afterWarp\) return;/);
  assert.match(studySource, /\}, \[lenis, afterWarp\]\);/);
  assert.match(studySource, /lenis\.options\.lerp = scrollSmoothing\.lerp \?\? lerp;/);
  assert.match(studySource, /data\.deltaY \*= WARP_WHEEL_GAIN;/);
  assert.match(
    studySource,
    /return \(\) => \{ lenis\.options\.lerp = lerp; lenis\.options\.virtualScroll = virtualScroll; \};/
  );
  assert.equal(scrollSmoothing.lerp, 0.16);
  assert.equal(scrollSmoothing.syncTouch, false);
  assert.equal(scrollSmoothing.respectReducedMotion, false);
  assert.equal(scrollSmoothing.wheelMultiplier, undefined);
});

test("source contract: extra runway provides distance, not input latency", () => {
  assert.match(studySource, /analogueRunwayHeightVh\(\)/);
  assert.doesNotMatch(studySource, /h-\[600svh\]/);
});

test("source contract: retained tour seek uses Lenis with native startup fallback", () => {
  assert.match(studySource, /const lenis = useLenis\(\)/);
  const seek = studySource.match(
    /const seek = \(value: number\) => \{([\s\S]*?)\};/
  )?.[1];
  assert.ok(seek);
  assert.match(seek, /if \(!runway\.current \|\| !hero\.ref\.current\) return/);
  assert.match(seek, /value <= HANDOFF/);
  assert.match(seek, /travel \* \(value \/ HANDOFF\)/);
  assert.match(
    seek,
    /heroTravel \* heroGeometry\.motionEnd \* \(\(value - HANDOFF\) \/ \.3\)/
  );
  assert.match(
    seek,
    /if \(lenis\) lenis\.scrollTo\(target, \{ immediate: true, force: true \}\)/
  );
  assert.match(
    seek,
    /else window\.scrollTo\(\{ top: target, behavior: "instant" \}\)/
  );
  assert.match(studySource, /onUpdate: time => seek\(tourProgress\(time\)\)/);
});

test("source contract: overall progress includes original Hero, while tour stops at its zero", () => {
  assert.match(studySource, /const overallProgress = useTransform\(/);
  assert.match(
    studySource,
    /prelude < 1 \? prelude \* HANDOFF : HANDOFF \+ corona \* \.3/
  );
  assert.match(
    studySource,
    /chapterGeometry\((?:hero\.timeline|heroTimeline)\.travelVh, chapterExitHoldVh\.hero\)/
  );
  assert.match(studySource, /overallProgress\.get\(\) >= HANDOFF/);
  assert.doesNotMatch(studySource, /openingControl|duration: 5/);
  assert.match(studySource, /useTransform\(\(\) => sequenceMappers\.get\(\)\.opening\(opening\.get\(\)\)\)/);
  assert.match(studySource, /useTransform\(\(\) => sequenceMappers\.get\(\)\.frame\(overallProgress\.get\(\)\)\)/);
  assert.match(studySource, /onReady=\{markReady\}/);
});

test("source contract: wheel still interrupts playback without custom trapping or frame loops", () => {
  assert.match(
    studySource,
    /const interrupt = \(event\?: Event\) => \{[\s\S]*?closest\("\[data-warp-controls\]"\)[\s\S]*?jumpControl\.current\?\.stop\(\);[\s\S]*?jumpControl\.current = null;[\s\S]*?setPlaying\(false\);/
  );
  assert.match(
    studySource,
    /window\.addEventListener\("wheel", interrupt, \{ passive: true \}\)/
  );
  for (const event of ["wheel", "touchstart", "keydown"]) {
    assert.match(
      studySource,
      new RegExp(`window\\.removeEventListener\\("${event}"`)
    );
  }
  assert.doesNotMatch(
    studySource,
    /preventDefault|requestAnimationFrame|\.raf\(|wheelDelta|touchMultiplier/
  );
  // The only wheel delta handling is Lenis's documented virtualScroll hook,
  // which scales the shared scroller's wheel input while Warp is mounted.
  assert.deepEqual(studySource.match(/deltaY/g), ["deltaY"]);
  assert.match(studySource, /lenis\.options\.virtualScroll = data => \{ if \(data\.event\.type\.includes\("wheel"\)\)/);
});
