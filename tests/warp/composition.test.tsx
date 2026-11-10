import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { motionValue } from "motion/react";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { homepageSSRFixture } from "../fixtures/homepage-ssr";
import { Warp } from "@/components/Warp";
import WarpField from "@/components/Warp/warp-field";
import { stories, teaser } from "@/lib/teaser/content";
import { analogueRunwayHeightVh, chapterGeometry } from "@/lib/teaser/step-motion";
import {
  chapterExitHoldVh,
  createTimeline,
  scrollChapters
} from "@/lib/teaser/choreography";

const homepage = homepageSSRFixture();

const layoutSource = readFileSync(
  new URL("../../src/app/(site)/layout.tsx", import.meta.url),
  "utf8"
);
const studySource = readFileSync(
  new URL("../../src/components/Warp/index.tsx", import.meta.url),
  "utf8"
);
const fieldSource = readFileSync(
  new URL("../../src/components/Warp/warp-field.tsx", import.meta.url),
  "utf8"
);

test("SSR: noindex study reuses actual Hero then actual Story under teaser scope", () => {
  assert.match(
    layoutSource,
    /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/
  );
  const dom = new JSDOM(renderToStaticMarkup(<homepage.Home />));
  try {
    const main = dom.window.document.querySelector("main[data-warp-study]");
    assert.ok(main);
    assert.ok(main.classList.contains("teaser"));
    const hero = main.querySelector<HTMLElement>(
      "#hero[aria-label='Introduction']"
    );
    const story = main.querySelector("#origin[aria-label='Our story']");
    assert.ok(hero && story);
    assert.ok(
      hero.compareDocumentPosition(story) &
        dom.window.Node.DOCUMENT_POSITION_FOLLOWING
    );
    assert.equal(
      hero.style.height,
      `${chapterGeometry(createTimeline(scrollChapters.hero).travelVh, chapterExitHoldVh.hero ?? 0).heightVh}svh`
    );
    assert.equal(
      story.querySelectorAll("[data-story-card]").length,
      stories.length
    );
    assert.equal(hero.querySelector("h1") === null, true);
    const notices = hero.querySelectorAll<HTMLElement>("[data-notification]");
    assert.equal(notices.length, 2);
    assert.deepEqual(
      [...notices].map((node) => node.style.opacity),
      ["0", "0"]
    );
    assert.ok(notices[0].textContent?.includes(teaser.introduction));
    assert.ok(notices[1].textContent?.includes(teaser.notification));
    const statement = hero.querySelector("[data-hero-statement]");
    assert.ok(
      statement?.classList.contains("font-teaser-serif")
    );
    assert.ok(
      statement
        ?.querySelector(".sr-only")
        ?.textContent?.includes(teaser.headline)
    );
    assert.equal(
      main.querySelector("[data-warp-arrival-copy], [data-warp-notice]") === null,
      true
    );
  } finally {
    dom.window.close();
  }
});

test("SSR: unpositioned overlap places real Hero at prelude end and preserves Story offsets", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const prelude = dom.window.document.querySelector(
      "section[aria-label='Entry sequence']"
    );
    const handoff = dom.window.document.querySelector<HTMLElement>(
      "[data-warp-handoff]"
    );
    assert.ok(prelude && handoff);
    assert.equal(
      prelude.getAttribute("style"),
      `height:${analogueRunwayHeightVh()}svh`
    );
    assert.ok(handoff.classList.contains("-mt-[100svh]"));
    assert.ok(handoff.classList.contains("w-full"));
    for (const positioning of ["relative", "absolute", "fixed", "sticky"])
      assert.equal(handoff.classList.contains(positioning), false);
    assert.equal(handoff.style.position, "");
    assert.equal(handoff.style.opacity, "");
    assert.equal(handoff.style.visibility, "");
    assert.equal(handoff.querySelector("#hero")?.parentElement === handoff, true);
    assert.equal(handoff.querySelector("#origin")?.parentElement === handoff, true);
    assert.equal(handoff.firstElementChild?.id, "hero");
  } finally {
    dom.window.close();
  }
});

test("SSR: existing nested light field persists in a fixed group behind the sticky headline", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const scene =
      dom.window.document.querySelector<HTMLElement>("[data-warp-scene]");
    assert.ok(scene);
    const runway = scene.closest("section");
    assert.ok(runway);
    const fieldGroup = runway.children[1];
    assert.ok(fieldGroup.classList.contains("fixed"));
    assert.ok(fieldGroup.contains(scene));
    assert.equal(scene.style.opacity, "0");
    const stage = dom.window.document.querySelector(
      "section[aria-label='Entry sequence'] > div"
    );
    assert.ok(stage);
    assert.ok(stage.classList.contains("sticky"));
    assert.equal(stage.classList.contains("bg-black"), false);
  } finally {
    dom.window.close();
  }
});

test("SSR: existing headline uses hidden fixed-width characters without clipping or duplicate copy", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const headline = dom.window.document.querySelector<HTMLElement>(
      "section[aria-label='Entry sequence'] > div"
    );
    assert.ok(headline);
    assert.equal(
      dom.window.document.querySelector("[data-warp-opening-copy]") === null,
      true
    );
    assert.equal(
      headline.getAttribute("aria-label"),
      `${teaser.preludeTitleLeft} ${teaser.preludeTitleRight}`
    );
    const halves = [...headline.querySelectorAll<HTMLElement>("h2")];
    assert.equal(halves.length, 2);
    assert.ok(
      halves.every((half) =>
        half.parentElement?.classList.contains("whitespace-pre")
      )
    );
    assert.deepEqual(
      halves.map((half) => half.style.opacity),
      ["0", "0"]
    );
    assert.equal(headline.style.clipPath, "");
    const characters = [
      ...headline.querySelectorAll<HTMLElement>("[data-warp-char]")
    ];
    assert.ok(characters.length > 20);
    assert.ok(
      characters.every(
        (char) =>
          char.classList.contains("opacity-0") &&
          char.classList.contains("whitespace-pre")
      )
    );
    assert.equal(
      characters.map((char) => char.textContent).join(""),
      `${teaser.preludeTitleLeft}${teaser.preludeTitleRight}`
    );
    assert.equal(headline.querySelector("[data-warp-headline-wipe]") === null, true);
    assert.equal(
      dom.window.document.body.textContent?.includes(
        "Opening line — copy to come."
      ),
      false
    );
  } finally {
    dom.window.close();
  }
});

test("SSR: removed study transport is not reintroduced", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    assert.equal(
      dom.window.document.querySelector(
        "[data-warp-controls], aside[aria-label='Motion study controls'], input[type='range']"
      ) === null,
      true
    );
    assert.equal(
      dom.window.document.querySelectorAll(
        "section[aria-label='Entry sequence'] > div"
      ).length,
      4
    );
  } finally {
    dom.window.close();
  }
});

test("SSR: retained field accepts corona progress without readiness or browser-global leaks", () => {
  let readyCalls = 0;
  const dom = new JSDOM(
    renderToStaticMarkup(
      <WarpField
        progress={motionValue(0.76)}
        settlement={motionValue(1)}
        coronaProgress={motionValue(0)}
        opening={motionValue(1)}
        active={false}
        onReady={() => {
          readyCalls += 1;
        }}
      />
    )
  );
  try {
    assert.equal(dom.window.document.querySelectorAll("canvas").length, 1);
    assert.equal(readyCalls, 0);
    assert.equal(typeof document, "undefined");
    assert.equal(typeof window, "undefined");
  } finally {
    dom.window.close();
  }
});

test("source contract: retained renderer receives original Hero scene progress and fade", () => {
  assert.equal((fieldSource.match(/<Canvas\b/g) ?? []).length, 1);
  assert.match(
    fieldSource,
    /createFragmentShader\(\s*(?:resolveFlameConfig\(|config\))/
  );
  assert.match(studySource, /useChapterScroll\("hero"\)/);
  assert.match(
    studySource,
    /hero\.rawPosition,[\s\S]*?scrollChapters\.hero\.steps - 1/
  );
  assert.match(
    studySource,
    /useTransform\(heroProgress,\s*\[0\.7, 1\],\s*\[1, 0\]\)/
  );
  assert.match(studySource, /coronaProgress=\{coronaProgress\}/);
  assert.match(
    studySource,
    /settlement\s*=\s*useTransform\(studyFrame,\s*\(?\w+\)?\s*=>\s*\w+\.settlement\)/
  );
  assert.match(studySource, /settlement=\{settlement\}/);
  assert.match(studySource, /<Hero[\s\S]*?hideWordmark/);
  assert.doesNotMatch(studySource, /useEntry\(/);
  assert.doesNotMatch(
    studySource,
    /teaser\.headline|teaser\.introduction|teaser\.notification|captionGain|noticeOpacity/
  );
});

test("source contract: Hero and Story retain original scroll ownership and playback gating", () => {
  assert.match(studySource, /sectionRef=\{hero\.ref\}/);
  assert.match(studySource, /sectionStyle=\{hero\.sectionStyle\}/);
  assert.match(studySource, /position=\{hero\.position\}/);
  assert.match(
    studySource,
    /<Story\s+suspended=\{[^}]*current[^}]*"origin"[^}]*heroComplete/
  );
  assert.match(studySource, /entryTokens\.complete/);
  assert.match(studySource, /preludeInView\s*\|\|\s*coronaInView/);
});

test("source contract: readiness, opening and replay/interrupt cleanup remain intact", () => {
  assert.match(studySource, /onReady=\{markReady\}/);
  assert.match(studySource, /ready\.set\(1\)/);
  assert.match(
    fieldSource,
    /if \(\+\+renderedFrames\.current === 2\) onReady\(\)/
  );
  assert.match(fieldSource, /useEffect\(onReady, \[onReady\]\)/);
  assert.match(studySource, /createSequenceMappers\(sequenceDefaults\)/);
  assert.match(
    studySource,
    /sequenceMappers = useMotionValue\(initialMappers\)/
  );
  assert.match(
    studySource,
    /useTransform\(\(\)\s*=>\s*sequenceMappers\.get\(\)\.opening\(opening\.get\(\)\)\s*\)/
  );
  assert.match(
    studySource,
    /useTransform\(\(\)\s*=>\s*sequenceMappers\.get\(\)\.frame\(overallProgress\.get\(\)\)\s*\)/
  );
  assert.doesNotMatch(studySource, /headlineClip|clipPath/);
  const cleanup = studySource.match(
    /useEffect\(\s*\(\)\s*=>\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[ready\]\s*\)/
  )?.[1];
  assert.ok(cleanup);
  assert.match(cleanup, /jumpControl\.current\?\.stop\(\)/);
  assert.match(cleanup, /introControl\.current\?\.stop\(\)/);
  assert.match(cleanup, /ready\.set\(0\)/);
  for (const event of ["wheel", "touchstart", "keydown"])
    assert.match(
      studySource,
      new RegExp(`window\\.removeEventListener\\("${event}"`)
    );
  assert.doesNotMatch(
    studySource + fieldSource,
    /prefers-reduced-motion|useReducedMotion|setInterval|requestAnimationFrame/
  );
});

test("SSR: chapter notices remain unobstructed by added transport nodes", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    assert.equal(
      dom.window.document.querySelector("[data-warp-controls-location]") === null,
      true
    );
    assert.equal(
      dom.window.document.querySelectorAll("[data-notification]").length,
      2
    );
    assert.ok(studySource.includes("[body:has(&)_nextjs-portal]:hidden"));
  } finally {
    dom.window.close();
  }
});

test("SSR: existing two-line passage starts below the viewport without duplicating Hero text", () => {
  const dom = new JSDOM(renderToStaticMarkup(<Warp />));
  try {
    const passage = dom.window.document.querySelector<HTMLElement>(
      "[data-warp-passage]"
    );
    assert.ok(passage);
    assert.equal(passage.style.opacity, "0");
    assert.ok(passage.classList.contains("top-0"));
    assert.equal(passage.classList.contains("-translate-y-1/2"), false);
    assert.match(passage.style.transform, /translateY\(calc\(100svh - 0%\)\)/);
    assert.equal(
      passage.querySelectorAll("[data-warp-passage-line]").length,
      2
    );
    assert.ok(passage.textContent?.includes(teaser.warpPassageLine1));
    assert.ok(passage.textContent?.includes(teaser.warpPassageLine2));
    assert.equal(passage.textContent?.includes(teaser.headline), false);
    assert.ok(passage.querySelector(".overflow-hidden"));
  } finally {
    dom.window.close();
  }
});

test("source contract: readiness starts one scoped text-streak-page sequence independent of scroll", () => {
  const choreography = studySource
    .replace(/\s+/g, " ")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
  assert.match(choreography, /\[headlineScope, animateIntro\] = useAnimate/);
  assert.match(
    choreography,
    /\[opening, \[0, 1\], \{ at: 0, duration: draft\.openingDuration, ease: "linear" \}\]/
  );
  assert.match(
    choreography,
    /\["\[data-warp-char\]", \{ opacity: \[0, 1\] \}, \{\s*at: text\.start,\s*duration: OPENING_TIMING\.characterDuration \* stretch,\s*delay: stagger\(OPENING_TIMING\.characterStagger \* stretch\),\s*ease: text\.ease,?\s*\}\]/
  );
  assert.match(choreography, /const text = draft\.clips\.openingText/);
  assert.match(
    choreography,
    /const stretch = \(text\.end - text\.start\) \/ originalSpan/
  );
  assert.match(choreography, /defaultTransition: \{ autoplay: false \}/);
  assert.match(choreography, /control\.time = time/);
  assert.match(
    choreography,
    /if \(play && !document\.hidden\) control\.play\(\)/
  );
  const ready = studySource.match(
    /const markReady = useCallback\(\(\) => \{([\s\S]*?)\n  \},/
  )?.[1];
  assert.ok(ready);
  assert.match(ready, /if \(ready\.get\(\)\) return/);
  assert.match(ready, /ready\.set\(1\)/);
  assert.match(ready, /startIntro\(\)/);
  assert.match(
    choreography,
    /\["opening", introControl\.current\], \["scroll", jumpControl\.current\]/
  );
  assert.match(
    choreography,
    /control\.state === "paused" && playbackIntent\.current\[domain\]/
  );
  assert.match(choreography, /const replay = \(\) => \{[\s\S]*?startIntro\(\)/);
  assert.match(
    choreography,
    /const controlsOpacity = useTransform\(\(\) => introFrame\.get\(\)\.controlsOpacity \* ready\.get\(\)\)/
  );
  assert.match(
    choreography,
    /const hintOpacity = useTransform\(\(\) => controlsOpacity\.get\(\) \* headlineOpacity\.get\(\)\)/
  );
});
