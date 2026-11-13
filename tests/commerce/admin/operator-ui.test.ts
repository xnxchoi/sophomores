import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";

const base = "src/payload/admin/commerce/";
test("operator touch targets use CSS pixels independent of Payload root font size", async () => {
  for (const file of ["operation-panel.tsx", "order-controls.tsx", "admission-controls.tsx", "event-manifest.tsx"]) {
    const source = await readFile(base + file, "utf8");
    assert.equal(/staff:min-h-11/.test(source), false, file);
    assert.equal(/staff:min-h-\[44px\]/.test(source), true, file);
  }
});
test("operator fields are server-authorized and document-scoped", async () => {
  const server = await readFile(base + "fields.tsx", "utf8");
  assert.match(server, /isCmsSuperAdmin/);
  assert.match(server, /req\.user/);
  assert.match(server, /operatorID/);
  const client = await readFile(base + "operation-panel.tsx", "utf8");
  assert.match(client, /useFormModified/);
  assert.match(client, /formatAdminURL/);
  assert.match(client, /sessionStorage/);
  assert.match(client, /pending\.current/);
  assert.match(client, /setData/);
});
test("manifest pagination is bounded and cancels obsolete reads", async () => {
  const source = await readFile(base + "event-manifest.tsx", "utf8");
  assert.match(source, /AbortController/);
  assert.match(source, /hasNextPage/);
  const t = createTranslator({ locale: "en", messages: messagesByLocale.en, namespace: "Staff.eventManifest" });
  assert.match(source, /t\("previous"\)/);
  assert.match(source, /t\("next"\)/);
  assert.equal(t("previous"), "Previous");
  assert.equal(t("next"), "Next");
  assert.match(source, /\.max\(100\)/);
  assert.match(source, /page: z\.int\(\)\.min\(1\)/);
  assert.match(source, /page <= 1/);
  assert.match(source, /!result\?\.hasNextPage/);
  assert.match(source, /if \(receipt\.page !== page\)/);
  assert.match(source, /return \(\) => controller\.abort\(\)/);
  assert.match(source, /if \(!controller\.signal\.aborted\) setResult\(receipt\)/);
});
