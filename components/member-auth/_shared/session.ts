import {
  MemberAuthActionError,
  type MemberAuthFailureKind,
  type MemberClient,
  type MemberStatus
} from "../../../lib/member-auth/client";
import type { TrialSnapshot } from "../../../lib/phone-verification/client-contracts";

export type MemberSnapshot = {
  status: MemberStatus | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  codeRequested: boolean;
  phoneIdentified: boolean;
  failure?: MemberAuthFailureKind | null;
  resendAvailableAt?: number | null;
};
export const emptyMemberSnapshot: MemberSnapshot = {
  status: null,
  busy: false,
  error: null,
  notice: null,
  codeRequested: false,
  phoneIdentified: false,
  failure: null,
  resendAvailableAt: null
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
  "provider-denied":
    "Google sign-in was not completed. Try again or use another sign-in method.",
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
  let codeNeedsReplacement = false;
  const update = (change: Partial<MemberSnapshot>) => {
    if (disposed) return;
    current = { ...current, ...change };
    onChange(current);
  };
  async function run(action: () => Promise<void>) {
    if (disposed || current.busy) return;
    update({ busy: true, error: null, notice: null, failure: null });
    try {
      await action();
    } catch (error) {
      const failure =
        error instanceof MemberAuthActionError ? error.kind : "unavailable";
      const isNotice =
        failure === "passkey-cancelled" || failure === "provider-denied";
      const retry =
        error instanceof MemberAuthActionError ? error.retryAfterSeconds : undefined;
      if (failure === "expired-code" || failure === "attempts-exhausted")
        codeNeedsReplacement = true;
      update({
        failure,
        error: isNotice ? null : failureMessages[failure],
        notice: isNotice ? failureMessages[failure] : null,
        ...(failure === "rate-limited"
          ? {
              resendAvailableAt: Math.max(
                current.resendAvailableAt ?? 0,
                Date.now() +
                  (typeof retry === "number" && Number.isFinite(retry) && retry > 0
                    ? Math.min(Math.ceil(retry), 86400)
                    : 60) * 1000
              )
            }
          : {})
      });
    } finally {
      update({ busy: false });
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
            "provider_denied"
          ].includes(callbackError);
          update({
            failure: denied ? "provider-denied" : "unavailable",
            error: denied ? null : failed,
            notice: denied ? failureMessages["provider-denied"] : null
          });
        }
      }),
    refresh: () =>
      run(async () => {
        const status = await client.status();
        if (disposed) return;
        if (!current.status && !status.authenticated)
          await client.clearPhoneIdentifier();
        update({ status });
      }),
    editEmail: () => {
      if (!disposed && !current.busy)
        update({ codeRequested: false, error: null, notice: null, failure: null });
    },
    sendCode: (email: string) => {
      if ((current.resendAvailableAt ?? 0) > Date.now()) return Promise.resolve();
      return run(async () => {
        await client.sendEmailCode(email);
        if (disposed) return;
        codeNeedsReplacement = false;
        update({
          codeRequested: true,
          resendAvailableAt: Date.now() + 30_000,
          notice: "Check your inbox for the 6-character sign-in code."
        });
      });
    },
    verifyCode: (email: string, otp: string) => {
      if (!current.codeRequested || codeNeedsReplacement) return Promise.resolve();
      return run(async () => {
        await client.verifyEmailCode(email, otp);
        await authenticatedStatus();
      });
    },
    sendLink: (email: string) =>
      run(async () => {
        await client.sendMagicLink(email);
        update({
          notice: "Check your inbox for a sign-in link. Open it to continue."
        });
      }),
    signInGoogle: () =>
      run(async () => {
        await client.signInGoogle();
      }),
    signInPasskey: () =>
      run(async () => {
        await client.signInPasskey();
        await authenticatedStatus();
      }),
    identifyPhone: (phone: string) =>
      run(async () => {
        await client.identifyPhone(phone);
        update({
          phoneIdentified: true,
          notice:
            "Phone selected. Your passkey or email still authenticates you."
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
          notice: "Email and phone binding confirmed for this local account."
        });
      }),
    addPasskey: () =>
      run(async () => {
        if (!current.status?.member)
          throw new Error("Active membership required");
        await client.addPasskey();
        update({ notice: "Passkey added to this local account." });
      }),
    signOut: () =>
      run(async () => {
        await client.signOut();
        const status = await client.status();
        if (status.authenticated) throw new Error("Sign-out was not confirmed");
        await client.clearPhoneIdentifier();
        update({
          status,
          codeRequested: false,
          phoneIdentified: false,
          notice: "Signed out."
        });
      }),
    dispose: () => {
      disposed = true;
    }
  };
}
export type MemberSession = ReturnType<typeof createMemberSession>;
