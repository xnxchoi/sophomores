import { isSandboxRuntime } from "@/lib/auth/review-editor-policy";

/**
 * Phone proofs a member binding accepts: the local SKT pilot as before; the preview carrier trial (owner, 24 Nov:
 * staff on SKT, an SKT MVNO, KT and LG U+ test on preview) only in the preview sandbox runtime, as main defines it
 * (exact flag, no review owner, PortOne test channel). Server-only: the repositories use it, never the client.
 */
export function memberPhonePolicies(env: Readonly<Record<string, string | undefined>> = process.env): readonly string[] {
  return isSandboxRuntime(env)
    ? ["local-skt-zoho-arc-v1", "preview-trial-zoho-arc-v1"]
    : ["local-skt-zoho-arc-v1"];
}
