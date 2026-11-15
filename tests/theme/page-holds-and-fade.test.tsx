import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { holdThemeBoot, pageThemeFor, themeBoot, themeStorageKey } from "@/lib/content/theme";
import { THEME_ANIMATING_CLASS, THEME_TRANSITION_SECONDS } from "@/utilities/applyDocumentTheme";

// Pages that hold dark, traced from The Hideaway (owner, 2026-11-16), and what the colour fade needs to work.
const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("pages that hold dark: home (owner) and the team page (The Hideaway's the-team)", () => {
  assert.equal(pageThemeFor("/"), "dark");
  assert.equal(pageThemeFor("/team"), "dark");
  assert.equal(pageThemeFor("/shop"), null);
});

test("a 404 paints dark from its first frame, over a saved light pick", () => {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "http://localhost/no-such-page",
    runScripts: "outside-only"
  });
  dom.window.localStorage.setItem(themeStorageKey, "light");
  dom.window.matchMedia = (() => ({ matches: true })) as unknown as typeof dom.window.matchMedia;
  dom.window.eval(themeBoot);
  assert.equal(dom.window.document.documentElement.getAttribute("data-theme"), "light", "the boot script can't know a 404");
  dom.window.eval(holdThemeBoot("dark"));
  assert.equal(dom.window.document.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(dom.window.document.documentElement.classList.contains("dark"), true);
  assert.equal(dom.window.localStorage.getItem(themeStorageKey), "light", "the hold is not saved");
  dom.window.close();
  const notFound = read("src/app/(site)/not-found.tsx");
  assert.match(notFound, /<script dangerouslySetInnerHTML=\{\{ __html: holdThemeBoot\("dark"\) \}\} \/>\s*<NotFoundPage \/>/);
});

test("the home page's black ground stays on the home page", () => {
  const css = read("src/styles/teaser.css");
  assert.doesNotMatch(css, /^\s*(html|body)\s*\{[^}]*background/m, "no global black html or body");
  assert.match(css, /html:has\(\.teaser\)[^{]*\{[^}]*background:\s*#000/);
  assert.match(css, /body:has\(\.teaser\)[^{]*\{[^}]*background:\s*#000/);
});

test("the colour fade is in the theme layer and lasts as long as the provider keeps it armed", () => {
  const css = read("src/styles/globals.css");
  const rule = css.match(/html\.theme-animating \[data-themed\]\s*\{([^}]*)\}/);
  assert.ok(rule, "html.theme-animating [data-themed] rule");
  assert.match(rule[1], /transition-property:\s*background-color, color, fill, border-color, opacity/);
  assert.match(rule[1], /transition-duration:\s*var\(--theme-transition-duration\)/);
  const duration = css.match(/--theme-transition-duration:\s*([\d.]+)s/);
  assert.ok(duration, "--theme-transition-duration");
  assert.equal(Number(duration[1]), THEME_TRANSITION_SECONDS);
  assert.equal(THEME_ANIMATING_CLASS, "theme-animating");
  assert.match(read("src/app/(site)/layout.tsx"), /<body data-themed="color, background-color">/, "the page ground fades too, as in The Hideaway");
});
