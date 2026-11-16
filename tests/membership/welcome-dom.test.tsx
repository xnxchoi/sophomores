import { EnglishMessages } from "../fixtures/english-messages";
import messages from "../../messages/en.json";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, before, mock, test } from "node:test";
import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";
import {
  MemberAuthActionError,
  type PendingPasskey
} from "@/lib/member-auth/client";

// ADR-0013: the welcome page works for any signed-in account with a verified
// email, with or without passkeys. Its one action registers an ordinary
// sign-in passkey through the member client; nothing binds a wallet owner.
// Round 5: outcomes come from the client's evidence, an unknown result is
// settled by re-reading the passkey count, retry refreshes in place, and
// signing in from here comes back here.

let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let Welcome: typeof import("@/components/membership/welcome").Welcome;
let WelcomeLink: typeof import("@/components/membership/welcome").WelcomeLink;
const previous = new Map<string, PropertyDescriptor | undefined>();

function install(key: string, value: unknown) {
  if (!previous.has(key))
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value
  });
}
const supportPasskeys = () =>
  Object.defineProperty(dom.window, "PublicKeyCredential", {
    configurable: true,
    value: function PublicKeyCredential() {}
  });

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/welcome",
    pretendToBeVisual: true
  });
  // motion/react (the eased result and collapse) needs these browser globals.
  const bound = [
    "getComputedStyle",
    "requestAnimationFrame",
    "cancelAnimationFrame"
  ];
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "SVGElement",
    "Node",
    "MutationObserver",
    "Event",
    "DOMException",
    "localStorage",
    ...bound
  ]) {
    const value =
      key === "window"
        ? dom.window
        : dom.window[key as keyof typeof dom.window];
    install(
      key,
      typeof value === "function" && bound.includes(key)
        ? (value as (...args: unknown[]) => unknown).bind(dom.window)
        : value
    );
  }
  dom.window.matchMedia = (() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false
  })) as never;
  install("IS_REACT_ACT_ENVIRONMENT", true);
  ui = await import("@testing-library/react/pure");
  ({ Welcome, WelcomeLink } = await import("@/components/membership/welcome"));
});
afterEach(() => {
  ui.cleanup();
  Reflect.deleteProperty(dom.window, "PublicKeyCredential");
  dom.window.localStorage.clear();
});
after(() => {
  dom.window.close();
  for (const [key, value] of previous)
    value
      ? Object.defineProperty(globalThis, key, value)
      : Reflect.deleteProperty(globalThis, key);
});

function routerFixture() {
  const calls: string[] = [];
  const router = {
    refresh: () => calls.push("refresh"),
    replace: (href: string) => calls.push(`replace ${href}`),
    push: (href: string) => calls.push(`push ${href}`),
    prefetch: async () => {},
    back: () => {},
    forward: () => {}
  } as unknown as AppRouterInstance;
  const wrap = (children: ReactNode) => (
    <AppRouterContext.Provider value={router}>
      <EnglishMessages>{children}</EnglishMessages>
    </AppRouterContext.Provider>
  );
  return { calls, wrap };
}

const welcome = (
  extra: Partial<Extract<WelcomeView, { state: "welcome" }>> = {}
): WelcomeView => ({
  state: "welcome",
  signet: "pending",
  passkeys: 0,
  emailVerified: true,
  ...extra
});
type Confirmation = "added" | "not_added" | "unknown";
function render(
  view: WelcomeView,
  addPasskey: () => Promise<void> = async () => undefined,
  confirmPasskey: (
    pending: PendingPasskey
  ) => Promise<Confirmation> = async () => "unknown"
) {
  const calls: string[] = [];
  const client = {
    addPasskey: async () => {
      calls.push("add");
      await addPasskey();
    },
    confirmPasskey: async (pending: PendingPasskey) => {
      calls.push(`confirm ${pending.baseline}`);
      return confirmPasskey(pending);
    }
  };
  const router = routerFixture();
  const result = ui.render(
    router.wrap(<Welcome initialView={view} client={client} />)
  );
  return {
    calls,
    router: router.calls,
    rerender: (next: WelcomeView) =>
      result.rerender(
        router.wrap(<Welcome initialView={next} client={client} />)
      )
  };
}
const text = () => document.body.textContent ?? "";
/** Every live result region's text: "Passkey added." leads above the body; other results follow the button. */
const status = () =>
  ui.screen
    .queryAllByRole("status")
    .map((region) => region.textContent ?? "")
    .join("")
    .trim();
/** A lost registration the client couldn't settle. */
const lost = (
  kind: "network" | "timeout" = "network",
  baseline = 0,
  settlesAt = Date.now() + 60_000
) =>
  new MemberAuthActionError(kind, undefined, {
    pendingPasskey: { baseline, settlesAt }
  });
const w = messages.Customer.components_membership_welcome;
const add = () => ui.screen.getByRole("button", { name: w.addPasskey });
const card = () => document.querySelector("section[data-state]")!;
/** Which control the passkey cell shows: add, waiting, check, checking, unsupported or added. */
const control = () =>
  [...document.querySelectorAll("[data-welcome-slot] [data-welcome-control]")]
    // A control still fading out of the cell is inert; it isn't the one shown.
    .filter((element) => element.closest("[data-leaving]") === null)
    .map(
    (element) => element.getAttribute("data-welcome-control")
  );
const signetState = () =>
  document.querySelector("[data-signet-state]")?.getAttribute("data-signet-state") ?? null;
/** The one line beside the control. */
const line = () =>
  (document.querySelector("[data-welcome-result=after]")?.textContent ?? "").trim();
const precedes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
const press = (element: HTMLElement) =>
  ui.act(async () => ui.fireEvent.click(element));
/** Lets the arrival and any exit animation finish. */
const settled = () =>
  ui.act(() => new Promise((resolve) => setTimeout(resolve, 1300)));

// Round 7: the card is designed, not written. These tests assert which element
// and which state is shown; wording comes from the catalogue.

test("each Signet state shows as the mark's own state with a short label, and no paragraph explains it", () => {
  const cases = [
    ["pending", w.signetPending],
    ["issued", w.signetIssued],
    ["on_hold", w.signetOnHold],
    ["none", w.signetNone]
  ] as const;
  for (const [signet, label] of cases) {
    supportPasskeys();
    render(welcome({ signet }));
    assert.equal(signetState(), signet);
    const row = document.querySelector("[data-signet-state]")!;
    assert.equal(
      row.querySelector("svg[data-placeholder=signet-mark]") !== null,
      true,
      "the placeholder mark carries the state"
    );
    assert.match(row.textContent ?? "", new RegExp(label));
    // A seal inside the ring for every told state; none is an empty, dashed ring.
    const circles = row.querySelectorAll("svg[data-placeholder] circle").length;
    assert.equal(circles, signet === "none" ? 1 : 2, signet);
    assert.equal(
      [...card().querySelectorAll("p")].filter((p) => (p.textContent ?? "") !== "")
        .length,
      0,
      "no body paragraphs"
    );
    const shop = ui.screen.queryByRole("link", { name: w.goToShop });
    assert.equal(shop?.getAttribute("href") ?? null, signet === "none" ? "/shop" : null);
    ui.cleanup();
  }
});

test("the card arrives in three beats, greeting, Signet, passkey, and a refresh doesn't replay them", async () => {
  supportPasskeys();
  const { rerender } = render(welcome());
  const heading = ui.screen.getByRole("heading", { level: 1, name: w.title });
  const beats = [
    heading.parentElement!,
    document.querySelector("[data-signet-state]")!,
    document.querySelector("[data-welcome-slot]")!.parentElement!
  ];
  assert.equal(precedes(beats[0], beats[1]) && precedes(beats[1], beats[2]), true);
  const opacity = (element: Element) =>
    Number((element as HTMLElement).style.opacity || "1");
  assert.equal(
    beats.every((beat) => opacity(beat) < 1),
    true,
    "every beat starts hidden"
  );
  await settled();
  assert.equal(beats.every((beat) => opacity(beat) === 1), true, "and arrives");
  ui.act(() => rerender(welcome({ signet: "issued" })));
  assert.equal(
    beats.every((beat) => opacity(beat) === 1),
    true,
    "new server data doesn't stage the card again"
  );
  // The greeting is the one large line; the way back sits above it, on the left.
  const back = ui.screen.getByRole("link", { name: w.backToAccount });
  assert.equal(back.getAttribute("href"), "/account");
  assert.equal(precedes(back, heading), true);
  assert.equal(back.classList.contains("min-h-12"), true, "a 48 px target");
});

test("the passkey row is one control and a label; the count shows once there is one", () => {
  supportPasskeys();
  render(welcome());
  assert.deepEqual(control(), ["add"]);
  assert.equal(line(), "");
  const slot = document.querySelector("[data-welcome-slot]")!;
  assert.match(slot.parentElement!.textContent ?? "", new RegExp(w.passkeyLabel));
  assert.doesNotMatch(slot.parentElement!.textContent ?? "", /saved/);
  ui.cleanup();
  supportPasskeys();
  render(welcome({ passkeys: 2 }));
  assert.match(
    document.querySelector("[data-welcome-slot]")!.parentElement!.textContent ?? "",
    /2 saved/
  );
  assert.deepEqual(control(), ["add"], "another can still be added here");
});

test("adding a passkey resolves the control in place: the confirmation takes its cell and focus, and nothing invites another", async () => {
  supportPasskeys();
  const { calls } = render(welcome());
  await press(add());
  assert.deepEqual(calls, ["add"]);
  await settled();
  assert.deepEqual(control(), ["added"]);
  assert.equal(status(), w.added);
  const confirmation = document.querySelector("[data-welcome-control=added]")!;
  assert.equal(document.activeElement === confirmation, true, "focus moves to it");
  assert.equal(
    confirmation.closest("[role=status]") !== null,
    true,
    "it fills a live region mounted before it"
  );
  assert.equal(control().includes("add"), false, "no Add a passkey control is shown");
  assert.equal(line(), "");
  assert.match(
    document.querySelector("[data-welcome-slot]")!.parentElement!.textContent ?? "",
    /1 saved/
  );
});

test("idle reserves nothing below the control: the line eases in only when there is one", async () => {
  supportPasskeys();
  render(welcome());
  const after = document.querySelector("[data-welcome-result=after]")!;
  assert.equal(after.className, "", "no reserved band under the button");
  assert.equal(after.children.length, 0);
  const source = readFileSync("src/components/membership/welcome.tsx", "utf8");
  assert.match(source, /AnimatePresence/);
  assert.match(source, /height: "auto"/);
  assert.doesNotMatch(
    source,
    /useReducedMotion|prefers-reduced-motion|motion-reduce|popLayout/
  );
});

test("each answered outcome gives one line and leaves the control usable; not added always says the same", async () => {
  const outcomes: [Error, string][] = [
    [new MemberAuthActionError("passkey-cancelled"), w.errorCancelled],
    [new MemberAuthActionError("rate-limited"), w.errorRateLimited],
    [new MemberAuthActionError("unavailable"), w.notAdded],
    // A lost request the client already settled, or one that never reached verification, wasn't added either.
    [new MemberAuthActionError("network"), w.notAdded],
    [new Error("boom"), w.notAdded]
  ];
  for (const [error, message] of outcomes) {
    supportPasskeys();
    render(welcome(), async () => {
      throw error;
    });
    await press(add());
    assert.equal(line(), message);
    assert.deepEqual(control(), ["add"]);
    assert.equal(add().hasAttribute("disabled"), false);
    ui.cleanup();
  }
  // The tray says not added the same way (round 6).
  assert.equal(messages.MemberAuth.notices["passkey-not-added"], w.notAdded);
  assert.match(
    readFileSync("src/components/Authentication/member-auth/_shared/session.ts", "utf8"),
    new RegExp(`const notAdded = "${w.notAdded.replace(/\./g, "\\.")}"`)
  );
});

test("an unsettled lost registration stays unknown until the client confirms it, and the control then resolves", async () => {
  supportPasskeys();
  for (const kind of ["network", "timeout"] as const) {
    const answers: Confirmation[] = ["unknown", "added"];
    const { calls } = render(
      welcome({ passkeys: 3 }),
      async () => {
        throw lost(kind, 3);
      },
      async () => answers.shift()!
    );
    await press(add());
    assert.deepEqual(control(), ["check"], "no second passkey before the first is settled");
    assert.equal(line(), w.errorUnknown);
    await press(ui.screen.getByRole("button", { name: w.checkAgain }));
    assert.deepEqual(control(), ["check"], "still unknown while it could commit");
    await press(ui.screen.getByRole("button", { name: w.checkAgain }));
    await settled();
    assert.deepEqual(control(), ["added"]);
    assert.deepEqual(
      calls,
      ["add", "confirm 3", "confirm 3"],
      "the client's own baseline is what it compares against"
    );
    ui.cleanup();
  }
  render(
    welcome(),
    async () => {
      throw lost();
    },
    async () => "not_added"
  );
  await press(add());
  await press(ui.screen.getByRole("button", { name: w.checkAgain }));
  assert.equal(line(), w.notAdded, "the same wording as any refusal");
  assert.deepEqual(control(), ["add"]);
});

test("the page checks a lost registration again by itself once it can no longer commit", async () => {
  supportPasskeys();
  const { calls } = render(
    welcome(),
    async () => {
      throw lost("network", 0, Date.now() - 1);
    },
    async () => "not_added"
  );
  await press(add());
  assert.deepEqual(calls, ["add"]);
  await ui.act(() => new Promise((resolve) => setTimeout(resolve, 1200)));
  assert.deepEqual(calls, ["add", "confirm 0"]);
  assert.equal(line(), w.notAdded);
});

test("when an automatic check still can't tell, the page keeps checking, then hands the check to the member", async () => {
  supportPasskeys();
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    // An issued (still) Signet: ticking ten mocked minutes would otherwise run the pending breath's frames.
    const { calls } = render(
      welcome({ signet: "issued" }),
      async () => {
        throw lost("network", 0, Date.now() - 1);
      },
      async () => "unknown"
    );
    await press(add());
    const tick = (ms: number) =>
      ui.act(async () => {
        mock.timers.tick(ms);
        // Let the check that tick started settle (setImmediate isn't mocked) before time moves on.
        await new Promise((resolve) => setImmediate(resolve));
      });
    await tick(1000);
    assert.deepEqual(calls, ["add", "confirm 0"], "the first check runs once the window has closed");
    assert.equal(line(), w.errorUnknown);
    for (let index = 0; index < 4; index++) await tick(60_000);
    assert.equal(
      calls.filter((call) => call.startsWith("confirm")).length,
      5,
      "it checks again while it still can't tell, a bounded number of times"
    );
    assert.equal(line(), w.errorUnknownManual, "then it stops checking by itself");
    await tick(600_000);
    assert.equal(calls.filter((call) => call.startsWith("confirm")).length, 5);
    assert.deepEqual(control(), ["check"]);
  } finally {
    mock.timers.reset();
  }
});

test("a browser without passkeys sees the control itself dimmed in its own cell, so the card never grows after hydration", async () => {
  const { calls } = render(welcome());
  assert.deepEqual(control(), ["unsupported"]);
  assert.equal(control().includes("add"), false, "no Add a passkey control is shown");
  assert.equal(line(), "", "nothing is added below it");
  const cell = document.querySelector("[data-welcome-slot]")!;
  assert.equal(cell.classList.contains("min-h-12"), true, "the cell holds the button's 48 px");
  assert.equal(
    cell.querySelector("[data-welcome-control=unsupported]")!.classList.contains("min-h-12"),
    true
  );
  assert.deepEqual(calls, []);
});

test("an unverified email shows a ghost mark and only what to do: no Signet state, no shop, no passkey", () => {
  supportPasskeys();
  render(welcome({ emailVerified: false, signet: null }));
  assert.equal(signetState(), "unverified");
  assert.equal(document.querySelectorAll("[data-signet-state] svg circle").length, 1);
  assert.equal(document.querySelector("[data-welcome-slot]") === null, true);
  assert.equal(ui.screen.queryByRole("link", { name: w.goToShop }) === null, true);
  for (const told of [w.signetPending, w.signetIssued, w.signetOnHold, w.signetNone])
    assert.doesNotMatch(text(), new RegExp(told));
  assert.match(text(), new RegExp(w.unverifiedBody.replace(/\./g, "\\.")));
});

test("a suspended account sees a restricted state, not a missing membership, with one way out", () => {
  supportPasskeys();
  render({ state: "restricted" });
  assert.equal(signetState(), "restricted");
  assert.equal(document.querySelector("[data-welcome-slot]") === null, true);
  const mail = ui.screen.getByRole("link", { name: "concierge@sophomores.co" });
  assert.equal(mail.getAttribute("href"), "mailto:concierge@sophomores.co");
  // An 18 px text line plus 15 px above and below: a 48 px touch target that leaves the line box alone.
  assert.equal(mail.classList.contains("py-[15px]"), true, "a 48 px hit area");
  assert.equal(ui.screen.queryByRole("link", { name: w.goToShop }) === null, true);
  assert.doesNotMatch(text(), new RegExp(w.signetNone));
});

test("while the prompt is open the control shows progress, is busy and can't be pressed twice", async () => {
  supportPasskeys();
  let release!: () => void;
  const { calls } = render(
    welcome(),
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  await press(add());
  assert.deepEqual(control(), ["waiting"]);
  const button = document.querySelector<HTMLButtonElement>("[data-welcome-control=waiting]")!;
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute("aria-busy"), "true");
  assert.equal(button.querySelector("span[aria-hidden=true]") !== null, true, "a progress sweep");
  await press(button);
  assert.deepEqual(calls, ["add"]);
  await ui.act(async () => release());
  await settled();
  assert.deepEqual(control(), ["added"]);
});

test("a session that ended reads as signed out", async () => {
  supportPasskeys();
  render(welcome(), async () => {
    throw new MemberAuthActionError("unauthenticated");
  });
  await press(add());
  assert.equal(card().getAttribute("data-state"), "signed_out");
  assert.equal(
    ui.screen.getByRole("link", { name: w.signIn }).getAttribute("href"),
    "/account"
  );
  assert.equal(ui.screen.queryByRole("link", { name: w.backToAccount }) === null, true);
});

test("try again refreshes the page's data in place instead of reloading", async () => {
  const { router, rerender } = render({ state: "unavailable" });
  assert.ok(ui.screen.getByRole("heading", { level: 1, name: w.unavailableTitle }));
  // The source check below rules out location.reload; the router refresh is the only retry.
  await press(ui.screen.getByRole("button", { name: w.tryAgain }));
  assert.deepEqual(router, ["refresh"]);
  ui.act(() => rerender(welcome({ signet: "issued" })));
  assert.equal(signetState(), "issued", "the refreshed server state replaces the page's view");
});

test("signing in from the welcome page comes back to it", async () => {
  render({ state: "signed_out" });
  const link = ui.screen.getByRole("link", { name: w.signIn });
  assert.equal(link.getAttribute("href"), "/account");
  link.addEventListener("click", (event) => event.preventDefault());
  await press(link);
  ui.cleanup();
  const back = routerFixture();
  ui.render(back.wrap(<WelcomeLink />));
  assert.deepEqual(back.calls, ["replace /welcome"], "once signed in, the account page sends the member back");
  assert.equal(
    ui.screen.getByRole("link", { name: w.accountLink }).getAttribute("href"),
    "/welcome"
  );
  ui.cleanup();
  const direct = routerFixture();
  ui.render(direct.wrap(<WelcomeLink />));
  assert.deepEqual(direct.calls, [], "the return happens once; opening the account page later stays there");
  ui.cleanup();
  // A magic link opens in a new tab, so the intent lives in localStorage, and it expires.
  dom.window.localStorage.setItem(
    "sophomores.welcome.return",
    String(Date.now() - 31 * 60 * 1000)
  );
  const stale = routerFixture();
  ui.render(stale.wrap(<WelcomeLink />));
  assert.deepEqual(stale.calls, [], "an old intent doesn't redirect");
  // Provider sign-ins come back through /account/continue, which carries the link (and the return) too.
  for (const page of [
    "src/app/(site)/account/page.tsx",
    "src/app/(site)/account/continue/page.tsx"
  ])
    assert.match(readFileSync(page, "utf8"), /welcomeLink/, page);
});

// Round 7, part A: on "added", nothing may pop into the card's flow at full
// height. Every element that mounts at that moment either eases its height in
// from 0, or takes the pressed control's own 48 px slot (a stacked cell), so
// the card never grows un-eased while the offer is still leaving.
test("adding a passkey never grows the card un-eased: whatever enters eases its height or takes the control's own slot", async () => {
  supportPasskeys();
  render(welcome());
  const card = document.querySelector("section[data-state]")!;
  // The height each element mounts with, read as it is inserted (before any animation frame).
  const mountedHeight = new Map<HTMLElement, string>();
  const collect = (batch: MutationRecord[]) => {
    for (const record of batch)
      for (const node of record.addedNodes)
        if (node instanceof dom.window.HTMLElement)
          mountedHeight.set(node, node.style.height);
  };
  const observer = new dom.window.MutationObserver(collect);
  observer.observe(card, { childList: true, subtree: true });
  await press(add());
  collect(observer.takeRecords());
  observer.disconnect();
  // Only what entered the card's flow and is still in it (a sweep that came and went with the press isn't),
  // not descendants of an entering element.
  const entered = [...mountedHeight.keys()].filter((element) => element.isConnected).filter((element) =>
    [...mountedHeight.keys()].every(
      (other) => other === element || !other.contains(element)
    )
  );
  assert.ok(entered.length > 0, "something entered on added");
  assert.match(text(), /Passkey added/);
  for (const element of entered) {
    const eased = mountedHeight.get(element) === "0px";
    const slot = element.closest("[data-welcome-slot]");
    const inSlot =
      slot !== null &&
      slot.classList.contains("grid") &&
      slot.classList.contains("min-h-12");
    assert.equal(
      eased || inSlot,
      true,
      `"${(element.textContent ?? "").trim()}" entered the card's flow at full height`
    );
  }
});

test("the page reuses the shared account controls and the shared member client", () => {
  const source = readFileSync("src/components/membership/welcome.tsx", "utf8");
  assert.match(source, /AccountPrimaryButton/);
  assert.match(source, /AccountButton/);
  assert.doesNotMatch(
    source,
    /function Action(Button|Link)|location\.reload|member\/wallet|navigator\.credentials|bind/
  );
  assert.match(source, /createMemberClient\(\)/);
  assert.match(source, /router\.refresh\(\)/);
});

test("the account page links to the welcome page; the confirmation pages no longer carry an activation entry", () => {
  assert.match(
    readFileSync("src/components/tickets/ticket-account-entry.tsx", "utf8"),
    /memberAction=\{welcomeLink \? <WelcomeLink \/> : undefined\}/
  );
  assert.match(
    readFileSync("src/app/(site)/account/page.tsx", "utf8"),
    /welcomeLink/
  );
  for (const file of [
    "src/components/commerce/payment.tsx",
    "src/components/tickets/portone-payment-result.tsx"
  ])
    assert.doesNotMatch(
      readFileSync(file, "utf8"),
      /Activation|activate|welcome/i,
      file
    );
});
