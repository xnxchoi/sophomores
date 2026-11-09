import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createRef } from "react";
import { motionValue } from "motion/react";
import { homepageSSRFixture } from "../fixtures/homepage-ssr";
import { getPayload } from "../fixtures/homepage-ssr-boundary";
import { Hero } from "@/components/teaser/hero";
import { entryTokens } from "@/lib/teaser/entry-tokens";

const homepage = homepageSSRFixture();

test("real homepage SSR renders Warp and seller Suspense fallback without providers", async () => {
  const before = homepage.readAttempts();
  for (let render = 0; render < 2; render += 1) {
    const html = renderToStaticMarkup(<homepage.Home />);
    assert.match(html, /data-warp-study/);
    for (const id of ["hero", "origin", "strategy", "people", "contacts"])
      assert.ok(html.includes(`id="${id}"`));
    assert.match(html, /판매자 정보가 아직 공개되지 않았습니다/);
    for (const href of ["/terms", "/privacy", "/refund"])
      assert.ok(html.includes(`href="${href}"`));
  }
  await Promise.resolve();
  const after = homepage.readAttempts();
  assert.ok(after.connections > before.connections, "The real async disclosure reaches the request boundary");
  assert.equal(after.payload, before.payload, "Pending connection must never initialize Payload");
  assert.equal(after.transport, 0);
});

test("homepage fixture hard-rejects Payload initialization before any provider can run", () => {
  const before = homepage.readAttempts();
  assert.throws(() => getPayload(), /forbids Payload\/provider access/);
  assert.equal(homepage.readAttempts().payload, before.payload + 1);
  assert.equal(homepage.readAttempts().transport, 0);
});

test("invitation and ticket studies return to the current Warp entry route", () => {
  assert.ok(existsSync(new URL("../../src/app/(site)/page.tsx", import.meta.url)));
  for (const path of ["invitation/experience.tsx", "tickets/ticket-study.tsx"]) {
    const source = readFileSync(new URL(`../../src/components/${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\/studies\/intro/, "The retired intro route cannot remain a navigation target");
    assert.match(source, /href="\/studies\/warp"/);
  }
  const invitation = readFileSync(new URL("../../src/components/invitation/experience.tsx", import.meta.url), "utf8");
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
    const cards = elements.filter((tag) => hasClass(tag, "bg-teaser-notice"));
    assert.equal(cards.length, 2);
    for (const card of cards) assert.match(card, /style="[^"]*opacity:0;/);
  }
});

test("production omits exploration hint and global motion chrome", () => {
  const html = renderToStaticMarkup(<homepage.Home />);
  assert.doesNotMatch(
    html,
    /scene-hint|Move to explore|motion-toggle|Pause motion/
  );
  assert.match(html, /story-playback/);
  assert.doesNotMatch(html, /chapter-nav|desktop-chapters|mobile-chapters/,
    "Warp retains the user's hierarchy rather than restoring the legacy navigation");
});

test("server render preserves narrative and includes a no-script experience", () => {
  const html = renderToStaticMarkup(<homepage.Home />);
  for (const id of ["hero", "origin", "strategy", "people", "contacts"])
    assert.ok(html.includes(`id="${id}"`));
  assert.ok(!html.includes('id="how"'));
  assert.match(html, /<noscript>/);
  assert.match(html, /aria-labelledby="invitation-dialog-heading"/);
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 0,
    "Warp intentionally omits the original animated wordmark");
  const entry = html.match(/<section[^>]*aria-label="Entry sequence"[\s\S]*?<\/section>/)?.[0];
  assert.ok(entry);
  assert.equal((entry.match(/<h2[ >]/g) ?? []).length, 2,
    "Preserve the user's two headline halves rather than inserting a new heading");
  assert.ok(!html.includes("<form"));
});
