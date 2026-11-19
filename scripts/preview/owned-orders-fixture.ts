import assert from "node:assert/strict";
import { lstat, mkdtemp, readFile, realpath, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { BetterAuthOptions } from "better-auth";
import type { Config, SanitizedConfig } from "payload";

const root = "/tmp/sphmrs-owner-preview-6lse30ag";
const socketDir = join(root, "socket");
const dataDir = join(root, "data");
const database = "sphmrs_owner_preview";
const role = "preview_owner";
const port = 55439;
const marker = "sphmrs:owned-disposable-preview:6lse30ag:v1";
const email = "orders-preview-6lse30ag@fixture.invalid";
const name = "Synthetic orders preview";
// Matches the existing identity and attempt in scripts/seed-commerce-preview.ts.
const seedOwner = {
  id: "ed98b970-55aa-4e85-a3dc-0b173be1c006",
  email: "hamlet-commerce-v1@preview.invalid",
  attempt: "ed98b970-55aa-4e85-a3dc-0b173be1c007",
} as const;
type FixtureEmail = typeof email | typeof seedOwner.email;
const exitCheckOrigin = "http://127.0.0.1:3000";
const browserOrigin = "http://localhost:3000";
const uri = `postgresql://${role}@localhost/${database}?host=${encodeURIComponent(socketDir)}&port=${port}`;
const capturePath = join(root, "orders-preview-email.json");
const fixtureLock = 54621390;
const allowedEnvironment = new Set([
  "PATH", "HOME", "PWD", "SHLVL", "_", "LANG", "LC_ALL", "TZ", "NODE_OPTIONS",
  "NODE_ENV", "DATABASE_URI", "PORTONE_PAYMENT_MODE", "PAYLOAD_SECRET", "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL", "NEXT_PUBLIC_SERVER_URL", "SPHMRS_PREVIEW_CHECKOUT", "SPHMRS_PREVIEW_CLUSTER_SYSTEM_ID",
  "NEXT_TELEMETRY_DISABLED", "DISABLE_PAYLOAD_HMR", "TMPDIR",
]);

async function assertOwnedPath(path: string, kind: "directory" | "socket" | "file") {
  const stat = await lstat(path);
  assert.equal(stat.uid, process.getuid?.());
  assert.ok(kind === "directory" ? stat.isDirectory() : kind === "socket" ? stat.isSocket() : stat.isFile());
  // PG can create a world-mode socket inode inside a private parent directory.
  if (kind !== "socket") assert.equal(stat.mode & 0o077, 0);
  if (kind === "file") assert.equal(stat.nlink, 1);
}

async function preflight(origin: string) {
  assert.ok(Object.keys(process.env).every((key) => allowedEnvironment.has(key)),
    "Refusing inherited configuration outside the preview allowlist");
  assert.ok(process.env.DISABLE_PAYLOAD_HMR === undefined || process.env.DISABLE_PAYLOAD_HMR === "true");
  assert.ok(!process.env.NODE_OPTIONS || /^--max-old-space-size=[1-9][0-9]*$/.test(process.env.NODE_OPTIONS));
  assert.equal(process.env.NODE_ENV, "development");
  assert.equal(process.env.DATABASE_URI, uri);
  assert.equal(process.env.BETTER_AUTH_URL, origin);
  assert.equal(process.env.NEXT_PUBLIC_SERVER_URL, origin);
  assert.ok(!process.env.PORTONE_PAYMENT_MODE || process.env.PORTONE_PAYMENT_MODE === "disabled");
  assert.ok((process.env.PAYLOAD_SECRET?.length ?? 0) >= 32);
  assert.ok((process.env.BETTER_AUTH_SECRET?.length ?? 0) >= 32);
  const checkout = process.env.SPHMRS_PREVIEW_CHECKOUT;
  const systemID = process.env.SPHMRS_PREVIEW_CLUSTER_SYSTEM_ID;
  assert.ok(checkout && checkout.startsWith("/") && systemID && /^\d{15,20}$/.test(systemID));
  assert.equal(process.cwd(), await realpath(checkout));
  assert.equal(process.cwd(), await realpath(fileURLToPath(new URL("../..", import.meta.url))));
  assert.equal(await realpath(root), join(await realpath("/tmp"), "sphmrs-owner-preview-6lse30ag"));
  for (const dir of [root, dataDir, socketDir]) await assertOwnedPath(dir, "directory");
  await assertOwnedPath(join(socketDir, `.s.PGSQL.${port}`), "socket");
  const pidPath = join(dataDir, "postmaster.pid");
  await assertOwnedPath(pidPath, "file");
  assert.ok((await lstat(pidPath)).size <= 4096);
  const [pid, postmasterData, started, serverPort, postmasterSocket] =
    (await readFile(pidPath, "utf8")).split("\n");
  assert.ok(/^[1-9]\d*$/.test(pid) && /^\d+$/.test(started) && serverPort === String(port) &&
    await realpath(postmasterData) === await realpath(dataDir) &&
    await realpath(postmasterSocket) === await realpath(socketDir));
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  process.env.DISABLE_PAYLOAD_HMR = "true";
  process.env.TMPDIR = root;
  return { started, systemID };
}

async function assertSafeCaptureDestination() {
  try {
    await assertOwnedPath(capturePath, "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function captureCode(recipient: FixtureEmail, code: string, requestedAt: number) {
  assert.match(code, /^[A-Z0-9]{6}$/);
  const staging = await mkdtemp(join(root, "orders-mail-"));
  const file = join(staging, "email.json");
  try {
    await writeFile(file, JSON.stringify({ to: recipient, code, expiresAt: requestedAt + 300_000 }) + "\n", {
      mode: 0o600, flag: "wx",
    });
    await rename(file, capturePath);
  } finally {
    try {
      await unlink(file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    } finally {
      await rmdir(staging);
    }
  }
}

type FixturePool = PostgresAdapter["pool"];

async function withOwnedDatabase(origin: string, run: (pool: FixturePool) => Promise<void>) {
  const lease = await preflight(origin);
  // Resolve pg from the adapter without loading the adapter or the app config.
  const require = createRequire(import.meta.url);
  const requireFromAdapter = createRequire(require.resolve("@payloadcms/db-postgres"));
  const { Pool } = requireFromAdapter("pg") as Pick<PostgresAdapter["pg"], "Pool">;
  const pool = new Pool({ connectionString: uri, max: 4,
    connectionTimeoutMillis: 2000, statement_timeout: 4000 });
  pool.on("error", () => { console.error("Owned preview database connection was interrupted."); });
  const gate = await pool.connect().catch(async (error: unknown) => { await pool.end(); throw error; });
  try {
    const { rows: [identity] } = await gate.query(`
      SELECT current_database() AS db, current_user AS role, session_user AS login,
        inet_server_addr() IS NULL AS unix, current_setting('port') AS port,
        current_setting('data_directory') AS data_dir,
        current_setting('unix_socket_directories') AS socket_dir,
        floor(extract(epoch from pg_postmaster_start_time()))::text AS started,
        system_identifier::text AS cluster_id,
        current_setting('listen_addresses') = '' AS socket_only,
        current_schema() = 'public' AS public_schema,
        shobj_description(oid, 'pg_database') AS marker,
        pg_get_userbyid(datdba) AS owner,
        to_regclass('public.users') IS NOT NULL
          AND to_regclass('public.users_role') IS NOT NULL
          AND to_regclass('public.orders') IS NOT NULL
          AND to_regclass('public.verifications') IS NOT NULL
          AND to_regclass('public.rate_limit') IS NOT NULL AS schema_ready
      FROM pg_catalog.pg_database CROSS JOIN pg_catalog.pg_control_system()
      WHERE datname = current_database()`);
    assert.ok(identity && identity.db === database && identity.role === role && identity.login === role &&
      identity.unix === true && identity.port === String(port) && identity.socket_only === true &&
      identity.public_schema === true && identity.marker === marker && identity.owner === role &&
      identity.cluster_id === lease.systemID && identity.started === lease.started &&
      identity.schema_ready === true, "Disposable database identity or schema mismatch");
    assert.equal(await realpath(identity.data_dir), await realpath(dataDir));
    assert.equal(await realpath(identity.socket_dir), await realpath(socketDir));
    const { rows: [lock] } = await gate.query("SELECT pg_try_advisory_lock($1) AS acquired", [fixtureLock]);
    assert.equal(lock?.acquired, true, "Another fixture run owns the lease");
    await assertSafeCaptureDestination();
    await run(pool);
  } finally {
    gate.release(true);
    await pool.end();
  }
}

type FixturePayload = Awaited<ReturnType<typeof import("../../src/payload").getPayload>>;
type FixtureMember = Awaited<ReturnType<typeof findFixtureMember>>;

async function assertFixtureSchema(db: FixturePayload["db"], pool: FixturePool) {
  const required = ["users", "users_role", "orders", "verifications", "rate_limit"];
  const tables = Object.values(db.rawTables).filter(({ name }) => required.includes(name));
  assert.equal(tables.length, required.length);
  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = ANY($2::text[])",
    [db.schemaName ?? "public", required],
  );
  const present = new Set(rows.map(({ table_name, column_name }) => `${table_name}.${column_name}`));
  assert.ok(tables.every(({ name, columns }) => Object.values(columns)
    .every((column) => present.has(`${name}.${column.name}`))), "Preview fixture schema columns changed");
}

async function usingCanonicalPayload(pool: FixturePool, run: (payload: FixturePayload) => Promise<void>) {
  assert.equal(process.env.DISABLE_PAYLOAD_HMR, "true");
  const [{ getPayload }, { default: canonical }] = await Promise.all([
    import("payload"), import("../../src/payload.config"),
  ]);
  const config = await canonical;
  const logger = { options: { level: "silent" } } satisfies NonNullable<Config["logger"]>;
  const payload = await getPayload({
    config: {
      ...config,
      // Payload's SanitizedConfig deep-requires Pino options that getLogger accepts as optional.
      logger: logger as SanitizedConfig["logger"],
      typescript: { ...config.typescript, autoGenerate: false },
    },
    disableDBConnect: true, disableOnInit: true,
  });
  try {
    const db = payload.db;
    // The adapter stores its configured replicas under this runtime key.
    const replicaOptions: unknown = Reflect.get(db, "readReplicaOptions");
    assert.ok(db.name === "postgres" && db.push === false &&
      (replicaOptions === undefined || (Array.isArray(replicaOptions) && replicaOptions.length === 0)) &&
      !Object.values(db.extensions).some(Boolean) && db.connect && !db.pool &&
      Object.keys(db.poolOptions).length === 1 && db.poolOptions.connectionString === uri);
    db.disableCreateDatabase = true;
    // Binding the verified pool skips the adapter's unreleased startup checkout.
    db.pool = pool;
    await db.connect();
    await assertFixtureSchema(db, pool);
    assert.ok(config.onInit, "Canonical Better Auth initialization required");
    // Payload Auth writes unsanitized initialization errors directly to console.error.
    const logError = console.error;
    try {
      console.error = () => { logError("Canonical preview initialization failed."); };
      await config.onInit(payload);
    } finally {
      console.error = logError;
    }
    assert.ok("betterAuth" in payload, "Canonical onInit did not attach Better Auth");
    await run(payload as FixturePayload);
  } finally {
    await payload.destroy();
  }
}

async function findFixtureMember(payload: FixturePayload) {
  const existing = await payload.find({ collection: "users", depth: 0, limit: 2, overrideAccess: true,
    where: { email: { equals: email } } });
  assert.ok(existing.docs.length <= 1);
  const member = existing.docs[0];
  if (member) assert.ok(member.name === name && member.emailVerified === true &&
    member.membershipStatus === "applicant" && member.role?.length === 1 && member.role[0] === "user" &&
    !member.phoneNumber && !member.phoneNumberVerified && !member.phone,
    "The synthetic email is occupied by a non-fixture account");
  return member ?? null;
}

async function requireSeedOwner(payload: FixturePayload) {
  const found = await payload.find({ collection: "users", depth: 0, limit: 2, overrideAccess: true,
    where: { or: [{ id: { equals: seedOwner.id } }, { email: { equals: seedOwner.email } }] } });
  const member = found.docs[0];
  assert.ok(found.totalDocs === 1 && member?.id === seedOwner.id && member.email === seedOwner.email &&
    member.name === "PREVIEW Member" && member.membershipStatus === "approved" &&
    member.role?.length === 1 && member.role[0] === "user" &&
    !member.phoneNumber && !member.phoneNumberVerified && !member.phone);
  // Do not treat a critical preview fixture as present until its exact owned row is readable.
  const orders = await payload.find({ collection: "orders", depth: 0, limit: 1, overrideAccess: false,
    user: { ...member, collection: "users" }, select: {},
    where: { and: [{ customer: { equals: member.id } }, { commerceVersion: { equals: "commerce-v1" } },
      { status: { equals: "processing" } }, { commerceAttemptID: { equals: seedOwner.attempt } }] } });
  assert.equal(orders.totalDocs, 1);
}

async function issueEmailCode(payload: FixturePayload, recipient: FixtureEmail, origin: string) {
  const [{ betterAuth }, { createBetterAuthPlugins }] = await Promise.all([
    import("better-auth"), import("../../src/lib/auth/options"),
  ]);
  const options: BetterAuthOptions = payload.betterAuth.options;
  assert.equal(options.baseURL, origin);
  assert.equal(options.basePath ?? "/api/auth", "/api/auth");
  assert.ok(options.database, "Canonical adapter is required");
  const plugins = options.plugins ?? [];
  assert.equal(plugins.filter((plugin) => plugin.id === "email-otp").length, 1);
  const codes: string[] = [];
  const otpPlugin = createBetterAuthPlugins({ appURL: origin, mailer: async (notice) => {
    assert.ok(notice.type === "email-otp" && notice.email === recipient);
    codes.push(notice.otp);
  } }).find((plugin) => plugin.id === "email-otp");
  assert.ok(otpPlugin);
  const auth = betterAuth({ ...options, logger: { disabled: true }, socialProviders: {},
    plugins: plugins.map((plugin) => plugin.id === "email-otp" ? otpPlugin : plugin) });
  const requestedAt = Date.now();
  const result = await auth.handler(new Request(origin + "/api/auth/email-otp/send-verification-otp", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ email: recipient, type: "sign-in" }),
  }));
  assert.equal(result.status, 200, "Canonical OTP request did not complete");
  assert.equal(codes.length, 1, "No single successful synthetic delivery");
  await captureCode(recipient, codes[0]!, requestedAt);
}

async function readExistingOrder(payload: FixturePayload, member: FixtureMember) {
  if (!member) return false;
  const orders = await payload.find({ collection: "orders", depth: 0, limit: 1, overrideAccess: false,
    user: { ...member, collection: "users" },
    where: { and: [{ customer: { equals: member.id } }, { commerceVersion: { equals: "commerce-v1" } },
      { status: { equals: "processing" } }] },
    select: {} });
  return orders.docs.length === 1;
}

async function main() {
  const [command] = process.argv.slice(2);
  assert.ok(process.argv.length === 3 &&
    (command === "--prepare-owned-preview" || command === "--issue-email-code" ||
      command === "--issue-seed-owner-email-code"));
  // Only the pinned seed-owner issuance may target the admitted browser origin.
  const origin = command === "--issue-seed-owner-email-code" && process.env.BETTER_AUTH_URL === browserOrigin
    ? browserOrigin : exitCheckOrigin;
  await withOwnedDatabase(origin, (pool) => usingCanonicalPayload(pool, async (payload) => {
    if (command === "--issue-seed-owner-email-code") {
      await requireSeedOwner(payload);
      await issueEmailCode(payload, seedOwner.email, origin);
      console.info("Fresh seed-owner sign-in code captured locally; use once before expiry.");
      return;
    }
    const member = await findFixtureMember(payload);
    if (command === "--issue-email-code") {
      assert.ok(member, "Prepare the fixture before requesting a code");
      await issueEmailCode(payload, email, origin);
      console.info("Fresh synthetic sign-in code captured locally; use once before expiry.");
      return;
    }
    const hasOrder = await readExistingOrder(payload, member);
    if (!member) {
      await payload.create({ collection: "users", overrideAccess: true, disableVerificationEmail: true,
        data: { email, name, emailVerified: true, membershipStatus: "applicant", localePreference: "en" } });
    }
    console.info(hasOrder ? "Synthetic account ready; existing processing history row found (settlement not proved)." :
      "Synthetic account ready; no processing history row for this account.");
  }));
}

void main().catch(() => {
  console.error("Owned preview fixture stopped; no connection strings or email codes were logged.");
  process.exitCode = 1;
});
