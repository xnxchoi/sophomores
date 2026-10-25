import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { motionValue } from "motion/react";
import { Hero } from "../components/teaser/hero";
import { TicketStudy } from "../components/tickets/ticket-study";
import Link from "next/link";
import { BrandMark } from "../lib/brand";
import { entryTokens } from "../lib/teaser/entry-tokens";

test("the shared brandmark component preserves semantics and prioritizes Helvetica", () => {
  assert.match(
    renderToStaticMarkup(<BrandMark>sophomores</BrandMark>),
    /<span class="!font-\[Helvetica,Arial,sans-serif\]">sophomores<\/span>/
  );
  const mark = renderToStaticMarkup(
    <BrandMark asChild>
      <Link href="/" aria-label="Home" className="text-xl">
        sophomores
      </Link>
    </BrandMark>
  );
  assert.match(mark, /^<a[^>]+>sophomores<\/a>$/);
  assert.match(mark, /href="\/"/);
  assert.match(mark, /aria-label="Home"/);
  assert.match(mark, /class="!font-\[Helvetica,Arial,sans-serif\] text-xl"/);
});

test("all non-phone visual brandmarks reuse the component rather than class strings", () => {
  for (const path of [
    "teaser/hero.tsx",
    "invitation/experience.tsx",
    "tickets/ticket-study.tsx"
  ]) {
    const source = readFileSync(
      new URL(`../components/${path}`, import.meta.url),
      "utf8"
    );
    assert.match(
      source,
      /import \{ BrandMark \} from ["'][^"']*lib\/brand["']/
    );
    assert.match(source, /<BrandMark(?: asChild)?>/);
    assert.doesNotMatch(source, /brandMarkFont/);
  }
});

test("rendered hero and study marks share Helvetica without replacing editorial type", () => {
  const hero = renderToStaticMarkup(
    <Hero
      sectionRef={createRef<HTMLElement>()}
      sectionStyle={{ height: "200svh" }}
      position={motionValue(0)}
      entry={{
        dock: motionValue<number>(entryTokens.complete.dock),
        backdrop: motionValue<number>(entryTokens.complete.backdrop),
        layout: motionValue<number>(entryTokens.complete.layout),
        scale: motionValue<number>(entryTokens.complete.scale),
        glyph: motionValue<number>(entryTokens.complete.glyph)
      }}
      onActive={() => {}}
    />
  );
  const marks = [
    hero.match(/<h1[^>]*>/)?.[0],
    renderToStaticMarkup(<TicketStudy />).match(
      /<a[^>]*aria-label="Sophomores — back to intro study"[^>]*>/
    )?.[0]
  ];
  for (const mark of marks) {
    assert.ok(mark, "expected the rendered visual brandmark");
    assert.ok(
      mark.includes("!font-[Helvetica,Arial,sans-serif]"),
      "brandmark must use the canonical Helvetica utility"
    );
  }
  assert.match(hero, /hero-statement[^>]*font-teaser-serif/);
});
