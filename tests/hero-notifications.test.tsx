import assert from "node:assert/strict";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { motionValue } from "motion/react";
import { test } from "node:test";
import { Hero } from "../components/teaser/hero";
import { entryTokens } from "../lib/teaser/entry-tokens";

function render(position: number, still = false) {
  return renderToStaticMarkup(
    <Hero
      sectionRef={createRef<HTMLElement>()}
      sectionStyle={{ height: "200svh" }}
      position={motionValue(position)}
      entry={{
        dock: motionValue(1),
        backdrop: motionValue(1),
        layout: motionValue(1),
        scale: motionValue(1),
        glyph: motionValue(1)
      }}
      still={still}
      onActive={() => {}}
    />
  );
}
function style(html: string, className: string) {
  const value = html.match(
    new RegExp(`class="${className}" style="([^"]*)"`)
  )?.[1];
  assert.ok(value !== undefined, `style for ${className}`);
  return Object.fromEntries(
    value
      .split(";")
      .filter(Boolean)
      .map((pair) => pair.split(":"))
  );
}

test("first and second notification surfaces share opacity and scale at equal progress", () => {
  for (const progress of [0, 0.25, 0.5, 1]) {
    const firstHtml = render(progress);
    const secondHtml = render(1 + progress);
    const first = style(firstHtml, "notification");
    const second = style(secondHtml, "notification notification-second");
    assert.equal(Number(first.opacity), progress);
    assert.doesNotMatch(
      firstHtml,
      /class="notifications" style=/,
      "no timed parent opacity compounds either fade"
    );
    assert.equal(Number(second.opacity), progress);
    assert.equal(first.transform, second.transform);
    assert.equal(first["transform-origin"], second["transform-origin"]);
    assert.equal(first["transform-origin"], "50% 50%");
    const scale =
      first.transform === "none"
        ? 1
        : Number(first.transform?.match(/scale\(([^)]+)\)/)?.[1]);
    assert.ok(Math.abs(scale - (0.85 + 0.15 * progress)) < 1e-12);
  }
});

test("still mode settles both notifications while animated top return hides both", () => {
  const still = render(0, true);
  assert.equal(style(still, "notification").opacity, "1");
  assert.equal(style(still, "notification").transform, "none");
  assert.equal(
    style(still, "notification notification-second").transform,
    "none"
  );
  assert.equal(style(still, "notification notification-second").opacity, "1");
  assert.equal(style(render(0), "notification").opacity, "0");
  assert.equal(
    style(render(0), "notification notification-second").opacity,
    "0"
  );
});

test("neither notification has an independent timed trigger or retimes the wordmark layout", () => {
  assert.equal("notification" in entryTokens, false);
  assert.equal("notification" in entryTokens.initial, false);
  assert.deepEqual(entryTokens.layout, { delay: 3, duration: 0.5 });
});

test("the hero holds blank, first card, both cards, then fades the header for the statement", () => {
  for (const position of [0, 0.25, 0.5, 1, 1.25, 1.5, 2, 3]) {
    const html = render(position);
    assert.equal(
      Number(style(html, "notification").opacity),
      Math.max(0, Math.min(1, position))
    );
    assert.equal(
      Number(style(html, "notification notification-second").opacity),
      Math.max(0, Math.min(1, position - 1))
    );
    assert.equal(
      Number(style(html, "hero-header").opacity),
      position <= 2 ? 1 : 0
    );
  }
});
