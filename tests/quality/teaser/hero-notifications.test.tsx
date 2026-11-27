import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRef } from "react";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../../fixtures/english-render";
import { motionValue } from "motion/react";
import { test } from "node:test";
import { Hero } from "@/components/teaser/hero";
import { entryTokens } from "@/lib/teaser/entry-tokens";

function render(position: number) {
  return renderToStaticMarkup(
    <Hero
      sectionRef={createRef<HTMLElement>()}
      sectionStyle={{ height: "200svh" }}
      position={motionValue(position)}
      onActive={() => {}}
    />
  );
}

function element(html: string, className: string) {
  if (className === "wordmark") {
    const tag = html.match(/<h1[^>]*>/)?.[0];
    assert.ok(tag, `element for ${className}`);
    return tag;
  }
  if (className === "hero-header") {
    const tag = html.match(/<header[^>]*>/)?.[0];
    assert.ok(tag, `element for ${className}`);
    return tag;
  }
  if (className === "wordmark-glyph") {
    const tag = html.match(/<span class="inline-block origin-center scale-\(--wordmark-scale\)"[^>]*>/)?.[0];
    assert.ok(tag, `element for ${className}`);
    return tag;
  }
  if (className === "notifications") {
    const tag = html.match(/<div class="absolute top-\[calc\(clamp[^"]*"[^>]*>/)?.[0];
    assert.ok(tag, `element for ${className}`);
    return tag;
  }
  if (className === "notification") {
    const tag = html.match(/<div\b[^>]*class="[^"]*rounded-teaser-card bg-ultramarine[^"]*"[^>]*>/)?.[0];
    assert.ok(tag, `element for ${className}`);
    return tag;
  }
  if (className === "notification notification-second") {
    const tags = [...html.matchAll(/<div\b[^>]*class="[^"]*rounded-teaser-card bg-ultramarine[^"]*"[^>]*>/g)];
    const tag = tags[1]?.[0];
    assert.ok(tag, `element for ${className}`);
    return tag;
  }
  const required = className.split(/\s+/);
  const tag = [...html.matchAll(/<[a-z][^>]*>/g)].find(([tag]) => {
    const classes = (tag.match(/\bclass="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    return required.every((name) => classes.includes(name));
  })?.[0];
  assert.ok(tag, `element for ${className}`);
  return tag;
}
function style(html: string, className: string) {
  const value = element(html, className).match(/\bstyle="([^"]*)"/)?.[1];
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
      element(firstHtml, "notifications"),
      /\bstyle=/,
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

test("top return hides both notifications until scrolling resumes", () => {
  assert.equal(style(render(0), "notification").opacity, "0");
  assert.equal(style(render(0), "notification notification-second").opacity, "0");
});

test("neither notification has an independent timed trigger", () => {
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
