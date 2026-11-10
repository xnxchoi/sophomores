"use client";

import { useTranslations } from "next-intl";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
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
import { AccountPrimaryButton, AccountTextButton } from "./account-controls";
import { Heading } from "../phone-verification/verification-ui";
import { VerificationTrayTitle } from "../phone-verification/verification-tray";

const empty: TrialSnapshot = {
  challenge: null,
  status: null,
  busy: false,
  error: null
};
export function MemberPhoneStep({
  busy,
  onPrepare,
  bindingError,
  recoveryRequired = false,
  onRecover,
  proofResetKey = 0,
  focusOnProofReset = true,
  onBind
}: {
  busy: boolean;
  onPrepare: () => Promise<boolean>;
  bindingError?: string | null;
  recoveryRequired?: boolean;
  onRecover?: () => void;
  proofResetKey?: number;
  focusOnProofReset?: boolean;
  onBind: (challengeId: string, phone: string) => void;
}) {
  const t = useTranslations("MemberAuth");
  const [snapshot, setSnapshot] = useState<TrialSnapshot>(empty);
  const [platform, setPlatform] = useState<MessagingPlatform>("manual");
  const [expired, setExpired] = useState(false);
  const [phone, setPhone] = useState("");
  const [suppressResetFocus, setSuppressResetFocus] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const preparingRef = useRef(false);
  const controller = useRef<ReturnType<typeof createTrialSession> | null>(null);
  useEffect(() => {
    setSuppressResetFocus(!focusOnProofReset);
    setSnapshot(empty);
    setExpired(false);
    const session = createTrialSession(createVerificationClient(), setSnapshot);
    controller.current = session;
    return () => {
      session.dispose();
      controller.current = null;
    };
  }, [proofResetKey, focusOnProofReset]);
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
  useEffect(() => {
    if (recoveryRequired) document.getElementById("member-phone-recovery-heading")?.focus({ preventScroll: true });
  }, [recoveryRequired]);
  const working = busy || preparing || snapshot.busy;
  const feedback = expired ? t("verificationExpiredTryAgain") : bindingError;
  return (
    <div data-member-phone-step="" className="[font-family:system-ui] [&_section]:!px-0 [&_section]:!pt-0 [&_section]:!pb-0 [&>section]:!px-0 [&>section]:!pt-0 [&>section]:!pb-0">
      {recoveryRequired && <div data-member-phone-recovery="" className="space-y-5">
        <VerificationTrayTitle><Heading id="member-phone-recovery-heading" tabIndex={-1} className="mt-0 mb-2 text-center text-[24px] leading-[30px] tracking-[-0.035em] sm:text-[24px]">{t("signInAgain")}</Heading></VerificationTrayTitle>
        <p className="text-center text-sm leading-6 text-neutral-400">{t("continueRegistrationAfterSigningIn")}</p>
        <AccountPrimaryButton type="button" disabled={working} onClick={onRecover}>{t("signInAgain")}</AccountPrimaryButton>
      </div>}
      <div hidden={recoveryRequired} inert={recoveryRequired}>
      <VerificationProvider initialLocale="en">
        <TrialVerificationView
          presentation="registration"
          autoFocusHeading={!suppressResetFocus}
          snapshot={working ? { ...presentationSnapshot, busy: true } : presentationSnapshot}
          headingId="member-phone-heading"
          platform={platform}
          onStart={(value) => {
            if (preparingRef.current || busy || recoveryRequired) return;
            setSuppressResetFocus(false);
            setPhone(value);
            preparingRef.current = true;
            setPreparing(true);
            const current = controller.current;
            void (async () => {
              try {
                if (typeof onPrepare !== "function" || !await onPrepare() || controller.current !== current) return;
                setExpired(false);
                setPlatform(messagingPlatform(navigator.userAgent, navigator.maxTouchPoints));
                await current?.start(value);
              } finally {
                preparingRef.current = false;
                if (controller.current === current) setPreparing(false);
              }
            })();
          }}
          onRefresh={() => { void controller.current?.refresh(); }}
          onReset={() => { setSuppressResetFocus(false); setExpired(false); void controller.current?.reset(); }}
          onExpire={() => controller.current?.expire()}
          registrationCompletion={<div data-member-phone-completion="" className="space-y-2 pt-1">
            <AccountPrimaryButton className="relative" type="button" aria-busy={busy} disabled={working || expired || !isPhoneProofReady(snapshot, phone)} onClick={() => {
              if (!isPhoneProofReady(snapshot, phone) || !snapshot.challenge) { setExpired(true); return; }
              onBind(snapshot.challenge.id, phone);
            }}>
              {busy ? t("finishing") : t("finishRegistration")}
              {busy && <LoaderCircle aria-hidden="true" className="absolute right-4 size-4 animate-spin" strokeWidth={1.5} />}
            </AccountPrimaryButton>
            <AccountTextButton className="mx-auto flex px-3 no-underline hover:underline" type="button" disabled={working} onClick={() => { setSuppressResetFocus(false); setExpired(false); void controller.current?.reset(); }}>{t("useADifferentPhone")}</AccountTextButton>
            <p role="status" className="sr-only">{busy ? t("finishingRegistration") : ""}</p>
          </div>}
          registrationFeedback={<div data-member-phone-feedback="" className="min-h-5 text-[13px] leading-5 text-neutral-300" aria-live="polite">{feedback && <p role="alert" className="m-0">{feedback}</p>}</div>}
        />
      </VerificationProvider>
      </div>
    </div>
  );
}
