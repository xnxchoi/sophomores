import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../../fixtures/english-render";
import { createRef } from "react";
import { motionValue } from "motion/react";
import { Hero } from "@/components/teaser/hero";
import { entryTokens } from "@/lib/teaser/entry-tokens";

test("invitation and ticket studies return to the current Warp entry route", () => {
  assert.ok(existsSync(new URL("../../../src/app/(site)/page.tsx", import.meta.url)));
  for (const path of ["invitation/experience.tsx", "tickets/ticket-study.tsx"]) {
    const source = readFileSync(new URL(`../../../src/components/${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\/studies\/intro/, "The retired intro route cannot remain a navigation target");
    assert.match(source, /href="\/studies\/warp"/);
  }
  const invitation = readFileSync(new URL("../../../src/components/invitation/experience.tsx", import.meta.url), "utf8");
  assert.match(invitation, /onExit=\{\(\) => router\.push\("\/studies\/warp"\)\}/);
});

test("notification-free return retains the completed wordmark layout", () => {
  const render = (pose: Record<keyof typeof entryTokens.initial, number>) =>
    renderToStaticMarkup(
      <Hero
        sectionRef={createRef<HTMLElement>()}
        sectionStyle={{ height: "200svh" }}
        position={motionValue(0)}
        entry={{
          dock: motionValue(pose.dock),
          backdrop: motionValue(pose.backdrop),
          layout: motionValue(pose.layout),
          scale: motionValue(pose.scale),
          glyph: motionValue(pose.glyph)
        }}
        onActive={() => {}}
      />
    );
  const complete = render(entryTokens.complete);
  const clean = render(entryTokens.complete);
  assert.equal(
    clean.match(/<h1[\s\S]*?<\/h1>/)?.[0],
    complete.match(/<h1[\s\S]*?<\/h1>/)?.[0]
  );
  for (const html of [clean, complete]) {
    const elements = [...html.matchAll(/<[a-z][^>]*>/g)].map(([tag]) => tag);
    const hasClass = (tag: string, name: string) =>
      (tag.match(/\bclass="([^"]*)"/)?.[1] ?? "").split(/\s+/).includes(name);
    const notifications = elements.find((tag) => hasClass(tag, "md:w-(--notification-width)"));
    assert.ok(notifications);
    assert.doesNotMatch(notifications, /\bstyle=/);
    const cards = elements.filter((tag) => hasClass(tag, "bg-ultramarine"));
    assert.equal(cards.length, 2);
    for (const card of cards) assert.match(card, /style="[^"]*opacity:0;/);
  }
});
