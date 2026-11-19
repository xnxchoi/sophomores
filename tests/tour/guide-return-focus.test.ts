import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { JSDOM } from "jsdom";

// When the guide closes, focus goes back to a control that still exists. Opened from the menu, the menu closes
// with the guide (UI-Shell Rule B) and its opener unmounts, so focus goes to the menu button.

let dom: JSDOM;
let guideReturnTarget: typeof import("@/components/UX/Tour/InterfaceTour").guideReturnTarget;
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/help" });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  ({ guideReturnTarget } = await import("@/components/UX/Tour/InterfaceTour"));
});

after(() => {
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function page() {
  document.body.innerHTML = `
    <header id="rp-header"><button id="menu" aria-controls="site-menu">Menu</button></header>
    <nav id="site-menu"><button id="menu-opener">Open the site guide</button></nav>
    <main><button id="help-opener">Open the site guide</button></main>`;
  return (id: string) => document.getElementById(id) as HTMLElement;
}

test("opened from Help: focus returns to the Help opener", () => {
  const at = page();
  assert.equal(guideReturnTarget(at("help-opener")) === at("help-opener"), true);
});

test("opened from the menu, which closed with the guide: focus goes to the menu button", () => {
  const at = page();
  const opener = at("menu-opener");
  at("site-menu").remove();
  assert.equal(guideReturnTarget(opener) === at("menu"), true);
});

test("an opener left in an inert menu is not a target: the menu button is", () => {
  const at = page();
  at("site-menu").setAttribute("inert", "");
  assert.equal(guideReturnTarget(at("menu-opener")) === at("menu"), true);
});

test("no opener, or no menu button to fall back on: the dialog's own default", () => {
  const at = page();
  assert.equal(guideReturnTarget(null), true);
  const opener = at("menu-opener");
  document.body.innerHTML = "";
  assert.equal(guideReturnTarget(opener), true);
});

test("the guide uses it on close, and every opener records itself before opening", () => {
  const source = readFileSync(new URL("../../src/components/UX/Tour/InterfaceTour.tsx", import.meta.url), "utf8");
  assert.match(source, /finalFocus=\{\(\) => \{\s*const target = guideReturnTarget\(lastOpener\);/);
  assert.match(source, /onClick=\{\(event\) => \{\s*lastOpener = event\.currentTarget;\s*show\(\);/);
});
