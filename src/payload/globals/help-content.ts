import english from "../../../messages/en.json";
import type { GlobalAfterChangeHook, GlobalConfig, Payload } from "payload";
import { revalidatePath } from "next/cache";
import { staffWrite } from "../collections/access";
import { lockGlobalBeforeUpdate } from "./singleton-lock";

const label = english.Staff.schema;

/** Help pages render per request; this keeps any cached copy of them current after a save (Payload template). */
const revalidateHelp: GlobalAfterChangeHook = ({ doc, context }) => {
  if (!context.disableRevalidate) {
    try {
      revalidatePath("/help");
      revalidatePath("/help/shipping");
    } catch {
      // Outside a Next request (scripts, tests) there is nothing to revalidate.
    }
  }
  return doc;
};

/**
 * The business's own Help prose, edited in the admin (owner, 20 Nov: "all the stuff that must be provided by
 * us - the business- should be wired to Payloadcms for convenient editing."). Shaped like The Hideaway's
 * Header and Footer globals. Interface text (headings, link labels, state and safety lines) stays in next-intl.
 */
export const HelpContent: GlobalConfig = {
  slug: "help-content",
  label: label.helpContent,
  admin: { description: label.helpContentDescription },
  access: { read: () => true, update: staffWrite },
  hooks: { beforeOperation: [lockGlobalBeforeUpdate], afterChange: [revalidateHelp] },
  fields: [
    {
      name: "introduction",
      type: "textarea",
      localized: true,
      label: label.helpIntroduction
    },
    {
      name: "topics",
      type: "group",
      label: label.helpTopicSummaries,
      fields: [
        {
          name: "shipping",
          type: "textarea",
          localized: true,
          label: label.helpTopicShipping
        },
        {
          name: "account",
          type: "textarea",
          localized: true,
          label: label.helpTopicAccount
        },
        {
          name: "shop",
          type: "textarea",
          localized: true,
          label: label.helpTopicShop
        }
      ]
    },
    {
      name: "shipping",
      type: "group",
      label: label.helpShippingPage,
      fields: [
        {
          name: "introduction",
          type: "textarea",
          localized: true,
          label: label.helpShippingIntroduction
        }
      ]
    }
  ]
};

export type HelpTopic = "shipping" | "account" | "shop";
export type HelpCopy = Readonly<{
  introduction: string;
  topics: Readonly<Record<HelpTopic, string>>;
  shippingIntroduction: string;
}>;

const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const record = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export function parseHelpCopy(value: unknown): HelpCopy {
  const doc = record(value);
  const topics = record(doc.topics);
  return {
    introduction: text(doc.introduction),
    topics: {
      shipping: text(topics.shipping),
      account: text(topics.account),
      shop: text(topics.shop)
    },
    shippingIntroduction: text(record(doc.shipping).introduction)
  };
}

/** The Help prose in one locale. An empty field renders nothing. */
export async function loadHelpCopy(
  payload: Payload,
  locale: "en" | "ko"
): Promise<HelpCopy> {
  return parseHelpCopy(
    await payload.findGlobal({
      slug: "help-content",
      locale,
      depth: 0,
      overrideAccess: true
    })
  );
}
