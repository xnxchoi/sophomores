"use client";

import { attachHaptics } from "../../../lib/haptics";

import { useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import { cn } from "../../../lib/utils";
import { VerificationPresentation, VerificationTray, VerificationTrayTitle } from "./verification-tray";
import {
  VerificationLanguageSwitcher,
  VerificationProvider
} from "./phone-verification";
import type { PhoneVerificationModalProps } from "./phone-verification-modal";
import { PhoneNumberField } from "./phone-number-field";
import { VerificationCountdown } from "./verification-countdown";
import { VerificationStatus } from "./verification-status";
import { useComposeFallback } from "./use-compose-fallback";
import {
  createTrialSession,
  createVerificationClient
} from "../../../lib/phone-verification/client";
import type { TrialSnapshot } from "../../../lib/phone-verification/client-contracts";
import {
  buildMessageHref,
  messagingPlatform,
  type MessagingPlatform,
  normalizeKoreanMobile
} from "../../../lib/phone-verification/model";
import {
  ChallengeCard,
  Description,
  Heading,
  Note,
  Panel,
  PrimaryButton,
  SecondaryButton,
  TextButton,
  VerificationBoundary,
  VerificationDetails,
  VerificationMark,
  PrimaryLink
} from "./verification-ui";

export function PhoneVerificationTrialModal({
  initialLocale = "ko",
  locale,
  onLocaleChange,
  ...props
}: PhoneVerificationModalProps) {
  return (
    <VerificationProvider
      initialLocale={initialLocale}
      locale={locale}
      onLocaleChange={onLocaleChange}
    >
      <TrialDialog {...props} />
    </VerificationProvider>
  );
}

function TrialDialog({
  open,
  onOpenChange,
  returnFocusRef
}: Pick<
  PhoneVerificationModalProps,
  "open" | "onOpenChange" | "returnFocusRef"
>) {
  const locale = useLocale();
  const t = useTranslations("VerificationTrial");
  const common = useTranslations("Common");
  const headingId = useId();
  const descriptionId = useId();
  return (
    <VerificationTray
      open={open}
      onOpenChange={onOpenChange}
      returnFocusRef={returnFocusRef}
      onCancel={() => onOpenChange(false)}
      cancelLabel={common("cancel")}
      headingId={headingId}
      descriptionId={descriptionId}
      locale={locale}
      description={t("boundary")}
      closeLabel={t("close")}
    >
      {open && <TrialVerificationFlow headingId={headingId} />}
    </VerificationTray>
  );
}

const emptySnapshot: TrialSnapshot = {
  challenge: null,
  status: null,
  busy: false,
  error: null
};

export function TrialVerificationFlow({ headingId }: { headingId: string }) {
  const [snapshot, setSnapshot] = useState<TrialSnapshot>(emptySnapshot);
  const [platform, setPlatform] = useState<MessagingPlatform>("manual");
  const session = useRef<ReturnType<typeof createTrialSession> | null>(null);
  useEffect(() => {
    const current = createTrialSession(createVerificationClient(), setSnapshot);
    session.current = current;
    return () => {
      current.dispose();
      session.current = null;
    };
  }, []);
  const expire = useCallback(() => session.current?.expire(), []);
  return (
    <TrialVerificationView
      snapshot={snapshot}
      headingId={headingId}
      platform={platform}
      onStart={(phone) => {
        setPlatform(
          messagingPlatform(navigator.userAgent, navigator.maxTouchPoints)
        );
        void session.current?.start(phone);
      }}
      onRefresh={() => {
        void session.current?.refresh();
      }}
      onReset={() => {
        void session.current?.reset();
      }}
      onExpire={expire}
    />
  );
}

type TrialViewProps = {
  snapshot: TrialSnapshot;
  presentation?: "trial" | "registration";
  headingId?: string;
  registrationCompletion?: ReactNode;
  registrationFeedback?: ReactNode;
  autoFocusHeading?: boolean;
  platform?: MessagingPlatform;
  onStart: (phone: string) => void;
  onRefresh: () => void;
  onReset: () => void;
  onExpire: () => void;
};

/** Pure view also exercises truthful pending/review/terminal copy in rendering tests. */
export function TrialVerificationView({
  snapshot,
  presentation = "trial",
  headingId = "pv-trial-heading",
  platform = "manual",
  onStart,
  onRefresh,
  onReset,
  onExpire,
  registrationCompletion,
  registrationFeedback,
  autoFocusHeading = true
}: TrialViewProps) {
  const mobileTray = useContext(VerificationPresentation) === "tray";
  const t = useTranslations("VerificationTrial");
  const common = useTranslations("Verification");
  const locale = useLocale();
  const registration = presentation === "registration";
  const [phone, setPhone] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [checkedChallenge, setCheckedChallenge] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const state = snapshot.status?.state;
  const active = state === "pending" || state === "review";
  const challenge = snapshot.challenge;
  useLayoutEffect(() => {
    if (autoFocusHeading) heading.current?.focus({ preventScroll: true });
  }, [state, challenge?.id, autoFocusHeading]);
  const composer =
    challenge && state === "pending" && snapshot.error !== "receiver"
      ? buildMessageHref(challenge.recipient, challenge.body, platform, {
          allowManual: registration
        })
      : null;
  const composerFallback = useComposeFallback(
    registration && composer && challenge ? challenge.id : null
  );
  const markState =
    snapshot.error || state === "expired" || state === "cancelled"
      ? "error"
      : state === "verified"
        ? "success"
        : active || snapshot.busy
          ? "pending"
          : "entry";
  const terminalRecovery = registration && (state === "expired" || state === "cancelled" || state === "consumed");
  const ResetAction = terminalRecovery ? PrimaryButton : TextButton;
  return (
    <Panel lang={locale} aria-labelledby={headingId} className={cn(registration && "[font-family:system-ui]")}>
      {!registration && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {markState !== "entry" && <VerificationMark state={markState} />}
            <p className="truncate text-[10px] tracking-[0.08em] text-neutral-400">
              {t("trial")}
            </p>
          </div>
          <VerificationLanguageSwitcher />
        </div>
      )}
      <motion.div
        key={challenge ? (state ?? "pending") : "number"}
        data-trial-phase={challenge ? (state ?? "pending") : "number"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="min-w-0"
      >
        {registration && !active && markState !== "entry" && !(state === "verified" && registrationCompletion) && (
          <div className="mb-3"><VerificationMark state={markState} /></div>
        )}
        <VerificationTrayTitle>
          <Heading
            id={headingId}
            tabIndex={-1}
            ref={heading}
            className={cn(registration && "mt-0 mb-2 text-2xl leading-[30px] tracking-[-0.035em] sm:text-2xl", registration && !mobileTray && !(state === "verified" && registrationCompletion) && "pl-14", registration && state === "verified" && Boolean(registrationCompletion) && "flex items-center justify-center gap-2.5 text-center")}
          >
            {registration && state === "verified" && registrationCompletion && <Check aria-hidden="true" className="size-5 shrink-0 text-neutral-200" strokeWidth={1.5} />}
            {t(
              challenge && state
                ? registration
                  ? `registration.heading.${state}`
                  : `heading.${state}`
                : "heading.number"
            )}
          </Heading>
        </VerificationTrayTitle>
          <div className={cn("space-y-4", registration && !mobileTray && "[&>form>p:first-child]:pl-14 [&>p:first-child]:pl-14")}>
            {!challenge ? (
              <form
                noValidate
                aria-busy={registration ? undefined : snapshot.busy}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (snapshot.busy) return;
                  const normalized = normalizeKoreanMobile(phone);
                  if (!normalized) {
                    setInvalid(true);
                    phoneInput.current?.focus();
                    return;
                  }
                  setInvalid(false);
                  onStart(normalized);
                }}
              >
                <Description className={cn(registration && "mb-6 leading-6")}>{t("numberPrompt")}</Description>
                <PhoneNumberField
                  compact={registration}
                  value={phone}
                  inputRef={phoneInput}
                  disabled={snapshot.busy}
                  error={invalid ? common("invalidPhone") : ""}
                  onChange={(value) => {
                    setPhone(value);
                    setInvalid(false);
                  }}
                />
                <PrimaryButton
                  ref={attachHaptics}
                  type="submit"
                  aria-busy={registration ? snapshot.busy : undefined}
                  className={cn(registration && "mt-4 min-h-12 justify-center rounded-xl bg-neutral-100 py-3 font-medium")}
                  disabled={snapshot.busy}
                >
                  {t(snapshot.busy ? "creating" : "continueLabel")}
                  {registration ? snapshot.busy && <LoaderCircle aria-hidden="true" className="absolute right-4 size-4 animate-spin" strokeWidth={1.5} /> : <span aria-hidden="true">↗</span>}
                </PrimaryButton>
                {registration && <p role="status" className="sr-only">{snapshot.busy ? t("creating") : ""}</p>}
              </form>
            ) : (
              <>
                {(!registration || (state !== "pending" && state !== "verified")) && (
                  <Description role={registration ? undefined : "status"} className={cn(registration && "mb-4 leading-6")}>
                    {t(
                      registration
                        ? `registration.state.${state ?? "pending"}`
                        : `state.${state ?? "pending"}`
                    )}
                  </Description>
                )}
                {state === "pending" && (
                  <>
                    {!registration && (
                      <ChallengeCard
                        recipient={challenge.recipient}
                        body={challenge.body}
                      />
                    )}
                    {composer && (
                      <PrimaryLink
                        className={cn(registration && "mt-4 min-h-12 justify-center rounded-xl bg-neutral-100 py-3 font-medium")}
                        href={composer}
                        onClick={
                          registration ? composerFallback.onCompose : undefined
                        }
                      >
                        {registration
                          ? common("openMessages")
                          : t("openMessages")}
                        {registration && <ArrowUpRight aria-hidden="true" className="absolute right-4 size-4" strokeWidth={1.5} />}
                      </PrimaryLink>
                    )}
                    {!registration && (
                      <Note>
                        {t(platform === "manual" ? "manual" : "candidate")}
                      </Note>
                    )}
                  </>
                )}
                {registration && active && (
                  <VerificationStatus
                    state={state}
                    busy={false}
                    error={snapshot.error}
                    checked={!snapshot.busy && checkedChallenge === challenge.id}
                    expiresAt={Date.parse(challenge.expiresAt)}
                    onExpire={onExpire}
                  />
                )}
                {active && (
                  <>
                    {!registration && (
                      <VerificationCountdown
                        expiresAt={Date.parse(challenge.expiresAt)}
                        visible
                        onExpire={onExpire}
                        labelKey="trialCountdownLabel"
                      />
                    )}
                    <SecondaryButton
                      className={cn(registration && "my-0 rounded-xl")}
                      type="button"
                      disabled={snapshot.busy}
                      aria-busy={snapshot.busy}
                      onClick={() => {
                        setCheckedChallenge(challenge.id);
                        onRefresh();
                      }}
                    >
                      {t(snapshot.busy ? "checking" : "check")}
                      {registration && snapshot.busy && <LoaderCircle aria-hidden="true" className="absolute right-4 size-4 animate-spin" strokeWidth={1.5} />}
                    </SecondaryButton>
                    {registration && <p role="status" className="sr-only">{snapshot.busy ? t("checking") : ""}</p>}
                  </>
                )}
                {registration &&
                  state === "pending" &&
                  composerFallback.showFallback && (
                    <VerificationDetails
                      label={t("registration.composerHelpLabel")}
                    >
                      <Note>{t("registration.composerHelp")}</Note>
                      <ChallengeCard
                        recipient={challenge.recipient}
                        body={challenge.body}
                      />
                    </VerificationDetails>
                  )}
                {registration && state === "verified" && registrationCompletion ? registrationCompletion : <ResetAction
                  className={cn(registration && "mx-auto", terminalRecovery && "mt-4 min-h-12 justify-center rounded-xl bg-neutral-100 py-3 font-medium")}
                  type="button"
                  disabled={snapshot.busy}
                  onClick={onReset}
                >
                  {t(
                    active
                      ? "cancel"
                      : registration
                        ? "registration.restart"
                        : "restart"
                  )}
                </ResetAction>}
              </>
            )}
          </div>
          {registration && registrationFeedback}
          {snapshot.error && (
            <div data-trial-error="">
              <div className="pt-4">
                <p
                  className="rounded-lg border border-neutral-500/40 bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-neutral-200"
                  role="alert"
                >
                  {t(
                    registration
                      ? `registration.error.${snapshot.error}`
                      : `error.${snapshot.error}`
                  )}
                </p>
              </div>
            </div>
          )}
      </motion.div>
      {!registration && (
        <VerificationDetails label={common("privacyDetails")}>
          <Note>{t("privacy")}</Note>
          {challenge && <Note>{t("mmsWarning")}</Note>}
        </VerificationDetails>
      )}
      {!registration && (
        <VerificationBoundary>{t("boundary")}</VerificationBoundary>
      )}
    </Panel>
  );
}
