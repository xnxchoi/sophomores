import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { useState } from "react";
import { InlineRetry } from "@/components/core/InlineRetry/InlineRetry";
import { EnglishMessages } from "../fixtures/english-messages";

// Rendered, clicked and re-rendered in a DOM: the busy text shows in the button itself, and a press while
// pending does not retry again.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/help", pretendToBeVisual: true });
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    // The Arc label crossfade (motion's popLayout) measures the outgoing label after the click.
    Element: dom.window.Element,
    SVGElement: dom.window.SVGElement,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
    cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  ui = await import("@testing-library/react/pure");
});
afterEach(() => ui.cleanup());
after(() => {
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else delete (globalThis as Record<string, unknown>)[key];
  }
  dom.window.close();
});

/** Stands in for a caller: the retry starts a request that hasn't settled yet, so `pending` stays true. */
function Caller({ onRetry }: { onRetry: () => void }) {
  const [pending, setPending] = useState(false);
  return (
    <InlineRetry
      message="Can't load this right now."
      pending={pending}
      onRetry={() => {
        onRetry();
        setPending(true);
      }}
    />
  );
}

/** Visible label text: the button minus anything hidden from the reader (an outgoing crossfade phase). */
const visibleLabel = (button: HTMLElement) =>
  [...button.querySelectorAll("span")]
    .filter((span) => !span.closest("[aria-hidden='true']") && span.children.length === 0)
    .map((span) => span.textContent)
    .join("")
    .trim();

test("idle: the failure line, then a plain refresh action", () => {
  const view = ui.render(<EnglishMessages><Caller onRetry={() => {}} /></EnglishMessages>);
  const button = view.getByRole("button");
  assert.equal(view.getByText("Can't load this right now.").tagName, "P");
  assert.match(button.textContent ?? "", /Try again/);
  assert.equal(button.getAttribute("type"), "button");
  assert.equal(button.hasAttribute("aria-busy"), false);
  assert.equal(button.hasAttribute("aria-disabled"), false);
  assert.equal(button.closest("a"), null, "retry is a button, not a navigation link");
});

test("pending: busy text shows in place, the action is locked, and a second press does not retry", async () => {
  let retries = 0;
  const view = ui.render(<EnglishMessages><Caller onRetry={() => retries++} /></EnglishMessages>);
  const button = view.getByRole("button");
  button.focus();
  await ui.act(async () => {
    ui.fireEvent.click(button);
  });
  assert.equal(retries, 1);

  const pendingButton = view.getByRole("button");
  assert.equal(pendingButton, button, "same button, same place");
  assert.match(pendingButton.textContent ?? "", /Trying again…/);
  assert.equal(pendingButton.getAttribute("aria-busy"), "true");
  assert.equal(pendingButton.getAttribute("aria-disabled"), "true");
  assert.equal(pendingButton.hasAttribute("disabled"), false, "aria-disabled, not disabled, so focus stays");
  assert.equal(document.activeElement === pendingButton, true);
  assert.match(view.getByRole("status").textContent ?? "", /Trying again…/);

  await ui.act(async () => {
    ui.fireEvent.click(pendingButton);
    ui.fireEvent.click(pendingButton);
  });
  assert.equal(retries, 1, "presses while pending do nothing");
});

test("pending text is not hidden by a loading state", async () => {
  const view = ui.render(
    <EnglishMessages>
      <InlineRetry onRetry={() => {}} pending label="Retry the list" pendingLabel="Loading the list…" />
    </EnglishMessages>
  );
  const button = view.getByRole("button");
  assert.equal(visibleLabel(button), "Loading the list…");
});
