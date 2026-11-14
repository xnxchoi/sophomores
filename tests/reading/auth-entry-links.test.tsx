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

let CheckInButton: typeof import("@/components/shell/header-actions").CheckInButton;
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
    ({ CheckInButton } = await import("@/components/shell/header-actions"));
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

test("active Check In anchor opens the existing standalone account chooser", () => {
  assert.equal(existsSync(new URL("../../src/app/(site)/account/page.tsx", import.meta.url)), true);
  const dom = new JSDOM(renderToStaticMarkup(<EnglishMessages><AuthEntryFixture><CheckInButton /></AuthEntryFixture></EnglishMessages>));
  try {
    const anchors = dom.window.document.querySelectorAll("a[aria-label='Check-In']");
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].getAttribute("href"), "/account");
  } finally {
    dom.window.close();
  }
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
