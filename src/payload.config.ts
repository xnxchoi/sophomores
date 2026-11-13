import english from "../messages/en.json";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { betterAuthPlugin } from "payload-auth/better-auth";

import { Admins } from "@/lib/payload/collections/admins";
import { Users } from "@/lib/payload/collections/users";
import { HomePage } from "@/lib/payload/collections/home-page";
import { AccountRecoveryRequests } from "@/lib/payload/collections/account-recovery-requests";
import { contentCollections } from "@/lib/payload/collections";
import { betterAuthPluginOptions } from "@/lib/auth/options";
import { staffCmsLoginPlugin } from "@/lib/payload/admin/staff-login-plugin";
import { payloadEnvironmentSchema } from "@/lib/payload/configuration";
import { commercePlugin } from "@/lib/commerce/ecommerce";
import { commerceDomainPlugin } from "@/lib/commerce/domain";
import { CommercePublication } from "@/lib/commerce/catalogue";

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
    for (const client of (pool as typeof pool & { _clients: Parameters<typeof attachClient>[0][] })._clients) attachClient(client);
  },
  admin: {
    // Separate admin collection strictly for staff
    user: "admins",
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [Admins, Users, HomePage, AccountRecoveryRequests, ...contentCollections],
  globals: [CommercePublication],
  plugins: [betterAuthPlugin(betterAuthPluginOptions), staffCmsLoginPlugin, commercePlugin, commerceDomainPlugin],
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
    migrationDir: path.resolve(dirname, "./lib/migrations"),
    pool: {
      connectionString: environment.data.DATABASE_URI
    },
    idType: "uuid",
    push: false
  })
});
