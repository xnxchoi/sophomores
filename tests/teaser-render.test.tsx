import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";

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
