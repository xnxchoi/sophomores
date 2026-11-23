import { EnglishMessages } from "../fixtures/english-messages";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, afterEach, before, mock, test } from "node:test";
import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext, type AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { readNotificationActionAttempts } from "../fixtures/notification-action-boundary";
import type { HeaderMemberState } from "@/lib/member-auth/header-state.server";

let ReadingAccountButton: typeof import("@/components/shell/header-actions").ReadingAccountButton;
let HeaderActions: typeof import("@/components/shell/header-actions").HeaderActions;
let RightZone: typeof import("@/components/shell/controlbar").RightZone;
let AccountView: typeof import("@/components/shell/controlbar/views").AccountView;
let SearchPanel: typeof import("@/components/shell/header-panels").SearchPanel;
let Providers: typeof import("@/providers").Providers;
let transportAttempts = 0;
let restoreTransport: (() => void) | undefined;

before(async () => {
  const transport = mock.method(globalThis, "fetch", () => {
    transportAttempts += 1;
    throw new Error("Auth entry SSR forbids provider/network requests");
  });
  restoreTransport = () => transport.mock.restore();
  const inboxURL = new URL("../../src/components/notifications/notification-inbox.tsx", import.meta.url).href;
  const boundaryURL = new URL("../fixtures/notification-action-boundary.ts", import.meta.url).href;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL === inboxURL && specifier === "@/payload/collections/notifications/actions")
        return { url: boundaryURL, shortCircuit: true };
      return nextResolve(specifier, context);
    }
  });
  try {
    ({ ReadingAccountButton, HeaderActions } = await import("@/components/shell/header-actions"));
    ({ RightZone } = await import("@/components/shell/controlbar"));
    ({ AccountView } = await import("@/components/shell/controlbar/views"));
    ({ SearchPanel } = await import("@/components/shell/header-panels"));
    ({ Providers } = await import("@/providers"));
  } finally {
    hooks.deregister();
  }
});

afterEach(() => {
  assert.equal(readNotificationActionAttempts(), 0, "Static link SSR must never invoke a server action");
  assert.equal(transportAttempts, 0, "Importing and rendering auth entry links must not send requests");
});
after(() => { restoreTransport?.(); });

const unexpectedNavigation = () => { throw new Error("Auth entry SSR must not navigate"); };
const router: AppRouterInstance = {
  back: unexpectedNavigation,
  forward: unexpectedNavigation,
  refresh: unexpectedNavigation,
  push: unexpectedNavigation,
  replace: unexpectedNavigation,
  prefetch: unexpectedNavigation,
  bfcacheId: "auth-entry-ssr-fixture"
};

function AuthEntryFixture({ children }: { children: ReactNode }) {
  return <AppRouterContext.Provider value={router}><Providers>{children}</Providers></AppRouterContext.Provider>;
}

test("the reading header's account pill says what the main header says: Sign in to the account chooser, or Account", () => {
  assert.equal(existsSync(new URL("../../src/app/(site)/account/page.tsx", import.meta.url)), true);
  // setup: signed in, registration not finished. Account goes to /account, where Continue registration is.
  for (const [signedIn, setup, label, href] of [[false, false, "Sign in", "/account"], [true, false, "Account", "/me"], [true, true, "Account", "/account"]] as const) {
    const dom = new JSDOM(renderToStaticMarkup(<EnglishMessages><AuthEntryFixture><ReadingAccountButton signedIn={signedIn} setup={setup} /></AuthEntryFixture></EnglishMessages>));
    try {
      const anchors = dom.window.document.querySelectorAll("a");
      assert.equal(anchors.length, 1);
      assert.equal(anchors[0].getAttribute("aria-label"), label);
      assert.equal(anchors[0].textContent, label);
      assert.equal(anchors[0].getAttribute("href"), href);
      assert.ok(!/check.?in/i.test(anchors[0].textContent ?? ""), "no Check In label");
    } finally {
      dom.window.close();
    }
  }
});

/** A member state React reads without suspending (an already-settled promise, as React tracks one). */
function settled(value: HeaderMemberState) {
  return Object.assign(Promise.resolve(value), { status: "fulfilled", value });
}
const pending = () => new Promise<HeaderMemberState>(() => {});
const anchorsIn = (markup: string) => [...new JSDOM(markup).window.document.querySelectorAll("a")]
  .map((anchor) => [anchor.getAttribute("aria-label") ?? anchor.textContent, anchor.getAttribute("href")]);

test("the reading header follows the member state: Account while it loads, /account until registration is finished", () => {
  const header = (member: Promise<HeaderMemberState>) =>
    anchorsIn(renderToStaticMarkup(<EnglishMessages><AuthEntryFixture><HeaderActions member={member} /></AuthEntryFixture></EnglishMessages>))
      .filter(([label]) => label === "Sign in" || label === "Account");
  assert.deepEqual(header(pending()), [["Account", "/me"]], "while the state loads: Account, as the main header");
  assert.deepEqual(header(settled({ state: "unavailable" })), [["Account", "/me"]]);
  assert.deepEqual(header(settled({ state: "signed-out" })), [["Sign in", "/account"]]);
  assert.deepEqual(header(settled({ state: "signed-in", member: true })), [["Account", "/me"]]);
  assert.deepEqual(header(settled({ state: "signed-in", member: false })), [["Account", "/account"]]);
});

test("on touch phones the reading bar shows Sign in only when signed out; unknown states get Account, as on desktop", () => {
  const bar = (state: "signed-in" | "signed-out" | "unavailable" | null) => {
    const document = new JSDOM(renderToStaticMarkup(<EnglishMessages><AuthEntryFixture>
      <RightZone reading state={state} view={null} select={unexpectedNavigation} />
    </AuthEntryFixture></EnglishMessages>)).window.document;
    return {
      signIn: [...document.querySelectorAll("a")].filter((anchor) => anchor.getAttribute("aria-label") === "Sign in").length,
      account: document.querySelectorAll("button[aria-label='Account']").length
    };
  };
  assert.deepEqual(bar("signed-out"), { signIn: 1, account: 0 });
  for (const state of [null, "unavailable", "signed-in"] as const)
    assert.deepEqual(bar(state), { signIn: 0, account: 1 }, String(state));
});

test("the phone account view offers Continue registration (/account) only while registration is unfinished", () => {
  const rows = (member?: Promise<HeaderMemberState>) =>
    anchorsIn(renderToStaticMarkup(<EnglishMessages><AuthEntryFixture><AccountView member={member} /></AuthEntryFixture></EnglishMessages>));
  const resume = ["Continue registration", "/account"];
  assert.ok(rows(settled({ state: "signed-in", member: false })).some((row) => row.join() === resume.join()));
  for (const member of [settled({ state: "signed-in", member: true }), settled({ state: "signed-out" }), settled({ state: "unavailable" }), pending(), undefined])
    assert.ok(!rows(member).some((row) => row[1] === "/account"), "no /account row otherwise");
});

test("search Sign in and Create account anchors share the standalone account chooser", () => {
  const dom = new JSDOM(renderToStaticMarkup(<EnglishMessages><AuthEntryFixture><SearchPanel onClose={unexpectedNavigation} /></AuthEntryFixture></EnglishMessages>));
  try {
    for (const label of ["Sign in", "Create account"]) {
      const anchors = [...dom.window.document.querySelectorAll("a")]
        .filter((anchor) => anchor.textContent?.startsWith(label));
      assert.equal(anchors.length, 1, `${label} must remain a visible navigation choice`);
      assert.equal(anchors[0].getAttribute("href"), "/account", label);
    }
  } finally {
    dom.window.close();
  }
});
