import type { MemberClient, MemberStatus } from "../../lib/member-auth/client";
import type { TrialSnapshot } from "../../lib/phone-verification/client-contracts";

export type MemberSnapshot = {
  status: MemberStatus | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  codeRequested: boolean;
  phoneIdentified: boolean;
};
export const emptyMemberSnapshot: MemberSnapshot = {
  status: null,
  busy: false,
  error: null,
  notice: null,
  codeRequested: false,
  phoneIdentified: false
};
const failed =
  "We couldn’t complete that action. Try again; no sign-in or account activation was assumed.";

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
  const update = (change: Partial<MemberSnapshot>) => {
    if (disposed) return;
    current = { ...current, ...change };
    onChange(current);
  };
  async function run(action: () => Promise<void>) {
    if (disposed || current.busy) return;
    update({ busy: true, error: null, notice: null });
    try {
      await action();
    } catch {
      update({ error: failed, notice: null });
    } finally {
      update({ busy: false });
    }
  }
  async function authenticatedStatus() {
    const status = await client.status();
    if (!status.authenticated) throw new Error("Session was not confirmed");
    update({ status, codeRequested: false });
  }
  return {
    snapshot: () => current,
    initialize: () =>
      run(async () => {
        const status = await client.status();
        if (disposed) return;
        if (!status.authenticated) await client.clearPhoneIdentifier();
        update({ status, phoneIdentified: false });
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
        update({ codeRequested: false, error: null, notice: null });
    },
    sendCode: (email: string) =>
      run(async () => {
        await client.sendEmailCode(email);
        update({
          codeRequested: true,
          notice: "Check your inbox for the 8-digit sign-in code."
        });
      }),
    verifyCode: (email: string, otp: string) =>
      run(async () => {
        await client.verifyEmailCode(email, otp);
        await authenticatedStatus();
      }),
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
