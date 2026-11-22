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
import { contentCollections } from "@/payload/collections";
import { betterAuthPluginOptions } from "@/lib/auth/options";
import { staffCmsLoginPlugin } from "@/payload/admin/staff-login-plugin";
import { payloadEnvironmentSchema } from "@/payload/configuration";
import { commercePlugin } from "@/lib/commerce/ecommerce";
import { commerceDomainPlugin } from "@/lib/commerce/domain";
import { CommercePublication } from "@/lib/commerce/catalogue";
import { BusinessInfo } from "@/payload/globals/business-info";
import { HelpContent } from "@/payload/globals/help-content";
import { SiteEditorial } from "@/payload/globals/site-editorial";
import { editorialEnsurePlugin } from "@/payload/seed/editorial";
import { homePageEnsurePlugin } from "@/payload/seed/home-page";
import { teamMemberDeleteContract } from "@/payload/collections/team-members";
import { serverChosenIDsPlugin } from "@/payload/server-chosen-ids";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const environment = payloadEnvironmentSchema.safeParse(process.env);
if (!environment.success) {
  throw new Error(`Missing or invalid Payload configuration: ${environment.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

export default buildConfig({
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
  admin: {
    // Separate admin collection strictly for staff
    user: "admins",
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [Admins, Users, MemberWallets, MemberWalletCatchUp, HomePage, AccountRecoveryRequests, ...contentCollections, ...nfcCollections],
  jobs: walletCatchUpJobs,
  globals: [CommercePublication, BusinessInfo, HelpContent, SiteEditorial],
  plugins: [betterAuthPlugin(betterAuthPluginOptions), staffCmsLoginPlugin, commercePlugin, commerceDomainPlugin, editorialEnsurePlugin, homePageEnsurePlugin, serverChosenIDsPlugin],
  localization: {
    locales: [
      { label: english.Staff.schema.englishEN, code: "en" },
      { label: english.Staff.schema.koreanKO, code: "ko" }
    ],
    defaultLocale: "en",
    fallback: true
  },
  editor: lexicalEditor(),
  secret: environment.data.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts")
  },
  db: postgresAdapter({
    migrationDir: path.resolve(dirname, "./payload/migrations"),
    pool: {
      connectionString: environment.data.DATABASE_URI
    },
    idType: "uuid",
    // The payment adapter stores a transaction under the id its payment ID was
    // derived from. serverChosenIDsPlugin keeps client creates from choosing ids.
    allowIDOnCreate: true,
    // Delete contracts Payload's field config can't express (see each hook).
    beforeSchemaInit: [teamMemberDeleteContract, walletCatchUpCursorIndex],
    push: false
  })
});
