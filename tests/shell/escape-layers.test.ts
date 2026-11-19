import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import {
  escapeFocus,
  escapeLayer,
  escapeOrigin,
  foregroundOpen,
  panelOpen,
  readEscape,
  type EscapeInput,
  type EscapeOrigin
} from "../../src/components/shell/_shared/escape-layers";

// One test per row of the header v6 state table (escape-focus-table.md in the packet). Each cell gives
// the layer one Escape closes and where focus goes; "nothing" and the guide's cells are null for the
// shell. Cells marked "—" in the table can't occur and are not asserted.

type Cell = { layer: "panel" | "menu" | null; focus?: "panel-button" | "menu-button" | "stay" };
const press = (origin: EscapeOrigin, state: Pick<EscapeInput, "panel" | "menu" | "foreground">): EscapeInput => ({
  key: "Escape",
  composing: false,
  repeat: false,
  claimed: false,
  origin,
  ...state
});
function row(state: Pick<EscapeInput, "panel" | "menu" | "foreground">, cells: Partial<Record<EscapeOrigin, Cell>>) {
  for (const [origin, cell] of Object.entries(cells) as [EscapeOrigin, Cell][]) {
    const layer = escapeLayer(press(origin, state));
    assert.equal(layer, cell.layer, `${JSON.stringify(state)} from ${origin}: layer`);
    if (layer) assert.equal(escapeFocus(layer, origin), cell.focus, `${JSON.stringify(state)} from ${origin}: focus`);
  }
}

test("row none: Escape closes nothing", () => {
  row({ panel: false, menu: false, foreground: false }, { header: { layer: null }, body: { layer: null }, page: { layer: null } });
});

test("row panel: the panel closes and focus returns to its button; page content is not the shell's", () => {
  row(
    { panel: true, menu: false, foreground: false },
    {
      header: { layer: "panel", focus: "panel-button" },
      panel: { layer: "panel", focus: "panel-button" },
      body: { layer: "panel", focus: "panel-button" },
      page: { layer: null }
    }
  );
});

test("row menu: the menu closes; focus stays on a header control, else returns to Menu", () => {
  row(
    { panel: false, menu: true, foreground: false },
    {
      header: { layer: "menu", focus: "stay" },
      menu: { layer: "menu", focus: "menu-button" },
      body: { layer: "menu", focus: "menu-button" },
      page: { layer: null }
    }
  );
});

test("row menu + panel: the panel (newer, higher) closes first from every shell origin, including a menu link", () => {
  row(
    { panel: true, menu: true, foreground: false },
    {
      header: { layer: "panel", focus: "panel-button" },
      panel: { layer: "panel", focus: "panel-button" },
      menu: { layer: "panel", focus: "panel-button" },
      body: { layer: "panel", focus: "panel-button" },
      page: { layer: null }
    }
  );
  // The next press follows the menu row.
  assert.equal(escapeLayer(press("menu", { panel: false, menu: true, foreground: false })), "menu");
});

test("row guide: the shell leaves the key to the guide, with or without a panel behind it", () => {
  for (const panel of [false, true]) {
    row(
      { panel, menu: false, foreground: true },
      { header: { layer: null }, panel: { layer: null }, body: { layer: null }, page: { layer: null } }
    );
  }
  // Rule B normally closes the menu first; if both were ever open, the guide still wins.
  row({ panel: true, menu: true, foreground: true }, { menu: { layer: null }, header: { layer: null } });

  // Column G: focus inside the guide itself (a body-portalled dialog, outside the shell). The shell reads
  // it as page focus with a foreground layer open and leaves the key to the guide, panel or not.
  const { window } = new JSDOM(`<!doctype html><body>
    <header id="rp-header"><div data-header-panel></div></header>
    <div role="dialog" data-open><button id="next">Next</button></div>
  </body>`);
  const doc = window.document;
  const event = new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true });
  doc.getElementById("next")!.dispatchEvent(event);
  const input = readEscape(event, doc, false);
  assert.equal(input.origin, "page");
  assert.equal(input.foreground, true);
  assert.equal(input.panel, true);
  assert.equal(escapeLayer(input), null, "from inside the guide, only the guide closes");
});

test("rule C: composing, held or already-claimed presses count for nobody", () => {
  const state = { panel: true, menu: true, foreground: false };
  for (const extra of [{ composing: true }, { repeat: true }, { claimed: true }, { key: "Enter" }]) {
    assert.equal(escapeLayer({ ...press("header", state), ...extra }), null, JSON.stringify(extra));
  }
});

test("origin, panel and foreground marks read from the document", () => {
  const { window } = new JSDOM(`<!doctype html><body>
    <header id="rp-header"><a id="logo" href="/">mark</a>
      <div data-header-panel id="open"><a id="row" href="/x">row</a></div>
      <div data-header-panel inert id="exiting"></div>
    </header>
    <div data-site-menu><a id="item" href="/shop">Shop</a></div>
    <main><a id="article" href="/y">y</a></main>
  </body>`);
  const doc = window.document;
  const at = (id: string) => doc.getElementById(id);
  assert.equal(escapeOrigin(at("logo"), doc), "header");
  assert.equal(escapeOrigin(at("row"), doc), "panel");
  assert.equal(escapeOrigin(at("item"), doc), "menu");
  assert.equal(escapeOrigin(at("article"), doc), "page");
  assert.equal(escapeOrigin(doc.body, doc), "body");
  assert.equal(panelOpen(doc), true);
  at("open")!.setAttribute("inert", "");
  assert.equal(panelOpen(doc), false, "exiting (inert) panels do not count");
  assert.equal(foregroundOpen(doc), false);
  const guide = doc.createElement("div");
  guide.setAttribute("role", "dialog");
  guide.setAttribute("data-open", "");
  doc.body.append(guide);
  assert.equal(foregroundOpen(doc), true, "a body-portalled open dialog is foreground");
  guide.remove();
  const inHeader = doc.createElement("div");
  inHeader.setAttribute("aria-modal", "true");
  at("open")!.append(inHeader);
  assert.equal(foregroundOpen(doc), false, "a dialog inside the shell is not foreground");
  // Header panels render on the body (F12); a panel marked as a dialog is still the shell's, not foreground.
  const portalled = doc.createElement("div");
  portalled.setAttribute("data-header-panel", "");
  portalled.setAttribute("role", "dialog");
  portalled.setAttribute("aria-modal", "true");
  doc.body.append(portalled);
  assert.equal(foregroundOpen(doc), false, "a body-portalled header panel is not foreground");
  const link = doc.createElement("a");
  portalled.append(link);
  assert.equal(escapeOrigin(link, doc), "panel", "focus in a body-portalled panel is the panel's");
});

test("the guide's own open state counts as foreground even without dialog marks (base tour tooltip)", () => {
  const { window } = new JSDOM(`<!doctype html><body><header id="rp-header"><a id="logo" href="/">mark</a></header></body>`);
  const doc = window.document;
  const event = new window.KeyboardEvent("keydown", { key: "Escape" });
  doc.getElementById("logo")!.dispatchEvent(event);
  assert.equal(readEscape(event, doc, true).foreground, false);
  assert.equal(readEscape(event, doc, true, true).foreground, true);
  assert.equal(escapeLayer(readEscape(event, doc, true, true)), null, "the shell leaves the key to the guide");
  assert.equal(escapeLayer(readEscape(event, doc, true)), "menu");
});
