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
import { chapterGeometry } from "@/lib/teaser/step-motion";
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
