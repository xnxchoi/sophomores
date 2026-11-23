import assert from "node:assert/strict";
import test from "node:test";
import { get } from "lodash-es";
import { messagesByLocale } from "@/i18n/messages";
import {
  verificationLocales,
  verificationNamespaces
} from "@/lib/phone-verification/i18n";
import { verificationCatalogues } from "@/lib/phone-verification/messages.server";
import { clientNamespaces } from "../support/client-namespaces";

// The flow switches language itself, so its segment hands it these namespaces in both locales (SegmentMessages).
// A namespace read anywhere under the flow and missing here would show as a raw key after a language switch.
const flow = [
  "src/components/Authentication/phone-verification/phone-verification.tsx",
  "src/components/Authentication/phone-verification/phone-verification-trial.tsx",
  "src/components/Authentication/phone-verification/phone-verification-modal.tsx",
  "src/components/Authentication/phone-verification/authentication-entry.tsx",
  "src/components/Authentication/phone-verification/verification-study.tsx"
];

test("the verification namespaces cover every namespace the flow reads", () => {
  const { namespaces, untyped } = clientNamespaces(flow);
  assert.deepEqual(untyped, []);
  for (const namespace of namespaces) {
    assert.equal(
      verificationNamespaces.some(
        (delivered) =>
          namespace === delivered || namespace.startsWith(`${delivered}.`)
      ),
      true,
      namespace
    );
  }
});

test("the server hands over exactly those namespaces, in both locales, from the canonical catalogue", () => {
  const catalogues = verificationCatalogues();
  for (const locale of verificationLocales) {
    assert.deepEqual(
      Object.keys(catalogues[locale]).sort(),
      [...verificationNamespaces].sort(),
      locale
    );
    for (const namespace of verificationNamespaces) {
      assert.deepEqual(
        get(catalogues[locale], namespace),
        get(messagesByLocale[locale], namespace),
        `${locale} ${namespace}`
      );
    }
  }
});
