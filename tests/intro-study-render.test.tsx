import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { IntroStudy } from "../components/intro-study/intro-study";

test("intro SSR is readable, honest, and cannot preload remote reference footage", () => {
  const html = renderToStaticMarkup(<IntroStudy />);
  assert.match(html, /Experienced\.<br\/>Not finished\./);
  assert.match(html, /A private social club/);
  assert.match(html, /The beginning/);
  assert.match(html, /Reference light footage/);
  assert.match(html, /local study only/);
  assert.match(html, /placement and copy provisional/);
  assert.match(html, /href="#intro-first-section"/);
  assert.match(html, /href="\/studies\/invitation"/);
  assert.match(html, /href="\/studies\/tickets"/);
  assert.match(html, /Use current Sophomores light/);
  assert.match(html, /Pause motion/);
  assert.ok(!html.includes("<video"));
  assert.ok(!html.includes("framerusercontent"));
  assert.ok(!html.includes("<iframe"));
});
