import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, afterEach, before, test } from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import { cn } from "cn";
import type { ControllerRenderProps, UseFormReturn } from "react-hook-form";

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let badges: typeof import("@/components/ui/badge");
let buttons: typeof import("@/components/ui/button");
let labels: typeof import("@/components/ui/label");
let separators: typeof import("@/components/ui/separator");
let forms: typeof import("@/components/ui/form");
let sidebar: typeof import("@/components/ui/sidebar");
let rhf: typeof import("react-hook-form");
let legacySlot: typeof import("@radix-ui/react-slot");
let hooks: ReturnType<typeof registerHooks>;
let sidebarSlots: Array<{ Component: React.ElementType; slot: string; tag: string }>;
const previous = new Map<string, PropertyDescriptor | undefined>();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/", pretendToBeVisual: true
  });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLButtonElement", "HTMLInputElement", "HTMLFormElement", "HTMLLabelElement", "SVGElement", "Element", "Node", "DocumentFragment", "MutationObserver", "Event", "MouseEvent", "FocusEvent", "KeyboardEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" ? dom.window
      : key === "IS_REACT_ACT_ENVIRONMENT" ? true
      : dom.window[key as keyof typeof dom.window];
    Object.defineProperty(globalThis, key, { configurable: true, writable: true,
      value: typeof value === "function" && ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key) ? value.bind(dom.window) : value });
  }
  // Stub only application-wide cursor/device providers. Composition, RHF,
  // SidebarProvider/useSidebar and the installed primitives remain real.
  const cursorSource = `
    export function useCursorHandlers(_scope, {onEnter,onLeave} = {}) {
      return { onMouseEnter: onEnter, onMouseLeave: onLeave };
    }
    export function useDomCursor({onEnter,onLeave}) {
      return { onMouseEnter: onEnter, onMouseLeave: onLeave };
    }
  `;
  const mobileSource = "export function useIsMobile() { return {isMobile: false}; }";
  const cursorUrl = `data:text/javascript,${encodeURIComponent(cursorSource)}`;
  const mobileUrl = `data:text/javascript,${encodeURIComponent(mobileSource)}`;
  hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.endsWith("/cursorWrapper")) return { url: cursorUrl, shortCircuit: true };
      if (specifier.endsWith("/MiddleMan")) return { url: mobileUrl, shortCircuit: true };
      return nextResolve(specifier, context);
    },
    load(moduleUrl, context, nextLoad) {
      if (moduleUrl === cursorUrl || moduleUrl === mobileUrl) return {
        format: "module", source: decodeURIComponent(moduleUrl.slice("data:text/javascript,".length)), shortCircuit: true
      };
      return nextLoad(moduleUrl, context);
    }
  });
  ui = await import("@testing-library/react/pure");
  rhf = await import("react-hook-form");
  legacySlot = await import("@radix-ui/react-slot");
  badges = await import("@/components/ui/badge");
  buttons = await import("@/components/ui/button");
  labels = await import("@/components/ui/label");
  separators = await import("@/components/ui/separator");
  forms = await import("@/components/ui/form");
  sidebar = await import("@/components/ui/sidebar");
  sidebarSlots = [
    { Component: sidebar.SidebarGroupLabel, slot: "sidebar-group-label", tag: "DIV" },
    { Component: sidebar.SidebarGroupAction, slot: "sidebar-group-action", tag: "BUTTON" },
    { Component: sidebar.SidebarMenuButton, slot: "sidebar-menu-button", tag: "BUTTON" },
    { Component: sidebar.SidebarMenuAction, slot: "sidebar-menu-action", tag: "BUTTON" },
    { Component: sidebar.SidebarMenuSubButton, slot: "sidebar-menu-sub-button", tag: "A" }
  ];
});

afterEach(async () => {
  await ui?.act(async () => {
    ui.cleanup();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
});
after(() => {
  hooks?.deregister();
  dom?.window.close();
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

for (const file of ["badge", "form", "sidebar"]) {
  test(`${file} composition no longer directly imports Radix`, () => {
    const source = readFileSync(new URL(`../../../components/ui/${file}.tsx`, import.meta.url), "utf8");
    assert.equal(/from\s+["']@radix-ui\//.test(source), false, `${file} still imports a direct Radix primitive`);
    assert.match(source, /from\s+["']@base-ui\/react\/use-render["']/);
  });
}

test("legacy badge retains its native host, variants, caller props and ref", () => {
  for (const variant of ["default", "secondary", "destructive", "outline"] as const) {
    const ref = React.createRef<HTMLSpanElement>();
    let clicks = 0;
    const view = ui.render(<badges.HA_Badge ref={ref} variant={variant} className="extra-badge"
      title="Native badge" aria-label="Unread" onClick={() => clicks++}>알림 🧪 &lt;script&gt;</badges.HA_Badge>);
    const element = view.getByLabelText("Unread");
    assert.equal(element.tagName, "SPAN");
    assert.equal(element.getAttribute("data-slot"), "badge");
    assert.equal(element.getAttribute("title"), "Native badge");
    assert.equal(element.textContent, "알림 🧪 <script>");
    assert.ok(element.querySelector("script") === null);
    for (const token of cn(badges.HA_badgeVariants({ variant }), "extra-badge").split(" ")) assert.ok(element.classList.contains(token), token);
    assert.ok(element.classList.contains("extra-badge"));
    assert.ok(ref.current === element);
    ui.fireEvent.click(element);
    assert.equal(clicks, 1);
    view.unmount();
    assert.ok(ref.current === null);
  }
});

test("legacy badge asChild preserves a custom host, child-first handlers and merged refs/styles", () => {
  function Link(props: React.ComponentProps<"a">) { return <a {...props} />; }
  const events: string[] = [];
  const outer = React.createRef<HTMLSpanElement>();
  const child = React.createRef<HTMLAnchorElement>();
  const view = ui.render(<badges.HA_Badge asChild ref={outer} className="parent-badge" title="parent"
    style={{ color: "red", marginTop: "2px" }} onClick={() => events.push("parent")}>
    <Link ref={child} href="/archive" title="child" className="child-badge" style={{ color: "blue" }}
      onClick={(event) => { events.push("child"); event.preventDefault(); }}>Archive</Link>
  </badges.HA_Badge>);
  const element = view.getByRole("link", { name: "Archive" });
  assert.equal(view.container.children.length, 1);
  assert.equal(element.getAttribute("href"), "/archive");
  assert.equal(element.getAttribute("data-slot"), "badge");
  assert.equal(element.getAttribute("title"), "child");
  assert.equal(element.getAttribute("role"), null);
  assert.equal(element.getAttribute("tabindex"), null);
  assert.equal(element.style.color, "blue");
  assert.equal(element.style.marginTop, "2px");
  assert.ok(element.classList.contains("parent-badge") && element.classList.contains("child-badge"));
  assert.ok(outer.current === element && child.current === element);
  ui.fireEvent.click(element);
  assert.deepEqual(events, ["child", "parent"], "preventDefault must not suppress the parent handler");
  element.focus();
  assert.ok(document.activeElement === element);
  view.unmount();
  assert.ok(outer.current === null && child.current === null);
});

test("both badge APIs retain caller data-slot overrides and the modern render API", () => {
  const modernRef = React.createRef<HTMLAnchorElement>();
  const view = ui.render(<>
    <badges.HA_Badge data-slot="legacy-custom">Legacy</badges.HA_Badge>
    <badges.Badge render={<a ref={modernRef} href="/modern" />} variant="secondary" data-slot="modern-custom">Modern</badges.Badge>
  </>);
  assert.equal(view.getByText("Legacy").getAttribute("data-slot"), "legacy-custom");
  const modern = view.getByRole("link", { name: "Modern" });
  assert.equal(modern.getAttribute("data-slot"), "modern-custom");
  assert.equal(modern.getAttribute("data-variant"), "secondary");
  assert.ok(modernRef.current === modern);
});

test("badge empty asChild content stays empty across element transitions", () => {
  const view = ui.render(<badges.HA_Badge asChild>{null}</badges.HA_Badge>);
  for (const children of [undefined, false, "", <span key="badge">Visible</span>, null]) {
    view.rerender(<badges.HA_Badge asChild>{children}</badges.HA_Badge>);
    assert.equal(view.container.children.length, React.isValidElement(children) ? 1 : 0);
    assert.equal(view.container.textContent, React.isValidElement(children) ? "Visible" : "");
  }
});

test("badge asChild rejects text, zero and multiple hosts", (t) => {
  t.mock.method(console, "error", () => undefined);
  for (const children of ["not an element", 0, [<span key="one" />, <span key="two" />]]) {
    assert.throws(() => ui.render(<badges.HA_Badge asChild>{children}</badges.HA_Badge>), /single React element/);
  }
});

type FormValues = { name: string };

function FormHarness({ children, onReady }: {
  children: React.ReactNode | ((field: ControllerRenderProps<FormValues, "name">) => React.ReactNode);
  onReady?: (methods: UseFormReturn<FormValues>) => void;
}) {
  const methods = rhf.useForm<FormValues>({ defaultValues: { name: "" } });
  React.useEffect(() => { onReady?.(methods); }, [methods, onReady]);
  return <forms.Form {...methods}>
    <forms.FormField control={methods.control} name="name" render={({ field }) => (
      <forms.FormItem>{typeof children === "function" ? children(field) : children}</forms.FormItem>
    )} />
  </forms.Form>;
}

test("FormControl retains RHF values, label association, descriptions, error updates and focus refs", async () => {
  let methods: UseFormReturn<FormValues> | undefined;
  const outer = React.createRef<HTMLElement>();
  const child = React.createRef<HTMLInputElement>();
  const view = ui.render(<FormHarness onReady={(value) => { methods = value; }}>{(field) => <>
    <forms.FormLabel className="extra-label">Name</forms.FormLabel>
    <forms.FormControl ref={outer}><input {...field} ref={(element) => { field.ref(element); child.current = element; }} /></forms.FormControl>
    <forms.FormDescription>Use your name.</forms.FormDescription>
    <forms.FormMessage />
  </>}</FormHarness>);
  const input = view.getByRole("textbox", { name: "Name" }) as HTMLInputElement;
  const label = view.getByText("Name") as HTMLLabelElement;
  const description = view.getByText("Use your name.");
  assert.ok(label.control === input);
  assert.equal(label.htmlFor, input.id);
  assert.equal(label.getAttribute("data-slot"), "form-label");
  assert.equal(label.getAttribute("data-error"), "false");
  assert.ok(label.classList.contains("extra-label"));
  assert.equal(input.getAttribute("data-slot"), "form-control");
  assert.equal(input.getAttribute("aria-describedby"), description.id);
  assert.equal(input.getAttribute("aria-invalid"), "false");
  assert.ok(view.container.querySelector('[data-slot="form-message"]') === null);
  assert.ok(outer.current === input && child.current === input);
  ui.fireEvent.change(input, { target: { value: "이름 🧪 ' OR 1=1" } });
  assert.equal(methods!.getValues("name"), "이름 🧪 ' OR 1=1");
  ui.fireEvent.blur(input);
  assert.equal(methods!.getFieldState("name").isTouched, true);
  await ui.act(async () => { methods!.setError("name", { type: "manual", message: "Name is required 🧪" }); });
  const message = view.getByText("Name is required 🧪");
  assert.equal(message.getAttribute("data-slot"), "form-message");
  assert.equal(input.getAttribute("aria-describedby"), `${description.id} ${message.id}`);
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(label.getAttribute("data-error"), "true");
  await ui.act(async () => { methods!.setFocus("name"); });
  await ui.waitFor(() => assert.ok(document.activeElement === input, "RHF must receive the actual composed input ref"));
  await ui.act(async () => { methods!.clearErrors("name"); });
  assert.equal(input.getAttribute("aria-describedby"), description.id);
  assert.equal(input.getAttribute("aria-invalid"), "false");
  assert.ok(view.container.querySelector('[data-slot="form-message"]') === null);
  view.unmount();
  assert.ok(outer.current === null && child.current === null);
});

test("FormControl's implicit composition merges styles/events and preserves caller then child overrides", () => {
  const events: string[] = [];
  const outer = React.createRef<HTMLElement>();
  const child = React.createRef<HTMLInputElement>();
  const view = ui.render(<FormHarness>
    <forms.FormControl ref={outer} id="caller-id" aria-describedby="caller-help" aria-invalid
      data-slot="caller-control" title="caller" className="parent-control"
      style={{ color: "red", marginTop: "2px" }} onClick={() => events.push("parent")}>
      <input ref={child} id="child-id" aria-describedby="child-help" aria-invalid={false}
        data-slot="child-control" title="child" className="child-control" style={{ color: "blue" }}
        onClick={(event) => { events.push("child"); event.preventDefault(); }} />
    </forms.FormControl>
  </FormHarness>);
  const input = view.getByRole("textbox");
  assert.equal(view.container.querySelector('[data-slot="form-item"]')!.children.length, 1);
  assert.equal(input.id, "child-id");
  assert.equal(input.getAttribute("aria-describedby"), "child-help");
  assert.equal(input.getAttribute("aria-invalid"), "false");
  assert.equal(input.getAttribute("data-slot"), "child-control");
  assert.equal(input.getAttribute("title"), "child");
  assert.equal(input.style.color, "blue");
  assert.equal(input.style.marginTop, "2px");
  assert.ok(input.classList.contains("parent-control") && input.classList.contains("child-control"));
  assert.ok(outer.current === input && child.current === input);
  ui.fireEvent.click(input);
  assert.deepEqual(events, ["child", "parent"]);
  view.unmount();
  assert.ok(outer.current === null && child.current === null);
});

test("FormControl caller attributes remain authoritative when the child does not override them", () => {
  const view = ui.render(<FormHarness>
    <forms.FormControl id="caller-id" aria-describedby="caller-help" aria-invalid data-slot="caller-control"><input /></forms.FormControl>
  </FormHarness>);
  const input = view.getByRole("textbox");
  assert.equal(input.id, "caller-id");
  assert.equal(input.getAttribute("aria-describedby"), "caller-help");
  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(input.getAttribute("data-slot"), "caller-control");
});

test("FormControl empty children stay empty and can transition back to a field", () => {
  const view = ui.render(<FormHarness><forms.FormControl>{null}</forms.FormControl></FormHarness>);
  for (const children of [undefined, false, "", <input key="field" />, null]) {
    view.rerender(<FormHarness><forms.FormControl>{children}</forms.FormControl></FormHarness>);
    const item = view.container.querySelector('[data-slot="form-item"]')!;
    assert.equal(item.children.length, React.isValidElement(children) ? 1 : 0);
    assert.equal(item.textContent, "");
  }
});

test("FormControl rejects text, zero and multiple controls instead of wrapping them", (t) => {
  t.mock.method(console, "error", () => undefined);
  for (const children of ["not an element", 0, [<input key="one" />, <input key="two" />]]) {
    assert.throws(() => ui.render(<FormHarness><forms.FormControl>{children}</forms.FormControl></FormHarness>), /single React element/);
  }
});

test("all five sidebar composition sites retain native hosts, metadata, classes and refs", () => {
  for (const { Component, slot, tag } of sidebarSlots) {
    const ref = React.createRef<HTMLElement>();
    const view = ui.render(<sidebar.SidebarProvider><Component ref={ref} className="extra-sidebar">Native</Component></sidebar.SidebarProvider>);
    const element = view.getByText("Native");
    assert.equal(element.tagName, tag, slot);
    assert.equal(element.getAttribute("data-slot"), slot);
    assert.equal(element.getAttribute("data-sidebar"), slot.slice("sidebar-".length));
    assert.ok(element.classList.contains("extra-sidebar"));
    assert.ok(element.classList.contains("outline-hidden"));
    assert.ok(ref.current === element);
    view.unmount();
    assert.ok(ref.current === null);
  }
});

test("sidebar native button sites preserve implicit submit and explicit button types", () => {
  for (const { Component, tag } of sidebarSlots) {
    if (tag !== "BUTTON") continue;
    let submitted = 0;
    const view = ui.render(<sidebar.SidebarProvider><form onSubmit={(event) => { event.preventDefault(); submitted++; }}>
      <Component>Submit</Component><Component type="button">Do not submit</Component>
    </form></sidebar.SidebarProvider>);
    const button = view.getByRole("button", { name: "Submit" }) as HTMLButtonElement;
    assert.equal(button.getAttribute("type"), null);
    assert.equal(button.type, "submit");
    ui.fireEvent.click(button);
    ui.fireEvent.click(view.getByRole("button", { name: "Do not submit" }));
    assert.equal(submitted, 1);
    view.unmount();
  }
});

test("sidebar native button sites retain disabled activation behavior", () => {
  for (const { Component, tag } of sidebarSlots) {
    if (tag !== "BUTTON") continue;
    let clicks = 0;
    const view = ui.render(<sidebar.SidebarProvider><Component disabled onClick={() => clicks++}>Disabled</Component></sidebar.SidebarProvider>);
    const button = view.getByRole("button") as HTMLButtonElement;
    assert.equal(button.disabled, true);
    ui.fireEvent.click(button);
    assert.equal(clicks, 0);
    view.unmount();
  }
});

test("all five sidebar asChild sites preserve host, child-first events, styles and both refs", () => {
  function Link(props: React.ComponentProps<"a">) { return <a {...props} />; }
  for (const { Component, slot } of sidebarSlots) {
    const events: string[] = [];
    const outer = React.createRef<HTMLElement>();
    const child = React.createRef<HTMLAnchorElement>();
    const view = ui.render(<sidebar.SidebarProvider>
      <Component asChild ref={outer} title="parent" className="parent-sidebar" style={{ color: "red", marginTop: "2px" }}
        onClick={() => events.push("parent click")} onMouseEnter={() => events.push("parent enter")} onMouseLeave={() => events.push("parent leave")}>
        <Link ref={child} href="/archive" title="child" className="child-sidebar" style={{ color: "blue" }}
          onClick={(event) => { events.push("child click"); event.preventDefault(); }}
          onMouseEnter={() => events.push("child enter")} onMouseLeave={() => events.push("child leave")}>Archive</Link>
      </Component>
    </sidebar.SidebarProvider>);
    const element = view.getByRole("link", { name: "Archive" });
    assert.equal(element.parentElement!.children.length, 1, slot);
    assert.equal(element.getAttribute("data-slot"), slot);
    assert.equal(element.getAttribute("href"), "/archive");
    assert.equal(element.getAttribute("title"), "child");
    assert.equal(element.getAttribute("role"), null);
    assert.equal(element.getAttribute("tabindex"), null);
    assert.equal(element.style.color, "blue");
    assert.equal(element.style.marginTop, "2px");
    assert.ok(element.classList.contains("parent-sidebar") && element.classList.contains("child-sidebar"));
    assert.ok(outer.current === element && child.current === element);
    ui.fireEvent.click(element);
    ui.fireEvent.mouseEnter(element);
    ui.fireEvent.mouseLeave(element);
    assert.deepEqual(events, ["child click", "parent click", "child enter", "parent enter", "child leave", "parent leave"], slot);
    element.focus();
    assert.ok(document.activeElement === element);
    view.unmount();
    assert.ok(outer.current === null && child.current === null);
  }
});

test("sidebar menu variants and action state remain intact", () => {
  const view = ui.render(<sidebar.SidebarProvider>
    <sidebar.SidebarMenuButton variant="outline" size="sm" isActive>Menu</sidebar.SidebarMenuButton>
    <sidebar.SidebarMenuAction showOnHover>Action</sidebar.SidebarMenuAction>
    <sidebar.SidebarMenuSubButton href="/sub" size="sm" isActive>Submenu</sidebar.SidebarMenuSubButton>
  </sidebar.SidebarProvider>);
  const menu = view.getByRole("button", { name: "Menu" });
  assert.equal(menu.getAttribute("data-size"), "sm");
  assert.equal(menu.getAttribute("data-active"), "true");
  assert.ok(menu.classList.contains("h-[28px]") && menu.classList.contains("bg-background"));
  assert.ok(view.getByRole("button", { name: "Action" }).classList.contains("md:opacity-0"));
  const sub = view.getByRole("link", { name: "Submenu" });
  assert.equal(sub.getAttribute("data-size"), "sm");
  assert.equal(sub.getAttribute("data-active"), "true");
  assert.ok(sub.classList.contains("text-[11.67px]"));
});

test("sidebar composition retains parent overrides and child attribute precedence", () => {
  for (const { Component } of sidebarSlots) {
    const view = ui.render(<sidebar.SidebarProvider><Component asChild data-slot="caller-slot" data-sidebar="caller-sidebar">
      <a href="/custom" data-slot="child-slot">Custom</a>
    </Component></sidebar.SidebarProvider>);
    const element = view.getByRole("link");
    assert.equal(element.getAttribute("data-slot"), "child-slot");
    assert.equal(element.getAttribute("data-sidebar"), "caller-sidebar");
    view.unmount();
  }
});

test("all five sidebar asChild sites preserve empty children across element transitions", () => {
  for (const { Component } of sidebarSlots) {
    const view = ui.render(<sidebar.SidebarProvider><Component asChild>{null}</Component></sidebar.SidebarProvider>);
    for (const children of [undefined, false, "", <span key="visible">Visible</span>, null]) {
      view.rerender(<sidebar.SidebarProvider><Component asChild>{children}</Component></sidebar.SidebarProvider>);
      const wrapper = view.container.querySelector('[data-slot="sidebar-wrapper"]')!;
      assert.equal(wrapper.children.length, React.isValidElement(children) ? 1 : 0);
      assert.equal(wrapper.textContent, React.isValidElement(children) ? "Visible" : "");
    }
    view.unmount();
  }
});

test("all five sidebar asChild sites reject text, zero and multiple hosts", (t) => {
  t.mock.method(console, "error", () => undefined);
  for (const { Component } of sidebarSlots) {
    for (const children of ["not an element", 0, [<span key="one" />, <span key="two" />]]) {
      assert.throws(() => ui.render(<sidebar.SidebarProvider><Component asChild>{children}</Component></sidebar.SidebarProvider>), /single React element/);
    }
  }
});

test("composed badge, form control and sidebar sites retain React callback ref cleanup", () => {
  for (const Component of [badges.HA_Badge, ...sidebarSlots.map(({ Component }) => Component), forms.FormControl]) {
    const events: string[] = [];
    const content = <Component {...(Component === forms.FormControl ? {} : { asChild: true })} ref={(element: HTMLElement | null) => {
      assert.ok(element?.tagName === "INPUT");
      events.push("parent mounted");
      return () => { events.push("parent cleanup"); };
    }}><input ref={(element) => {
      assert.ok(element?.tagName === "INPUT");
      events.push("child mounted");
      return () => { events.push("child cleanup"); };
    }} /></Component>;
    const view = ui.render(Component === forms.FormControl ? <FormHarness>{content}</FormHarness> : <sidebar.SidebarProvider>{content}</sidebar.SidebarProvider>);
    assert.deepEqual([...events].sort(), ["child mounted", "parent mounted"]);
    view.unmount();
    assert.deepEqual([...events].sort(), ["child cleanup", "child mounted", "parent cleanup", "parent mounted"]);
  }
});

for (const site of ["installed Radix Slot", "installed Base UI useRender", "legacy-button", "legacy-vault-button", "legacy-label", "legacy-separator", "badge", "form-control", "sidebar-group-label", "sidebar-group-action", "sidebar-menu-button", "sidebar-menu-action", "sidebar-menu-sub-button"]) {
  test(`${site} accepts an internal Flight-lazy element and composes resolved handlers/refs`, () => {
    const refEvents: string[] = [];
    const clickEvents: string[] = [];
    const parentRef = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const element = <button type="button" title="child" className="child-flight" ref={(node) => {
      childRef.current = node;
      refEvents.push("child mounted");
      return () => { childRef.current = null; refEvents.push("child cleanup"); };
    }} onClick={(event) => { clickEvents.push("child"); event.preventDefault(); }}>Flight host</button>;
    // Test-only React Flight internal shape, NOT React.lazy(Component). The RSC
    // client wraps an element in a lazy object whose payload is a thenable.
    // Both libraries support this shape; the installed React.use resolves it.
    const payload = Object.assign(Promise.resolve(element), { status: "fulfilled" as const, value: element });
    const flightChild = {
      $$typeof: Symbol.for("react.lazy"),
      _payload: payload,
      _init: React.use
    } as unknown as React.ReactNode;
    assert.equal(React.isValidElement(flightChild), false, "the Flight wrapper is not itself a clonable element");
    const Component: React.ElementType = site === "installed Radix Slot" ? legacySlot.Slot
      : site === "installed Base UI useRender" ? badges.Badge
      : site === "legacy-button" ? buttons.HA_Button
      : site === "legacy-vault-button" ? buttons.HA_VaultButton
      : site === "legacy-label" ? labels.HA_Label
      : site === "legacy-separator" ? separators.HA_Separator
      : site === "badge" ? badges.HA_Badge
      : site === "form-control" ? forms.FormControl
      : sidebarSlots.find(({ slot }) => slot === site)!.Component;
    const content = <Component
      {...(site === "installed Base UI useRender"
        ? { render: flightChild as React.ReactElement }
        : { children: flightChild })}
      {...(!["installed Radix Slot", "installed Base UI useRender", "form-control"].includes(site) ? { asChild: true } : {})}
      ref={(node: HTMLElement | null) => {
        parentRef.current = node;
        refEvents.push("parent mounted");
        return () => { parentRef.current = null; refEvents.push("parent cleanup"); };
      }} title="parent" className="parent-flight" onClick={() => clickEvents.push("parent")}
    />;
    const view = ui.render(site === "form-control" ? <FormHarness>{content}</FormHarness>
      : site.startsWith("sidebar-") ? <sidebar.SidebarProvider>{content}</sidebar.SidebarProvider>
      : content);
    const button = view.getByText("Flight host");
    assert.equal(button.tagName, "BUTTON");
    assert.equal(button.getAttribute("title"), "child");
    assert.ok(button.classList.contains("parent-flight") && button.classList.contains("child-flight"));
    assert.ok(parentRef.current === button && childRef.current === button);
    assert.deepEqual([...refEvents].sort(), ["child mounted", "parent mounted"]);
    ui.fireEvent.click(button);
    assert.deepEqual(clickEvents, ["child", "parent"], "resolved child cancellation does not suppress the parent");
    view.unmount();
    assert.ok(parentRef.current === null && childRef.current === null);
    assert.deepEqual([...refEvents].sort(), ["child cleanup", "child mounted", "parent cleanup", "parent mounted"]);
  });
}

test("sidebar menu tooltip with empty asChild content renders nothing without crashing", () => {
  const view = ui.render(<sidebar.SidebarProvider defaultOpen={false}>
    <sidebar.SidebarMenuButton asChild tooltip="Tools">{null}</sidebar.SidebarMenuButton>
  </sidebar.SidebarProvider>);
  for (const children of [undefined, false, "", null]) {
    view.rerender(<sidebar.SidebarProvider defaultOpen={false}>
      <sidebar.SidebarMenuButton asChild tooltip="Tools">{children}</sidebar.SidebarMenuButton>
    </sidebar.SidebarProvider>);
    const wrapper = view.container.querySelector('[data-slot="sidebar-wrapper"]')!;
    assert.equal(wrapper.children.length, 0);
    assert.equal(wrapper.textContent, "");
    assert.ok(view.queryByRole("tooltip") === null);
  }
});

test("sidebar container exports compose semantic navigation, input and menu content", () => {
  const inputRef = React.createRef<HTMLInputElement>();
  const view = ui.render(<sidebar.SidebarProvider data-testid="provider" className="extra-provider"
    style={{ "--sidebar-width": "30rem" } as React.CSSProperties}>
    <sidebar.Sidebar collapsible="none" role="navigation" aria-label="Library" className="extra-sidebar-shell">
      <sidebar.SidebarHeader><sidebar.SidebarInput ref={inputRef} aria-label="Filter sidebar" placeholder="Find a book" /></sidebar.SidebarHeader>
      <sidebar.SidebarSeparator />
      <sidebar.SidebarContent><sidebar.SidebarGroup>
        <sidebar.SidebarGroupLabel>Library</sidebar.SidebarGroupLabel>
        <sidebar.SidebarGroupContent><sidebar.SidebarMenu><sidebar.SidebarMenuItem>
          <sidebar.SidebarMenuButton>Books</sidebar.SidebarMenuButton>
          <sidebar.SidebarMenuBadge>2</sidebar.SidebarMenuBadge>
          <sidebar.SidebarMenuSub><sidebar.SidebarMenuSubItem>
            <sidebar.SidebarMenuSubButton href="/books/recent">Recent books</sidebar.SidebarMenuSubButton>
          </sidebar.SidebarMenuSubItem></sidebar.SidebarMenuSub>
        </sidebar.SidebarMenuItem></sidebar.SidebarMenu></sidebar.SidebarGroupContent>
      </sidebar.SidebarGroup></sidebar.SidebarContent>
      <sidebar.SidebarFooter>Account</sidebar.SidebarFooter>
    </sidebar.Sidebar>
    <sidebar.SidebarInset>Page content</sidebar.SidebarInset>
  </sidebar.SidebarProvider>);
  const wrapper = view.getByTestId("provider");
  assert.ok(wrapper.classList.contains("extra-provider"));
  assert.equal(wrapper.style.getPropertyValue("--sidebar-width"), "30rem");
  assert.equal(wrapper.style.getPropertyValue("--sidebar-width-icon"), "4.8rem");
  const navigation = view.getByRole("navigation", { name: "Library" });
  assert.ok(navigation.classList.contains("extra-sidebar-shell"));
  assert.ok(navigation.querySelector('[data-slot="sidebar-container"]') === null, "noncollapsible mode has no offcanvas shell");
  const input = view.getByRole("textbox", { name: "Filter sidebar" });
  assert.equal(input.getAttribute("placeholder"), "Find a book");
  assert.ok(inputRef.current === input);
  assert.equal(view.getByRole("link", { name: "Recent books" }).getAttribute("href"), "/books/recent");
  assert.equal(view.getByRole("main").textContent, "Page content");
  assert.equal(view.getByText("2").getAttribute("data-slot"), "sidebar-menu-badge");
  for (const [slot, tag] of [
    ["sidebar-header", "DIV"], ["sidebar-separator", "DIV"], ["sidebar-content", "DIV"],
    ["sidebar-group", "DIV"], ["sidebar-group-content", "DIV"], ["sidebar-menu", "UL"],
    ["sidebar-menu-item", "LI"], ["sidebar-menu-sub", "UL"], ["sidebar-menu-sub-item", "LI"],
    ["sidebar-footer", "DIV"]
  ]) {
    const element = navigation.querySelector(`[data-slot="${slot}"]`)!;
    assert.equal(element.tagName, tag, slot);
    assert.equal(element.getAttribute("data-sidebar"), slot.slice("sidebar-".length));
  }
  view.unmount();
  assert.ok(inputRef.current === null);
});

test("desktop sidebar variants retain side, collapse state, layout hosts and forwarded refs", () => {
  for (const variant of ["sidebar", "floating", "inset"] as const) {
    for (const side of ["left", "right"] as const) {
      const ref = React.createRef<HTMLDivElement>();
      const collapsed = side === "right";
      const view = ui.render(<sidebar.SidebarProvider defaultOpen={!collapsed}>
        <sidebar.Sidebar ref={ref} variant={variant} side={side} collapsible="icon" data-testid="desktop-container" className="extra-desktop">Desktop content</sidebar.Sidebar>
      </sidebar.SidebarProvider>);
      const shell = view.container.querySelector('[data-slot="sidebar"]')!;
      const container = view.getByTestId("desktop-container");
      assert.equal(shell.getAttribute("data-state"), collapsed ? "collapsed" : "expanded");
      assert.equal(shell.getAttribute("data-collapsible"), collapsed ? "icon" : "");
      assert.equal(shell.getAttribute("data-variant"), variant);
      assert.equal(shell.getAttribute("data-side"), side);
      assert.ok(shell.querySelector('[data-slot="sidebar-gap"]'));
      assert.equal(container.getAttribute("data-slot"), "sidebar-container");
      assert.ok(container.classList.contains("extra-desktop"));
      assert.equal(container.classList.contains("left-0"), side === "left");
      assert.equal(container.classList.contains("right-0"), side === "right");
      assert.equal(container.classList.contains("p-3"), variant !== "sidebar");
      assert.equal(container.querySelector('[data-slot="sidebar-inner"]')!.textContent, "Desktop content");
      assert.ok(ref.current === container);
      view.unmount();
      assert.ok(ref.current === null);
    }
  }
});

function SidebarStateProbe() {
  const { state, setOpen } = sidebar.useSidebar();
  return <><output aria-label="Sidebar state">{state}</output>
    <button type="button" onClick={() => setOpen(true)}>Open directly</button></>;
}

test("uncontrolled sidebar toggles through trigger, rail and keyboard and removes its listener", () => {
  const events: string[] = [];
  const view = ui.render(<sidebar.SidebarProvider>
    <SidebarStateProbe />
    <sidebar.SidebarTrigger onClick={(event) => { events.push("caller click"); event.preventDefault(); }}
      onMouseEnter={() => events.push("trigger enter")} onMouseLeave={() => events.push("trigger leave")} />
    <sidebar.SidebarRail onMouseEnter={() => events.push("rail enter")} onMouseLeave={() => events.push("rail leave")} />
  </sidebar.SidebarProvider>);
  const state = view.getByLabelText("Sidebar state");
  const trigger = view.container.querySelector('[data-slot="sidebar-trigger"]')!;
  const rail = view.container.querySelector('[data-slot="sidebar-rail"]')!;
  assert.equal(state.textContent, "expanded");
  assert.equal(rail.getAttribute("tabindex"), "-1");
  assert.equal(rail.getAttribute("title"), "Toggle Sidebar");
  ui.fireEvent.click(trigger);
  assert.equal(state.textContent, "collapsed", "caller preventDefault does not cancel the existing toggle contract");
  assert.match(document.cookie, /(?:^|; )sidebar_state=false(?:;|$)/);
  ui.fireEvent.click(rail);
  assert.equal(state.textContent, "expanded");
  assert.match(document.cookie, /(?:^|; )sidebar_state=true(?:;|$)/);
  ui.fireEvent.mouseEnter(trigger);
  ui.fireEvent.mouseLeave(trigger);
  ui.fireEvent.mouseEnter(rail);
  ui.fireEvent.mouseLeave(rail);
  assert.deepEqual(events, ["caller click", "trigger enter", "trigger leave", "rail enter", "rail leave"]);
  assert.equal(ui.fireEvent.keyDown(window, { key: "b" }), true);
  assert.equal(state.textContent, "expanded");
  assert.equal(ui.fireEvent.keyDown(window, { key: "x", ctrlKey: true }), true);
  assert.equal(state.textContent, "expanded");
  assert.equal(ui.fireEvent.keyDown(window, { key: "b", ctrlKey: true }), false);
  assert.equal(state.textContent, "collapsed");
  ui.fireEvent.click(view.getByRole("button", { name: "Open directly" }));
  assert.equal(state.textContent, "expanded");
  assert.equal(ui.fireEvent.keyDown(window, { key: "b", metaKey: true }), false);
  assert.equal(state.textContent, "collapsed");
  view.unmount();
  assert.equal(ui.fireEvent.keyDown(window, { key: "b", ctrlKey: true }), true, "unmounted provider must not keep its global listener");
});

test("controlled sidebar requests changes but waits for its owner to update open", () => {
  const changes: boolean[] = [];
  const onOpenChange = (open: boolean) => { changes.push(open); };
  const view = ui.render(<sidebar.SidebarProvider open onOpenChange={onOpenChange}>
    <SidebarStateProbe /><sidebar.SidebarTrigger />
  </sidebar.SidebarProvider>);
  const state = view.getByLabelText("Sidebar state");
  ui.fireEvent.click(view.getByRole("button", { name: "Toggle Sidebar" }));
  assert.deepEqual(changes, [false]);
  assert.equal(state.textContent, "expanded");
  view.rerender(<sidebar.SidebarProvider open={false} onOpenChange={onOpenChange}>
    <SidebarStateProbe /><sidebar.SidebarTrigger />
  </sidebar.SidebarProvider>);
  assert.equal(state.textContent, "collapsed");
  ui.fireEvent.keyDown(window, { key: "b", metaKey: true });
  assert.deepEqual(changes, [false, true]);
  assert.equal(state.textContent, "collapsed");
  view.rerender(<sidebar.SidebarProvider open onOpenChange={onOpenChange}>
    <SidebarStateProbe /><sidebar.SidebarTrigger />
  </sidebar.SidebarProvider>);
  assert.equal(state.textContent, "expanded");
});

test("useSidebar fails explicitly outside its actual provider", (t) => {
  t.mock.method(console, "error", () => undefined);
  assert.throws(() => ui.render(<SidebarStateProbe />), /useSidebar must be used within a SidebarProvider/);
});

const legacyFlightSites = ["installed Radix Slot", "legacy-button", "legacy-vault-button", "legacy-label", "legacy-separator", "badge", "form-control", "sidebar-group-label", "sidebar-group-action", "sidebar-menu-button", "sidebar-menu-action", "sidebar-menu-sub-button"] as const;

// Test-only internal Flight shape. The installed React.use performs resolution;
// this does not implement production lazy handling or use React.lazy(Component).
function flightChild(payload: Promise<React.ReactNode>): React.ReactNode {
  return { $$typeof: Symbol.for("react.lazy"), _payload: payload,
    _init: React.use } as unknown as React.ReactNode;
}

function LegacyFlightComposition({ site, children }: { site: typeof legacyFlightSites[number]; children: React.ReactNode }) {
  const Component: React.ElementType = site === "installed Radix Slot" ? legacySlot.Slot
    : site === "legacy-button" ? buttons.HA_Button
    : site === "legacy-vault-button" ? buttons.HA_VaultButton
    : site === "legacy-label" ? labels.HA_Label
    : site === "legacy-separator" ? separators.HA_Separator
    : site === "badge" ? badges.HA_Badge
    : site === "form-control" ? forms.FormControl
    : sidebarSlots.find(({ slot }) => slot === site)!.Component;
  const content = <div data-testid="flight-contents"><Component
    {...(site === "installed Radix Slot" || site === "form-control" ? {} : { asChild: true })}
  >{children}</Component></div>;
  return site === "form-control" ? <FormHarness>{content}</FormHarness>
    : site.startsWith("sidebar-") ? <sidebar.SidebarProvider>{content}</sidebar.SidebarProvider> : content;
}

for (const site of legacyFlightSites) {
  test(`${site} preserves Flight-lazy empty values and transitions back to an element`, () => {
    const empty = flightChild(Object.assign(Promise.resolve(null), { status: "fulfilled", value: null }));
    const view = ui.render(<LegacyFlightComposition site={site}>{empty}</LegacyFlightComposition>);
    for (const value of [null, false, undefined, "", <button key="resolved" type="button">Resolved</button>, null]) {
      const child = flightChild(Object.assign(Promise.resolve(value), { status: "fulfilled", value }));
      view.rerender(<LegacyFlightComposition site={site}>{child}</LegacyFlightComposition>);
      const contents = view.getByTestId("flight-contents");
      assert.equal(contents.childNodes.length, React.isValidElement(value) ? 1 : 0);
      assert.equal(contents.textContent, React.isValidElement(value) ? "Resolved" : "");
    }
  });

  test(`${site} rejects Flight-lazy content resolving to multiple hosts`, (t) => {
    t.mock.method(console, "error", () => undefined);
    const value = [<span key="one">One</span>, <span key="two">Two</span>];
    const child = flightChild(Object.assign(Promise.resolve(value), { status: "fulfilled", value }));
    assert.throws(() => ui.render(<LegacyFlightComposition site={site}>{child}</LegacyFlightComposition>), /single React element/);
  });

  test(`${site} suspends for Flight content then resolves empty and element states`, async () => {
    let resolveEmpty!: (value: React.ReactNode) => void;
    const empty = flightChild(new Promise<React.ReactNode>((resolve) => { resolveEmpty = resolve; }));
    let view!: ReturnType<typeof ui.render>;
    await ui.act(async () => {
      view = ui.render(<React.Suspense fallback={<p>Waiting for Flight</p>}>
        <LegacyFlightComposition site={site}>{empty}</LegacyFlightComposition>
      </React.Suspense>);
    });
    assert.ok(view.getByText("Waiting for Flight"));
    await ui.act(async () => { resolveEmpty(null); });
    await ui.waitFor(() => assert.ok(view.queryByText("Waiting for Flight") === null));
    assert.equal(view.getByTestId("flight-contents").childNodes.length, 0);
    let resolveElement!: (value: React.ReactNode) => void;
    const pending = flightChild(new Promise<React.ReactNode>((resolve) => { resolveElement = resolve; }));
    await ui.act(async () => {
      view.rerender(<React.Suspense fallback={<p>Waiting for Flight</p>}>
        <LegacyFlightComposition site={site}>{pending}</LegacyFlightComposition>
      </React.Suspense>);
    });
    assert.ok(view.getByText("Waiting for Flight"));
    const ref = React.createRef<HTMLButtonElement>();
    let activations = 0;
    await ui.act(async () => { resolveElement(<button type="button" ref={ref} onClick={() => activations++}>Flight arrived</button>); });
    await ui.waitFor(() => assert.ok(view.queryByText("Waiting for Flight") === null));
    const button = view.getByText("Flight arrived");
    assert.ok(ref.current === button);
    ui.fireEvent.click(button);
    assert.equal(activations, 1);
    view.unmount();
    assert.ok(ref.current === null);
  });
}
