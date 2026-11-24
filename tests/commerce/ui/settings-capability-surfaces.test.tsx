import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SettingsRail } from "@/components/settings/SettingsRail";
import { SettingsNavProvider } from "@/components/settings/SettingsNav";
import { EnglishMessages } from "../../fixtures/english-messages";
import { ReadingFixture } from "../../fixtures/reading-layout";
import { setSettingsFixtureIdentity } from "../../fixtures/settings-capability-identity";

test("address and notification settings guard entry and render only supported actions", async (t) => {
  const boundary = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL && /\/me\/settings(?:\/(?:addresses|notifications))?\/page\.tsx$/.test(new URL(context.parentURL).pathname)) {
        if (specifier === "next-intl/server") return {
          url: new URL("../../fixtures/preview-server-translations.ts", import.meta.url).href,
          shortCircuit: true,
        };
        if (specifier === "@/lib/auth/server") return {
          url: new URL("../../fixtures/settings-capability-identity.ts", import.meta.url).href,
          shortCircuit: true,
        };
      }
      return nextResolve(specifier, context);
    },
  });
  t.after(() => {
    boundary.deregister();
    setSettingsFixtureIdentity(false);
  });

  const { default: settings } = await import("@/app/(site)/me/settings/page");
  const { default: addresses } = await import("@/app/(site)/me/settings/addresses/page");
  const { default: notifications } = await import("@/app/(site)/me/settings/notifications/page");

  setSettingsFixtureIdentity(true);
  const hub = renderToStaticMarkup(
    <EnglishMessages>
      <ReadingFixture>
        <SettingsNavProvider>{await settings()}</SettingsNavProvider>
      </ReadingFixture>
    </EnglishMessages>,
  ).split('<main data-reading-fixture="content">')[1]?.split("</main>")[0];
  assert.ok(hub);
  for (const path of ["/me", "/me/settings/account", "/me/settings/general", "/me/settings/security", "/me/settings/addresses", "/me/settings/notifications"]) {
    assert.ok(hub.includes(`href="${path}"`), path);
  }

  for (const [page, details, destination] of [
    [addresses, /Enter a delivery address at checkout/, "/help/shipping"],
    [notifications, /change notification preferences here/, "/help"],
  ] as const) {
    setSettingsFixtureIdentity(false);
    await assert.rejects(page, (error: unknown) => error instanceof Error && "digest" in error
      && typeof error.digest === "string" && /^\/sign-in\?next=\/me\/settings\/(?:addresses|notifications)$/.test(error.digest.split(";")[2]));

    setSettingsFixtureIdentity(true);
    const html = renderToStaticMarkup(
      <EnglishMessages>
        <ReadingFixture>
          <SettingsNavProvider><SettingsRail />{await page()}</SettingsNavProvider>
        </ReadingFixture>
      </EnglishMessages>,
    ).split('<main data-reading-fixture="content">')[1]?.split("</main>")[0];
    assert.ok(html);
    assert.match(html, details);
    for (const path of ["/me/settings", "/me/orders", destination]) {
      assert.ok(html.includes(`href="${path}"`), path);
    }
    assert.equal((html.match(/href="\/me\/settings"/g) ?? []).length, 2, "desktop rail and subroute header both link to Settings");
    assert.doesNotMatch(html, /<form\b|<input\b|<button\b|role="switch"|aria-checked/i);
  }
});
