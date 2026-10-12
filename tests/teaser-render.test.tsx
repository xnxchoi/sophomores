import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createRef } from "react";
import { motionValue } from "motion/react";
import Home from "../app/page";
import { Hero } from "../components/teaser/hero";
import { entryTokens } from "../lib/teaser/entry-tokens";

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
        still={false}
        onActive={() => {}}
      />
    );
  const complete = render(entryTokens.complete);
  const clean = render(entryTokens.clean);
  assert.equal(
    clean.match(/<h1[\s\S]*?<\/h1>/)?.[0],
    complete.match(/<h1[\s\S]*?<\/h1>/)?.[0]
  );
  for (const html of [clean, complete]) {
    assert.doesNotMatch(html, /class="notifications" style=/);
    assert.match(html, /class="notification" style="[^"]*opacity:0;/);
    assert.match(
      html,
      /class="notification notification-second" style="[^"]*opacity:0;/
    );
  }
});

test("production omits exploration hint and global motion chrome", () => {
  const html = renderToStaticMarkup(<Home />);
  assert.doesNotMatch(
    html,
    /scene-hint|Move to explore|motion-toggle|Pause motion/
  );
  assert.match(html, /story-playback/);
  assert.match(html, /<nav[^>]*style="[^"]*visibility:hidden/);
});

test("server render preserves narrative and includes a no-script experience", () => {
  const html = renderToStaticMarkup(<Home />);
  for (const id of ["hero", "origin", "how", "strategy", "people", "contacts"])
    assert.ok(html.includes(`id="${id}"`));
  assert.match(html, /<noscript>/);
  assert.match(html, /static-fallback.css/);
  assert.match(html, /aria-labelledby="invitation-dialog-heading"/);
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.ok(!html.includes("<form"));
});
