import english from "../messages/en.json";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { betterAuthPlugin } from "payload-auth/better-auth";

import { Admins } from "@/payload/collections/admins";
import { Users } from "@/payload/collections/users";
import { MemberWallets } from "@/payload/collections/member-wallets";
import { MemberWalletCatchUp } from "@/payload/collections/member-wallet-catch-up";
import { walletCatchUpCursorIndex } from "@/payload/collections/member-wallet-catch-up/cursor-index";
import { walletCatchUpJobs } from "@/payload/tasks/member-wallet-catch-up";
import { HomePage } from "@/payload/collections/home-page";
import { AccountRecoveryRequests } from "@/payload/collections/account-recovery-requests";
import { nfcCollections } from "@/payload/collections/nfc";
import { nfcDeleteContract, nfcHandoffChecks, nfcHandoffSchema } from "@/payload/collections/nfc/schema";
import { contentCollections } from "@/payload/collections";
import { betterAuthPluginOptions } from "@/lib/auth/options";
import { staffCmsLoginPlugin } from "@/payload/admin/staff-login-plugin";
import { payloadEnvironmentSchema } from "@/payload/configuration";
import { commercePlugin } from "@/lib/commerce/ecommerce";
import { commerceDomainPlugin } from "@/lib/commerce/domain";
import { CommercePublication } from "@/lib/commerce/catalogue";
import { BusinessInfo } from "@/payload/globals/business-info";
import { HelpContent } from "@/payload/globals/help-content";
import { HomeEntry } from "@/payload/globals/home-entry";
import { SiteEditorial } from "@/payload/globals/site-editorial";
import { editorialEnsurePlugin } from "@/payload/seed/editorial";
import { superAdminEnsurePlugin } from "@/payload/seed/super-admin";
import { homePageEnsurePlugin } from "@/payload/seed/home-page";
import { teamMemberDeleteContract } from "@/payload/collections/team-members";
import { serverChosenIDsPlugin } from "@/payload/server-chosen-ids";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const environment = payloadEnvironmentSchema.safeParse(process.env);
if (!environment.success) {
  throw new Error(`Missing or invalid Payload configuration: ${environment.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}
const { DATABASE_URI, PAYLOAD_SECRET } = environment.data;

const buildSiteConfig = (mode: "site" | "nfc-read" | "nfc-write") => {
  const tapOnly = mode !== "site";
  const readOnly = mode === "nfc-read";
  return buildConfig({
    telemetry: false,
    onInit: (payload) => {
      const pool = payload.db.pool;
      const reportError = () => { console.error("Payload storage is unavailable."); };
      const attached = new WeakSet<object>();
      const attachClient = (client: { on(event: "error", listener: () => void): unknown }) => {
        if (attached.has(client)) return;
        attached.add(client);
        client.on("error", reportError);
      };
      pool.on("error", reportError);
      pool.on("connect", attachClient);
      // pg-pool 3.14.0 has no public client enumeration. Include the adapter's
      // retained startup client and any clients opened before Payload onInit.
      const clients: unknown = Reflect.get(pool, "_clients");
      if (Array.isArray(clients)) {
        for (const client of clients) {
          if (client && typeof client.on === "function") attachClient(client);
        }
      }
    },
    // Keep the canonical CMS route in every profile.
    routes: { admin: "/vault" },
    admin: {
      // Separate admin collection strictly for staff
      user: "admins",
      importMap: {
        baseDir: path.resolve(dirname)
      }
    },
    collections: tapOnly ? [Admins, Users, ...nfcCollections] :
      [Admins, Users, MemberWallets, MemberWalletCatchUp, HomePage, AccountRecoveryRequests, ...contentCollections, ...nfcCollections],
    ...(tapOnly ? {} : { jobs: walletCatchUpJobs, globals: [CommercePublication, BusinessInfo, HelpContent, SiteEditorial, HomeEntry] }),
    plugins: [
      betterAuthPlugin(betterAuthPluginOptions),
      ...(tapOnly ? [] : [staffCmsLoginPlugin, commercePlugin, commerceDomainPlugin, editorialEnsurePlugin, superAdminEnsurePlugin, homePageEnsurePlugin]),
      serverChosenIDsPlugin,
    ],
    localization: {
      locales: [
        { label: english.Staff.schema.englishEN, code: "en" },
        { label: english.Staff.schema.koreanKO, code: "ko" }
      ],
      defaultLocale: "en",
      fallback: true
    },
    editor: lexicalEditor(),
    secret: PAYLOAD_SECRET,
    typescript: {
      outputFile: path.resolve(dirname, "payload-types.ts"),
      ...(tapOnly ? { autoGenerate: false } : {})
    },
    db: postgresAdapter({
      migrationDir: path.resolve(dirname, "./payload/migrations"),
      pool: {
        connectionString: DATABASE_URI,
        ...(readOnly ? { max: 3, options: "-c default_transaction_read_only=on" } : tapOnly ? { max: 4 } : {})
      },
      disableCreateDatabase: tapOnly,
      idType: "uuid",
      // The payment adapter stores a transaction under the id its payment ID was
      // derived from. serverChosenIDsPlugin keeps client creates from choosing ids.
      allowIDOnCreate: true,
      // Delete contracts Payload's field config can't express (see each hook).
      beforeSchemaInit: tapOnly ? [nfcDeleteContract, nfcHandoffSchema] : [teamMemberDeleteContract, walletCatchUpCursorIndex, nfcDeleteContract, nfcHandoffSchema],
      afterSchemaInit: [nfcHandoffChecks],
      push: false
    })
  });
};

export default buildSiteConfig("site");

/** NFC uses the canonical Auth schema without the site jobs, commerce or startup seeding. */
export function buildNfcPayloadConfig(readOnly: boolean) {
  // node-postgres gives connection-string options precedence over pool options.
  if (process.env.PAYLOAD_DROP_DATABASE === "true" ||
    new URL(DATABASE_URI).searchParams.has("options")) {
    throw new Error("NFC inspection is unavailable");
  }
  return buildSiteConfig(readOnly ? "nfc-read" : "nfc-write");
}
