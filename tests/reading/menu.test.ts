import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { menuLinks, useSiteMenu } from "../../lib/content/menu";
import { nextTheme } from "../../lib/content/theme";

test("the theme toggle flips dark and light", () => {
  assert.equal(nextTheme("dark"), "light");
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme(null), "dark");
});

test("the menu carries a link preview and opens over the gradient", () => {
  assert.equal(menuLinks[0]?.preview?.src, "/assets/credits/fixture-author.svg");
  useSiteMenu.getState().close();
  useSiteMenu.getState().toggle();
  assert.equal(useSiteMenu.getState().open, true);
  useSiteMenu.getState().setPreview(menuLinks[1]?.preview ?? null);
  assert.equal(useSiteMenu.getState().preview?.alt, "Index");
  useSiteMenu.getState().close();
  assert.equal(useSiteMenu.getState().open, false);
  assert.equal(useSiteMenu.getState().preview, null);
  const gradient = readFileSync(new URL("../../components/shell/menu-gradient.tsx", import.meta.url), "utf8");
  assert.match(gradient, /useCanvasClaim\(true\)/);
  assert.match(gradient, /seamless\.png/);
  assert.match(gradient, /data-theme/);
});
