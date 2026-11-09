import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { JSDOM } from "jsdom";
import { useState } from "react";
import type { SequenceDraft } from "@/components/Warp/_shared/sequence-editor";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Editor: typeof import("@/components/Warp/editor/sequence-editor").default;
let defaults: SequenceDraft;
const previous = new Map<string, PropertyDescriptor | undefined>();
const vendorStyles = registerHooks({
  load(url, context, nextLoad) {
    if (
      url.endsWith("react-timeline-editor.css") ||
      (url.includes("react-bezier-curve-editor") && url.endsWith("/index.css"))
    )
      return { format: "module", source: "export {};", shortCircuit: true };
    return nextLoad(url, context);
  }
});
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
    "Element",
    "ResizeObserver",
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
            : key === "ResizeObserver"
              ? class {
                  observe() {}
                  disconnect() {}
                }
              : dom.window[key as keyof typeof dom.window]
    });
  }
  ui = await import("@testing-library/react/pure");
  Editor = (await import("@/components/Warp/editor/sequence-editor"))
    .default;
  defaults = (
    await import("@/components/Warp/_shared/sequence-editor")
  ).createDefaultSequence();
});
afterEach(async () => {
  if (!ui) return;
  await ui.act(async () => {
    ui.cleanup();
    // React 19 can already have a host-scheduled passive-effects callback.
    // Let that turn finish while JSDOM globals still exist, before final teardown.
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
});
after(() => {
  vendorStyles.deregister();
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("editor starts collapsed and opens on the separate opening clock", () => {
  const view = ui.render(
    <Editor
      draft={defaults}
      defaults={defaults}
      onChange={() => assert.fail("no mount edits")}
      openingTime={1}
      scrollProgress={20}
      ready
      playing={null}
      onSeek={() => {}}
      onPlay={() => {}}
      onPause={() => {}}
      onReplay={() => {}}
    />
  );
  const launcher = view.getByRole("button", { name: "Sequence editor" });
  assert.equal(launcher.getAttribute("aria-expanded"), "false");
  ui.fireEvent.click(launcher);
  assert.ok(
    view
      .getByRole("complementary", { name: "Sequence editor" })
      .hasAttribute("data-lenis-prevent")
  );
  assert.equal(
    view
      .getByRole("tab", { name: "Page reveal · seconds" })
      .getAttribute("aria-selected"),
    "true"
  );
  assert.ok(
    view.getByRole("spinbutton", { name: "Opening duration (seconds)" })
  );
  assert.equal(
    dom.window.document.activeElement,
    view.getByRole("button", { name: "Play" })
  );
  ui.fireEvent.keyDown(
    view.getByRole("button", { name: "Close sequence editor" }),
    { key: "Escape" }
  );
  assert.equal(view.queryByRole("complementary"), null);
  assert.equal(dom.window.document.activeElement, launcher);
});

test("valid numeric changes are immutable and invalid intervals expose feedback", () => {
  const changes: SequenceDraft[] = [];
  function Harness() {
    const [draft, setDraft] = useState(defaults);
    return (
      <Editor
        draft={draft}
        defaults={defaults}
        onChange={(next) => {
          changes.push(next);
          setDraft(next);
        }}
        openingTime={1}
        scrollProgress={20}
        ready
        playing={null}
        onSeek={() => {}}
        onPlay={() => {}}
        onPause={() => {}}
        onReplay={() => {}}
      />
    );
  }
  const view = ui.render(<Harness />);
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  ui.fireEvent.change(view.getByRole("spinbutton", { name: "Clip start" }), {
    target: { value: "0.05" }
  });
  assert.equal(changes.at(-1)?.clips.openingText.start, 0.05);
  assert.notEqual(changes.at(-1), defaults);
  ui.fireEvent.change(view.getByRole("spinbutton", { name: "Clip end" }), {
    target: { value: "0.01" }
  });
  assert.match(
    view.getByRole("status", { name: "Sequence feedback" }).textContent ?? "",
    /invalid/i
  );
  assert.equal(changes.length, 1);
});

test("selection supports pointer-clamped keyboard seeking and disabling auto-seek", () => {
  const seeks: [string, number][] = [];
  const view = ui.render(
    <Editor
      draft={defaults}
      defaults={defaults}
      onChange={() => {}}
      openingTime={1}
      scrollProgress={20}
      ready
      playing={null}
      onSeek={(domain, time) => seeks.push([domain, time])}
      onPlay={() => {}}
      onPause={() => {}}
      onReplay={() => {}}
    />
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  ui.fireEvent.change(view.getByLabelText("Seek selection to"), {
    target: { value: "pointer" }
  });
  ui.fireEvent.click(
    view.getByRole("button", { name: "Select Headline reveal" })
  );
  assert.deepEqual(seeks.at(-1), [
    "opening",
    Math.min(
      defaults.clips.openingText.end,
      Math.max(defaults.clips.openingText.start, 1)
    )
  ]);
  ui.fireEvent.click(
    view.getByRole("checkbox", { name: "Auto-seek on selection" })
  );
  ui.fireEvent.click(
    view.getByRole("button", { name: "Select Headline reveal" })
  );
  assert.equal(seeks.length, 1);
});

test("vendor timeline has no playback runner and uses real click time", () => {
  const source = readFileSync(
    new URL(
      "../../src/components/Warp/editor/domain-timeline.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(source, /autoReRender=\{false\}/);
  assert.match(source, /effects=\{\{\}\}/);
  assert.doesNotMatch(source, /\.play\(/);
  assert.match(source, /onClickActionOnly/);
  assert.match(source, /onSelect\(.*time/);
});

test("numeric inspector retains intermediate text and locks the corona handoff edges", () => {
  const changes: SequenceDraft[] = [];
  function Harness() {
    const [draft, setDraft] = useState(defaults);
    return (
      <Editor
        draft={draft}
        defaults={defaults}
        onChange={(next) => {
          changes.push(next);
          setDraft(next);
        }}
        openingTime={3}
        scrollProgress={25}
        ready
        playing={null}
        onSeek={() => {}}
        onPlay={() => {}}
        onPause={() => {}}
        onReplay={() => {}}
      />
    );
  }
  const view = ui.render(<Harness />);
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  ui.fireEvent.click(view.getByRole("tab", { name: "Scroll · percent" }));
  ui.fireEvent.click(
    view.getByRole("button", { name: "Select Headline fade" })
  );
  const end = view.getByRole("spinbutton", {
    name: "Clip end"
  }) as HTMLInputElement;
  ui.fireEvent.change(end, { target: { value: "3" } });
  assert.equal(end.value, "3", "an invalid partial number remains editable");
  assert.equal(changes.length, 0);
  ui.fireEvent.change(end, { target: { value: "35" } });
  assert.equal(changes.at(-1)?.clips.headlineFade.end, 35);
  const y1 = view.getByRole("spinbutton", {
    name: "Easing y1"
  }) as HTMLInputElement;
  ui.fireEvent.change(y1, { target: { value: "" } });
  assert.equal(y1.value, "");
  ui.fireEvent.change(y1, { target: { value: "-0.5" } });
  assert.equal(changes.at(-1)?.clips.headlineFade.ease[1], -0.5);
  ui.fireEvent.click(
    view.getByRole("button", { name: "Select Warp approach" })
  );
  assert.equal(
    (view.getByRole("spinbutton", { name: "Clip start" }) as HTMLInputElement)
      .disabled,
    true
  );
  ui.fireEvent.click(
    view.getByRole("button", { name: "Select Ring settlement" })
  );
  assert.equal(
    (view.getByRole("spinbutton", { name: "Clip end" }) as HTMLInputElement)
      .disabled,
    true
  );
  assert.match(
    view.getByText(/Original corona · 70–100% — read-only reference/)
      .textContent ?? "",
    /read-only/
  );
});

test("scene picking chooses active scroll clips after a completed opening and does not intercept controls", () => {
  const draft = {
    ...defaults,
    clips: {
      ...defaults.clips,
      openingText: {
        ...defaults.clips.openingText,
        end: defaults.openingDuration
      }
    }
  };
  const seeks: [string, number][] = [];
  let navigations = 0;
  const view = ui.render(
    <>
      <a
        href="#heading"
        data-sequence-clips="openingText headlineSplit headlineScale headlineFade"
        onClick={() => navigations++}
      >
        Pick this heading
      </a>
      <button
        data-warp-controls=""
        data-sequence-clips="openingText"
        onClick={() => navigations++}
      >
        Other scene control
      </button>
      <Editor
        draft={draft}
        defaults={defaults}
        onChange={() => {}}
        openingTime={draft.openingDuration}
        scrollProgress={25}
        ready
        playing={null}
        onSeek={(domain, value) => seeks.push([domain, value])}
        onPlay={() => {}}
        onPause={() => {}}
        onReplay={() => {}}
      />
    </>
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Inspect scene" }));
  ui.fireEvent.click(view.getByText("Pick this heading"));
  assert.equal(navigations, 0);
  assert.equal(
    view
      .getByRole("tab", { name: "Scroll · percent" })
      .getAttribute("aria-selected"),
    "true"
  );
  assert.equal(
    view
      .getByRole("button", { name: "Select Headline fade" })
      .getAttribute("aria-pressed"),
    "true"
  );
  assert.deepEqual(seeks.at(-1), ["scroll", draft.clips.headlineFade.start]);
  assert.equal(
    view
      .getByRole("button", { name: "Cancel scene pick" })
      .getAttribute("aria-pressed"),
    "true"
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Other scene control" }));
  assert.equal(navigations, 1);
  assert.equal(seeks.length, 1);
  ui.fireEvent.click(
    view.getByRole("button", { name: "Close sequence editor" })
  );
  ui.fireEvent.click(view.getByText("Pick this heading"));
  assert.equal(navigations, 2);
});

test("draft transfer exposes clipboard failures, validates imports, and resets immutably", async () => {
  const changes: SequenceDraft[] = [];
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: async () => {
        throw new Error("denied");
      }
    }
  });
  const view = ui.render(
    <Editor
      draft={defaults}
      defaults={defaults}
      onChange={(next) => changes.push(next)}
      openingTime={3}
      scrollProgress={25}
      ready
      playing={null}
      onSeek={() => {}}
      onPlay={() => {}}
      onPause={() => {}}
      onReplay={() => {}}
    />
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  ui.fireEvent.click(view.getByText("Session-only draft · reset, JSON & help"));
  await ui.act(async () => {
    ui.fireEvent.click(view.getByRole("button", { name: "Copy JSON" }));
  });
  await ui.waitFor(() =>
    assert.match(
      view.getByRole("status", { name: "Sequence feedback" }).textContent ?? "",
      /Could not copy/
    )
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Export JSON" }));
  const json = view.getByRole("textbox", {
    name: "Sequence JSON"
  }) as HTMLTextAreaElement;
  assert.deepEqual(JSON.parse(json.value), defaults);
  ui.fireEvent.change(json, {
    target: { value: JSON.stringify({ ...defaults, version: 9 }) }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Apply JSON draft" }));
  assert.equal(changes.length, 0);
  assert.match(
    view.getByRole("status", { name: "Sequence feedback" }).textContent ?? "",
    /Invalid JSON draft/
  );
  ui.fireEvent.change(json, {
    target: { value: JSON.stringify({ ...defaults, openingDuration: 4 }) }
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Apply JSON draft" }));
  assert.equal(changes.at(-1)?.openingDuration, 4);
  ui.fireEvent.click(view.getByRole("button", { name: "Reset sequence" }));
  assert.deepEqual(changes.at(-1), defaults);
  assert.notEqual(changes.at(-1)?.clips, defaults.clips);
});

test("transport stays caller-owned and unavailable before renderer readiness", () => {
  const plays: string[] = [];
  const seeks: number[] = [];
  const props = {
    draft: defaults,
    defaults,
    onChange: () => {},
    openingTime: 0,
    scrollProgress: 0,
    ready: false,
    playing: null,
    onSeek: (_domain: string, value: number) => seeks.push(value),
    onPlay: (domain: string) => plays.push(domain),
    onPause: () => {},
    onReplay: () => {}
  };
  const view = ui.render(<Editor {...props} />);
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  assert.equal(
    (view.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled,
    true
  );
  ui.fireEvent.click(
    view.getByRole("button", { name: "Select Headline reveal" })
  );
  assert.equal(seeks.length, 0);
  view.rerender(<Editor {...props} ready />);
  ui.fireEvent.click(view.getByRole("button", { name: "Play" }));
  ui.fireEvent.click(view.getByRole("tab", { name: "Scroll · percent" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Play" }));
  assert.deepEqual(plays, ["opening", "scroll"]);
  ui.fireEvent.change(
    view.getByRole("spinbutton", { name: "Scroll progress (percent)" }),
    { target: { value: "85" } }
  );
  assert.deepEqual(seeks, [defaults.clips.headlineSplit.start, 85]);
});

test("transport exposes the active clock, edit-boundary navigation, and paused restart", () => {
  const seeks: [string, number][] = [];
  const plays: string[] = [];
  let pauses = 0;
  const props = {
    draft: defaults,
    defaults,
    onChange: () => {},
    openingTime: 1,
    scrollProgress: 25,
    ready: true,
    playing: null,
    onSeek: (domain: string, value: number) => seeks.push([domain, value]),
    onPlay: (domain: string) => plays.push(domain),
    onPause: () => {
      pauses++;
    },
    onReplay: () => assert.fail("restart must seek only the active clock")
  };
  const view = ui.render(<Editor {...props} />);
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  assert.equal(
    view.getByLabelText("Playback position").textContent,
    `1.00 / ${defaults.openingDuration.toFixed(2)} s`
  );
  assert.equal(
    view.getByLabelText("Playback position").getAttribute("aria-live"),
    "off"
  );
  assert.equal(
    view.queryByRole("button", { name: /Replay all|Play reveal|Play warp/ }),
    null
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Previous edit" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Next edit" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Go to beginning" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Go to end" }));
  assert.deepEqual(seeks, [
    ["opening", defaults.clips.openingField.start],
    ["opening", defaults.clips.openingText.end],
    ["opening", 0],
    ["opening", defaults.openingDuration]
  ]);
  assert.equal(pauses, 4);
  view.rerender(<Editor {...props} playing="opening" />);
  ui.fireEvent.click(view.getByRole("button", { name: "Pause" }));
  assert.equal(pauses, 5);
  ui.fireEvent.click(view.getByRole("tab", { name: "Scroll · percent" }));
  assert.equal(pauses, 6);
  assert.match(
    view.getByLabelText("Playback position").textContent ?? "",
    /25\.00.*70\.00.*%/
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Go to end" }));
  assert.deepEqual(seeks.at(-1), ["scroll", 70]);
  view.rerender(<Editor {...props} scrollProgress={85} />);
  assert.equal(
    (view.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled,
    true
  );
  assert.equal(
    view.getByLabelText("Playback position").textContent,
    "85.00 / 100.00 %"
  );
  assert.ok(view.getByText("Corona reference · read-only"));
  ui.fireEvent.click(view.getByRole("button", { name: "Go to end" }));
  assert.deepEqual(seeks.at(-1), ["scroll", 70]);
  assert.equal(plays.length, 0);
});

test("transport keyboard shortcuts spare editable controls and clock-tab navigation", () => {
  const plays: string[] = [];
  const seeks: [string, number][] = [];
  const view = ui.render(
    <Editor
      draft={defaults}
      defaults={defaults}
      onChange={() => {}}
      openingTime={1}
      scrollProgress={25}
      ready
      playing={null}
      onSeek={(domain, value) => seeks.push([domain, value])}
      onPlay={(domain) => plays.push(domain)}
      onPause={() => {}}
      onReplay={() => {}}
    />
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  const panel = view.getByRole("complementary", { name: "Sequence editor" });
  ui.fireEvent.keyDown(panel, { key: " " });
  ui.fireEvent.keyDown(panel, { key: "Home" });
  ui.fireEvent.keyDown(panel, { key: "End" });
  assert.deepEqual(plays, ["opening"]);
  assert.deepEqual(seeks, [
    ["opening", 0],
    ["opening", defaults.openingDuration]
  ]);
  ui.fireEvent.keyDown(view.getByRole("button", { name: "Play" }), {
    key: "Home"
  });
  assert.deepEqual(seeks.at(-1), ["opening", 0]);
  for (const element of [
    view.getByRole("spinbutton", { name: "Opening time (seconds)" }),
    view.getByRole("slider", { name: "Scrub page reveal" }),
    view.getByRole("combobox", { name: "Seek selection to" }),
    view.getByRole("button", { name: "Play" })
  ])
    ui.fireEvent.keyDown(element, { key: " " });
  assert.deepEqual(plays, ["opening"]);
  ui.fireEvent.keyDown(
    view.getByRole("tab", { name: "Page reveal · seconds" }),
    { key: "End" }
  );
  assert.equal(
    view
      .getByRole("tab", { name: "Scroll · percent" })
      .getAttribute("aria-selected"),
    "true"
  );
  assert.deepEqual(seeks.at(-1), [
    "scroll",
    defaults.clips.headlineSplit.start
  ]);
  view.rerender(
    <Editor
      draft={defaults}
      defaults={defaults}
      onChange={() => {}}
      openingTime={1}
      scrollProgress={25}
      ready={false}
      playing={null}
      onSeek={() => assert.fail("disabled keyboard seek")}
      onPlay={() => assert.fail("disabled keyboard play")}
      onPause={() => {}}
      onReplay={() => {}}
    />
  );
  ui.fireEvent.keyDown(panel, { key: " " });
  ui.fireEvent.keyDown(panel, { key: "Home" });
});

test("curve handles have names, easing rows are smaller, and vendor zoom is adjustable", () => {
  const view = ui.render(
    <Editor
      draft={defaults}
      defaults={defaults}
      onChange={() => {}}
      openingTime={0}
      scrollProgress={0}
      ready
      playing={null}
      onSeek={() => {}}
      onPlay={() => {}}
      onPause={() => {}}
      onReplay={() => {}}
    />
  );
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  assert.ok(
    view.getByRole("button", {
      name: "First Bézier handle; keyboard users edit x1 and y1"
    })
  );
  assert.ok(
    view.getByRole("button", {
      name: "Second Bézier handle; keyboard users edit x2 and y2"
    })
  );
  ui.fireEvent.change(view.getByRole("combobox", { name: "Timeline zoom" }), {
    target: { value: "200" }
  });
  assert.equal(
    (view.getByRole("combobox", { name: "Timeline zoom" }) as HTMLSelectElement)
      .value,
    "200"
  );
  const source = readFileSync(
    new URL(
      "../../src/components/Warp/editor/domain-timeline.tsx",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(source, /rowHeight: 18/);
});

test("scene picker resolves a visible pointer-transparent passage from the root hit", () => {
  const seeks: [string, number][] = [];
  const view = ui.render(
    <>
      <div
        data-warp-study=""
        data-sequence-clips="warpApproach ringSettlement"
        data-testid="study-root"
      >
        <div data-sequence-clips="openingField warpApproach ringSettlement">
          <div
            className="pointer-events-none"
            data-sequence-clips="passageLine1 passageLine2 passageTravel"
            data-testid="visible-passage"
          >
            Visible passage
          </div>
          <div>
            <div
              data-sequence-clips="headlineFade"
              data-testid="hidden-heading"
            >
              Hidden heading
            </div>
          </div>
          <div data-testid="clipping-wrapper">
            <div>
              <div data-sequence-clips="passageLine2">Clipped passage line</div>
            </div>
          </div>
        </div>
      </div>
      <Editor
        draft={defaults}
        defaults={defaults}
        onChange={() => {}}
        openingTime={defaults.openingDuration}
        scrollProgress={12}
        ready
        playing={null}
        onSeek={(domain, value) => seeks.push([domain, value])}
        onPlay={() => {}}
        onPause={() => {}}
        onReplay={() => {}}
      />
    </>
  );
  for (const element of view.container.querySelectorAll(
    "[data-sequence-clips]"
  )) {
    Object.defineProperty(element, "getBoundingClientRect", {
      value: () => new dom.window.DOMRect(0, 0, 100, 100),
      configurable: true
    });
    Object.defineProperty(element, "checkVisibility", {
      value: () => element.getAttribute("data-testid") !== "hidden-heading",
      configurable: true
    });
  }
  const clippingWrapper = view.getByTestId("clipping-wrapper");
  clippingWrapper.style.overflow = "hidden";
  Object.defineProperty(clippingWrapper, "getBoundingClientRect", {
    value: () => new dom.window.DOMRect(0, 0, 100, 10),
    configurable: true
  });
  ui.fireEvent.click(view.getByRole("button", { name: "Sequence editor" }));
  ui.fireEvent.click(view.getByRole("button", { name: "Inspect scene" }));
  ui.fireEvent.click(view.getByTestId("study-root"), {
    clientX: 50,
    clientY: 50
  });
  assert.equal(
    view
      .getByRole("button", { name: "Select Passage line 1" })
      .getAttribute("aria-pressed"),
    "true"
  );
  assert.deepEqual(seeks.at(-1), ["scroll", defaults.clips.passageLine1.start]);
});
