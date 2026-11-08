import assert from "node:assert/strict";
import { createRef } from "react";
import test from "node:test";
import { JSDOM } from "jsdom";
import { motionValue } from "motion/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Hero } from "@/components/teaser/hero";
import { entryTokens } from "@/lib/teaser/entry-tokens";
import { teaser } from "@/lib/teaser/content";

test("Hero hides only its wordmark when explicitly requested; default markup is unchanged", () => {
  for (const progress of [0, 1, 2, 2.65, 3]) {
    const entry = {
      dock: motionValue<number>(entryTokens.complete.dock),
      backdrop: motionValue<number>(entryTokens.complete.backdrop),
      layout: motionValue<number>(entryTokens.complete.layout),
      scale: motionValue<number>(entryTokens.complete.scale),
      glyph: motionValue<number>(entryTokens.complete.glyph),
    };
    const props = { sectionRef: createRef<HTMLElement>(), sectionStyle: { height: "444svh" },
      position: motionValue(progress), entry, onActive: () => {} };
    const normal = new JSDOM(renderToStaticMarkup(<Hero {...props} />));
    const hidden = new JSDOM(renderToStaticMarkup(<Hero {...props} hideWordmark />));
    try {
      assert.ok(normal.window.document.querySelector("h1[aria-label='sophomores']"));
      assert.equal(hidden.window.document.querySelector("h1"), null);
      normal.window.document.querySelector("h1")?.remove();
      assert.equal(hidden.window.document.querySelector("#hero")?.outerHTML,
        normal.window.document.querySelector("#hero")?.outerHTML,
        `wordmark is the sole markup change at hero position ${progress}`);
      assert.equal(hidden.window.document.querySelectorAll("[data-notification]").length, 2);
      assert.ok(hidden.window.document.body.textContent?.includes(teaser.introduction));
      assert.ok(hidden.window.document.body.textContent?.includes(teaser.notification));
      assert.ok(hidden.window.document.querySelector("[data-hero-statement]")?.classList.contains("font-teaser-serif"));
    } finally { normal.window.close(); hidden.window.close(); }
  }
});

test("existing Hero notification positions remain zero, first, then both", () => {
  for (const [progress, expected] of [[0, ["0", "0"]], [1, ["1", "0"]], [2, ["1", "1"]]] as const) {
    const entry = {
      dock: motionValue(1), backdrop: motionValue(1), layout: motionValue(1),
      scale: motionValue(1), glyph: motionValue(1),
    };
    const dom = new JSDOM(renderToStaticMarkup(<Hero sectionRef={createRef<HTMLElement>()}
      sectionStyle={{ height: "444svh" }} position={motionValue<number>(progress)} entry={entry}
      onActive={() => {}} hideWordmark />));
    try {
      assert.deepEqual([...dom.window.document.querySelectorAll<HTMLElement>("[data-notification]")].map(node => node.style.opacity), expected);
    } finally { dom.window.close(); }
  }
});
