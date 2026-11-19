import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { before, test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { EnglishMessages } from "../fixtures/english-messages";

// The mode switch is hidden while a page holds its own theme (owner, 2026-11-16). The home page is locked.

let DarkmodeButton: typeof import("@/components/UX/DarkMode/Darkmode").DarkmodeButton;
let SearchPanel: typeof import("@/components/shell/header-panels").SearchPanel;
let Providers: typeof import("@/providers").Providers;

before(async () => {
  // The search panel reaches the notification inbox; its server actions are stubbed, as in the auth-entry test.
  const inboxURL = new URL(
    "../../src/components/notifications/notification-inbox.tsx",
    import.meta.url
  ).href;
  const boundaryURL = new URL(
    "../fixtures/notification-action-boundary.ts",
    import.meta.url
  ).href;
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (
        context.parentURL === inboxURL &&
        specifier === "@/payload/collections/notifications/actions"
      )
        return { url: boundaryURL, shortCircuit: true };
      return nextResolve(specifier, context);
    }
  });
  try {
    ({ DarkmodeButton } = await import("@/components/UX/DarkMode/Darkmode"));
    ({ SearchPanel } = await import("@/components/shell/header-panels"));
    ({ Providers } = await import("@/providers"));
  } finally {
    hooks.deregister();
  }
});

const unexpectedNavigation = () => {
  throw new Error("Rendering the mode switch must not navigate");
};
const router: AppRouterInstance = {
  back: unexpectedNavigation,
  forward: unexpectedNavigation,
  refresh: unexpectedNavigation,
  push: unexpectedNavigation,
  replace: unexpectedNavigation,
  prefetch: unexpectedNavigation,
  bfcacheId: "mode-switch-ssr-fixture"
};

const render = (path: string) =>
  renderToStaticMarkup(
    <EnglishMessages>
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={path}>
          <Providers>
            <DarkmodeButton />
            <SearchPanel onClose={() => {}} />
          </Providers>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    </EnglishMessages>
  );
const switches = (html: string) =>
  (html.match(/Switch to (light|dark) mode/g) ?? []).length;

test("on the home page (locked) neither the header button nor the search panel offers a mode switch", () => {
  assert.equal(switches(render("/")), 0);
});

test("on an unlocked page both offer it", () => {
  assert.equal(switches(render("/shop")), 2);
});
