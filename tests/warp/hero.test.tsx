import assert from "node:assert/strict";
import { createRef } from "react";
import test from "node:test";
import { JSDOM } from "jsdom";
import { motionValue } from "motion/react";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { Hero } from "@/components/teaser/hero";
import { teaser } from "@/lib/teaser/content";

// Owner, 27 Nov: "kill the motherfucker off the hero section". The hero renders no mark at any position.
test("Hero renders no logo or wordmark heading at any position; its notifications and statement remain", () => {
  for (const progress of [0, 1, 2, 2.65, 3]) {
    const dom = new JSDOM(renderToStaticMarkup(<Hero sectionRef={createRef<HTMLElement>()} sectionStyle={{ height: "444svh" }}
      position={motionValue(progress)} onActive={() => {}} />));
    try {
      const doc = dom.window.document;
      assert.equal(doc.querySelector("h1, [data-brand-mark]") === null, true, `no mark at ${progress}`);
      assert.equal(doc.querySelectorAll("[data-notification]").length, 2);
      assert.equal(doc.body.textContent?.includes(teaser.introduction), true);
      assert.equal(doc.body.textContent?.includes(teaser.notification), true);
      assert.equal(doc.querySelector("[data-hero-statement]")?.classList.contains("font-teaser-serif"), true);
    } finally { dom.window.close(); }
  }
});

test("existing Hero notification positions remain zero, first, then both", () => {
  for (const [progress, expected] of [[0, ["0", "0"]], [1, ["1", "0"]], [2, ["1", "1"]]] as const) {
    const dom = new JSDOM(renderToStaticMarkup(<Hero sectionRef={createRef<HTMLElement>()}
      sectionStyle={{ height: "444svh" }} position={motionValue<number>(progress)}
      onActive={() => {}} />));
    try {
      assert.deepEqual([...dom.window.document.querySelectorAll<HTMLElement>("[data-notification]")].map(node => node.style.opacity), expected);
    } finally { dom.window.close(); }
  }
});
