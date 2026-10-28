"use client";

import { useEffect, useRef, useState } from "react";
import { VerificationProvider } from "../phone-verification/phone-verification";
import { TrialVerificationView } from "../phone-verification/phone-verification-trial";
import {
  createTrialSession,
  createVerificationClient
} from "../../../lib/phone-verification/client";
import type { TrialSnapshot } from "../../../lib/phone-verification/client-contracts";
import {
  messagingPlatform,
  type MessagingPlatform
} from "../../../lib/phone-verification/model";
import { isPhoneProofReady } from "./_shared/session";

const empty: TrialSnapshot = {
  challenge: null,
  status: null,
  busy: false,
  error: null
};
export function MemberPhoneStep({
  busy,
  onBind
}: {
  busy: boolean;
  onBind: (challengeId: string, phone: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<TrialSnapshot>(empty);
  const [platform, setPlatform] = useState<MessagingPlatform>("manual");
  const [expired, setExpired] = useState(false);
  const [phone, setPhone] = useState("");
  const controller = useRef<ReturnType<typeof createTrialSession> | null>(null);
  useEffect(() => {
    const session = createTrialSession(createVerificationClient(), setSnapshot);
    controller.current = session;
    return () => {
      session.dispose();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    if (snapshot.status?.state !== "verified") return;
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(snapshot.status.expiresAt) - Date.now())
    );
    return () => clearTimeout(timer);
  }, [snapshot.status]);
  const presentationSnapshot: TrialSnapshot =
    expired && snapshot.status?.state === "verified"
      ? { ...snapshot, status: { ...snapshot.status, state: "expired" } }
      : snapshot;
  return (
    <div
      data-member-phone-step=""
      className="[&>section]:!px-0 [&>section]:!pt-0 [&>section]:!pb-0"
    >
      <VerificationProvider initialLocale="en">
        <TrialVerificationView
          presentation="registration"
          snapshot={presentationSnapshot}
          headingId="member-phone-heading"
          platform={platform}
          onStart={(value) => {
            setPhone(value);
            setExpired(false);
            setPlatform(
              messagingPlatform(navigator.userAgent, navigator.maxTouchPoints)
            );
            void controller.current?.start(value);
          }}
          onRefresh={() => {
            void controller.current?.refresh();
          }}
          onReset={() => {
            void controller.current?.reset();
          }}
          onExpire={() => controller.current?.expire()}
        />
      </VerificationProvider>
      {snapshot.status?.state === "verified" && (
        <div className="space-y-3 border-t border-neutral-800 pt-5">
          <p className="text-sm leading-6 text-neutral-400">
            {expired
              ? "This phone proof expired before binding. Start a new challenge above."
              : "The phone check passed. Finish registration to bind it to your authenticated account."}
          </p>
          <button
            className="min-h-12 w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-950 transition-colors duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={busy || expired || !isPhoneProofReady(snapshot, phone)}
            onClick={() => {
              if (!isPhoneProofReady(snapshot, phone) || !snapshot.challenge) {
                setExpired(true);
                return;
              }
              onBind(snapshot.challenge.id, phone);
            }}
          >
            {busy ? "Finishing…" : "Finish registration"}
          </button>
        </div>
      )}
    </div>
  );
}
