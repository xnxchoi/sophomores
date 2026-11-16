import { EnglishMessages } from "../fixtures/english-messages";
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
const add = () => ui.screen.getByRole("button", { name: "Add a passkey" });
const press = (element: HTMLElement) =>
  ui.act(async () => ui.fireEvent.click(element));
/** Lets an exit animation (the offer collapsing on "added") finish. */
const settled = () =>
  ui.act(() => new Promise((resolve) => setTimeout(resolve, 600)));

test("every Signet state reads plainly, and no membership comes with a next step", () => {
  const cases: [WelcomeView, RegExp][] = [
    [welcome({ signet: "pending" }), /Your Signet is on its way\./],
    [welcome({ signet: "issued" }), /Your Signet has been issued\./],
    [
      welcome({ signet: "on_hold" }),
      /Your Signet is on hold while a review or return of your membership purchase is open\./
    ],
    [
      welcome({ signet: "none" }),
      /doesn’t have a membership yet\. Membership comes with the book/
    ]
  ];
  for (const [view, body] of cases) {
    render(view);
    assert.match(text(), body);
    assert.doesNotMatch(
      text(),
      /\border\b/,
      "the page talks about the membership purchase, not an order"
    );
    ui.cleanup();
  }
  render(welcome({ signet: "none" }));
  assert.equal(
    ui.screen
      .getByRole("link", { name: "Go to the shop" })
      .getAttribute("href"),
    "/shop"
  );
});

test("the passkey offer names this device, not a phone it may not be", () => {
  supportPasskeys();
  render(welcome());
  assert.ok(ui.screen.getByRole("heading", { name: "Sign in with a passkey" }));
  assert.match(
    text(),
    /Add a passkey to this device, and you can sign in by unlocking it\./
  );
  assert.match(text(), /Your phone is the best place for one/);
  assert.doesNotMatch(text(), /on this phone|to it, and/);
  ui.cleanup();
  render(welcome({ passkeys: 2 }));
  assert.match(
    text(),
    /You already have a passkey\. If it’s on another device, you can add one here too\./
  );
});

test('adding a passkey ends the offer: "Passkey added." leads, above the body, and nothing invites another', async () => {
  supportPasskeys();
  const { calls } = render(welcome());
  await press(add());
  assert.deepEqual(calls, ["add"]);
  assert.equal(status(), "Passkey added.");
  const lead = document.querySelector("[data-welcome-result=lead]")!;
  const body = [...document.querySelectorAll("p")].find(
    (p) =>
      p.textContent === "Next time, you can sign in by unlocking this device."
  )!;
  assert.ok(body, "the body after adding");
  assert.equal(
    Boolean(
      lead.compareDocumentPosition(body) &
      dom.window.Node.DOCUMENT_POSITION_FOLLOWING
    ),
    true,
    "the result comes before the body"
  );
  assert.equal(
    ui.screen.queryByRole("button", { name: "Add a passkey" }),
    null
  );
  assert.doesNotMatch(text(), /Add a passkey to this device|add one here too/);
});

test("idle states reserve only a compact one-line result slot, and a longer result eases in", async () => {
  supportPasskeys();
  render(welcome());
  assert.equal(status(), "");
  const after = document.querySelector("[data-welcome-result=after]")!;
  assert.equal(
    after.classList.contains("min-h-6"),
    true,
    "one line reserved below the button"
  );
  assert.equal(
    document.querySelector(
      "[class*=min-h-12][role=status], [role=status] [class*=min-h-12]"
    ),
    null,
    "never the old two-line slot"
  );
  const source = readFileSync("src/components/membership/welcome.tsx", "utf8");
  assert.match(source, /AnimatePresence/);
  assert.match(source, /height: "auto"/);
  assert.doesNotMatch(
    source,
    /useReducedMotion|prefers-reduced-motion|motion-reduce/
  );
});

test("each answered outcome reads below the button and leaves it usable; not added always says the same", async () => {
  supportPasskeys();
  const outcomes: [Error, string][] = [
    [
      new MemberAuthActionError("passkey-cancelled"),
      "The passkey request was cancelled or timed out. Try again when you’re ready."
    ],
    [
      new MemberAuthActionError("rate-limited"),
      "Too many attempts. Wait a few minutes, then try again."
    ],
    [
      new MemberAuthActionError("unavailable"),
      "The passkey wasn’t added. Try again."
    ],
    // A lost request the client already settled, or one that never reached verification, wasn't added either.
    [
      new MemberAuthActionError("network"),
      "The passkey wasn’t added. Try again."
    ],
    [new Error("boom"), "The passkey wasn’t added. Try again."]
  ];
  for (const [error, message] of outcomes) {
    render(welcome(), async () => {
      throw error;
    });
    await press(add());
    assert.equal(status(), message);
    assert.equal(add().hasAttribute("disabled"), false);
    ui.cleanup();
  }
});

test("an unsettled lost registration stays unknown until the client confirms it, and the result then says added or not added", async () => {
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
    assert.equal(
      status(),
      "We couldn’t confirm the passkey yet. This page checks again in a few minutes."
    );
    assert.equal(
      ui.screen.queryByRole("button", { name: "Add a passkey" }),
      null,
      "no second passkey before the first is settled"
    );
    await press(ui.screen.getByRole("button", { name: "Check again" }));
    assert.match(
      status(),
      /couldn’t confirm the passkey yet/,
      "still unknown while it could commit"
    );
    await press(ui.screen.getByRole("button", { name: "Check again" }));
    await settled();
    assert.equal(status(), "Passkey added.");
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
  await press(ui.screen.getByRole("button", { name: "Check again" }));
  assert.equal(
    status(),
    "The passkey wasn’t added. Try again.",
    "the same wording as a refusal"
  );
  assert.ok(add());
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
  assert.equal(status(), "The passkey wasn’t added. Try again.");
});

test("when an automatic check still can't tell, the page keeps checking, then stops promising to", async () => {
  supportPasskeys();
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { calls } = render(
      welcome(),
      async () => {
        throw lost("network", 0, Date.now() - 1);
      },
      async () => "unknown"
    );
    await press(add());
    const tick = (ms: number) =>
      ui.act(async () => {
        mock.timers.tick(ms);
        await Promise.resolve();
      });
    await tick(1000);
    assert.deepEqual(
      calls,
      ["add", "confirm 0"],
      "the first check runs once the window has closed"
    );
    assert.match(status(), /This page checks again in a few minutes/);
    for (let index = 0; index < 4; index++) await tick(60_000);
    assert.equal(
      calls.filter((call) => call.startsWith("confirm")).length,
      5,
      "it checks again while it still can't tell, a bounded number of times"
    );
    assert.equal(
      status(),
      "We couldn’t confirm the passkey yet. Check again in a few minutes before you add another.",
      "then it stops promising to check by itself"
    );
    await tick(600_000);
    assert.equal(calls.filter((call) => call.startsWith("confirm")).length, 5);
    assert.ok(ui.screen.getByRole("button", { name: "Check again" }));
  } finally {
    mock.timers.reset();
  }
});

test("a browser without passkeys is told so in the button's own slot, so the card never grows after hydration", async () => {
  const { calls } = render(welcome());
  const unsupported =
    "This browser can’t use passkeys. Open this page on your phone instead.";
  // Swap, don't append: no Add a passkey button, and nothing waits in the result slot below.
  assert.equal(
    ui.screen.queryByRole("button", { name: "Add a passkey" }) === null,
    true,
    "no button to press"
  );
  const after = document.querySelector("[data-welcome-result=after]");
  assert.equal(
    (after?.textContent ?? "") === "",
    true,
    "the result slot below stays empty"
  );
  const slot = [...document.querySelectorAll("p")].find(
    (p) => p.textContent === unsupported
  );
  assert.equal(slot !== undefined, true, "the message is shown");
  // The button's 48 px (two lines of text-sm leading-6) is held, whatever the width.
  assert.equal(
    slot!.classList.contains("min-h-12"),
    true,
    "it takes the button's height"
  );
  const body = [...document.querySelectorAll("p")].find((p) =>
    /Add a passkey to this device/.test(p.textContent ?? "")
  )!;
  assert.equal(
    Boolean(
      body.compareDocumentPosition(slot!) &
      dom.window.Node.DOCUMENT_POSITION_FOLLOWING
    ),
    true,
    "below the body, where the button sits"
  );
  assert.equal(
    Boolean(
      after &&
      slot!.compareDocumentPosition(after) &
        dom.window.Node.DOCUMENT_POSITION_FOLLOWING
    ),
    true,
    "above the result slot"
  );
  assert.deepEqual(calls, []);
});

test("an unverified email shows no Signet sentence, no shop and no passkey offer, only what to do", () => {
  supportPasskeys();
  render(welcome({ emailVerified: false, signet: null }));
  assert.equal(
    ui.screen.queryByRole("button", { name: "Add a passkey" }),
    null
  );
  assert.equal(ui.screen.queryByRole("link", { name: "Go to the shop" }), null);
  assert.doesNotMatch(text(), /Signet|membership yet/);
  assert.match(
    text(),
    /Your email isn’t verified yet\. Sign out from your account and verify your email/
  );
});

test("a suspended account sees a restricted state, not a missing membership", () => {
  supportPasskeys();
  render({ state: "restricted" });
  assert.ok(
    ui.screen.getByRole("heading", { name: "This account is restricted" })
  );
  const mail = ui.screen.getByRole("link", { name: "concierge@sophomores.co" });
  assert.equal(mail.getAttribute("href"), "mailto:concierge@sophomores.co");
  // An 18 px text line plus 13 px above and below: a 44 px touch target that leaves the line box alone.
  assert.equal(mail.classList.contains("py-[13px]"), true, "a 44 px hit area");
  assert.equal(
    ui.screen.queryByRole("button", { name: "Add a passkey" }),
    null
  );
  assert.equal(ui.screen.queryByRole("link", { name: "Go to the shop" }), null);
  assert.doesNotMatch(text(), /membership yet|Signet is/);
});

test("while the prompt is open the button is busy and can't be pressed twice", async () => {
  supportPasskeys();
  let release!: () => void;
  const { calls } = render(
    welcome(),
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  const button = () =>
    ui.screen.getByRole("button", {
      name: /Add a passkey|Waiting for your passkey…/
    });
  await press(button());
  assert.equal(button().textContent, "Waiting for your passkey…");
  assert.equal(button().hasAttribute("disabled"), true);
  await press(button());
  assert.deepEqual(calls, ["add"]);
  await ui.act(async () => release());
  assert.equal(status(), "Passkey added.");
});

test("a session that ended reads as signed out", async () => {
  supportPasskeys();
  render(welcome(), async () => {
    throw new MemberAuthActionError("unauthenticated");
  });
  await press(add());
  assert.match(text(), /Sign in to see your membership\./);
});

test("try again refreshes the page's data in place instead of reloading", async () => {
  const { router, rerender } = render({ state: "unavailable" });
  // The source check below rules out location.reload; the router refresh is the only retry.
  await press(ui.screen.getByRole("button", { name: "Try again" }));
  assert.deepEqual(router, ["refresh"]);
  ui.act(() => rerender(welcome({ signet: "issued" })));
  assert.match(
    text(),
    /Your Signet has been issued\./,
    "the refreshed server state replaces the page's view"
  );
});

test("signing in from the welcome page comes back to it", async () => {
  render({ state: "signed_out" });
  const link = ui.screen.getByRole("link", { name: "Sign in" });
  assert.equal(link.getAttribute("href"), "/account");
  link.addEventListener("click", (event) => event.preventDefault());
  await press(link);
  ui.cleanup();
  const back = routerFixture();
  ui.render(back.wrap(<WelcomeLink />));
  assert.deepEqual(
    back.calls,
    ["replace /welcome"],
    "once signed in, the account page sends the member back"
  );
  assert.equal(
    ui.screen
      .getByRole("link", { name: "Your membership" })
      .getAttribute("href"),
    "/welcome"
  );
  ui.cleanup();
  const direct = routerFixture();
  ui.render(direct.wrap(<WelcomeLink />));
  assert.deepEqual(
    direct.calls,
    [],
    "the return happens once; opening the account page later stays there"
  );
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
