import { Pool } from "pg";
import { PgRecoveryRepository } from "./repository";
import { RecoveryService } from "./service";

type Environment = Readonly<Record<string, string | undefined>>;
export function loadRecoveryConfig(env: Environment = process.env) {
  if (!env.MEMBER_AUTH_MODE || env.MEMBER_AUTH_MODE === "disabled") return null;
  try {
    const origin = new URL(env.MEMBER_AUTH_ORIGIN ?? "");
    const database = new URL(env.DATABASE_URI ?? "");
    const secret = env.BETTER_AUTH_SECRET ?? env.PAYLOAD_SECRET ?? "";
    if (
      env.MEMBER_AUTH_MODE !== "local" ||
      origin.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) ||
      !origin.port ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password ||
      !["postgres:", "postgresql:"].includes(database.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) ||
      database.search ||
      database.hash ||
      secret.length < 32
    )
      throw new Error();
    return Object.freeze({
      origin: origin.origin,
      databaseUrl: database.href,
      secret
    });
  } catch {
    throw new Error(
      "Recovery intake requires private local canonical configuration."
    );
  }
}
let current: ReturnType<typeof createRecoveryRuntime> | undefined;
export function createRecoveryRuntime(
  config: NonNullable<ReturnType<typeof loadRecoveryConfig>>,
  pool?: Pool
) {
  // Installed Payload exposes db.pool, but its shared configuration has no
  // acquisition/query deadline. Native pg has no per-acquire override on an
  // existing pool. A small separate pool against the SAME guarded DATABASE_URI
  // isolates bounded intake/review/cleanup without changing global CMS behavior.
  const activePool =
    pool ??
    new Pool({
      connectionString: config.databaseUrl,
      max: 2,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 5000,
      statement_timeout: 5000,
      lock_timeout: 1000,
      query_timeout: 6000,
      allowExitOnIdle: true
    });
  activePool.on("error", () => {
    console.error("Recovery storage is unavailable.");
  });
  const repository = new PgRecoveryRepository(activePool);
  return {
    config,
    pool: activePool,
    repository,
    service: new RecoveryService(repository, config.secret)
  };
}
export function getRecoveryRuntime() {
  const config = loadRecoveryConfig();
  if (!config) return null;
  current ??= createRecoveryRuntime(config);
  return current;
}
