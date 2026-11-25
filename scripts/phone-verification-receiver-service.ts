import { basename } from "node:path";
import { isSandboxRuntime } from "../src/lib/auth/review-editor-policy";
import { PREVIEW_SANDBOX_ORIGIN, previewSandboxAttestation } from "../src/lib/phone-verification/server/receiver-config";
import { loadPhoneVerificationConfig } from "../src/lib/phone-verification/server/config";
import { receiverHealthDirectory } from "../src/lib/phone-verification/server/receiver-health";
import { superviseMemberReceiver } from "./member-auth-receiver";

type Environment = Readonly<Record<string, string | undefined>>;

/**
 * The preview carrier trial's receiver as a long-running service (owner, 24 Nov: staff test on preview).
 * It supervises the same receive-only child as the local launcher, without the localhost-only preview launcher.
 * It starts only when the full sandbox profile holds (isSandboxRuntime: exact flag, no review owner, PortOne test
 * mode on the pinned TEST pair) on exactly the preview origin, with the trial policy, the Zoho poll transport and an
 * absolute health directory. The child receives an attestation, never the PortOne or review settings.
 * Returns the child's environment, or null when the service must not start.
 */
export function previewReceiverServiceEnvironment(env: Environment): Environment | null {
  try {
    const config = loadPhoneVerificationConfig(env);
    if (!config || config.transport !== "zoho-poll" || env.PHONE_VERIFICATION_MODE !== "production") return null;
    if (config.origin !== PREVIEW_SANDBOX_ORIGIN || !isSandboxRuntime(env)) return null;
    if (env.PHONE_VERIFICATION_CARRIER_POLICY !== "preview-trial-zoho-arc-v1") return null;
    if (env.PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY === undefined) return null;
    receiverHealthDirectory(env);
    return { ...env, PHONE_VERIFICATION_PREVIEW_ATTESTATION: previewSandboxAttestation(config) };
  } catch { return null; }
}

async function main() {
  const env = previewReceiverServiceEnvironment(process.env);
  if (!env) {
    console.error("Preview receiver service needs the sandbox runtime profile, production phone verification on the preview origin, the preview-trial carrier policy, zoho-poll and an absolute health directory. Not started.");
    process.exitCode = 78;
    return;
  }
  const controller = new AbortController();
  const stop = () => controller.abort("stopped");
  process.once("SIGTERM", stop); process.once("SIGINT", stop);
  console.error("Preview receiver service started (preview-trial-zoho-arc-v1).");
  try { await superviseMemberReceiver({ root: process.cwd(), env, signal: controller.signal }); }
  finally { process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop); }
  // A stop without a signal (configuration refusal or restart limit) exits non-zero so the container restarts it.
  if (!controller.signal.aborted) process.exitCode = 1;
}

if (process.argv[1] && basename(process.argv[1]) === "phone-verification-receiver-service.ts") {
  main().catch(() => { console.error("Preview receiver service failed. No registration approval was issued."); process.exitCode = 1; });
}
