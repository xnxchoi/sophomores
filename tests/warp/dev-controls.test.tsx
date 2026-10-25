import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WarpTuning } from "../../components/Warp/_shared/tuning";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let WarpControls: typeof import("../../components/Warp/dev-controls").default;
let defaults: WarpTuning;
const previous = new Map<string, PropertyDescriptor | undefined>();
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
    "HTMLInputElement",
    "Event",
    "Node",
    "IS_REACT_ACT_ENVIRONMENT"
  ]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value:
        key === "window"
          ? dom.window
          : key === "IS_REACT_ACT_ENVIRONMENT"
            ? true
            : dom.window[key as keyof typeof dom.window]
    });
  }
  ui = await import("@testing-library/react/pure");
  WarpControls = (await import("../../components/Warp/dev-controls")).default;
  defaults = (await import("../../components/Warp/_shared/tuning"))
    .DEFAULT_WARP_TUNING;
});
afterEach(() => ui?.cleanup());
after(() => {
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("starts collapsed without changing the current look or adding a modal", () => {
  const html = renderToStaticMarkup(
    <WarpControls
      tuning={defaults}
      progress={0}
      playing={false}
      onChange={() => assert.fail("must not edit on mount")}
      onSeek={() => {}}
      onReplay={() => {}}
      onPlay={() => {}}
    />
  );
  const parsed = new JSDOM(html);
  assert.equal(
    parsed.window.document.querySelector("button")?.textContent,
    "Warp controls"
  );
  assert.equal(
    parsed.window.document
      .querySelector("button")
      ?.getAttribute("aria-expanded"),
    "false"
  );
  assert.equal(parsed.window.document.querySelector("input"), null);
  assert.equal(parsed.window.document.querySelector("dialog"), null);
  parsed.window.close();
});

test("controls update immutably, expose all visual layers, and reset to exact defaults", () => {
  const changes: WarpTuning[] = [];
  function Harness() {
    const [tuning, setTuning] = useState<WarpTuning>(defaults);
    return (
      <WarpControls
        tuning={tuning}
        progress={42}
        playing={false}
        onChange={(next) => {
          changes.push(next);
          setTuning(next);
        }}
        onSeek={() => {}}
        onReplay={() => {}}
        onPlay={() => {}}
      />
    );
  }
  const view = ui.render(<Harness />);
  ui.fireEvent.click(view.getByRole("button", { name: "Warp controls" }));
  const panel = view.getByRole("complementary", { name: "Warp controls" });
  assert.ok(panel.hasAttribute("data-lenis-prevent"));
  assert.ok(panel.closest("[data-warp-controls]"));
  assert.ok(view.getAllByRole("slider").length >= 15);
  assert.equal(view.getAllByRole("checkbox").length, 4);
  ui.fireEvent.change(view.getByRole("slider", { name: "Ring size" }), {
    target: { value: "1.5" }
  });
  assert.equal(changes.at(-1)?.ringScale, 1.5);
  assert.notEqual(changes.at(-1), defaults);
  ui.fireEvent.click(view.getByRole("checkbox", { name: "Show ring" }));
  assert.equal(changes.at(-1)?.showRing, false);
  assert.equal(defaults.showRing, true);
  ui.fireEvent.click(view.getByRole("button", { name: "Reset look" }));
  assert.deepEqual(changes.at(-1), defaults);
});

test("transport uses fractional seek and preserves caller-owned play/replay behavior", () => {
  const seeks: number[] = [];
  let replays = 0;
  let plays = 0;
  const view = ui.render(
    <WarpControls
      tuning={defaults}
      progress={42}
      playing
      onChange={() => {}}
      onSeek={(n) => seeks.push(n)}
      onReplay={() => {
        replays++;
      }}
      onPlay={() => {
        plays++;
      }}
    />
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Warp controls" }));
  ui.fireEvent.change(view.getByRole("slider", { name: "Sequence progress" }), {
    target: { value: "70" }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Stop" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Replay" }));
  assert.deepEqual(seeks, [0.7]);
  assert.equal(plays, 1);
  assert.equal(replays, 1);
});

test("Escape closes only the inspector and returns keyboard focus to its launcher", () => {
  const view = ui.render(
    <WarpControls
      tuning={defaults}
      progress={0}
      playing={false}
      onChange={() => {}}
      onSeek={() => {}}
      onReplay={() => {}}
      onPlay={() => {}}
    />
  );
  const launcher = view.getByRole("button", { name: "Warp controls" });
  ui.fireEvent.click(launcher);
  const close = view.getByRole("button", { name: "Close warp controls" });
  assert.equal(dom.window.document.activeElement, close);
  ui.fireEvent.keyDown(close, { key: "Escape" });
  assert.equal(view.queryByRole("complementary"), null);
  assert.equal(dom.window.document.activeElement, launcher);
});

test("copy reports success only after clipboard acceptance and exposes failures", async () => {
  const copied: string[] = [];
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async (value: string) => {
        copied.push(value);
      }
    }
  });
  const view = ui.render(
    <WarpControls
      tuning={defaults}
      progress={0}
      playing={false}
      onChange={() => {}}
      onSeek={() => {}}
      onReplay={() => {}}
      onPlay={() => {}}
    />
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Warp controls" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Copy settings" }));
  await ui.waitFor(() =>
    assert.match(
      view.getByRole("status", { name: "Settings feedback" }).textContent ?? "",
      /Copied/
    )
  );
  assert.deepEqual(JSON.parse(copied[0]), defaults);
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("denied");
      }
    }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Copy settings" }));
  await ui.waitFor(() =>
    assert.match(
      view.getByRole("status", { name: "Settings feedback" }).textContent ?? "",
      /Could not copy/
    )
  );
});
