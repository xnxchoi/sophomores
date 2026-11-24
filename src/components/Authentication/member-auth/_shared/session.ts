import {
  MemberAuthActionError,
  type MemberAuthFailureKind,
  type MemberClient,
  type PendingPasskey,
  type MemberStatus
} from "../../../../lib/member-auth/client";
import { normalizeLoginEmail } from "../../../../lib/passwordless-login";
import type { TrialSnapshot } from "../../../../lib/phone-verification/client-contracts";
import type { MemberSocialProvider } from "../../../../lib/member-auth/contracts";
import { clearMemberBrowserCopies } from "../../../../lib/member-auth/browser-copies";

export type MemberSnapshot = {
  status: MemberStatus | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  noticeCode?: "magic-link-sent" | "phone-selected" | "binding-confirmed" | "passkey-added" | "signed-out" | null;
  passkeyPending?: boolean;
  codeRequested: boolean;
  phoneIdentified: boolean;
  failure?: MemberAuthFailureKind | null;
  resendAvailableAt?: number | null;
  pendingAction?: "send-code" | "verify-code" | MemberSocialProvider | "passkey" | "magic-link" | "other" | null;
  codeRecovery?: "expired-code" | "attempts-exhausted" | null;
  verificationAvailableAt?: number | null;
};
export const emptyMemberSnapshot: MemberSnapshot = {
  status: null,
  busy: false,
  error: null,
  notice: null,
  codeRequested: false,
  phoneIdentified: false,
  failure: null,
  resendAvailableAt: null,
  pendingAction: null,
  codeRecovery: null,
  verificationAvailableAt: null
};
const failed =
  "We couldn’t complete that action. Try again; no sign-in or account activation was assumed.";
const failureMessages: Record<MemberAuthFailureKind, string> = {
  "invalid-code": "That code did not match. Check the 6 characters and try again.",
  "expired-code": "That code has expired. Request a fresh code to continue.",
  "attempts-exhausted":
    "That code can no longer be used. Request a fresh code to continue.",
  "rate-limited": "Too many attempts. Wait before trying again.",
  "delivery-failed": "We couldn’t send the email. Check the address and try again.",
  network: "We couldn’t connect. Check your connection and try again.",
  timeout: "That request timed out. Try again when your connection is ready.",
  "passkey-cancelled":
    "Passkey sign-in was cancelled. Try again or use another sign-in method.",
  "passkey-sign-in-unconfirmed": "Passkey sign-in could not be confirmed.",
  "passkey-session-changed": "Your session changed. Refresh account status to continue.",
  "provider-denied":
    "Sign-in was not completed. Try again or use another sign-in method.",
  // Shown from the shared catalogue (messages/en.json); this is only a fallback.
  "email-not-shared": failed,
  "email-unverified": failed,
  "link-failed": failed,
  "create-failed": failed,
  "fresh-auth-required": "Sign in again before verifying your phone.",
  unauthenticated: "Sign in to continue phone verification.",
  "invalid-phone-proof": "Verify your phone again to continue.",
  "phone-conflict": "This phone cannot be linked to this account. Use another phone.",
  unavailable: failed
};

export function isPhoneProofReady(
  snapshot: TrialSnapshot,
  phone: string,
  now = Date.now()
): boolean {
  return Boolean(
    phone &&
    snapshot.challenge &&
    snapshot.status?.id === snapshot.challenge.id &&
    snapshot.status.state === "verified" &&
    Date.parse(snapshot.status.expiresAt) > now
  );
}

/** Serializes browser actions; only a fresh server status can activate the member view. */
export function createMemberSession(
  client: MemberClient,
  onChange: (snapshot: MemberSnapshot) => void
) {
  let current: MemberSnapshot = { ...emptyMemberSnapshot };
  let disposed = false;
  let pendingPasskey: PendingPasskey | undefined;
  let codeNeedsReplacement = false;
  let verificationAvailableAt = 0;
  const emailResendDeadlines = new Map<string, number>();
  function resendAvailableAtFor(email: string) {
    const now = Date.now();
    for (const [address, deadline] of emailResendDeadlines) if (deadline <= now) emailResendDeadlines.delete(address);
    const key = normalizeLoginEmail(email)?.toLowerCase();
    return Math.max(verificationAvailableAt, key ? emailResendDeadlines.get(key) ?? 0 : 0);
  }
  const update = (change: Partial<MemberSnapshot>) => {
    if (disposed) return;
    current = { ...current, ...change };
    onChange(current);
  };
  async function run(
    action: () => Promise<void>,
    pendingAction: NonNullable<MemberSnapshot["pendingAction"]> = "other"
  ) {
    if (disposed || current.busy) return;
    update({ busy: true, error: null, notice: null, noticeCode: null, failure: null, pendingAction });
    try {
      await action();
    } catch (error) {
      const failure =
        error instanceof MemberAuthActionError &&
        typeof error.kind === "string" &&
        Object.hasOwn(failureMessages, error.kind)
          ? error.kind
          : "unavailable";
      const isNotice =
        failure === "passkey-cancelled" || failure === "provider-denied";
      const retry =
        error instanceof MemberAuthActionError ? error.retryAfterSeconds : undefined;
      if (failure === "expired-code" || failure === "attempts-exhausted")
        codeNeedsReplacement = true;
      if (failure === "rate-limited") {
        verificationAvailableAt = Math.max(
          verificationAvailableAt,
          Date.now() +
            (typeof retry === "number" && Number.isFinite(retry) && retry > 0
              ? Math.min(Math.ceil(retry), 86400)
              : 60) * 1000
        );
      }
      if (failure === "passkey-session-changed") pendingPasskey = undefined;
      update({
        ...(failure === "passkey-session-changed" ? { status: null, passkeyPending: false } : {}),
        failure,
        error: isNotice ? null : failureMessages[failure],
        notice: isNotice ? failureMessages[failure] : null,
        ...(failure === "expired-code" || failure === "attempts-exhausted"
          ? { codeRecovery: failure }
          : {}),
        ...(failure === "rate-limited"
          ? {
              verificationAvailableAt,
              resendAvailableAt: Math.max(
                current.resendAvailableAt ?? 0,
                verificationAvailableAt
              )
            }
          : {})
      });
    } finally {
      update({ busy: false, pendingAction: null });
    }
  }
  async function authenticatedStatus() {
    if (disposed) return;
    const status = await client.status();
    if (!status.authenticated) throw new Error("Session was not confirmed");
    update({ status, codeRequested: false });
  }
  return {
    snapshot: () => current,
    resendAvailableAtFor,
    preparePhoneVerification: async (): Promise<boolean> => {
      let ready = false;
      await run(async () => {
        const status = await client.status();
        if (disposed) return;
        update({ status });
        if (!status.authenticated || !status.emailVerified)
          throw new MemberAuthActionError("unauthenticated");
        if (status.phoneBindingAuth !== "ready")
          throw new MemberAuthActionError("fresh-auth-required");
        ready = true;
      });
      return ready && !disposed;
    },
    initialize: (callbackError?: string | null) =>
      run(async () => {
        const status = await client.status();
        if (disposed) return;
        if (!status.authenticated) await client.clearPhoneIdentifier();
        update({ status, phoneIdentified: false });
        if (callbackError) {
          const denied = [
            "access_denied",
            "user_cancelled",
            "user_canceled",
            "consent_denied",
            "provider_denied",
            // Apple's only web-flow error: the member pressed Cancel.
            "user_cancelled_authorize"
          ].includes(callbackError);
          // Better Auth 1.7.12's callback codes. Only email_not_verified is a definite
          // verification failure (our create hook raises it for an unverified provider
          // email). account_not_linked and unable_to_link_account also come from storage,
          // local-verification and linking-policy failures, so they claim no cause.
          const known: MemberAuthFailureKind | null = callbackError === "email_not_found" ? "email-not-shared"
            : callbackError === "email_not_verified" ? "email-unverified"
              : ["account_not_linked", "unable_to_link_account"].includes(callbackError) ? "link-failed"
                // Creation can fail for a genuinely new person too, so this implies no account.
                : callbackError === "unable_to_create_user" ? "create-failed"
                  : null;
          update({
            failure: denied ? "provider-denied" : known ?? "unavailable",
            error: denied ? null : known ? failureMessages[known] : failed,
            notice: denied ? failureMessages["provider-denied"] : null
          });
        }
      }),
    refresh: () => {
      const previousFailure = current.failure;
      return run(async () => {
        const status = await client.status();
        if (disposed) return;
        if (pendingPasskey) {
          if (!status.authenticated || !status.emailVerified) pendingPasskey = undefined;
          else {
            // Do not publish a replacement status with another session's pending UI.
            const same = await client.isPasskeySessionCurrent?.(pendingPasskey);
            if (disposed) return;
            if (same === false) pendingPasskey = undefined;
            else if (same === undefined) throw new MemberAuthActionError("unavailable");
          }
        }
        if (!current.status && !status.authenticated)
          await client.clearPhoneIdentifier();
        const preserveFailure =
          previousFailure === "invalid-code" ||
          previousFailure === "expired-code" ||
          previousFailure === "attempts-exhausted" ||
          (previousFailure === "rate-limited" && Date.now() < verificationAvailableAt);
        update({
          status,
          passkeyPending: Boolean(pendingPasskey),
          ...(preserveFailure && previousFailure
            ? { failure: previousFailure, error: failureMessages[previousFailure] }
            : {})
        });
      });
    },
    editEmail: () => {
      if (!disposed && !current.busy)
        update({ codeRequested: false, error: null, notice: null, noticeCode: null, failure: null });
    },
    sendCode: (email: string) => {
      if (resendAvailableAtFor(email) > Date.now()) return Promise.resolve();
      return run(async () => {
        await client.sendEmailCode(email);
        if (disposed) return;
        codeNeedsReplacement = false;
        verificationAvailableAt = 0;
        const key = normalizeLoginEmail(email)?.toLowerCase();
        const deadline = Date.now() + 30_000;
        if (key) {
          emailResendDeadlines.delete(key);
          if (emailResendDeadlines.size >= 64) emailResendDeadlines.delete(emailResendDeadlines.keys().next().value!);
          emailResendDeadlines.set(key, deadline);
        }
        update({
          codeRequested: true,
          codeRecovery: null,
          verificationAvailableAt: null,
          resendAvailableAt: deadline
        });
      }, "send-code");
    },
    verifyCode: (email: string, otp: string) => {
      if (
        !current.codeRequested ||
        codeNeedsReplacement ||
        Date.now() < verificationAvailableAt
      ) return Promise.resolve();
      return run(async () => {
        await client.verifyEmailCode(email, otp);
        await authenticatedStatus();
      }, "verify-code");
    },
    sendLink: (email: string) =>
      run(async () => {
        await client.sendMagicLink(email);
        update({
          codeRequested: false,
          noticeCode: "magic-link-sent",
          notice: "Check your inbox for a sign-in link. Open it to continue."
        });
      }, "magic-link"),
    signInSocial: (provider: MemberSocialProvider) =>
      run(async () => {
        update({ codeRequested: false });
        await client.signInSocial(provider);
      }, provider),
    signInPasskey: () =>
      run(async () => {
        update({ codeRequested: false });
        await client.signInPasskey();
        await authenticatedStatus();
      }, "passkey"),
    identifyPhone: (phone: string) =>
      run(async () => {
        await client.identifyPhone(phone);
        update({
          phoneIdentified: true,
          noticeCode: "phone-selected",
          notice: "Phone selected. Your passkey or email still authenticates you."
        });
      }),
    clearIdentifier: () =>
      run(async () => {
        await client.clearPhoneIdentifier();
        update({ phoneIdentified: false, codeRequested: false });
      }),
    bindPhone: (challengeId: string, phone: string) =>
      run(async () => {
        await client.bindPhone(challengeId, phone);
        const status = await client.status();
        if (!status.member) throw new Error("Membership was not confirmed");
        update({
          status,
          noticeCode: "binding-confirmed",
          notice: "Email and phone binding confirmed for this local account."
        });
      }),
    addPasskey: () =>
      run(async () => {
        if (!current.status?.authenticated || !current.status.emailVerified)
          throw new Error("Verified email required");
        if (pendingPasskey) return;
        try {
          await client.addPasskey();
        } catch (error) {
          if (!(error instanceof MemberAuthActionError) || !error.pendingPasskey) throw error;
          pendingPasskey = error.pendingPasskey;
          update({ passkeyPending: true });
          return;
        }
        update({ noticeCode: "passkey-added",
          notice: "Passkey added to this local account." });
      }, "passkey"),
    checkPasskey: () =>
      run(async () => {
        if (!pendingPasskey || !client.confirmPasskey) return;
        const outcome = await client.confirmPasskey(pendingPasskey);
        if (outcome !== "added") return;
        pendingPasskey = undefined;
        update({ passkeyPending: false, noticeCode: "passkey-added",
          notice: "Passkey added to this local account." });
      }, "passkey"),
    signOut: () =>
      run(async () => {
        await client.signOut();
        const status = await client.status();
        if (status.authenticated) throw new Error("Sign-out was not confirmed");
        // Signed out: this browser keeps no copy of the account or its purchases.
        clearMemberBrowserCopies();
        await client.clearPhoneIdentifier();
        pendingPasskey = undefined;
        update({
          status,
          passkeyPending: false,
          codeRequested: false,
          phoneIdentified: false,
          noticeCode: "signed-out",
          notice: "Signed out."
        });
      }),
    dispose: () => {
      disposed = true;
    }
  };
}
export type MemberSession = ReturnType<typeof createMemberSession>;
