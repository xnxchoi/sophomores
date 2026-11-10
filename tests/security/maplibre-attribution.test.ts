import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import type { Map as MapLibreMap } from "maplibre-gl";

test("installed AttributionControl sanitizes adjacent remote-source attributes without losing attribution", async (t) => {
  // No scripts, resources, WebGL or real Map instance: exercise the library's
  // public control and its normal style.tileManagers attribution path directly.
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  // v5 prepares a worker URL on import, but this control-only fixture never
  // constructs a Map or starts that worker. JSDOM does not supply Blob URLs.
  Object.defineProperties(dom.window.URL, {
    createObjectURL: { configurable: true, value: () => "blob:synthetic-unused-worker" },
    revokeObjectURL: { configurable: true, value: () => {} },
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    DOMParser: dom.window.DOMParser,
  };
  const descriptors = new Map(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  t.after(() => {
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  // v5's CommonJS distribution exposes default; v6's ESM distribution does not.
  const namespace = await import("maplibre-gl");
  const maplibre = (namespace as { default?: typeof namespace }).default ?? namespace;
  for (const name of ["Map", "Marker", "Popup", "AttributionControl"] as const) {
    assert.equal(typeof maplibre[name], "function", `public ${name} constructor remains available`);
  }

  for (const attributes of [
    'onmouseover="void 0" onfocus="void 0" onclick="void 0" href="javascript:void(0)"',
    'href="javascript:void(0)" onmouseover="void 0" onfocus="void 0" onclick="void 0"',
  ]) {
    await t.test(`removes all dangerous attributes when ${attributes.startsWith("href") ? "href" : "event handlers"} comes first`, () => {
      const subscriptions = new Map<string, Set<unknown>>();
      const map = {
        style: {
          tileManagers: {
            remote: {
              used: true,
              getSource: () => ({
                attribution: `<a ${attributes}>Remote © 지도 🗺️</a> <a href="https://example.com/credits">Safe credits</a>`,
              }),
            },
          },
        },
        getCanvasContainer: () => dom.window.document.body,
        _getUIString: (key: string) => key,
        on: (event: string, listener: unknown) => {
          const listeners = subscriptions.get(event) ?? new Set();
          subscriptions.set(event, new Set([...listeners, listener]));
        },
        off: (event: string, listener: unknown) => {
          subscriptions.set(event, new Set([...(subscriptions.get(event) ?? [])].filter((entry) => entry !== listener)));
        },
      };
      const control = new maplibre.AttributionControl({ compact: false });
      const container = control.onAdd(map as unknown as MapLibreMap);
      dom.window.document.body.appendChild(container);
      try {
        const links = container.querySelectorAll(".maplibregl-ctrl-attrib-inner a");
        assert.equal(links.length, 2, "both attribution links remain rendered");
        assert.equal(links[0].textContent, "Remote © 지도 🗺️");
        assert.equal(links[1].textContent, "Safe credits");
        assert.equal(links[1].getAttribute("href"), "https://example.com/credits");
        for (const attribute of ["onmouseover", "onfocus", "onclick", "href"]) {
          assert.equal(links[0].hasAttribute(attribute), false, `${attribute} must not survive sanitization`);
        }
        assert.equal(subscriptions.size, 5, "control subscribes to map updates");
      } finally {
        control.onRemove();
      }
      assert.equal(container.isConnected, false, "onRemove detaches the control");
      assert.equal([...subscriptions.values()].every((listeners) => listeners.size === 0), true, "onRemove unsubscribes all listeners");
    });
  }
});
