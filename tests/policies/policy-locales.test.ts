import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Payload } from "payload";
import {
  BusinessInfo,
  loadBusinessInformation
} from "@/payload/globals/business-info";

// Owner, 20 Nov: "Separate fields for the policy pages". Policies are per language; the facts are not.
test("only the three policies are localized on the business-info global", () => {
  const localized = BusinessInfo.fields.flatMap((field) =>
    "name" in field && "localized" in field && field.localized
      ? [field.name]
      : []
  );
  assert.deepEqual(localized, ["terms", "privacy", "refund"]);
});

test("the loader reads the requested language, and the default without one", async () => {
  const calls: Record<string, unknown>[] = [];
  const payload = {
    findGlobal: async (args: Record<string, unknown>) => {
      calls.push(args);
      return {};
    }
  } as unknown as Payload;
  await loadBusinessInformation(payload, "ko");
  await loadBusinessInformation(payload);
  assert.equal(calls[0].locale, "ko");
  assert.equal("locale" in calls[1], false);
});

// Review-A LOW: a Korean document saved blank isn't null, so Payload's fallback keeps it.
const lexical = (value: string) => ({
  root: {
    type: "root",
    version: 1,
    direction: null,
    format: "",
    indent: 0,
    children: [
      {
        type: "paragraph",
        version: 1,
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
        children: value
          ? [
              {
                type: "text",
                version: 1,
                text: value,
                format: 0,
                mode: "normal",
                style: "",
                detail: 0
              }
            ]
          : []
      }
    ]
  }
});
const text = (document: unknown) =>
  JSON.stringify(document).match(/"text":"([^"]*)"/)?.[1] ?? null;

test("a Korean policy saved blank shows the English; saved Korean text stays", async () => {
  const docs: Record<string, Record<string, unknown>> = {
    ko: {
      terms: lexical(""),
      privacy: lexical("Fixture Korean privacy"),
      refund: null
    },
    en: {
      terms: lexical("Fixture English terms"),
      privacy: lexical("Fixture English privacy"),
      refund: null
    }
  };
  const reads: unknown[] = [];
  const payload = {
    findGlobal: async (args: { locale?: string }) => {
      reads.push(args.locale);
      return docs[args.locale ?? "en"];
    }
  } as unknown as Payload;
  const korean = await loadBusinessInformation(payload, "ko");
  assert.equal(text(korean.policies.terms), "Fixture English terms");
  assert.equal(text(korean.policies.privacy), "Fixture Korean privacy");
  assert.equal(korean.policies.refund, null);
  assert.deepEqual(reads, ["ko", "en"]);
  reads.length = 0;
  docs.en.terms = lexical("");
  assert.equal(
    (await loadBusinessInformation(payload, "en")).policies.terms,
    null
  );
  assert.deepEqual(reads, ["en"]);
});

test("if the English read fails, the Korean read stands", async () => {
  // Synthetic fixture facts only.
  const korean = {
    tradeName: "Fixture trade name", representative: "Fixture representative", businessAddress: "Fixture address",
    bizNum: "000-00-00000", mailOrderRegistration: "Fixture exemption",
    customerServicePhone: "02-000-0000", customerServiceEmail: "help@example.test",
    terms: lexical(""),
    privacy: lexical("Fixture Korean privacy"),
    refund: null
  };
  const payload = {
    findGlobal: async (args: { locale?: string }) => {
      if (args.locale === "en") throw new Error("Fixture read failure");
      return korean;
    }
  } as unknown as Payload;
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args[0]); };
  try {
    const info = await loadBusinessInformation(payload, "ko");
    assert.equal(info.policies.terms, null);
    assert.equal(text(info.policies.privacy), "Fixture Korean privacy");
    assert.equal(info.facts?.tradeName, "Fixture trade name");
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 1);
});

test("source-only: policy readers pass the visitor's language", () => {
  for (const path of ["terms", "privacy", "refund", "help/shipping"]) {
    const source = readFileSync(`src/app/(site)/${path}/page.tsx`, "utf8");
    assert.equal(
      /loadBusinessInformation\([^;]*,\s*[^;]*"ko"/.test(source),
      true,
      path
    );
  }
});

test("source-only: the migration keeps saved policy text in English both ways", () => {
  const source = readFileSync(
    "src/payload/migrations/20261120_062810_policy_locales.ts",
    "utf8"
  );
  const [up, down] = source.split("export async function down");
  const copy = up.indexOf(
    `SELECT "terms", "privacy", "refund", 'en', "id" FROM "business_info"`
  );
  assert.equal(copy > up.indexOf(`CREATE TABLE "business_info_locales"`), true);
  assert.equal(copy < up.indexOf(`DROP COLUMN "terms"`), true);
  const restore = down.indexOf(`l."_locale" = 'en'`);
  assert.equal(restore > down.indexOf(`ADD COLUMN "refund"`), true);
  assert.equal(
    restore < down.indexOf(`DROP TABLE "business_info_locales"`),
    true
  );
});
