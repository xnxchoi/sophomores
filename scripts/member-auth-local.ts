import { randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseEnv } from "node:util";
import { loadPhoneVerificationConfig } from "@/lib/phone-verification/server/config";

export function parseMemberLocalCommand(args: readonly string[]) {
  if (args.length !== 1 || !["prepare", "migrate"].includes(args[0]))
    throw new Error("Usage: member-auth-local.ts prepare|migrate");
  return args[0] as "prepare" | "migrate";
}

/** A new private local configuration; never overwrite the working receiver. */
export async function prepareMemberAuthLocal(root: string): Promise<string> {
  const sourcePath = join(root, ".deployment/phone-verification-local/runtime.env");
  const source = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  let values: ReturnType<typeof parseEnv>;
  try {
    const stat = await source.stat();
    if (!stat.isFile() || stat.size > 16384 || (stat.mode & 0o077) !== 0
      || (process.getuid && stat.uid !== process.getuid())) throw new Error("Private local verifier required");
    values = parseEnv(await source.readFile("utf8"));
  } finally { await source.close(); }
  const verification = loadPhoneVerificationConfig(values);
  if (!verification) throw new Error("Local verifier required");
  const policy = values.PHONE_VERIFICATION_CARRIER_POLICY;
  const legacy = values.PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC;
  if ((policy !== undefined && policy !== "local-skt-zoho-arc-v1")
    || (legacy !== undefined && (legacy !== "1" || !policy)))
    throw new Error("Unapproved local carrier policy");
  const secret = randomBytes(32).toString("hex");
  if (secret === verification.secret) throw new Error("Distinct member secret required");
  const origin = "http://localhost:3240";
  const env = {
    PHONE_VERIFICATION_MODE: "local",
    PHONE_VERIFICATION_ORIGIN: origin,
    PHONE_VERIFICATION_DATABASE_URL: verification.databaseUrl,
    PHONE_VERIFICATION_STATE_SECRET: verification.secret,
    PHONE_VERIFICATION_TRANSPORT: verification.transport,
    PHONE_VERIFICATION_RECIPIENT: verification.recipient,
    PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: verification.mailboxId,
    ...(verification.transport === "fixture" ? {
      PHONE_VERIFICATION_ZOHO_USER_ID: verification.zohoUserId,
      PHONE_VERIFICATION_ZOHO_INTEGRATION_ID: verification.zohoIntegrationId,
      PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET: verification.webhookSecret,
    } : {}),
    ...(policy ? { PHONE_VERIFICATION_CARRIER_POLICY: policy } : {}),
    ...(legacy ? { PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC: legacy } : {}),
    MEMBER_AUTH_MODE: "local",
    MEMBER_AUTH_ORIGIN: origin,
    MEMBER_AUTH_DATABASE_URL: verification.databaseUrl,
    MEMBER_AUTH_SECRET: secret,
    MEMBER_AUTH_MAIL_MODE: "disabled",
  };
  const directory = join(root, ".deployment/member-auth-local");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "runtime.env");
  const lines = Object.entries(env).map(([key, value]) => `${key}=${JSON.stringify(value)}`);
  await writeFile(path, [
    "# Private local member auth. Never commit or paste credentials into chat.",
    ...lines,
    "# Add Google credentials only after creating an approved OAuth web client:",
    "# MEMBER_AUTH_GOOGLE_CLIENT_ID=REPLACE_LOCALLY",
    "# MEMBER_AUTH_GOOGLE_CLIENT_SECRET=REPLACE_LOCALLY",
    "# Outbound Zoho CPaaS SMTP is separate from the inbox OAuth receiver:",
    "# Set MEMBER_AUTH_MAIL_MODE=smtp and fill the fields below to enable email.",
    "# MEMBER_AUTH_SMTP_HOST=smtp.zeptomail.com",
    "# MEMBER_AUTH_SMTP_PORT=465",
    "# MEMBER_AUTH_SMTP_USERNAME=emailapikey",
    "# MEMBER_AUTH_SMTP_PASSWORD=REPLACE_LOCALLY",
    "# MEMBER_AUTH_SMTP_FROM=REPLACE_WITH_APPROVED_SENDER",
    "",
  ].join("\n"), { mode: 0o600, flag: "wx" });
  return path;
}

async function migrate() {
  const { getMemberAuthRuntime } = await import("@/lib/member-auth/runtime");
  const { getMigrations } = await import("better-auth/db/migration");
  const active = getMemberAuthRuntime();
  if (!active) throw new Error("Local member configuration required");
  try {
    await active.pool.query("CREATE SCHEMA IF NOT EXISTS member_auth");
    const migrations = await getMigrations(active.auth.options);
    await migrations.runMigrations();
    await active.repository.migrate();
    await active.identifier.migrate();
    console.log("Local member-auth schema migrated. No provider contacted or account created.");
  } finally { await active.pool.end(); }
}

if (process.argv[1] && basename(process.argv[1]) === "member-auth-local.ts") {
  const main = async () => {
    if (parseMemberLocalCommand(process.argv.slice(2)) === "prepare") {
      const path = await prepareMemberAuthLocal(process.cwd());
      console.log(`Private member setup created: ${path}. Providers remain disabled.`);
    } else await migrate();
  };
  main().catch(() => {
    console.error("Local member setup failed. Check private configuration and the member-auth runbook.");
    process.exitCode = 1;
  });
}
