import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { homepageSSRFixture } from "../fixtures/homepage-ssr";
import { getPayload } from "../fixtures/homepage-ssr-boundary";
import messages from "../../messages/en.json";

const homepage = homepageSSRFixture();

test("real homepage SSR renders Warp and seller Suspense fallback without external providers", async () => {
  const before = homepage.readAttempts();
  for (let render = 0; render < 2; render += 1) {
    const html = renderToStaticMarkup(<homepage.Home />);
    assert.match(html, /data-warp-study/);
    for (const id of ["hero", "origin", "strategy", "people", "contacts"])
      assert.ok(html.includes(`id="${id}"`));
    // Seller facts, support and policy links live in the site footer since 56d75fcd; the homepage's
    // seller section renders only published facts, and nothing while they load.
    assert.equal(html.includes(messages.Interface.seller.unavailable), false);
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

test("production omits exploration hint and global motion chrome", () => {
  const html = renderToStaticMarkup(<homepage.Home />);
  assert.doesNotMatch(
    html,
    /scene-hint|Move to explore|motion-toggle|Pause motion/
  );
  assert.match(html, /story-playback/);
  assert.doesNotMatch(html, /chapter-nav|desktop-chapters|mobile-chapters/,
    "the chapter nav mounts only after the Warp handoff, never in server HTML");
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
