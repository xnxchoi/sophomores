import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { MemberWelcomeView } from "@/lib/member-auth/welcome/read";
import { EnglishMessages } from "../../fixtures/english-messages";

test("welcome renders signed-out and verified views with their own controls", async (t) => {
  const stubs: Readonly<Record<string, string>> = {
    "next/navigation": "export function useRouter() { return { refresh() {} }; }",
    "@/components/core/Link/Link": "export function Link({ children }) { return children; }",
    "@/components/ui/button": "export function Button({ children }) { return children; }",
  };
  const modulePrefix = "data:text/javascript,";
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL?.endsWith("/welcome/welcome-card.tsx")) {
        const stub = stubs[specifier];
        if (stub) return { url: modulePrefix + encodeURIComponent(stub), shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
    load(url, context, nextLoad) {
      if (url.startsWith(modulePrefix)) {
        const source = decodeURIComponent(url.slice(modulePrefix.length));
        if (Object.values(stubs).includes(source)) return { format: "module", source, shortCircuit: true };
      }
      return nextLoad(url, context);
    }
  });
  t.after(() => hooks.deregister());

  const { WelcomeCard } = await import("@/app/(site)/welcome/welcome-card");
  const render = (view: MemberWelcomeView) =>
    renderToStaticMarkup(<EnglishMessages><WelcomeCard view={view} /></EnglishMessages>);

  const guest = render({ state: "signed-out" });
  assert.match(guest, /After signing in, return here to see your membership/);
  assert.doesNotMatch(guest, /Wallet record|Open passkey settings|Try again/);

  const verified = {
    state: "verified",
    wallet: "recorded",
    passkeyAvailable: true,
    signet: "unavailable",
    eventTicket: { issuance: "unavailable", qr: "unavailable", checkIn: "unavailable" }
  } as const satisfies MemberWelcomeView;
  assert.match(render(verified), /Open passkey settings/);
  assert.match(render(verified), /Wallet record/);
  assert.doesNotMatch(render({ ...verified, passkeyAvailable: false }), /Open passkey settings/);
  assert.match(render({ ...verified, wallet: "unavailable" }), /Try again/);
});
