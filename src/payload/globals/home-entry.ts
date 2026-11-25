import { randomBytes } from "node:crypto";
import english from "../../../messages/en.json";
import type { FieldHook, GlobalConfig } from "payload";
import { staffWrite } from "../collections/access";

const label = english.Staff.schema;
const seoul = { defaultTimezone: "Asia/Seoul", supportedTimezones: [{ label: "Seoul", value: "Asia/Seoul" }] };

/** An entry code: 24 base64url characters (144 random bits) made by the server, never typed by a person. */
export const entryCodePattern = /^[A-Za-z0-9_-]{24}$/;
export const newEntryCode = () => randomBytes(18).toString("base64url");

/**
 * A row keeps the code it was given; a new row gets a fresh one. Whatever the request sent for `code` is ignored,
 * so staff can't type a guessable code. Deleting a row deletes its code: from then on it opens nothing new (a pass it
 * already gave lasts out its 6 hours).
 */
const serverCode: FieldHook = ({ siblingData, originalDoc }) => {
  const rows = (originalDoc as { entryLinks?: Array<{ id?: unknown; code?: unknown }> } | undefined)?.entryLinks ?? [];
  const kept = rows.find((row) => row.id !== undefined && row.id === (siblingData as { id?: unknown }).id)?.code;
  return typeof kept === "string" && entryCodePattern.test(kept) ? kept : newEntryCode();
};

/**
 * When the Warp home shows at "/" (owner, 24 Nov: "I want the main warp page being activated for only a set period of
 * time, and for those entering with a particular link"). Staff-only for reading as well as writing: the codes are
 * secrets, so they never reach the public REST or GraphQL API. The site reads it on the server
 * (src/lib/content/home-entry.server.ts).
 */
export const HomeEntry: GlobalConfig = {
  slug: "home-entry",
  label: label.homeEntry,
  admin: { description: label.homeEntryDescription },
  access: { read: staffWrite, update: staffWrite },
  fields: [
    {
      type: "row",
      fields: [
        { name: "warpStart", type: "date", label: label.warpWindowStart, timezone: seoul,
          admin: { date: { pickerAppearance: "dayAndTime" }, description: label.warpWindowDescription } },
        { name: "warpEnd", type: "date", label: label.warpWindowEnd, timezone: seoul,
          admin: { date: { pickerAppearance: "dayAndTime" } },
          validate: (value: unknown, { siblingData }: { siblingData: { warpStart?: unknown } }) => {
            const start = siblingData?.warpStart;
            if (!value || !start) return true;
            return new Date(String(value)).getTime() > new Date(String(start)).getTime() ? true : label.warpWindowOrder;
          } }
      ]
    },
    {
      name: "entryLinks",
      type: "array",
      label: label.entryLinks,
      admin: { description: label.entryLinksDescription },
      fields: [
        // Required, so the column stays NOT NULL; the hook fills it before validation, and the check accepts the empty
        // field the admin form holds for a new row.
        { name: "code", type: "text", label: label.entryLinkCode, required: true,
          admin: { readOnly: true, description: label.entryLinkCodeDescription },
          hooks: { beforeValidate: [serverCode] },
          validate: (value: unknown) => value === undefined || value === null || value === "" || (typeof value === "string" && entryCodePattern.test(value)) ? true : label.entryLinkCodeLength },
        { name: "note", type: "text", label: label.entryLinkNote }
      ]
    }
  ]
};
