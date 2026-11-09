import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { betterAuthPlugin } from "payload-auth/better-auth";

import { Admins } from "@/lib/payload/collections/admins";
import { Users } from "@/lib/payload/collections/users";
import { Orders } from "@/lib/payload/collections/orders";
import { HomePage } from "@/lib/payload/collections/home-page";
import { AccountRecoveryRequests } from "@/lib/payload/collections/account-recovery-requests";
import { contentCollections } from "@/lib/payload/collections";
import { betterAuthPluginOptions } from "@/lib/auth/options";
import { staffCmsLoginPlugin } from "@/lib/payload/admin/staff-login-plugin";
import { payloadEnvironmentSchema } from "@/lib/payload/configuration";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const environment = payloadEnvironmentSchema.safeParse(process.env);
if (!environment.success) {
  throw new Error(`Missing or invalid Payload configuration: ${environment.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

export default buildConfig({
  telemetry: false,
  admin: {
    // Separate admin collection strictly for staff
    user: "admins",
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [Admins, Users, Orders, HomePage, AccountRecoveryRequests, ...contentCollections],
  globals: [],
  plugins: [betterAuthPlugin(betterAuthPluginOptions), staffCmsLoginPlugin],
  localization: {
    locales: [
      { label: "English (EN)", code: "en" },
      { label: "Korean (KO)", code: "ko" }
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
    migrationDir: path.resolve(dirname, "../migrations"),
    pool: {
      connectionString: environment.data.DATABASE_URI
    },
    idType: "uuid",
    push: false
  })
});
