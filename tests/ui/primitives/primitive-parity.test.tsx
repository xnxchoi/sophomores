import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, afterEach, before, test } from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import { cn } from "cn";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let buttons: typeof import("../../../components/ui/button");
let labels: typeof import("../../../components/ui/label");
let separators: typeof import("../../../components/ui/separator");
let hooks: ReturnType<typeof registerHooks>;
const previous = new Map<string, PropertyDescriptor | undefined>();
const cursor = { states: [] as Array<string | null> };
const cursorKey = "__sphmrsPrimitiveCursorTest";

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/", pretendToBeVisual: true
  });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLButtonElement", "HTMLInputElement", "SVGElement", "Element", "Node", "Event", "MouseEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "IS_REACT_ACT_ENVIRONMENT", cursorKey]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" ? dom.window
      : key === "IS_REACT_ACT_ENVIRONMENT" ? true
      : key === cursorKey ? cursor
      : dom.window[key as keyof typeof dom.window];
    Object.defineProperty(globalThis, key, { configurable: true, writable: true,
      value: typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(dom.window) : value });
  }
  // Isolate cursor state, not component behavior: importing its production
  // provider would otherwise pull unrelated graphics and application stores.
  const url = `data:text/javascript,${encodeURIComponent(`
    export function useDomCursor({onEnter,onLeave,enterCondition}) {
      return {
        onMouseEnter(event) { globalThis.${cursorKey}.states.push(enterCondition?.(event) ?? null); onEnter?.(event); },
        onMouseLeave(event) { globalThis.${cursorKey}.states.push(null); onLeave?.(event); }
      };
    }
    export function useCursorHandlers() { return {}; }
  `)}`;
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.endsWith("/cursorWrapper")) return { url, shortCircuit: true };
      return nextResolve(specifier, context);
    },
    load(moduleUrl, context, nextLoad) {
      if (moduleUrl === url) return { format: "module", source: decodeURIComponent(url.slice("data:text/javascript,".length)), shortCircuit: true };
      return nextLoad(moduleUrl, context);
    }
  });
  ui = await import("@testing-library/react/pure");
  buttons = await import("../../../components/ui/button");
  labels = await import("../../../components/ui/label");
  separators = await import("../../../components/ui/separator");
});

afterEach(async () => {
  await ui?.act(async () => {
    ui.cleanup();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
  cursor.states = [];
});
after(() => {
  hooks?.deregister();
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

for (const file of ["button", "label", "separator"]) {
  test(`${file} primitive no longer directly imports Radix`, () => {
    const source = readFileSync(new URL(`../../../components/ui/${file}.tsx`, import.meta.url), "utf8");
    assert.equal(/from\s+["']@radix-ui\//.test(source), false, `${file} still imports a direct Radix primitive`);
  });
}

test("legacy native buttons retain implicit submit, explicit type and omitted-variant styling", () => {
  for (const Button of [buttons.HA_Button, buttons.HA_VaultButton]) {
    let submitted = 0;
    const view = ui.render(<form onSubmit={(event) => { event.preventDefault(); submitted++; }}>
      <Button className="custom-native">Submit</Button>
      <Button type="button">Do not submit</Button>
    </form>);
    const submit = view.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
    assert.equal(submit.getAttribute("type"), null);
    assert.equal(submit.type, "submit");
    assert.equal(submit.getAttribute("data-slot"), "button");
    assert.equal(submit.getAttribute("data-themed"), "background-color,color");
    assert.ok(submit.classList.contains("custom-native"));
    assert.ok(!submit.classList.contains("h-14"), "omitted HA variant must not acquire default dimensions");
    ui.fireEvent.click(submit);
    ui.fireEvent.click(view.getByRole("button", { name: "Do not submit" }));
    assert.equal(submitted, 1);
    view.unmount();
  }
});

test("legacy variant and size combinations retain their existing classes", () => {
  for (const Button of [buttons.HA_Button, buttons.HA_VaultButton]) {
    for (const variant of ["default", "destructive", "outline", "secondary", "ghost", "link"] as const) {
      for (const size of ["default", "sm", "lg", "icon", "icon-sm", "icon-lg"] as const) {
        const view = ui.render(<Button variant={variant} size={size}>Styled</Button>);
        const element = view.getByRole("button");
        const expected = cn(buttons.HA_buttonVariants({ variant, size }), "transition-colors").split(" ");
        for (const token of expected) assert.ok(element.classList.contains(token), `missing ${token}`);
        view.unmount();
      }
    }
  }
});

test("disabled legacy buttons are actually disabled and cannot activate", () => {
  for (const Button of [buttons.HA_Button, buttons.HA_VaultButton]) {
    let calls = 0;
    const view = ui.render(<Button disabled onClick={() => calls++}>Unavailable</Button>);
    const element = view.getByRole("button") as HTMLButtonElement;
    assert.equal(element.disabled, true);
    ui.fireEvent.click(element);
    assert.equal(calls, 0);
    view.unmount();
  }
});

test("asChild preserves a custom anchor host, both refs and child-first event cancellation", () => {
  function Link(props: React.ComponentProps<"a">) { return <a {...props} />; }
  for (const Button of [buttons.HA_Button, buttons.HA_VaultButton]) {
    const events: string[] = [];
    const outer = React.createRef<HTMLButtonElement>();
    const child = React.createRef<HTMLAnchorElement>();
    const view = ui.render(<Button asChild ref={outer} className="parent-class" title="parent"
      style={{ color: "red", marginTop: "2px" }} onClick={() => events.push("parent")}>
      <Link ref={child} href="/tickets" title="child" className="child-class"
        style={{ color: "blue" }} onClick={(event) => { events.push("child"); event.preventDefault(); }}>Tickets</Link>
    </Button>);
    const element = view.getByRole("link", { name: "Tickets" });
    assert.equal(view.container.children.length, 1);
    assert.equal(element.tagName, "A");
    assert.equal(element.getAttribute("href"), "/tickets");
    assert.equal(element.getAttribute("role"), null);
    assert.equal(element.getAttribute("tabindex"), null);
    assert.equal(element.getAttribute("title"), "child");
    assert.equal(element.style.color, "blue");
    assert.equal(element.style.marginTop, "2px");
    assert.ok(element.classList.contains("parent-class") && element.classList.contains("child-class"));
    assert.ok(outer.current === element && child.current === element);
    ui.fireEvent.click(element);
    assert.deepEqual(events, ["child", "parent"], "preventDefault cancels navigation, not the parent's handler");
    view.unmount();
    assert.ok(outer.current === null && child.current === null);
  }
});

test("native button refs and cursor handlers survive polymorphic rendering", () => {
  const events: string[] = [];
  const ref = React.createRef<HTMLButtonElement>();
  const view = ui.render(<buttons.HA_Button ref={ref} onMouseEnter={() => events.push("enter")}
    onMouseLeave={() => events.push("leave")}>Cursor</buttons.HA_Button>);
  const element = view.getByRole("button");
  assert.ok(ref.current === element);
  ui.fireEvent.mouseEnter(element);
  ui.fireEvent.mouseLeave(element);
  assert.deepEqual(events, ["enter", "leave"]);
  assert.deepEqual(cursor.states, ["FOCUS", null]);
  element.focus();
  assert.ok(document.activeElement === element);
  view.unmount();
  assert.ok(ref.current === null);
});

test("Motion legacy button retains its DOM ref without leaking motion props", () => {
  const ref = React.createRef<HTMLButtonElement>();
  const view = ui.render(<buttons.HA_Mutton ref={ref} initial={false} animate={{ opacity: 1 }}>Motion</buttons.HA_Mutton>);
  const element = view.getByRole("button");
  assert.ok(ref.current === element);
  assert.equal(element.getAttribute("initial"), null);
  assert.equal(element.getAttribute("animate"), null);
  view.unmount();
  assert.ok(ref.current === null);
});

test("asChild rejects text or multiple elements instead of creating a wrapper", (t) => {
  t.mock.method(console, "error", () => undefined);
  for (const Button of [buttons.HA_Button, buttons.HA_VaultButton]) {
    assert.throws(() => ui.render(<Button asChild>not an element</Button>));
    assert.throws(() => ui.render(<Button asChild><span>One</span><span>Two</span></Button>));
  }
});

test("legacy label retains explicit association, ref and its visual treatment", () => {
  const ref = React.createRef<HTMLLabelElement>();
  let activations = 0;
  const view = ui.render(<><labels.HA_Label htmlFor="upload" ref={ref} className="extra-label">Upload</labels.HA_Label>
    <input id="upload" onClick={() => activations++} /></>);
  const label = view.getByText("Upload") as HTMLLabelElement;
  assert.equal(label.tagName, "LABEL");
  assert.ok(label.control === view.container.querySelector("input"));
  assert.ok(ref.current === label);
  assert.equal(label.getAttribute("data-slot"), "label");
  for (const token of ["text-[14px]", "leading-none", "font-medium", "select-none", "extra-label"]) assert.ok(label.classList.contains(token));
  ui.fireEvent.click(label);
  assert.equal(activations, 1);
  view.unmount();
  assert.ok(ref.current === null);
});

test("legacy label runs caller mousedown before preventing multi-click selection", () => {
  const prevented: boolean[] = [];
  const view = ui.render(<labels.HA_Label onMouseDown={(event) => prevented.push(event.defaultPrevented)}>Select</labels.HA_Label>);
  const label = view.getByText("Select");
  assert.equal(ui.fireEvent.mouseDown(label, { detail: 1 }), true);
  assert.equal(ui.fireEvent.mouseDown(label, { detail: 2 }), false);
  assert.deepEqual(prevented, [false, false]);
});

test("legacy label leaves interactive descendants' mousedown alone", () => {
  let calls = 0;
  const view = ui.render(<labels.HA_Label onMouseDown={() => calls++}>Action<button type="button">Child</button></labels.HA_Label>);
  assert.equal(ui.fireEvent.mouseDown(view.getByRole("button"), { detail: 2 }), true);
  assert.equal(calls, 0);
});

test("legacy label keeps asChild compatibility without an extra host", () => {
  const view = ui.render(<labels.HA_Label asChild><label htmlFor="native">Native label</label></labels.HA_Label>);
  const label = view.getByText("Native label");
  assert.equal(view.container.children.length, 1);
  assert.equal(label.tagName, "LABEL");
  assert.equal(label.getAttribute("for"), "native");
  assert.equal(label.getAttribute("data-slot"), "label");
});

test("legacy separators retain orientation, decorative semantics, dimensions and refs", () => {
  for (const orientation of ["horizontal", "vertical"] as const) {
    for (const decorative of [true, false]) {
      const ref = React.createRef<HTMLDivElement>();
      const view = ui.render(<separators.HA_Separator ref={ref} orientation={orientation} decorative={decorative} className="custom-separator" />);
      const element = view.container.firstElementChild as HTMLDivElement;
      assert.equal(element.tagName, "DIV");
      assert.equal(element.getAttribute("data-slot"), "separator-root");
      assert.equal(element.getAttribute("data-orientation"), orientation);
      assert.equal(element.getAttribute("role"), decorative ? "none" : "separator");
      assert.equal(element.getAttribute("aria-orientation"), !decorative && orientation === "vertical" ? "vertical" : null);
      assert.ok(element.classList.contains("custom-separator"));
      assert.ok(element.classList.contains("data-[orientation=horizontal]:h-px"));
      assert.ok(element.classList.contains("data-[orientation=vertical]:w-px"));
      assert.ok(ref.current === element);
      view.unmount();
      assert.ok(ref.current === null);
    }
  }
});

test("legacy separator caller overrides remain authoritative", () => {
  const view = ui.render(<separators.HA_Separator orientation="vertical" data-slot="sidebar-separator" role="presentation" className="h-[16px]" />);
  const element = view.container.firstElementChild!;
  assert.equal(element.getAttribute("role"), "presentation");
  assert.equal(element.getAttribute("data-slot"), "sidebar-separator");
  assert.ok(element.classList.contains("h-[16px]"));
});

test("legacy separator keeps asChild compatibility and composed refs", () => {
  const outer = React.createRef<HTMLDivElement>();
  const child = React.createRef<HTMLSpanElement>();
  const view = ui.render(<separators.HA_Separator asChild ref={outer} orientation="vertical">
    <span ref={child} className="child-separator" />
  </separators.HA_Separator>);
  const element = view.container.firstElementChild!;
  assert.equal(view.container.children.length, 1);
  assert.equal(element.tagName, "SPAN");
  assert.equal(element.getAttribute("data-orientation"), "vertical");
  assert.ok(element.classList.contains("child-separator"));
  assert.ok(outer.current === element && child.current === element);
  view.unmount();
  assert.ok(outer.current === null && child.current === null);
});
