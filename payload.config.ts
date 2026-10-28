import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { betterAuthPlugin } from "payload-auth/better-auth";

import { Admins } from "./lib/payload/collections/Admins";
import { Users } from "./lib/payload/collections/Users";
import { Orders } from "./lib/payload/collections/Orders";
import { HomePage } from "./lib/payload/collections/HomePage";
import { betterAuthPluginOptions } from "./lib/auth/options";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    // Separate admin collection strictly for staff
    user: "admins",
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [Admins, Users, Orders, HomePage],
  globals: [],
  plugins: [betterAuthPlugin(betterAuthPluginOptions)],
  localization: {
    locales: [
      { label: "English (EN)", code: "en" },
      { label: "Korean (KO)", code: "ko" }
    ],
    defaultLocale: "en",
    fallback: true
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "sophomor es_payload_secret_dev_2026",
  typescript: {
    outputFile: path.resolve(dirname, "lib/payload/payload-types.ts")
  },
  db: postgresAdapter({
    pool: {
      connectionString:
        process.env.DATABASE_URI ||
        "postgresql://postgres:soph!@localhost:4141/sopho"
    },
    idType: "uuid",
    push: false
  })
});
