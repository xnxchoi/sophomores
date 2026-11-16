import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { WelcomeView } from "@/lib/member-auth/welcome/read";
import { MemberAuthActionError } from "@/lib/member-auth/client";

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
    url: "http://localhost/welcome"
  });
  for (const key of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Node",
    "MutationObserver",
    "Event",
    "DOMException",
    "localStorage"
  ])
    install(
      key,
      key === "window" ? dom.window : dom.window[key as keyof typeof dom.window]
    );
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
function render(
  view: WelcomeView,
  addPasskey: () => Promise<void> = async () => undefined,
  passkeyCount: () => Promise<number> = async () => 0
) {
  const calls: string[] = [];
  const client = {
    addPasskey: async () => {
      calls.push("add");
      await addPasskey();
    },
    passkeyCount: async () => {
      calls.push("count");
      return passkeyCount();
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
const status = () => ui.screen.getByRole("status").textContent;
const add = () => ui.screen.getByRole("button", { name: "Add a passkey" });
const press = (element: HTMLElement) =>
  ui.act(async () => ui.fireEvent.click(element));

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

test("adding a passkey ends the offer: no body or button invites another", async () => {
  supportPasskeys();
  const { calls } = render(welcome());
  await press(add());
  assert.deepEqual(calls, ["add"]);
  assert.equal(status(), "Passkey added.");
  assert.match(text(), /Next time, you can sign in by unlocking this device\./);
  assert.equal(
    ui.screen.queryByRole("button", { name: "Add a passkey" }),
    null
  );
  assert.doesNotMatch(text(), /Add a passkey to this device|add one here too/);
});

test("each answered outcome reads in the reserved status slot and leaves the button usable", async () => {
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
      "We couldn’t add the passkey. Try again."
    ],
    [new Error("boom"), "We couldn’t add the passkey. Try again."]
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

test("an unknown result is checked against the passkey count: added, not added, or still unknown", async () => {
  supportPasskeys();
  for (const kind of ["network", "timeout"] as const) {
    const counts = [new Error("down"), 1];
    const { calls } = render(
      welcome(),
      async () => {
        throw new MemberAuthActionError(kind);
      },
      async () => {
        const next = counts.shift();
        if (next instanceof Error || next === undefined)
          throw new MemberAuthActionError("network");
        return next;
      }
    );
    await press(add());
    assert.equal(
      status(),
      "We couldn’t confirm whether the passkey was added. Check again before you add another."
    );
    assert.equal(
      ui.screen.queryByRole("button", { name: "Add a passkey" }),
      null,
      "no second passkey before the first is settled"
    );
    await press(ui.screen.getByRole("button", { name: "Check again" }));
    assert.match(
      status() ?? "",
      /couldn’t confirm/,
      "a failed check stays unknown"
    );
    await press(ui.screen.getByRole("button", { name: "Check again" }));
    assert.equal(status(), "Passkey added.");
    assert.deepEqual(calls, ["add", "count", "count"]);
    ui.cleanup();
  }
  render(
    welcome({ passkeys: 1 }),
    async () => {
      throw new MemberAuthActionError("network");
    },
    async () => 1
  );
  await press(add());
  await press(ui.screen.getByRole("button", { name: "Check again" }));
  assert.equal(status(), "The passkey wasn’t added. Try again.");
  assert.ok(add());
});

test("a browser without passkeys is told so up front, and the button is disabled", async () => {
  const { calls } = render(welcome());
  assert.equal(
    status(),
    "This browser can’t use passkeys. To add one, open this page on your phone or in an up-to-date browser."
  );
  assert.equal(add().hasAttribute("disabled"), true);
  await press(add());
  assert.deepEqual(calls, []);
});

test("an account with an unverified email isn't offered a passkey the server would refuse", () => {
  supportPasskeys();
  render(welcome({ emailVerified: false }));
  assert.equal(
    ui.screen.queryByRole("button", { name: "Add a passkey" }),
    null
  );
  assert.match(
    text(),
    /Passkeys need a verified email\. Verify your email from your account, then come back here to add one\./
  );
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
