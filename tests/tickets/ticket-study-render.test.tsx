import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TicketStudy } from "../../components/tickets/ticket-study";

test("ticket study starts with unknown price, honest status, and bounded controls", () => {
  const html = renderToStaticMarkup(<TicketStudy />);
  assert.match(html, /Local interaction study\. No tickets are on sale here\./);
  assert.match(html, /Price to be announced/);
  assert.match(html, /1 ticket/);
  assert.match(html, /Demo range: 1–6/);
  assert.match(html, /aria-label="Remove one ticket" disabled=""/);
  assert.match(html, /aria-label="Add one ticket"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /href="\/studies\/invitation"/);
  assert.match(html, /href="\/studies\/warp"/);
  assert.match(html, /Watch reference clip/);
  assert.match(html, /<dialog/);
  assert.match(
    html,
    /Analogue reference clip · local comparison only · not a Sophomores film/
  );
  assert.doesNotMatch(html, /href="\/studies\/invitation#film-study"/);
  assert.doesNotMatch(html, /<form|<video|Buy now|Reserve|checked=""/);
});

test("server rendering stays deterministic and content is not hidden behind animation", () => {
  const first = renderToStaticMarkup(<TicketStudy />);
  assert.equal(first, renderToStaticMarkup(<TicketStudy />));
  assert.doesNotMatch(first, /opacity:0(?:;|")/);
});

test("ticket study has no transmission, checkout or animation library other than Motion", () => {
  const source = readFileSync(
    new URL("../../components/tickets/ticket-study.tsx", import.meta.url),
    "utf8"
  );
  assert.match(source, /motion\/react/);
  assert.doesNotMatch(source, /ReducedMotion/);
  assert.doesNotMatch(source, /\buseReducedMotion\b/);
  assert.match(source, /@phosphor-icons\/react/);
  assert.doesNotMatch(source, /<svg|<circle|<path/);
  assert.match(source, /TEST PRICE — NOT AN OFFER/);
  assert.doesNotMatch(
    source,
    /\b(fetch|localStorage|sessionStorage|gsap|framer-motion)\b/
  );
});
