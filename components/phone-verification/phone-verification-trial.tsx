"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog, DialogClose, DialogContent } from "../ui/dialog";
import { VerificationLanguageSwitcher, VerificationProvider } from "./phone-verification";
import type { PhoneVerificationModalProps } from "./phone-verification-modal";
import { PhoneNumberField } from "./phone-number-field";
import { VerificationCountdown } from "./verification-countdown";
import { createTrialSession, createVerificationClient } from "../../lib/phone-verification/client";
import type { TrialSnapshot } from "../../lib/phone-verification/client-contracts";
import { buildMessageHref, messagingPlatform, normalizeKoreanMobile, type MessagingPlatform } from "../../lib/phone-verification/model";

export function PhoneVerificationTrialModal({
  initialLocale = "ko", locale, onLocaleChange, ...props
}: PhoneVerificationModalProps) {
  return (
    <VerificationProvider initialLocale={initialLocale} locale={locale} onLocaleChange={onLocaleChange}>
      <TrialDialog {...props} />
    </VerificationProvider>
  );
}

function TrialDialog({ open, onOpenChange, returnFocusRef }: Pick<PhoneVerificationModalProps, "open" | "onOpenChange" | "returnFocusRef">) {
  const locale = useLocale();
  const t = useTranslations("VerificationTrial");
  const headingId = useId();
  const descriptionId = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="phone-verification pv-modal" lang={locale} showCloseButton={false}
        aria-labelledby={headingId} aria-describedby={descriptionId}
        initialFocus={() => document.getElementById(headingId)} finalFocus={returnFocusRef ?? true}>
        <div className="pv-modal-bar">
          <span className="font-teaser-serif text-[25px] tracking-[-1.5px]" aria-hidden="true">sophomores</span>
          <DialogClose className="pv-close" aria-label={t("close")}>×</DialogClose>
        </div>
        <p id={descriptionId} className="sr-only">{t("boundary")}</p>
        {open && <TrialVerificationFlow headingId={headingId} />}
      </DialogContent>
    </Dialog>
  );
}

const emptySnapshot: TrialSnapshot = { challenge: null, status: null, busy: false, error: null };

export function TrialVerificationFlow({ headingId }: { headingId: string }) {
  const [snapshot, setSnapshot] = useState<TrialSnapshot>(emptySnapshot);
  const [platform, setPlatform] = useState<MessagingPlatform>("manual");
  const session = useRef<ReturnType<typeof createTrialSession> | null>(null);
  useEffect(() => {
    const current = createTrialSession(createVerificationClient(), setSnapshot);
    session.current = current;
    return () => { current.dispose(); session.current = null; };
  }, []);
  const expire = useCallback(() => session.current?.expire(), []);
  return <TrialVerificationView snapshot={snapshot} headingId={headingId} platform={platform}
    onStart={(phone) => {
      setPlatform(messagingPlatform(navigator.userAgent, navigator.maxTouchPoints));
      void session.current?.start(phone);
    }}
    onRefresh={() => { void session.current?.refresh(); }}
    onReset={() => { void session.current?.reset(); }} onExpire={expire} />;
}

type TrialViewProps = {
  snapshot: TrialSnapshot;
  headingId?: string;
  platform?: MessagingPlatform;
  onStart: (phone: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onExpire: () => void;
};

/** Pure view also exercises truthful pending/review/terminal copy in rendering tests. */
export function TrialVerificationView({ snapshot, headingId = "pv-trial-heading", platform = "manual", onStart, onRefresh, onReset, onExpire }: TrialViewProps) {
  const t = useTranslations("VerificationTrial");
  const common = useTranslations("Verification");
  const locale = useLocale();
  const [phone, setPhone] = useState("");
  const [invalid, setInvalid] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const state = snapshot.status?.state;
  const active = state === "pending" || state === "review";
  const challenge = snapshot.challenge;
  useEffect(() => { heading.current?.focus(); }, [state]);
  const composer = challenge && state === "pending" ? buildMessageHref(challenge.recipient, challenge.body, platform) : null;
  return (
    <section className="pv-panel pv-trial" lang={locale} aria-labelledby={headingId}>
      <VerificationLanguageSwitcher />
      <div className="pv-content">
        <h2 id={headingId} tabIndex={-1} ref={heading}>{t(challenge && state ? `heading.${state}` : "heading.number")}</h2>
        <p className="pv-simulation">{t("trial")}</p>
        {!challenge ? (
          <form noValidate onSubmit={(event) => {
            event.preventDefault();
            if (snapshot.busy) return;
            const normalized = normalizeKoreanMobile(phone);
            if (!normalized) { setInvalid(true); phoneInput.current?.focus(); return; }
            setInvalid(false);
            onStart(normalized);
          }}>
            <p className="pv-description">{t("numberDescription")}</p>
            <PhoneNumberField value={phone} inputRef={phoneInput} disabled={snapshot.busy} error={invalid ? common("invalidPhone") : ""}
              onChange={(value) => { setPhone(value); setInvalid(false); }} />
            <button className="pv-primary" type="submit" disabled={snapshot.busy}>{t(snapshot.busy ? "creating" : "create")}</button>
            <p className="pv-note pv-cost">{t("privacy")}</p>
          </form>
        ) : (
          <>
            <p className="pv-description" role="status">{t(`state.${state ?? "pending"}`)}</p>
            {state === "pending" && (
              <>
                <div className="pv-message-card">
                  <div><span>{t("recipient")}</span><code>{challenge.recipient}</code></div>
                  <div><span>{t("body")}</span><code>{challenge.body}</code></div>
                </div>
                {composer && <a className="pv-primary" href={composer}>{t("openMessages")}</a>}
                <p className="pv-note">{t(platform === "manual" ? "manual" : "candidate")}</p>
                <p className="pv-note pv-cost">{t("mmsWarning")}</p>
              </>
            )}
            {active && <>
              <VerificationCountdown expiresAt={Date.parse(challenge.expiresAt)} visible onExpire={onExpire} labelKey="trialCountdownLabel" />
              <button className="pv-secondary" type="button" disabled={snapshot.busy} onClick={onRefresh}>{t(snapshot.busy ? "checking" : "check")}</button>
            </>}
            <button className="pv-text-button" type="button" disabled={snapshot.busy} onClick={onReset}>{t(active ? "cancel" : "restart")}</button>
          </>
        )}
        {snapshot.error && <p className="pv-status" role="alert">{t(`error.${snapshot.error}`)}</p>}
      </div>
      <p className="pv-preview">{t("boundary")}</p>
    </section>
  );
}
