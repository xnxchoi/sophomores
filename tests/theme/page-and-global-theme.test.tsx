import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import {
  pageThemeFor,
  pageThemes,
  themeBoot,
  themeStorageKey
} from "@/lib/content/theme";

// Two layers, as in The Hideaway (owner, 2026-11-16; ADR 0002):
// - the global theme is the visitor's pick, or their device setting until they pick; only a pick is saved;
// - a page theme locks a page while it is open and wins over the global theme; it is never saved.
// Leaving the page releases the lock and the global theme returns.

function boot(
  saved: Record<string, string>,
  options: {
    deviceLight?: boolean;
    storageThrows?: boolean;
    path?: string;
  } = {}
) {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    {
      url: `http://localhost${options.path ?? "/shop"}`,
      runScripts: "outside-only"
    }
  );
  for (const [key, value] of Object.entries(saved))
    dom.window.localStorage.setItem(key, value);
  dom.window.matchMedia = ((query: string) => ({
    matches: query.includes("light")
      ? Boolean(options.deviceLight)
      : !options.deviceLight,
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

const pageOf = (dom: JSDOM) => ({
  theme: dom.window.document.documentElement.getAttribute("data-theme"),
  dark: dom.window.document.documentElement.classList.contains("dark")
});

test("the home page is locked dark; other pages aren't locked", () => {
  assert.equal(pageThemes["/"], "dark");
  assert.equal(pageThemeFor("/"), "dark");
  assert.equal(pageThemeFor("/shop"), null);
  assert.equal(pageThemeFor(null), null);
});

test("boot: nothing saved follows the device setting and writes nothing", () => {
  for (const deviceLight of [true, false]) {
    const dom = boot({}, { deviceLight });
    const expected = deviceLight ? "light" : "dark";
    assert.deepEqual(pageOf(dom), {
      theme: expected,
      dark: expected === "dark"
    });
    assert.equal(
      dom.window.localStorage.getItem(themeStorageKey),
      null,
      "a first visit records no pick"
    );
    dom.window.close();
  }
});

test("boot: a saved pick wins over the device setting", () => {
  for (const pick of ["light", "dark"]) {
    const dom = boot(
      { [themeStorageKey]: pick },
      { deviceLight: pick === "dark" }
    );
    assert.deepEqual(pageOf(dom), { theme: pick, dark: pick === "dark" });
    dom.window.close();
  }
});

test("boot: blocked storage still follows the device setting", () => {
  const dom = boot({}, { deviceLight: true, storageThrows: true });
  assert.deepEqual(pageOf(dom), { theme: "light", dark: false });
  dom.window.close();
});

test("boot: a pick saved under an old key carries over to the one key", () => {
  for (const oldKey of ["__RP__THEME__", "__RP_THEME__"]) {
    const dom = boot({ [oldKey]: "light" });
    assert.equal(pageOf(dom).theme, "light");
    assert.equal(dom.window.localStorage.getItem(themeStorageKey), "light");
    assert.equal(dom.window.localStorage.getItem(oldKey), null);
    dom.window.close();
  }
});

test("boot: a locked page paints in its own theme first, and the saved pick is kept", () => {
  for (const options of [{ deviceLight: true }, { deviceLight: false }]) {
    const dom = boot({ [themeStorageKey]: "light" }, { ...options, path: "/" });
    assert.deepEqual(pageOf(dom), { theme: "dark", dark: true });
    assert.equal(dom.window.localStorage.getItem(themeStorageKey), "light");
    dom.window.close();
  }
  const fresh = boot({}, { deviceLight: true, path: "/" });
  assert.equal(pageOf(fresh).theme, "dark");
  assert.equal(fresh.window.localStorage.getItem(themeStorageKey), null);
  fresh.window.close();
});

test("the server render starts dark, before any script runs", () => {
  const layout = readFileSync(
    new URL("../../src/app/(site)/layout.tsx", import.meta.url),
    "utf8"
  );
  assert.match(layout, /data-theme="dark"/);
  assert.match(layout, /cn\(\s*"dark"/);
});

// The store, the page and storage.
let dom: JSDOM;
let deviceLight = false;
const deviceListeners = new Set<() => void>();
function setDevice(light: boolean) {
  deviceLight = light;
  for (const listener of deviceListeners) listener();
}
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
  dom.window.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("light") ? deviceLight : !deviceLight;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) =>
      deviceListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      deviceListeners.delete(listener)
  })) as unknown as typeof dom.window.matchMedia;
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
  globalValue("matchMedia", dom.window.matchMedia);
  globalValue("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  Theme = await import("@/providers/Theme");
});

afterEach(() => {
  ui.cleanup();
  dom.window.localStorage.clear();
  deviceLight = false;
});

after(() => {
  dom.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});

type Store = Parameters<
  Parameters<typeof import("@/providers/Theme").useTheme>[0]
>[0];
function Probe({ onReady }: { onReady: (store: Store) => void }) {
  const store = Theme.useTheme((state) => state);
  onReady(store);
  return null;
}

function setPage(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.toggle("dark", theme === "dark");
}
const pageTheme = () => document.documentElement.getAttribute("data-theme");

function At({ path, children }: { path: string; children: ReactNode }) {
  return (
    <PathnameContext.Provider value={path}>
      <Theme.ThemeProvider>{children}</Theme.ThemeProvider>
    </PathnameContext.Provider>
  );
}

async function mount(path: string) {
  let store!: Store;
  const probe = <Probe onReady={(value) => (store = value)} />;
  const view = ui.render(<At path={path}>{probe}</At>);
  await ui.act(async () => {});
  return {
    get store() {
      return store;
    },
    navigate: async (next: string) => {
      view.rerender(<At path={next}>{probe}</At>);
      await ui.act(async () => {});
    }
  };
}

test("provider: with nothing saved the global theme is the device setting, and nothing is written", async () => {
  deviceLight = true;
  setPage("light");
  const view = await mount("/shop");
  assert.equal(view.store.savedTheme, "light");
  assert.equal(view.store.locked, false);
  assert.equal(pageTheme(), "light");
  assert.equal(localStorage.getItem(themeStorageKey), null);
});

test("provider: a pick on an unlocked page changes the page and is saved", async () => {
  setPage("dark");
  const view = await mount("/shop");
  await ui.act(async () => view.store.toggleTheme());
  assert.equal(pageTheme(), "light");
  assert.equal(document.documentElement.classList.contains("dark"), false);
  assert.equal(localStorage.getItem(themeStorageKey), "light");
  assert.equal(view.store.savedTheme, "light");
});

test("provider: a change fades (the transition class is armed), and the class is cleared once it ends", async () => {
  const { THEME_ANIMATING_CLASS, THEME_TRANSITION_SECONDS } = await import("@/utilities/applyDocumentTheme");
  setPage("dark");
  const view = await mount("/shop");
  assert.equal(document.documentElement.classList.contains(THEME_ANIMATING_CLASS), false, "mounting doesn't fade");
  await ui.act(async () => view.store.toggleTheme());
  assert.equal(document.documentElement.classList.contains(THEME_ANIMATING_CLASS), true);
  await ui.act(() => new Promise((done) => setTimeout(done, THEME_TRANSITION_SECONDS * 1000 + 80)));
  assert.equal(document.documentElement.classList.contains(THEME_ANIMATING_CLASS), false);
});

test("provider: the home page holds dark over a saved light pick, and saves nothing", async () => {
  localStorage.setItem(themeStorageKey, "light");
  setPage("dark");
  const view = await mount("/");
  assert.equal(view.store.locked, true);
  assert.equal(view.store.pageTheme, "dark");
  assert.equal(view.store.savedTheme, "light");
  assert.equal(pageTheme(), "dark");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

test("provider: a toggle on a locked page changes nothing", async () => {
  localStorage.setItem(themeStorageKey, "light");
  setPage("dark");
  const view = await mount("/");
  await ui.act(async () => view.store.toggleTheme());
  assert.equal(pageTheme(), "dark");
  assert.equal(view.store.savedTheme, "light");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

test("provider: leaving a locked page releases the lock and the global theme returns", async () => {
  localStorage.setItem(themeStorageKey, "light");
  setPage("dark");
  const view = await mount("/");
  await view.navigate("/shop");
  assert.equal(view.store.locked, false);
  assert.equal(pageTheme(), "light");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
  await view.navigate("/");
  assert.equal(pageTheme(), "dark", "coming back locks it again");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

// A page that holds its own theme, the way the 404 does. `passive` is the worst case: it lets go in a
// passive cleanup, after the next route's hold has already applied.
function OwnHold({ passive = false }: { passive?: boolean }) {
  const setPageTheme = Theme.useTheme((state) => state.setPageTheme);
  const clearPageTheme = Theme.useTheme((state) => state.clearPageTheme);
  const useHold = passive ? useEffect : useLayoutEffect;
  useHold(() => {
    setPageTheme("dark", true);
    return () => clearPageTheme();
  }, [setPageTheme, clearPageTheme]);
  return null;
}

test("provider: leaving a page that holds its own theme for the home page keeps the home page dark", async () => {
  localStorage.setItem(themeStorageKey, "light");
  setPage("dark");
  let store!: Store;
  const probe = <Probe onReady={(value) => (store = value)} />;
  const view = ui.render(<At path="/missing"><OwnHold passive />{probe}</At>);
  await ui.act(async () => {});
  assert.equal(pageTheme(), "dark");
  view.rerender(<At path="/">{probe}</At>);
  await ui.act(async () => {});
  assert.equal(store.locked, true, "the home page still holds its theme");
  assert.equal(pageTheme(), "dark");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

test("provider: going from the home page to a page that holds dark never shows the global theme", async () => {
  localStorage.setItem(themeStorageKey, "light");
  setPage("dark");
  let store!: Store;
  const probe = <Probe onReady={(value) => (store = value)} />;
  const view = ui.render(<At path="/">{probe}</At>);
  await ui.act(async () => {});
  const observer = new dom.window.MutationObserver(() => {});
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  view.rerender(<At path="/missing"><OwnHold />{probe}</At>);
  await ui.act(async () => {});
  const changes = observer.takeRecords().length;
  observer.disconnect();
  assert.equal(changes, 0, "data-theme never changed");
  assert.equal(store.locked, true);
  view.rerender(<At path="/shop">{probe}</At>);
  await ui.act(async () => {});
  assert.equal(pageTheme(), "light", "leaving both holds returns the global theme");
});

test("provider: with no pick the global theme follows a device change; with a pick it doesn't", async () => {
  setPage("dark");
  const view = await mount("/shop");
  await ui.act(async () => setDevice(true));
  assert.equal(pageTheme(), "light");
  assert.equal(localStorage.getItem(themeStorageKey), null);
  await ui.act(async () => view.store.toggleTheme());
  assert.equal(pageTheme(), "dark");
  await ui.act(async () => setDevice(false));
  await ui.act(async () => setDevice(true));
  assert.equal(pageTheme(), "dark", "a pick outranks the device");
});

test("provider: clearing the pick returns to the device setting", async () => {
  localStorage.setItem(themeStorageKey, "dark");
  deviceLight = true;
  setPage("dark");
  const view = await mount("/shop");
  await ui.act(async () => view.store.clearSave());
  assert.equal(pageTheme(), "light");
  assert.equal(
    localStorage.getItem(themeStorageKey),
    null,
    "clearing is not a pick"
  );
});

test("provider: under StrictMode a toggle still flips once and is saved", async () => {
  const { StrictMode } = await import("react");
  setPage("dark");
  let store!: Store;
  ui.render(
    <StrictMode>
      <At path="/shop">
        <Probe onReady={(value) => (store = value)} />
      </At>
    </StrictMode>
  );
  await ui.act(async () => {});
  assert.equal(localStorage.getItem(themeStorageKey), null);
  await ui.act(async () => store.toggleTheme());
  assert.equal(pageTheme(), "light");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

test("provider: with storage blocked, a pick made in this visit still outranks a device change", async () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); }
  };
  globalValue("localStorage", blocked);
  try {
    setPage("dark");
    const view = await mount("/shop");
    await ui.act(async () => view.store.toggleTheme());
    assert.equal(pageTheme(), "light");
    await ui.act(async () => setDevice(false));
    assert.equal(pageTheme(), "light");
  } finally {
    globalValue("localStorage", dom.window.localStorage);
  }
});

test("⌘H switches the mode on an unlocked page and does nothing on a held one", async () => {
  const press = () =>
    document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "h", metaKey: true, bubbles: true }));
  setPage("dark");
  ui.render(<At path="/shop"><Theme.CMDKeyManager /></At>);
  await ui.act(async () => {});
  await ui.act(async () => press());
  assert.equal(pageTheme(), "light");
  ui.cleanup();
  localStorage.setItem(themeStorageKey, "light");
  setPage("dark");
  ui.render(<At path="/"><Theme.CMDKeyManager /></At>);
  await ui.act(async () => {});
  await ui.act(async () => press());
  assert.equal(pageTheme(), "dark");
  assert.equal(localStorage.getItem(themeStorageKey), "light");
});

test("every mode switch goes through the store; nothing writes the page theme or storage directly", () => {
  for (const file of [
    "src/components/shell/header-panels.tsx",
    "src/components/UX/DarkMode/Darkmode.tsx"
  ]) {
    const source = readFileSync(
      new URL(`../../${file}`, import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(
      source,
      /applyTheme\(|applyDocumentTheme\(|localStorage/,
      file
    );
  }
});
