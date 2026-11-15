import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { themeBoot, themeStorageKey } from "@/lib/content/theme";

// D2 (ADR 0002): the site is dark until the visitor picks a mode; the device setting doesn't count.

function boot(
  saved: Record<string, string>,
  options: { prefersDark?: boolean; storageThrows?: boolean } = {}
) {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    { url: "http://localhost/", runScripts: "outside-only" }
  );
  for (const [key, value] of Object.entries(saved))
    dom.window.localStorage.setItem(key, value);
  dom.window.matchMedia = ((query: string) => ({
    matches: query.includes("dark")
      ? Boolean(options.prefersDark)
      : !options.prefersDark,
    media: query
  })) as unknown as typeof dom.window.matchMedia;
  if (options.storageThrows) {
    Object.defineProperty(dom.window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      }
    });
  }
  dom.window.eval(themeBoot);
  return dom;
}

test("boot: nothing saved and a light device setting still gives dark", () => {
  const dom = boot({}, { prefersDark: false });
  const root = dom.window.document.documentElement;
  assert.equal(root.getAttribute("data-theme"), "dark");
  assert.equal(root.classList.contains("dark"), true);
  assert.equal(
    dom.window.localStorage.getItem(themeStorageKey),
    null,
    "a first visit records no choice"
  );
  dom.window.close();
});

test("boot: a saved pick wins", () => {
  for (const pick of ["light", "dark"]) {
    const dom = boot(
      { [themeStorageKey]: pick },
      { prefersDark: pick === "light" }
    );
    assert.equal(
      dom.window.document.documentElement.getAttribute("data-theme"),
      pick
    );
    assert.equal(
      dom.window.document.documentElement.classList.contains("dark"),
      pick === "dark"
    );
    dom.window.close();
  }
});

test("boot: blocked storage gives dark", () => {
  const dom = boot({}, { prefersDark: false, storageThrows: true });
  assert.equal(
    dom.window.document.documentElement.getAttribute("data-theme"),
    "dark"
  );
  assert.equal(
    dom.window.document.documentElement.classList.contains("dark"),
    true
  );
  dom.window.close();
});

test("boot: a pick saved under an old key carries over to the one key", () => {
  for (const oldKey of ["__RP__THEME__", "__RP_THEME__"]) {
    const dom = boot({ [oldKey]: "light" });
    assert.equal(
      dom.window.document.documentElement.getAttribute("data-theme"),
      "light"
    );
    assert.equal(dom.window.localStorage.getItem(themeStorageKey), "light");
    assert.equal(dom.window.localStorage.getItem(oldKey), null);
    dom.window.close();
  }
});

test("the server render starts dark, before any script runs", () => {
  const layout = readFileSync(
    new URL("../../src/app/(site)/layout.tsx", import.meta.url),
    "utf8"
  );
  assert.match(layout, /data-theme="dark"/);
  assert.match(layout, /cn\(\s*"dark"/);
});

test("no mounted theme path falls back to the device setting", () => {
  for (const file of [
    "src/lib/content/theme.ts",
    "src/providers/Theme/index.tsx",
    "src/providers/Theme/shared.ts",
    "src/providers/MiddleMan.tsx"
  ]) {
    const source = readFileSync(
      new URL(`../../${file}`, import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(
      source,
      /prefers-color-scheme|getImplicitPreference/,
      file
    );
  }
});

// The store and the page agree, through the one key.
let dom: JSDOM;
const previous = new Map<string, PropertyDescriptor | undefined>();
function globalValue(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}
let ui: typeof import("@testing-library/react/pure");
let Theme: typeof import("@/providers/Theme");

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "MutationObserver",
    "Event",
    "KeyboardEvent"
  ]) {
    globalValue(
      key,
      key === "window" ? dom.window : dom.window[key as keyof typeof dom.window]
    );
  }
  globalValue("localStorage", dom.window.localStorage);
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  Theme = await import("@/providers/Theme");
});

afterEach(() => {
  ui.cleanup();
  dom.window.localStorage.clear();
});

after(() => {
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});

function Probe({ onReady }: { onReady: (toggle: () => void) => void }) {
  const toggle = Theme.useTheme((store) => store.toggleTheme);
  const saved = Theme.useTheme((store) => store.savedTheme);
  onReady(toggle);
  return <span data-saved={saved ?? ""} />;
}

function setPage(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const savedIn = (view: { container: HTMLElement }) =>
  view.container.querySelector("span")?.getAttribute("data-saved");

test("provider: on mount it takes the page's mode and writes nothing", async () => {
  setPage("light");
  const view = ui.render(
    <Theme.ThemeProvider>
      <Probe onReady={() => {}} />
    </Theme.ThemeProvider>
  );
  await ui.act(async () => {});
  assert.equal(savedIn(view), "light");
  assert.equal(localStorage.getItem(themeStorageKey), null);
});

test("provider: a toggle changes the page and is saved under the one key", async () => {
  setPage("dark");
  let toggle!: () => void;
  const view = ui.render(
    <Theme.ThemeProvider>
      <Probe onReady={(value) => (toggle = value)} />
    </Theme.ThemeProvider>
  );
  await ui.act(async () => {});
  await ui.act(async () => toggle());
  assert.equal(document.documentElement.getAttribute("data-theme"), "light");
  assert.equal(document.documentElement.classList.contains("dark"), false);
  assert.equal(localStorage.getItem(themeStorageKey), "light");
  assert.equal(savedIn(view), "light");
});

test("provider: a pick made outside the store (the search panel) is followed by the store", async () => {
  setPage("dark");
  const view = ui.render(
    <Theme.ThemeProvider>
      <Probe onReady={() => {}} />
    </Theme.ThemeProvider>
  );
  await ui.act(async () => {});
  const { applyTheme } = await import("@/lib/content/theme");
  await ui.act(async () => applyTheme("light"));
  assert.equal(savedIn(view), "light");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

test("provider: clearing the saved pick returns to dark", async () => {
  setPage("light");
  let clear!: () => void;
  function Clearer() {
    clear = Theme.useTheme((store) => store.clearSave);
    return null;
  }
  ui.render(
    <Theme.ThemeProvider>
      <Clearer />
    </Theme.ThemeProvider>
  );
  await ui.act(async () => {});
  await ui.act(async () => clear());
  assert.equal(document.documentElement.getAttribute("data-theme"), "dark");
  assert.equal(localStorage.getItem(themeStorageKey), null, "clearing is not a pick");
});

test("provider: the header button's path (page first, then the store) flips once", async () => {
  setPage("dark");
  let toggle!: () => void;
  const view = ui.render(<Theme.ThemeProvider><Probe onReady={(value) => (toggle = value)} /></Theme.ThemeProvider>);
  await ui.act(async () => {});
  const { applyDocumentTheme } = await import("@/utilities/applyDocumentTheme");
  await ui.act(async () => {
    applyDocumentTheme(document.documentElement, "light", { armTransitions: false });
    toggle();
  });
  assert.equal(document.documentElement.getAttribute("data-theme"), "light");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
  assert.equal(savedIn(view), "light");
});

test("provider: under StrictMode a toggle still flips once and is saved", async () => {
  const { StrictMode } = await import("react");
  setPage("dark");
  let toggle!: () => void;
  const view = ui.render(<StrictMode><Theme.ThemeProvider><Probe onReady={(value) => (toggle = value)} /></Theme.ThemeProvider></StrictMode>);
  await ui.act(async () => {});
  assert.equal(localStorage.getItem(themeStorageKey), null);
  await ui.act(async () => toggle());
  assert.equal(document.documentElement.getAttribute("data-theme"), "light");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
  assert.equal(savedIn(view), "light");
});
