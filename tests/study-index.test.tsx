import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import StudyIndex from "../app/studies/page";

test("study index exposes all experiments with an honest local-only boundary", () => {
  const html = renderToStaticMarkup(<StudyIndex />);
  for (const route of ["intro", "tickets", "invitation"]) {
    assert.ok(html.includes(`href="/studies/${route}"`));
  }
  assert.match(html, /No registration or purchase/);
});
