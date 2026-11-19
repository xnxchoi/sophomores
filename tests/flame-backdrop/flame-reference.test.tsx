import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FlameReference } from "@/components/Devtools/flame-reference/reference";

test("reference defaults to selected B and offers optional breathing without replacing originals", () => {
  const html = renderToStaticMarkup(createElement(FlameReference));
  assert.match(html, /value="stronger" selected=""/);
  assert.match(html, /data-render-status="loading"/);
});
