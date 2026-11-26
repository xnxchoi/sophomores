import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Starliner } from "@/components/sections/starliner";

const html = renderToStaticMarkup(<Starliner className="my-8" />);

test("Starliner renders its field, backdrop and 17 lines, and takes a className", () => {
  assert.match(html, /my-8/);
  assert.equal((html.match(/data-starline=""/g) ?? []).length, 17);
  assert.match(html, /bg-\[url\(\/assets\/starliner-backdrop\.svg\)\]/);
});

test("Starliner stands alone: no legacy stylesheet classes and no inline backdrop styles", () => {
  // Every class it uses is a Tailwind utility, so it renders the same off the reading pages and without sphmrs.scss.
  for (const legacy of ["starliner-field", "port-star-tail", "port-star-head", 'class="starline', "--port-shade"]) {
    assert.equal(html.includes(legacy), false, legacy);
  }
  assert.equal(/style="[^"]*background/.test(html), false, "backdrop styles are utilities, not inline styles");
  const stylesheet = readFileSync("src/styles/sphmrs.scss", "utf8");
  for (const rule of [".starliner-field", ".port-star-tail", ".port-star-head"]) assert.equal(stylesheet.includes(rule), false, rule);
});

test("the stars read one global token with a literal fallback, so they stay light on any page", () => {
  // --white is the palette's Titanium (sophomores-palette.css), defined on every page.
  assert.match(html, /\[--starliner-star:var\(--white\)\]/);
  assert.match(html, /oklch\(from_var\(--starliner-star\)_l_c_h_\/_0\.85\)/);
});
