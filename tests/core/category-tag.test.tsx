import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CategoryTag } from "@/components/core/CategoryTag/CategoryTag";

test("CategoryTag renders its label as an outlined pill and passes span props through", () => {
  const html = renderToStaticMarkup(<CategoryTag className="mt-2" title="Category">Essays</CategoryTag>);
  assert.match(html, /^<span class="[^"]*rounded-\[20px\][^"]*border-current[^"]*mt-2[^"]*" title="Category">Essays<\/span>$/);
});
