"use client";

import { useLocale, useTranslations } from "next-intl";

import { useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { cn } from "../../../lib/utils";
import { VerificationPresentation, VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./_shared/session";
import type { MemberCapabilities, MemberSocialProvider } from "../../../lib/member-auth/contracts";
import { AccountPhaseViews } from "@/components/Authentication/account-phase-views";
import { normalizeLoginEmail } from "@/lib/passwordless-login";
import { motionTokens } from "@/lib/motion-tokens";

import {
  AccountInput,
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton
} from "./account-controls";

export type MemberAccountViewProps = {
  presentation?: "ticket-checkout";
  noAccountMessage?: string;
  onVerifiedFocus?: () => void;
  emailEntry?: { email: string; state: "pending" | "error" | "existing" | "new"; retryAt?: number };
  onLookupRetry?: () => void;
  initialCapabilities?: Readonly<MemberCapabilities>;
  headingId?: string;
  flow?: "login" | "signup";
  registrationRequested?: boolean;
  registrationContext?: boolean;
  reauthenticating?: boolean;
  refreshingStatus?: boolean;
  onContinueRegistration: () => void;
  snapshot: MemberSnapshot;
  identifierMode: "email" | "phone";
  email: string;
  phone: string;
  otp: string;
  invalidEmail?: boolean;
  resendRemaining?: number;
  verificationRemaining?: number;
  visible?: boolean;
  phoneStep: ReactNode;
  completionAction?: ReactNode;
  authenticatedAction?: ReactNode;
  onRecover?: () => void;
  onPasskey: () => void;
  onSocial: (provider: MemberSocialProvider) => void;
  onCode: () => void;
  onLink: () => void;
  onVerify: (value?: string) => void;
  onEditEmail: () => void;
  onIdentifier: () => void;
  onClearIdentifier: () => void;
  onAddPasskey: () => void;
  onCheckPasskey?: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
  onMode: (mode: "email" | "phone") => void;
  onEmail: (value: string) => void;
  onPhone: (value: string) => void;
  onOtp: (value: string) => void;
};

/** Display order of the social providers that are switched on. */
function enabledProviders(capabilities?: Readonly<Partial<Pick<MemberCapabilities, MemberSocialProvider>>>): MemberSocialProvider[] {
  return (["apple", "google", "kakao"] as const).filter((provider) => capabilities?.[provider] === true);
}

/** Purchase rule: an email with no account is pointed to social sign-up; no code is offered. */
function NoAccountMessage({ capabilities }: { capabilities?: Readonly<Partial<Pick<MemberCapabilities, MemberSocialProvider>>> }) {
  const t = useTranslations("MemberAuth");
  const locale = useLocale();
  const names = enabledProviders(capabilities).map((provider) => t(provider));
  if (names.length === 0) return t("noAccountForThisEmailNoProviders");
  // An empty Korean string falls back to English (owner, 13 Nov). The joined list must be in the language the sentence
  // is actually shown in, or it reads "continue with Apple 또는 Google".
  const shownInKorean = locale === "ko" && /[\uAC00-\uD7A3]/.test(t.raw("noAccountForThisEmail") as string);
  const providers = new Intl.ListFormat(locale === "ko" && !shownInKorean ? "en" : locale, { type: "disjunction" }).format(names);
  return t("noAccountForThisEmail", { providers });
}

export function MemberAccountView(props: MemberAccountViewProps) {
  const t = useTranslations("MemberAuth");
  const presentation = useContext(VerificationPresentation);
  const mobileTray = presentation === "tray";
  const { snapshot } = props;
  const status = snapshot.status;
  const panel = useRef<HTMLElement>(null);
  const capturePanel = useCallback((node: HTMLElement | null) => {
    if (node === null && panel.current?.contains(document.activeElement)) props.onVerifiedFocus?.();
    panel.current = node;
  }, [props.onVerifiedFocus]);
  const capabilities = status?.capabilities ?? props.initialCapabilities;
  const locked = snapshot.busy || !status;
  const sharedEmail = !status?.authenticated || Boolean(props.reauthenticating);
  const bindingConfirmed = Boolean(
    status?.member &&
    snapshot.notice === "Email and phone binding confirmed for this local account."
  );
  const error = snapshot.error && snapshot.failure ? t(`failures.${snapshot.failure}`) : snapshot.error;
  const notice = bindingConfirmed || snapshot.noticeCode === "passkey-added" ||
    (status?.authenticated && snapshot.failure === "passkey-cancelled") ? null : snapshot.notice
    ? snapshot.failure ? t(`failures.${snapshot.failure}`)
      : snapshot.noticeCode ? t(`notices.${snapshot.noticeCode}`) : snapshot.notice
    : null;
  const needsStatusRetry = Boolean(
    props.refreshingStatus ||
    (snapshot.error &&
      (!snapshot.failure ||
        snapshot.failure === "passkey-sign-in-unconfirmed" ||
        snapshot.failure === "passkey-session-changed" ||
        snapshot.failure === "network" ||
        snapshot.failure === "timeout" ||
        snapshot.failure === "unavailable" ||
        (!status && snapshot.failure === "rate-limited"))) ||
    (status && !status.authenticated && !capabilities?.emailOtp)
  );
  const pendingSetup = Boolean(
    status?.authenticated && status.emailVerified && !status.member
  );
  const embeddedPhone =
    !status?.member && (props.registrationContext || (pendingSetup &&
    (props.flow === "signup" || props.registrationRequested === true)));
  const phase = embeddedPhone ? "phone" : status?.member
    ? "member"
    : status?.authenticated
      ? embeddedPhone
        ? "phone"
        : "setup"
      : "identity";
  const heading = status?.member
    ? t("accountReady")
    : status?.authenticated
      ? status.emailVerified
        ? embeddedPhone
          ? t("verifyYourPhoneToFinish")
          : t("finishSettingUpYourAccount")
        : t("emailVerificationNeeded")
      : props.flow === "signup"
        ? t("signUp")
        : t("logIn");
  useLayoutEffect(() => {
    if ((phase === "setup" || phase === "member") && document.visibilityState !== "hidden")
      document.getElementById(props.headingId ?? "member-account-heading")?.focus({ preventScroll: true });
  }, [phase, props.headingId]);
  useLayoutEffect(() => {
    if (props.reauthenticating) document.getElementById(props.headingId ?? "member-account-heading")?.focus({ preventScroll: true });
  }, [props.reauthenticating, props.headingId]);
  const statusRetry = needsStatusRetry ? (
    <>
      <AccountButton
        className={cn("gap-2 border-white/10 bg-white/[0.025] text-[13px] text-neutral-300", sharedEmail ? mobileTray ? "size-12 min-h-0 shrink-0 p-0" : "size-11 min-h-0 shrink-0 p-0" : "min-h-12 w-auto px-4 py-3", !sharedEmail && mobileTray && "mx-auto flex")}
        type="button"
        data-account-status-retry=""
        data-account-status-refresh={sharedEmail ? "" : undefined}
        aria-label={t("refreshAccountStatus")}
        aria-busy={props.refreshingStatus === true}
        disabled={snapshot.busy || props.refreshingStatus || (!status && snapshot.failure === "rate-limited" && Math.max(props.verificationRemaining ?? 0, props.resendRemaining ?? 0) > 0)}
        onClick={props.onRefresh}
      >
        <span data-account-refresh-icon="" aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
          <RefreshCw className={cn("size-4", props.refreshingStatus && "hidden")} strokeWidth={1.5} />
          <LoaderCircle className={cn("size-4 animate-spin", !props.refreshingStatus && "hidden")} strokeWidth={1.5} />
        </span>
        {!sharedEmail && t("refreshAccountStatus")}
      </AccountButton>
      <span role="status" className="sr-only">{props.refreshingStatus ? t("checkingSignInOptions") : null}</span>
    </>
  ) : null;
  const passkeyAction = props.presentation !== "ticket-checkout" && status?.authenticated &&
    status.emailVerified && (capabilities?.passkey || snapshot.passkeyPending) ? (
      <AccountPasskeyAction
        primary={status.member && !props.completionAction}
        snapshot={snapshot}
        onAdd={props.onAddPasskey}
        onCheck={props.onCheckPasskey}
      />
    ) : null;
  if (props.presentation === "ticket-checkout" && status?.member) {
    if (!snapshot.busy && !snapshot.error) return null;
    return <Panel ref={capturePanel} data-member-account-check="" className="px-0! pt-0! pb-0! [font-family:system-ui]">
      {snapshot.busy ? <p role="status" className="m-0 flex items-center gap-2 text-[14px] leading-6 text-neutral-300"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />  {t("checkingYourAccount")}</p> : snapshot.error && <p role="alert" className="m-0 text-[14px] leading-6 text-neutral-300">{error}</p>}
      {statusRetry && <div className="mt-3">{statusRetry}</div>}
    </Panel>;
  }
  return (
    <Panel ref={capturePanel} data-authentication-presentation={presentation ?? undefined} className={cn("!px-6 !pb-6 [font-family:system-ui] data-[authentication-presentation=modal]:[@media(max-height:600px)]:pt-4! data-[authentication-presentation=modal]:[@media(max-height:600px)]:pb-4!", mobileTray ? "!pt-0" : "!pt-6")} data-member-account-flow="">
      <motion.div
        key={phase}
        data-member-account-phase={phase}
        initial={phase === "identity" || phase === "phone" ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
      {!sharedEmail && (
        <VerificationTrayTitle>
          <Heading
            id={props.headingId ?? "member-account-heading"}
            tabIndex={-1}
            className={cn("!text-[24px] !leading-[30px] !font-medium", mobileTray ? "!mt-0" : "pl-14", pendingSetup && !embeddedPhone && "mt-0! mb-2!", status?.member && "!mt-0 !mb-4 flex items-center gap-2.5", embeddedPhone && "sr-only")}
          >
            {status?.member && <Check aria-hidden="true" data-account-confirmed="" className="size-5 shrink-0 text-neutral-200" strokeWidth={1.5} />}
            {heading}
          </Heading>
        </VerificationTrayTitle>
      )}
        <div className={cn(!sharedEmail && (status?.member ? "space-y-4" : "space-y-5"), !mobileTray && "[&>p:first-child]:pl-14")}>
          {embeddedPhone ? (
            <>
              <div hidden={props.reauthenticating} inert={props.reauthenticating}>
                {props.phoneStep}
                {passkeyAction}
                {props.presentation !== "ticket-checkout" && snapshot.failure === "passkey-session-changed" && (
                  <div className="space-y-2">
                    <p role="alert" className="text-[13px] leading-5">{error}</p>
                    {statusRetry}
                  </div>
                )}
                <AccountTextButton className="min-h-11 px-1 text-xs no-underline hover:underline [font-family:system-ui] [[data-member-account-flow]:has([data-member-phone-completion])_&]:hidden [[data-member-account-flow]:has([data-member-phone-recovery])_&]:hidden" type="button" disabled={locked} onClick={props.onSignOut}>{t("switchAccount")}</AccountTextButton>
              </div>
              {props.reauthenticating && <div data-member-registration-reauth="" className="space-y-4">
                <VerificationTrayTitle><Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="mt-0 mb-2 text-center text-[24px] leading-[30px] font-medium sm:text-[24px]">{t("signInAgain")}</Heading></VerificationTrayTitle>
                <p className="w-full text-center text-sm leading-6 text-neutral-400">{t("continueRegistrationAfterSigningIn")}</p>
                <IdentityStep {...props} flow="login" presentation={undefined} headingId={(props.headingId ?? "member-account-heading") + "-reauth-entry"} reauthenticating locked={locked} reserveFeedback={needsStatusRetry} feedbackAction={statusRetry} />
              </div>}
            </>
          ) : !status?.authenticated ? (
            <IdentityStep
              {...props}
              locked={locked}
              reserveFeedback={needsStatusRetry}
              feedbackAction={statusRetry}
            />
          ) : status.member ? (
            <>
              <p role={bindingConfirmed ? "status" : undefined} className="text-sm leading-5 text-neutral-400">
                {t("emailAndPhoneConfirmed")}
              </p>
              {props.completionAction}
              {passkeyAction}
              <p className="text-sm leading-6 text-neutral-400">
                {t("passkeysAreOptionalThisLocalPasskeyWontTransferToTheHostedSite")}
              </p>
              <AccountButton
                type="button"
                disabled={locked}
                onClick={props.onSignOut}
              >
                {t("signOut")}
              </AccountButton>
            </>
          ) : status.emailVerified ? (
            <>
              {embeddedPhone ? (
                props.phoneStep
              ) : (
                <>
                  <p className="text-sm leading-6 text-neutral-400">
                    {t("verifyYourPhoneToFinishLabel")}
                  </p>
                  <AccountPrimaryButton
                    type="button"
                    disabled={locked}
                    onClick={props.onContinueRegistration}
                  >
                    {t("continueRegistration")}
                  </AccountPrimaryButton>
                </>
              )}
              {passkeyAction}
              <AccountTextButton
                className={cn("min-h-11 px-1 text-xs no-underline hover:underline [font-family:system-ui]", !embeddedPhone && "w-full")}
                type="button"
                disabled={locked}
                onClick={props.onSignOut}
              >
                {t("switchAccount")}
              </AccountTextButton>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-neutral-400">
                {t("signOutAndVerifyYourEmailBeforeContinuing")}
              </p>
              <AccountButton
                type="button"
                disabled={locked}
                onClick={props.onSignOut}
              >
                {t("signOut")}
              </AccountButton>
            </>
          )}
        </div>
      {!status && snapshot.busy && !props.refreshingStatus && (
        <span role="status" aria-live="polite" className="sr-only">{t("checkingSignInOptions")}</span>
      )}
      {!embeddedPhone && (!sharedEmail || (!snapshot.failure && !needsStatusRetry)) && (notice || snapshot.error || (!status && !sharedEmail) || (props.refreshingStatus && !sharedEmail)) && (
        <div className="mt-4 space-y-2 text-[13px] leading-5" aria-live="polite">
          {notice && (
            <p role="status" className="text-neutral-300">
              {notice}
            </p>
          )}
          {(snapshot.error || props.refreshingStatus) && (
            <p
              role={props.refreshingStatus ? undefined : "alert"}
              className={cn("text-neutral-200", needsStatusRetry ? "min-h-10" : "rounded-xl border border-neutral-500 px-4 py-3")}
            >
              {!props.refreshingStatus && error}
            </p>
          )}
          {!status && !sharedEmail && !snapshot.error && (
            <p role="status" className="flex items-center gap-2 text-neutral-400">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              <span className="sr-only">{t("checkingSignInOptions")}</span>
            </p>
          )}
        </div>
      )}
      {!embeddedPhone && !sharedEmail && statusRetry && <div className="mt-3">{statusRetry}</div>}
      {status?.authenticated && props.authenticatedAction && <div inert={snapshot.busy}>{props.authenticatedAction}</div>}
      </motion.div>
    </Panel>
  );
}

function TicketEmailEntry(props: MemberAccountViewProps & { locked: boolean; visibleError: string | null; visibleFailure: MemberSnapshot["failure"]; feedbackAction?: ReactNode }) {
  const t = useTranslations("MemberAuth");
  const { snapshot, locked } = props;
  const emailInput = useRef<HTMLInputElement | null>(null);
  const capabilities = snapshot.status?.capabilities ?? props.initialCapabilities;
  const fieldId = (props.headingId ?? "member-account-heading") + "-email";
  const lookupFailed = props.emailEntry?.state === "error";
  const lookupBlocked = Boolean(props.emailEntry?.retryAt && props.emailEntry.retryAt > Date.now());
  const classified = props.emailEntry?.state === "existing" || props.emailEntry?.state === "new";
  const noAccount = props.emailEntry?.state === "new";
  const feedback = props.invalidEmail
    ? t("enterAValidEmailAddress")
    : (props.resendRemaining ?? 0) > 0
      ? t("retryAfterSeconds", { seconds: props.resendRemaining ?? 0 })
      : lookupFailed
        ? lookupBlocked ? t("tooManyAttemptsWaitBeforeTryingAgain") : t("weCouldntCheckThisEmailTryAgain")
        : noAccount ? props.noAccountMessage ?? <NoAccountMessage capabilities={capabilities} />
        : props.visibleError && props.visibleFailure ? t(`failures.${props.visibleFailure}`) : props.visibleError;

  return (
    <div data-account-email-entry="" className="flex flex-col gap-6">
      <Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="m-0 text-[24px] leading-[30px] font-medium tracking-[-0.025em]">
        {props.emailEntry?.state === "existing" ? t("signIn") : noAccount ? t("signUp") : t("enterYourEmail")}
      </Heading>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (locked || !capabilities?.emailOtp || props.emailEntry?.state === "pending" || lookupFailed || noAccount) return;
        if (!classified) {
          emailInput.current?.focus({ preventScroll: true });
          props.onLookupRetry?.();
        }
        else if ((props.resendRemaining ?? 0) === 0) props.onCode();
      }} noValidate>
        <div data-ticket-email-field="" className="grid gap-2">
          <label htmlFor={fieldId} className="sr-only">{t("emailAddress")}</label>
          <div className="relative">
            <AccountInput ref={emailInput} className="mt-0! pr-12! tracking-normal!" id={fieldId} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={props.email} disabled={snapshot.busy} aria-invalid={props.invalidEmail} aria-describedby={fieldId + "-feedback"} onChange={(event) => props.onEmail(event.target.value)} />
            <div data-ticket-email-adornment="" className="absolute inset-y-0 right-1 flex w-11 items-center justify-center">
              {lookupFailed ? (
                <button type="button" aria-label={t("tryEmailAgain")} disabled={locked || lookupBlocked} onClick={() => {
                  emailInput.current?.focus({ preventScroll: true });
                  props.onLookupRetry?.();
                }} className="flex size-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-100 disabled:opacity-40">
                  <RefreshCw aria-hidden="true" className="size-4" strokeWidth={1.5} />
                </button>
              ) : props.feedbackAction ? props.feedbackAction : props.emailEntry?.state === "pending" ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-neutral-400" strokeWidth={1.5} />
              ) : null}
            </div>
          </div>
        </div>
        <div id={fieldId + "-feedback"} data-ticket-email-feedback="" className="mt-2 min-h-10 text-[13px] leading-5 text-neutral-400" aria-live="polite" aria-atomic="true">
          {feedback ? <p role={props.invalidEmail || lookupFailed || props.visibleError ? "alert" : "status"} className="m-0">{feedback}</p> : props.emailEntry?.state === "pending" ? <span className="sr-only">{t("checkingEmail")}</span> : null}
        </div>
        {/* An email with no account cannot receive a sign-in code. */}
        {!noAccount && <AccountPrimaryButton type="submit" className="mt-1 min-h-12 w-full" disabled={locked || !capabilities?.emailOtp || props.emailEntry?.state === "pending" || lookupFailed || (classified && (props.resendRemaining ?? 0) > 0)} aria-busy={props.emailEntry?.state === "pending" || (snapshot.busy && snapshot.pendingAction === "send-code")}>
          {props.emailEntry?.state === "existing" ? t("sendSignInCode") : t("continue")}
        </AccountPrimaryButton>}
      </form>
    </div>
  );
}

function AccountPasskeyAction({ primary, snapshot, onAdd, onCheck }: {
  primary: boolean;
  snapshot: MemberSnapshot;
  onAdd: () => void;
  onCheck?: () => void;
}) {
  const t = useTranslations("MemberAuth");
  const Button = primary ? AccountPrimaryButton : AccountButton;
  const pending = snapshot.passkeyPending === true;
  const checking = snapshot.busy && snapshot.pendingAction === "passkey";
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        disabled={snapshot.busy || (pending && !onCheck)}
        aria-busy={checking}
        onClick={pending ? onCheck : onAdd}
      >
        {checking && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {t(pending ? "checkPasskeySession" : "addAPasskey")}
      </Button>
      <div role="status" className="text-[13px] leading-5 text-neutral-300 [&:empty]:sr-only">
        {pending ? t("passkeyRegistrationUnconfirmed") :
          snapshot.noticeCode === "passkey-added" ? t("notices.passkey-added") :
          snapshot.failure === "passkey-cancelled" ? t("passkeyRegistrationInterrupted") : null}
      </div>
    </div>
  );
}

function AccountEntryAlternatives(props: Pick<MemberAccountViewProps, "snapshot" | "onPasskey" | "onSocial"> & {
  locked: boolean;
  passkeyAvailable: boolean;
  providers: MemberSocialProvider[];
  /** Sign-up's stack sits right under the heading, whose own margin spaces it. */
  underHeading: boolean;
}) {
  const t = useTranslations("MemberAuth");
  const expanded = props.providers.length + (props.passkeyAvailable ? 1 : 0) > 0;
  return (
    <motion.div
      data-account-alternatives-shell=""
      data-expanded={expanded}
      initial={false}
      animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
      transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
      className="overflow-hidden"
      inert={!expanded}
      aria-hidden={!expanded}
    >
      <div
        data-account-entry-alternatives=""
        className={cn("grid items-stretch gap-2", props.underHeading ? "pt-0" : "pt-[var(--account-action-gap)]")}
      >
        {props.passkeyAvailable && (
          <AccountButton
            className="min-h-12 min-w-0 w-full gap-2 border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-neutral-300 focus-visible:-outline-offset-2 aria-busy:opacity-80"
            type="button"
            aria-label={t("signInWithAPasskey")}
            disabled={props.locked}
            aria-busy={props.snapshot.pendingAction === "passkey" && props.snapshot.busy}
            onClick={props.onPasskey}
          >
            {props.snapshot.busy && props.snapshot.pendingAction === "passkey" ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} />
            ) : <KeyRound aria-hidden="true" className="size-4" strokeWidth={1.5} />}
            {t("passkey")}
          </AccountButton>
        )}
        {props.providers.map((provider) => (
          <ProviderButton
            key={provider}
            provider={provider}
            disabled={props.locked}
            busy={props.snapshot.pendingAction === provider && props.snapshot.busy}
            onClick={() => props.onSocial(provider)}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Each provider's own button, per its guideline (read 2026-11-16; sources in
 * docs/design/provider-marks/SOURCES.md). Apple: white on a dark surface, Apple's
 * logo file as tall as the button, title at 43% of the button height. Google: the
 * dark theme with the full-colour "G", scaled from the 40 px spec. Kakao: #FEE500
 * with its symbol, a 12 px radius and Kakao's own label. Everything else stays monochrome.
 */
function ProviderButton({ provider, disabled, busy, onClick }: {
  provider: MemberSocialProvider;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("MemberAuth");
  const label = provider === "apple" ? t("continueWithApple") : provider === "google" ? t("continueWithGoogle") : t("loginWithKakao");
  return (
    <AccountButton
      data-social-provider={provider}
      type="button"
      aria-label={label}
      disabled={disabled}
      aria-busy={busy}
      onClick={onClick}
      className={cn(
        "relative h-12 min-h-12 min-w-0 w-full gap-0 rounded-xl px-4 py-0 whitespace-nowrap focus-visible:outline-offset-2 aria-busy:opacity-80",
        provider === "apple" && "border-white bg-white text-[20.6px] leading-none font-medium text-black hover:bg-white",
        provider === "google" && "gap-3 border-[#8E918F] bg-[#131314] text-[16.8px] leading-6 font-medium text-[#E3E3E3] hover:bg-[#131314]",
        provider === "kakao" && "gap-2 rounded-[12px] border-[#FEE500] bg-[#FEE500] text-[15px] leading-5 text-black/85 hover:bg-[#FEE500]"
      )}
    >
      {provider === "apple" && <Image src="/auth-providers/apple-logo.svg" alt="" aria-hidden="true" width={34} height={48} unoptimized className="h-12 w-auto shrink-0" />}
      {provider === "google" && <Image src="/auth-providers/google-g.svg" alt="" aria-hidden="true" width={24} height={24} unoptimized className="size-6 shrink-0" />}
      {provider === "kakao" && <Image src="/auth-providers/kakao-symbol.svg" alt="" aria-hidden="true" width={15} height={15} unoptimized className="size-[14.6px] shrink-0" />}
      <span>{label}</span>
      {busy && <LoaderCircle aria-hidden="true" className="absolute right-4 size-4 animate-spin" strokeWidth={1.5} />}
    </AccountButton>
  );
}

function IdentityStep(props: MemberAccountViewProps & { locked: boolean; reserveFeedback: boolean; feedbackAction?: ReactNode }) {
  const t = useTranslations("MemberAuth");
  const { locked } = props;
  // Binding failures remain in the controller; the explicit reauth form starts without repeating them.
  const snapshot = props.reauthenticating && (props.snapshot.failure === "fresh-auth-required" || props.snapshot.failure === "unauthenticated")
    ? { ...props.snapshot, failure: null, error: null }
    : props.snapshot;
  const presentation = useContext(VerificationPresentation);
  const capabilities = snapshot.status?.capabilities ?? props.initialCapabilities;
  const providers = enabledProviders(capabilities);
  // Sign-up is social only; log in looks an email up before any code is offered.
  const socialSignup = props.presentation !== "ticket-checkout" && props.flow === "signup" && !props.reauthenticating;
  const lookup = props.presentation !== "ticket-checkout" && !socialSignup && !props.reauthenticating && !snapshot.codeRequested;
  const entry = lookup && normalizeLoginEmail(props.email)?.toLowerCase() === props.emailEntry?.email ? props.emailEntry : undefined;
  const lookupFailed = entry?.state === "error";
  const lookupBlocked = Boolean(entry?.retryAt && entry.retryAt > Date.now());
  const [settledFeedback, setSettledFeedback] = useState({ failure: snapshot.failure, error: snapshot.error });
  if (!props.refreshingStatus && (settledFeedback.failure !== snapshot.failure || settledFeedback.error !== snapshot.error))
    setSettledFeedback({ failure: snapshot.failure, error: snapshot.error });
  const visibleFailure = props.refreshingStatus ? settledFeedback.failure : snapshot.failure;
  const visibleError = props.refreshingStatus ? settledFeedback.error : snapshot.error;
  // Sign-up says what is unavailable in its own words; specific causes keep theirs.
  const signupUnavailable = socialSignup && visibleFailure === "unavailable";
  return (
    <div data-account-identity="" data-authentication-presentation={presentation ?? undefined} className="flex flex-col [--account-action-gap:20px] data-[authentication-presentation=modal]:[@media(max-height:600px)]:[--account-action-gap:12px]">
      {props.presentation === "ticket-checkout" && !snapshot.codeRequested ? (
        <TicketEmailEntry {...props} visibleError={visibleError} visibleFailure={visibleFailure} />
      ) : <AccountPhaseViews
        phase={snapshot.codeRequested ? "email-code" : "entry"}
        flow={props.presentation === "ticket-checkout" ? "login" : props.flow ?? "login"}
        locale="en"
        headingId={props.headingId ?? "member-account-heading"}
        renderHeading={(heading) => (
          props.reauthenticating ? <div className="sr-only">{heading}</div> : props.presentation === "ticket-checkout" && !snapshot.codeRequested
            ? <Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="m-0 text-[24px] leading-[30px] font-medium tracking-[-0.025em]">{t("enterYourEmail")}</Heading>
            : <VerificationTrayTitle>{heading}</VerificationTrayTitle>
        )}
        email={props.email}
        code={props.otp}
        phone=""
        recipient=""
        message=""
        remaining="0:00"
        checked={false}
        copied={false}
        copyFailed={false}
        visible={props.visible ?? true}
        busy={snapshot.busy}
        showBusyFeedback={Boolean(snapshot.status) && !props.refreshingStatus}
        pendingAction={snapshot.pendingAction}
        invalid={
          props.invalidEmail
            ? "email"
            : snapshot.failure === "invalid-code"
              ? "code"
              : null
        }
        failure={props.invalidEmail || signupUnavailable ? null : visibleFailure}
        reserveFeedback={props.reserveFeedback}
        feedbackAction={props.feedbackAction}
        feedbackPending={props.refreshingStatus}
        feedbackMessage={
          signupUnavailable ? t("signUpIsUnavailableTryAgainShortly")
          : entry?.state === "new" ? props.noAccountMessage ?? <NoAccountMessage capabilities={capabilities} />
          : lookupFailed ? lookupBlocked ? t("tooManyAttemptsWaitBeforeTryingAgain") : t("weCouldntCheckThisEmailTryAgain")
          : props.reserveFeedback
            ? visibleError && !visibleFailure
              ? visibleError
              : snapshot.status && !capabilities?.emailOtp && !visibleError
                ? t("emailSignInIsUnavailableTryAgainShortly")
                : undefined
            : undefined
        }
        codeRecovery={snapshot.codeRecovery}
        verificationRemaining={props.verificationRemaining}
        resendRemaining={props.resendRemaining ?? 0}
        googleDisabled
        emailForm={!socialSignup}
        submitHidden={entry?.state === "new"}
        submitLabel={entry?.state === "existing" ? t("sendSignInCode") : undefined}
        resendDisabled={!capabilities?.emailOtp}
        submitDisabled={
          locked ||
          !capabilities?.emailOtp ||
          entry?.state === "pending" || entry?.state === "new" || lookupBlocked ||
          (!snapshot.codeRequested && (props.resendRemaining ?? 0) > 0) ||
          (snapshot.codeRequested &&
            (Boolean(snapshot.codeRecovery) ||
              (props.verificationRemaining ?? 0) > 0))
        }
        onField={(field, value) => {
          if (field === "email") props.onEmail(value);
          if (field === "code") props.onOtp(value);
        }}
        onCodeComplete={(value) => { if (!locked) props.onVerify(value); }}
        onAction={(action) => {
          if (locked) return;
          if (action === "submit") {
            if (snapshot.codeRequested) props.onVerify();
            // Continue looks the email up; only a registered email gets a separate Send press.
            else if (lookup && entry?.state !== "existing") { if (entry?.state !== "new" && entry?.state !== "pending") props.onLookupRetry?.(); }
            else props.onCode();
          }
          if (action === "retry") props.onCode();
        }}
        onEditEmail={props.onEditEmail}
      />}
      {socialSignup && snapshot.status && providers.length === 0 && (
        <p role="status" className="mt-[var(--account-action-gap)] min-h-10 text-center text-[13px] leading-5 text-neutral-400">{t("signUpIsUnavailableTryAgainShortly")}</p>
      )}
      {!snapshot.codeRequested && ((props.flow !== "signup" && capabilities?.passkey) || providers.length > 0) && (
        <AccountEntryAlternatives
          snapshot={snapshot}
          locked={locked}
          passkeyAvailable={Boolean(props.flow !== "signup" && capabilities?.passkey)}
          providers={providers}
          underHeading={socialSignup}
          onPasskey={props.onPasskey}
          onSocial={props.onSocial}
        />
      )}
      {snapshot.codeRequested && capabilities?.magicLink && (
        <AccountTextButton
          className="mx-auto mt-[var(--account-action-gap)] flex min-h-11 gap-2 px-3 aria-busy:opacity-80"
          type="button"
          disabled={locked || !props.email.trim() || (props.resendRemaining ?? 0) > 0}
          aria-busy={snapshot.busy && snapshot.pendingAction === "magic-link"}
          onClick={props.onLink}
        >
          {snapshot.busy && snapshot.pendingAction === "magic-link" && (
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
          )}
          {t("emailASignInLinkInstead")}
        </AccountTextButton>
      )}
      {!props.reauthenticating && (props.presentation === "ticket-checkout" || props.flow !== "signup") && props.onRecover && (
        <AccountTextButton
          className="mx-auto mt-[var(--account-action-gap)] flex min-h-11 px-3"
          type="button"
          disabled={snapshot.busy}
          onClick={props.onRecover}
        >
          {t("cantSignIn")}
        </AccountTextButton>
      )}
    </div>
  );
}
