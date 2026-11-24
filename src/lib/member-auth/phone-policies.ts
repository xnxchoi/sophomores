import { isSandboxRuntime } from "@/lib/auth/review-editor-policy";

const LOCAL_PILOT = "local-skt-zoho-arc-v1";
const PREVIEW_TRIAL = "preview-trial-zoho-arc-v1";
const PREVIEW_ORIGIN = "https://preview.sophomores.co";
type Environment = Readonly<Record<string, string | undefined>>;

/** The preview carrier trial's authority: main's sandbox runtime, production phone mode, exactly the preview origin. */
function previewTrialAuthority(env: Environment): boolean {
  return isSandboxRuntime(env) && env.PHONE_VERIFICATION_MODE === "production"
    && env.PHONE_VERIFICATION_ORIGIN === PREVIEW_ORIGIN && env.MEMBER_AUTH_ORIGIN === PREVIEW_ORIGIN;
}
function localPilot(env: Environment): boolean {
  return env.PHONE_VERIFICATION_MODE === "local" && env.MEMBER_AUTH_MODE === "local";
}

/**
 * Proofs a NEW binding may consume. The SKT pilot only in local mode; the preview carrier trial (owner, 24 Nov) only
 * under the preview trial authority. Production consumes neither. Server-only: the repositories use it.
 */
export function bindablePhonePolicies(env: Environment = process.env): readonly string[] {
  return [...(localPilot(env) ? [LOCAL_PILOT] : []), ...(previewTrialAuthority(env) ? [PREVIEW_TRIAL] : [])];
}

/**
 * Bindings that count as membership. Existing SKT pilot bindings stay a historical record everywhere (the owner's
 * 9 Nov binding); trial bindings count only under the preview trial authority.
 */
export function recognisedPhonePolicies(env: Environment = process.env): readonly string[] {
  return [LOCAL_PILOT, ...(previewTrialAuthority(env) ? [PREVIEW_TRIAL] : [])];
}
