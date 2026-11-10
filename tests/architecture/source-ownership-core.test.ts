import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

test("core source contracts live with their real owners", () => {
  for (const retired of ["components/core/Link/types.ts", "components/core/Link/ReferencedLink/getUrlFromReference.ts", "components/core/Media/types.ts", "components/UX/Transition/pageGroups.ts", "components/notifications/mark-read.ts", "components/UX/Tour/hooks/useAnchoredRect.ts", "components/UX/Tour/hooks/useTourTarget.ts"]) {
    assert.equal(existsSync(new URL(`../../src/${retired}`, import.meta.url)), false, retired);
  }
  for (const hook of ["useAnchoredRect", "useTourTarget"]) {
    assert.match(source(`components/UX/Tour/hooks/${hook}.tsx`), /use(?:Layout)?Effect/);
  }
  assert.match(source("cssVariables.ts"), /export type ViewportSizes = keyof \(typeof cssVariables\)\["breakpoints"\]/);
  assert.match(source("components/core/Link/Link.tsx"), /export type RPLinkProps/);
  const referenced = source("components/core/Link/ReferencedLink/index.tsx");
  assert.match(referenced, /export type ReferenceUrlResolver/);
  assert.doesNotMatch(referenced, /@payload-types|collectionTypeToFrontEnd/);
});

test("notification action retains the authenticated access-enforced server boundary", () => {
  const action = source("lib/payload/collections/notifications/actions.ts");
  assert.match(action, /^"use server";/);
  assert.match(action, /await currentUser\(\)/);
  assert.match(action, /if \(!userId\) return null/);
  assert.match(action, /overrideAccess: false/);
  assert.match(action, /if \(savedId !== id\) return null/);
  assert.match(action, /catch \{\s*return null/);
  assert.match(source("components/notifications/notification-inbox.tsx"), /@\/lib\/payload\/collections\/notifications\/actions/);
});

test("transition classification and selection preserve their current behavior", async () => {
  const classifierPath = existsSync(new URL("../../src/components/UX/Transition/pageGroups.ts", import.meta.url))
    ? "@/components/UX/Transition/pageGroups"
    : "@/components/UX/Transition/useTransitionSetter";
  const { classifyPath, pickTransitionType } = await import(classifierPath);
  assert.deepEqual(classifyPath("/@member/settings/?x=1#section"), { pathname: "/@member/settings", group: "profile", purpose: "content", authGated: false });
  assert.equal(classifyPath("/account").authGated, true);
  assert.equal(classifyPath("/two-factor").group, "auth");
  for (const [fromHref, toHref, navIsOpen, override, expected] of [
    ["/", "/account", false, null, "CURTAIN"],
    ["/privacy", "/terms", false, null, "FADE"],
    ["/me/settings", "/me/settings/profile", false, null, "SHELL"],
    ["/", "/account", true, null, "FROM_MENU"],
    ["/", "/account", true, "IMMEDIATE", "IMMEDIATE"]
  ] as const) {
    assert.equal(pickTransitionType({ fromHref, toHref, navIsOpen, override }).type, expected);
  }
});
