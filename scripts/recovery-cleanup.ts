import nextEnvironment from "@next/env";
import { getRecoveryRuntime } from "../lib/member-auth/recovery/runtime";

// Deliberate local operator action only. No scheduler, provider or identity write.
nextEnvironment.loadEnvConfig(process.cwd());
if (process.argv.slice(2).join(" ") !== "--confirm-local-retention-cleanup")
  throw new Error("Explicit local retention cleanup confirmation required.");
const active = await getRecoveryRuntime();
if (!active) throw new Error("Local recovery intake must be configured.");
try {
  const removed = await active.repository.cleanup();
  console.log(
    `Removed ${removed} expired recovery requests (maximum 100 per invocation).`
  );
} finally {
  await active.pool.end();
}
