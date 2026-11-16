import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import {
  AppRouterContext,
  type AppRouterInstance
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { EnglishMessages } from "../fixtures/english-messages";
import "../support/notification-action-stub";
import { ClientLayout } from "@/app/(site)/client-layout";
import { Providers } from "@/providers";

// The header bar is on every site page (owner, 2026-11-16). The home page keeps its own masthead, and the
// essays reading view mounts the bar itself with its live posts and notifications.

const root = resolve(import.meta.dirname, "../..");

const unexpectedNavigation = () => {
  throw new Error("Rendering the site frame must not navigate");
};
const router: AppRouterInstance = {
  back: unexpectedNavigation,
  forward: unexpectedNavigation,
  refresh: unexpectedNavigation,
  push: unexpectedNavigation,
  replace: unexpectedNavigation,
  prefetch: unexpectedNavigation,
  bfcacheId: "site-header-ssr-fixture"
};

const render = (path: string) =>
  renderToStaticMarkup(
    <EnglishMessages>
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={path}>
          <Providers>
            <ClientLayout>
              <p>Page</p>
            </ClientLayout>
          </Providers>
        </PathnameContext.Provider>
      </AppRouterContext.Provider>
    </EnglishMessages>
  );
const headers = (html: string) => (html.match(/id="rp-header"/g) ?? []).length;
const switches = (html: string) =>
  (html.match(/Switch to (light|dark) mode/g) ?? []).length;

for (const path of [
  "/shop",
  "/account",
  "/help",
  "/team",
  "/terms",
  "/tickets",
  "/me/settings"
]) {
  test(`the site frame mounts one header bar on ${path}`, () => {
    const html = render(path);
    assert.match(html, /Page/);
    assert.equal(headers(html), 1);
  });
}

test("the essays reading view keeps the one bar it mounts itself", () => {
  assert.equal(headers(render("/essays")), 0);
  assert.equal(headers(render("/essays/a-post")), 0);
  const stage = readFileSync(
    resolve(root, "src/components/reading/reading-stage.tsx"),
    "utf8"
  );
  assert.match(
    stage,
    /<SiteHeader posts=\{posts\} notifications=\{notifications\} \/>/
  );
});

test("a path that only starts like essays still gets the frame's bar", () => {
  assert.equal(headers(render("/essaysx")), 1);
});

test("the home page keeps its own masthead", () => {
  assert.equal(headers(render("/")), 0);
});

test("the mode switch stays hidden in the bar on a page that holds its theme", () => {
  assert.equal(switches(render("/team")), 0);
  assert.equal(switches(render("/shop")), 1);
});
