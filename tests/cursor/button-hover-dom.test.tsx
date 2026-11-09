import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { JSDOM } from "jsdom";
import React from "react";
import { createCursorStore } from "@/stores/Cursor/CursorStore";
let ui: typeof import("@testing-library/react/pure");
let cursor: typeof import("@/components/core/cursorWrapper");
let provider: typeof import("@/providers/RP_Pro");
let Button: typeof import("@/components/ui/button").Button;
const dom = new JSDOM("<!doctype html><body></body>", {
  url: "http://localhost"
});
const previous = new Map<string, PropertyDescriptor | undefined>();
before(async () => {
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
    "getComputedStyle"
  ]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: key === "window" ? dom.window : dom.window[key as keyof Window]
    });
  }
  ui = await import("@testing-library/react/pure");
  cursor = await import("@/components/core/cursorWrapper");
  provider = await import("@/providers/RP_Pro");
  Button = (await import("@/components/ui/button")).Button;
});
after(() => {
  ui.cleanup();
  dom.window.close();
  for (const [key, value] of previous) {
    if (value) Object.defineProperty(globalThis, key, value);
    else Reflect.deleteProperty(globalThis, key);
  }
});
test("delegated button hover supports late portals, native/Base UI controls, labels and cleanup", async () => {
  const store = createCursorStore();
  function Owner() {
    cursor.useInteractiveCursorHover(true);
    return null;
  }
  const view = ui.render(
    <provider.CurContext.Provider value={store}>
      <Owner />
      <Button>Base</Button>
    </provider.CurContext.Provider>
  );
  const portal = document.createElement("div");
  document.body.append(portal);
  portal.innerHTML = "<button><svg><path /></svg></button>";
  const button = portal.querySelector("button")!;
  const icon = button.querySelector("path")!;
  function pointer(
    target: Element,
    type: string,
    relatedTarget: EventTarget | null = null,
    pointerType = "mouse"
  ) {
    const event = new dom.window.MouseEvent(type, {
      bubbles: true,
      relatedTarget
    });
    Object.defineProperty(event, "pointerType", { value: pointerType });
    ui.fireEvent(target, event);
  }
  pointer(button, "pointerover");
  assert.equal(store.getState().cursorState, "FOCUS");
  pointer(button, "pointerout", icon);
  pointer(icon, "pointerover", button);
  assert.equal(store.getState().cursorState, "FOCUS");
  pointer(icon, "pointerout");
  assert.equal(store.getState().cursorState, null);
  for (const [attribute, value] of [
    ["disabled", ""],
    ["aria-disabled", "true"],
    ["data-disabled", ""],
    ["aria-busy", "true"]
  ]) {
    button.setAttribute(attribute, value);
    pointer(button, "pointerover");
    assert.equal(store.getState().cursorState, null, attribute);
    button.removeAttribute(attribute);
  }
  pointer(button, "pointerover", null, "touch");
  assert.equal(store.getState().cursorState, null);
  pointer(button, "pointerover");
  button.disabled = true;
  await ui.act(async () => {
    await Promise.resolve();
  });
  assert.equal(store.getState().cursorState, null);
  button.disabled = false;
  pointer(button, "pointerover");
  portal.remove();
  await ui.act(async () => {
    await Promise.resolve();
  });
  assert.equal(store.getState().cursorState, null);
  const base = ui.getByText(document.body, "Base");
  pointer(base, "pointerover");
  assert.equal(store.getState().cursorState, "FOCUS");
  pointer(base, "pointerout");
  store.getState().setCursorState("CUSTOM");
  pointer(base, "pointerover");
  pointer(base, "pointerout");
  assert.equal(store.getState().cursorState, "CUSTOM");
  store.getState().setCursorState(null);
  pointer(base, "pointerover");
  view.unmount();
  assert.equal(store.getState().cursorState, null);
});

test("links share delegated hover, exclusions, dynamic lifecycle and label precedence", async () => {
  const store = createCursorStore();
  function Owner({ enabled = true }: { enabled?: boolean }) {
    cursor.useInteractiveCursorHover(enabled);
    return null;
  }
  const view = ui.render(
    <provider.CurContext.Provider value={store}>
      <Owner />
    </provider.CurContext.Provider>
  );
  const portal = document.createElement("div");
  document.body.append(portal);
  portal.innerHTML =
    '<a href="/next"><svg><path /></svg></a><span role="link" tabindex="0">Role link</span><a>No href</a><span role="button" tabindex="-1">Unavailable</span>';
  const link = portal.querySelector("a")!;
  const icon = link.querySelector("path")!;
  const role = portal.querySelector('[role="link"]')!;
  const pointer = (
    target: Element,
    type = "pointerover",
    relatedTarget: EventTarget | null = null
  ) =>
    ui.fireEvent(
      target,
      new dom.window.MouseEvent(type, { bubbles: true, relatedTarget })
    );
  for (const target of [link, role]) {
    pointer(target);
    assert.equal(store.getState().cursorState, "FOCUS");
    pointer(target, "pointerout");
    assert.equal(store.getState().cursorState, null);
  }
  pointer(portal.querySelectorAll("a")[1]);
  assert.equal(store.getState().cursorState, null);
  const nativeButton = document.createElement("button");
  portal.append(nativeButton);
  for (const target of [
    link,
    nativeButton,
    role,
    portal.querySelector('[role="button"]')!
  ]) {
    target.setAttribute("tabindex", "-1");
    pointer(target);
    assert.equal(
      store.getState().cursorState,
      "FOCUS",
      "tabindex does not disable pointer actions"
    );
    pointer(target, "pointerout");
    assert.equal(store.getState().cursorState, null);
  }
  for (const attribute of ["aria-disabled", "aria-busy", "inert"]) {
    portal.setAttribute(attribute, "true");
    pointer(link);
    assert.equal(store.getState().cursorState, null, attribute);
    portal.removeAttribute(attribute);
  }
  for (const [attribute, value] of [["data-disabled", ""]]) {
    link.setAttribute(attribute, value);
    pointer(link);
    assert.equal(store.getState().cursorState, null, attribute);
    link.removeAttribute(attribute);
  }
  pointer(link);
  link.setAttribute("aria-disabled", "true");
  await ui.act(async () => {
    await Promise.resolve();
  });
  assert.equal(store.getState().cursorState, null);
  link.removeAttribute("aria-disabled");
  for (const label of ["CUSTOM", "DRAG"]) {
    store.getState().setCursorState(label);
    pointer(link);
    pointer(link, "pointerout", icon);
    pointer(icon);
    assert.equal(store.getState().cursorState, label);
    pointer(icon, "pointerout");
    assert.equal(store.getState().cursorState, label);
  }
  store.getState().setCursorState(null);
  pointer(link);
  link.remove();
  await ui.act(async () => {
    await Promise.resolve();
  });
  assert.equal(store.getState().cursorState, null);
  pointer(role);
  view.rerender(
    <provider.CurContext.Provider value={store}>
      <Owner enabled={false} />
    </provider.CurContext.Provider>
  );
  assert.equal(store.getState().cursorState, null);
  pointer(role);
  assert.equal(store.getState().cursorState, null);
  view.unmount();
  portal.remove();
});

test("React explicit labels survive delegated nested movement and coarse pointers never activate", () => {
  const store = createCursorStore();
  function Owner() {
    cursor.useInteractiveCursorHover(true);
    return (
      <a
        href="/read"
        onMouseEnter={() => store.getState().setCursorState("READ")}
        onMouseLeave={() => store.getState().setCursorState(null)}
      >
        <svg>
          <path />
        </svg>
      </a>
    );
  }
  const view = ui.render(
    <provider.CurContext.Provider value={store}>
      <Owner />
    </provider.CurContext.Provider>
  );
  const link = view.container.querySelector("a")!;
  const icon = link.querySelector("path")!;
  const pointer = (
    target: Element,
    type: string,
    relatedTarget: EventTarget | null = null
  ) =>
    ui.fireEvent(
      target,
      new dom.window.MouseEvent(type, { bubbles: true, relatedTarget })
    );
  pointer(link, "pointerover");
  ui.fireEvent.mouseOver(link);
  assert.equal(store.getState().cursorState, "READ");
  pointer(link, "pointerout", icon);
  pointer(icon, "pointerover", link);
  ui.fireEvent.mouseOver(icon, { relatedTarget: link });
  assert.equal(store.getState().cursorState, "READ");
  pointer(icon, "pointerout");
  ui.fireEvent.mouseOut(icon);
  assert.equal(store.getState().cursorState, null);
  const original = window.matchMedia;
  window.matchMedia = (media): MediaQueryList => ({
    matches: true,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true
  });
  try {
    pointer(link, "pointerover");
    assert.equal(store.getState().cursorState, null);
  } finally {
    window.matchMedia = original;
  }
  pointer(link, "pointerover");
  assert.equal(store.getState().cursorState, "FOCUS");
  ui.fireEvent(window, new dom.window.Event("blur"));
  assert.equal(store.getState().cursorState, null);
  view.unmount();
});

test("stationary pointer follows disabled and busy availability without losing explicit states", async () => {
  const store = createCursorStore();
  function Owner() {
    cursor.useInteractiveCursorHover(true);
    return null;
  }
  const view = ui.render(
    <provider.CurContext.Provider value={store}>
      <Owner />
      <button disabled>Pending</button>
    </provider.CurContext.Provider>
  );
  const button = view.container.querySelector("button")!;
  const pointer = (type: string) =>
    ui.fireEvent(button, new dom.window.MouseEvent(type, { bubbles: true }));
  const flush = async () => {
    await ui.act(async () => {
      await Promise.resolve();
    });
  };
  pointer("pointerover");
  assert.equal(store.getState().cursorState, null);
  button.disabled = false;
  await flush();
  assert.equal(store.getState().cursorState, "FOCUS");
  for (const attribute of [
    "disabled",
    "aria-busy",
    "aria-disabled",
    "data-disabled",
    "inert"
  ]) {
    button.setAttribute(attribute, "true");
    await flush();
    assert.equal(store.getState().cursorState, null, attribute);
    button.removeAttribute(attribute);
    await flush();
    assert.equal(store.getState().cursorState, "FOCUS", attribute);
  }
  for (const label of ["READ", "DRAG"]) {
    button.disabled = true;
    await flush();
    store.getState().setCursorState(label);
    button.disabled = false;
    await flush();
    assert.equal(store.getState().cursorState, label);
  }
  store.getState().setCursorState(null);
  button.disabled = true;
  await flush();
  pointer("pointerout");
  button.disabled = false;
  await flush();
  assert.equal(
    store.getState().cursorState,
    null,
    "leaving clears the unavailable candidate"
  );
  view.unmount();
});
