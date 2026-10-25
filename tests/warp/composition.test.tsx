import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { motionValue } from "motion/react";
import { renderToStaticMarkup } from "react-dom/server";
import WarpStudyPage, { metadata } from "../../app/(site)/studies/warp/page";
import { WarpStudy } from "../../app/(site)/studies/warp/warp-study";
import WarpField from "../../app/(site)/studies/warp/warp-field";
import { stories, teaser } from "../../lib/teaser/content";

const studySource = readFileSync(new URL("../../app/(site)/studies/warp/warp-study.tsx", import.meta.url), "utf8");
const fieldSource = readFileSync(new URL("../../app/(site)/studies/warp/warp-field.tsx", import.meta.url), "utf8");

test("SSR: noindex study reuses actual Hero then actual Story under teaser scope", () => {
  assert.deepEqual(metadata.robots, { index: false, follow: false });
  const dom = new JSDOM(renderToStaticMarkup(<WarpStudyPage />));
  try {
    const main = dom.window.document.querySelector("main[data-warp-study]");
    assert.ok(main);
    assert.ok(main.classList.contains("teaser"));
    const hero = main.querySelector<HTMLElement>("#hero[aria-label='Introduction']");
    const story = main.querySelector("#origin[aria-label='Our story']");
    assert.ok(hero && story);
    assert.ok(hero.compareDocumentPosition(story) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(hero.style.height, "444svh");
    assert.equal(story.querySelectorAll("[data-story-card]").length, stories.length);
    assert.equal(hero.querySelector("h1"), null);
    const notices = hero.querySelectorAll<HTMLElement>(".notification");
    assert.equal(notices.length, 2);
    assert.deepEqual([...notices].map(node => node.style.opacity), ["0", "0"]);
    assert.ok(notices[0].textContent?.includes(teaser.introduction));
    assert.ok(notices[1].textContent?.includes(teaser.notification));
    assert.ok(hero.querySelector(".hero-statement")?.classList.contains("font-teaser-serif"));
    assert.ok(hero.querySelector(".hero-statement .sr-only")?.textContent?.includes(teaser.headline));
    assert.equal(main.querySelector("[data-warp-arrival-copy], [data-warp-notice]"), null);
  } finally { dom.window.close(); }
});

test("SSR: unpositioned overlap places real Hero at prelude end and preserves Story offsets", () => {
  const dom = new JSDOM(renderToStaticMarkup(<WarpStudy />));
  try {
    const prelude = dom.window.document.querySelector("section[aria-label='Entry sequence']");
    const handoff = dom.window.document.querySelector<HTMLElement>("[data-warp-handoff]");
    assert.ok(prelude && handoff);
    assert.ok(prelude.classList.contains("h-[500svh]"));
    assert.ok(handoff.classList.contains("-mt-[100svh]"));
    for (const positioning of ["relative", "absolute", "fixed", "sticky"]) assert.equal(handoff.classList.contains(positioning), false);
    assert.equal(handoff.style.position, "");
    assert.equal(handoff.style.opacity, "");
    assert.equal(handoff.style.visibility, "");
    assert.equal(handoff.querySelector("#hero")?.parentElement, handoff);
    assert.equal(handoff.querySelector("#origin")?.parentElement, handoff);
    assert.equal(handoff.firstElementChild?.id, "hero");
  } finally { dom.window.close(); }
});

test("SSR: fixed light field persists outside transparent sticky prelude", () => {
  const dom = new JSDOM(renderToStaticMarkup(<WarpStudy />));
  try {
    const scene = dom.window.document.querySelector<HTMLElement>("[data-warp-scene]");
    assert.ok(scene);
    assert.ok(scene.classList.contains("fixed"));
    assert.equal(scene.closest("section"), null);
    assert.equal(scene.style.opacity, "0");
    const stage = dom.window.document.querySelector("section[aria-label='Entry sequence'] > div");
    assert.ok(stage);
    assert.ok(stage.classList.contains("sticky"));
    assert.equal(stage.classList.contains("bg-black"), false);
  } finally { dom.window.close(); }
});

test("SSR: existing headline uses hidden fixed-width characters without clipping or duplicate copy", () => {
  const dom = new JSDOM(renderToStaticMarkup(<WarpStudy />));
  try {
    const headline = dom.window.document.querySelector<HTMLElement>("section[aria-label='Entry sequence'] h1");
    assert.ok(headline);
    assert.equal(dom.window.document.querySelector("[data-warp-opening-copy]"), null);
    assert.equal(headline.getAttribute("aria-label"), stories[3].title);
    assert.ok(headline.classList.contains("whitespace-nowrap"));
    assert.equal(headline.querySelectorAll("span[aria-hidden='true']").length, 2);
    assert.equal(headline.style.opacity, "0");
    assert.equal(headline.style.clipPath, "");
    const characters = [...headline.querySelectorAll<HTMLElement>("[data-warp-char]")];
    assert.ok(characters.length > 20);
    assert.ok(characters.every(char => char.classList.contains("opacity-0") && char.classList.contains("whitespace-pre")));
    assert.equal(characters.map(char => char.textContent).join(""), stories[3].title.replace(". ", "."));
    assert.equal(headline.querySelector("[data-warp-headline-wipe]"), null);
    assert.equal(dom.window.document.body.textContent?.includes("Opening line — copy to come."), false);
  } finally { dom.window.close(); }
});

test("SSR: replay and warp-only controls are semantic and initially hidden", () => {
  const dom = new JSDOM(renderToStaticMarkup(<WarpStudy />));
  try {
    const controls = dom.window.document.querySelector<HTMLElement>("aside[aria-label='Motion study controls']");
    assert.ok(controls);
    assert.equal(controls.style.visibility, "hidden");
    const buttons = [...controls.querySelectorAll("button")];
    assert.deepEqual(buttons.map(button => button.textContent), ["Replay", "Play jump"]);
    assert.ok(buttons.every(button => button.type === "button"));
    assert.equal(buttons[1].getAttribute("aria-pressed"), "false");
    const slider = controls.querySelector<HTMLInputElement>("input[aria-label='Transition progress']");
    assert.ok(slider);
    assert.deepEqual([slider.type, slider.min, slider.max, slider.value], ["range", "0", "100", "0"]);
  } finally { dom.window.close(); }
});

test("SSR: retained field accepts corona progress without readiness or browser-global leaks", () => {
  let readyCalls = 0;
  const dom = new JSDOM(renderToStaticMarkup(<WarpField progress={motionValue(0.76)} settlement={motionValue(1)} coronaProgress={motionValue(0)}
    opening={motionValue(1)} active={false} onReady={() => { readyCalls += 1; }} />));
  try {
    assert.equal(dom.window.document.querySelectorAll("canvas").length, 1);
    assert.equal(readyCalls, 0);
    assert.equal(typeof document, "undefined");
    assert.equal(typeof window, "undefined");
  } finally { dom.window.close(); }
});

test("source contract: retained renderer receives original Hero scene progress and fade", () => {
  assert.equal((fieldSource.match(/<Canvas\b/g) ?? []).length, 1);
  assert.match(fieldSource, /createFragmentShader\(\s*resolveFlameConfig\(/);
  assert.match(studySource, /useChapterScroll\("hero"\)/);
  assert.match(studySource, /hero\.rawPosition,[\s\S]*?scrollChapters\.hero\.steps - 1/);
  assert.match(studySource, /useTransform\(coronaProgress,\s*\[0\.7, 1\],\s*\[1, 0\]\)/);
  assert.match(studySource, /coronaProgress=\{coronaProgress\}/);
  assert.match(studySource, /settlement\s*=\s*useTransform\(studyFrame,\s*\w+\s*=>\s*\w+\.settlement\)/);
  assert.match(studySource, /settlement=\{settlement\}/);
  assert.match(studySource, /<Hero[\s\S]*?hideWordmark/);
  assert.doesNotMatch(studySource, /useEntry\(/);
  assert.doesNotMatch(studySource, /teaser\.headline|teaser\.introduction|teaser\.notification|captionGain|noticeOpacity/);
});

test("source contract: Hero and Story retain original scroll ownership and playback gating", () => {
  assert.match(studySource, /sectionRef=\{hero\.ref\}/);
  assert.match(studySource, /sectionStyle=\{hero\.sectionStyle\}/);
  assert.match(studySource, /position=\{hero\.position\}/);
  assert.match(studySource, /<Story\s+suspended=\{[^}]*current[^}]*"origin"[^}]*heroComplete/);
  assert.match(studySource, /entryTokens\.complete/);
  assert.match(studySource, /preludeInView\s*\|\|\s*coronaInView/);
});

test("source contract: readiness, opening and replay/interrupt cleanup remain intact", () => {
  assert.match(studySource, /onReady=\{markReady\}/);
  assert.match(studySource, /ready\.set\(1\)/);
  assert.match(fieldSource, /if \(\+\+renderedFrames\.current === 2\) onReady\(\)/);
  assert.match(fieldSource, /useEffect\(onReady, \[onReady\]\)/);
  assert.match(studySource, /useTransform\(opening,\s*getOpeningFrame\)/);
  assert.match(studySource, /useTransform\(overallProgress,\s*getStudyFrame\)/);
  assert.doesNotMatch(studySource, /headlineClip|clipPath/);
  const cleanup = studySource.match(/useEffect\(\s*\(\)\s*=>\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[ready\]\s*\)/)?.[1];
  assert.ok(cleanup);
  assert.match(cleanup, /jumpControl\.current\?\.stop\(\)/);
  assert.match(cleanup, /introControl\.current\?\.stop\(\)/);
  assert.match(cleanup, /ready\.set\(0\)/);
  for (const event of ["wheel", "touchstart", "keydown"]) assert.match(studySource, new RegExp(`window\\.removeEventListener\\("${event}"`));
  assert.doesNotMatch(studySource + fieldSource, /prefers-reduced-motion|useReducedMotion|setInterval|requestAnimationFrame/);
});

test("source contract: completed warp inspector stays bottom-left away from real notices", () => {
  assert.match(studySource, /data-warp-controls-location=\{atCorona \? "bottom-left" : "top"\}/);
  assert.ok(studySource.includes("bottom-[max(12px,env(safe-area-inset-bottom))] left-3"));
  assert.ok(studySource.includes("[body:has(&)_nextjs-portal]:hidden"));
});


test("SSR: separate two-line passage is initially hidden above center without duplicating Hero text", () => {
  const dom = new JSDOM(renderToStaticMarkup(<WarpStudy />));
  try {
    const passage = dom.window.document.querySelector<HTMLElement>("[data-warp-passage]");
    assert.ok(passage);
    assert.equal(passage.style.opacity, "0");
    assert.ok(passage.classList.contains("top-[31svh]"));
    assert.equal(passage.querySelectorAll("[data-warp-passage-line]").length, 2);
    assert.equal(passage.textContent?.trim().split(/\s+/).length, 10);
    assert.ok(passage.textContent?.includes("Lorem ipsum"));
    assert.equal(passage.textContent?.includes(teaser.headline), false);
    assert.ok(passage.querySelector(".overflow-hidden"));
  } finally { dom.window.close(); }
});


test("source contract: readiness starts one scoped text-streak-page sequence independent of scroll", () => {
  assert.match(studySource, /\[headlineScope, animateIntro\] = useAnimate/);
  assert.match(studySource, /\[opening, 1, \{ at: 0, duration: OPENING_TIMING\.duration, ease: "linear" \}\]/);
  assert.match(studySource, /\["\[data-warp-char\]", \{ opacity: \[0, 1\] \}, \{\s*at: OPENING_TIMING\.textStart,\s*duration: OPENING_TIMING\.characterDuration,\s*delay: stagger\(OPENING_TIMING\.characterStagger\),\s*ease: "easeInOut",?\s*\}\]/);
  const ready = studySource.match(/const markReady = useCallback\(\(\) => \{([\s\S]*?)\n  \},/)?.[1];
  assert.ok(ready);
  assert.match(ready, /if \(ready\.get\(\)\) return/);
  assert.match(ready, /ready\.set\(1\)/);
  assert.match(ready, /startIntro\(\)/);
  assert.match(studySource, /\[introControl\.current, jumpControl\.current\]/);
  assert.match(studySource, /const replay = \(\) => \{[\s\S]*?startIntro\(\)/);
  assert.match(studySource, /const controlsOpacity = useTransform\(\(\) => introFrame\.get\(\)\.controlsOpacity \* ready\.get\(\)\)/);
  assert.match(studySource, /const hintOpacity = useTransform\(\(\) => controlsOpacity\.get\(\) \* headlineOpacity\.get\(\)\)/);
});
