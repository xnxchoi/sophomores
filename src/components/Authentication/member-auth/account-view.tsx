"use client";

import { useLocale, useTranslations } from "next-intl";

import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Check, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { UserIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion, type Transition } from "motion/react";
import Image from "next/image";
import { cn } from "../../../lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { VerificationPresentation, VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./_shared/session";
import type { MemberCapabilities, MemberSocialProvider } from "../../../lib/member-auth/contracts";
import { AccountPhaseViews } from "@/components/Authentication/account-phase-views";
import { normalizeLoginEmail } from "@/lib/passwordless-login";
import { motionTokens } from "@/lib/motion-tokens";
import { DrawnField } from "@/components/ui/input";
import { Button } from "@/components/core/ArcFocus/ArcFocus";

import {
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
  const statusRetry = needsStatusRetry ? props.presentation === "ticket-checkout" ? (
    <RetryAction
      data-account-status-retry=""
      data-account-status-refresh=""
      aria-label={t("refreshAccountStatus")}
      pending={props.refreshingStatus === true}
      disabled={snapshot.busy || props.refreshingStatus || (!status && snapshot.failure === "rate-limited" && Math.max(props.verificationRemaining ?? 0, props.resendRemaining ?? 0) > 0)}
      onClick={props.onRefresh}
      pendingLabel={t("checkingSignInOptions")}
    >
      {t("retry")}
    </RetryAction>
  ) : (
    <>
      <AccountButton
        className={cn("gap-2 border-border bg-transparent text-[13px] text-muted-foreground", sharedEmail ? mobileTray ? "size-12 min-h-0 shrink-0 p-0" : "size-11 min-h-0 shrink-0 p-0" : "min-h-12 w-auto px-4 py-3", !sharedEmail && mobileTray && "mx-auto flex")}
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
    return <Panel ref={capturePanel} data-member-account-check="" className="px-0! pt-0! pb-0!">
      {/* One row: what happened, and the refresh beside it. */}
      <div className="flex min-h-11 flex-wrap items-center gap-x-4">
        {snapshot.busy ? <p role="status" className="m-0 flex items-center gap-2 text-sm leading-6 text-muted-foreground"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" />  {t("checkingYourAccount")}</p> : snapshot.error && <p role="alert" className="m-0 text-sm leading-6 text-foreground">{error}</p>}
        {statusRetry}
      </div>
    </Panel>;
  }
  return (
    <Panel ref={capturePanel} data-authentication-presentation={presentation ?? undefined} className={cn(props.presentation === "ticket-checkout" ? "!px-0 !pt-0 !pb-0" : "!px-6 !pb-6 [font-family:system-ui] data-[authentication-presentation=modal]:[@media(max-height:600px)]:pt-4! data-[authentication-presentation=modal]:[@media(max-height:600px)]:pb-4!", props.presentation !== "ticket-checkout" && (mobileTray ? "!pt-0" : "!pt-6"))} data-member-account-flow="">
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
            className={cn("!text-[24px] !leading-[30px] !font-medium", mobileTray || props.presentation === "ticket-checkout" ? "!mt-0" : "pl-14", pendingSetup && !embeddedPhone && "mt-0! mb-2!", status?.member && "!mt-0 !mb-4 flex items-center gap-2.5", embeddedPhone && "sr-only")}
          >
            {status?.member && <Check aria-hidden="true" data-account-confirmed="" className="size-5 shrink-0 text-foreground" strokeWidth={1.5} />}
            {heading}
          </Heading>
        </VerificationTrayTitle>
      )}
        <div className={cn(!sharedEmail && (status?.member ? "space-y-4" : "space-y-5"), !mobileTray && props.presentation !== "ticket-checkout" && "[&>p:first-child]:pl-14")}>
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
                <p className="w-full text-center text-sm leading-6 text-muted-foreground">{t("continueRegistrationAfterSigningIn")}</p>
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
              <p role={bindingConfirmed ? "status" : undefined} className="text-sm leading-5 text-muted-foreground">
                {t("emailAndPhoneConfirmed")}
              </p>
              {props.completionAction}
              {passkeyAction}
              <p className="text-sm leading-6 text-muted-foreground">
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
                  <p className="text-sm leading-6 text-muted-foreground">
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
              <p className="text-sm leading-6 text-muted-foreground">
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
            <p role="status" className="text-muted-foreground">
              {notice}
            </p>
          )}
          {(snapshot.error || props.refreshingStatus) && (
            <p
              role={props.refreshingStatus ? undefined : "alert"}
              className={cn("text-foreground", needsStatusRetry ? "min-h-10" : "rounded-xl border border-border px-4 py-3")}
            >
              {!props.refreshingStatus && error}
            </p>
          )}
          {!status && !sharedEmail && !snapshot.error && (
            <p role="status" className="flex items-center gap-2 text-muted-foreground">
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

const GREETINGS = 4;
// One motion for an account found: heading, field and row move on springs tuned together (no fixed durations).
const headingMotion: Transition = { type: "spring", visualDuration: 0.5, bounce: 0, filter: { type: "spring", visualDuration: 0.35, bounce: 0 } };
const rowMotion: Transition = { type: "spring", visualDuration: 0.55, bounce: 0 };
const fadeMotion: Transition = { type: "spring", visualDuration: 0.4, bounce: 0 };

function TicketEmailEntry(props: MemberAccountViewProps & { locked: boolean; visibleError: string | null; visibleFailure: MemberSnapshot["failure"]; feedbackAction?: ReactNode }) {
  const t = useTranslations("MemberAuth");
  const { snapshot, locked } = props;
  const emailInput = useRef<HTMLInputElement | null>(null);
  const capabilities = snapshot.status?.capabilities ?? props.initialCapabilities;
  const fieldId = (props.headingId ?? "member-account-heading") + "-email";
  const lookupFailed = props.emailEntry?.state === "error";
  const lookupBlocked = Boolean(props.emailEntry?.retryAt && props.emailEntry.retryAt > Date.now());
  const pending = props.emailEntry?.state === "pending";
  const classified = props.emailEntry?.state === "existing" || props.emailEntry?.state === "new";
  const noAccount = props.emailEntry?.state === "new";
  // Account found (owner, 23 Nov): the heading greets, and the field becomes an account row. Only what the visitor
  // typed is shown (the lookup returns no profile data). The greeting is drawn once per email: a per-visit seed
  // plus the address, so it stays put through re-renders and comes back to 'Sign in' when the email changes.
  const typed = normalizeLoginEmail(props.email)?.toLowerCase();
  const classifiedExisting = props.emailEntry?.state === "existing" && Boolean(typed) && typed === props.emailEntry.email;
  // Back from the code step ("Change email"), the address is there to edit: the row and greeting belong to a lookup
  // made on this visit, not to one carried in from before.
  const [carriedIn] = useState(() => classifiedExisting ? typed : undefined);
  const found = classifiedExisting && typed !== carriedIn;
  const [seed] = useState(() => Math.floor(Math.random() * GREETINGS));
  const greeting = found && typed ? ([...typed].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, seed) % GREETINGS) + 1 : 0;
  const heading = greeting ? t(`accountGreeting.${greeting}` as "accountGreeting.1") : t("signIn");
  const refocus = useRef(false);
  const submitButton = useRef<HTMLButtonElement | null>(null);
  // An account found swaps the field for the row, which removes the focused input. Focus moves to the primary button
  // ("Send sign-in code"), so Enter keeps doing what that button does (owner, 24 Nov: Enter must submit).
  useEffect(() => {
    if (found && emailInput.current && document.activeElement === emailInput.current) submitButton.current?.focus({ preventScroll: true });
  }, [found]);
  useEffect(() => {
    if (found || !refocus.current) return;
    refocus.current = false;
    emailInput.current?.focus({ preventScroll: true });
  }, [found]);
  const retryLookup = () => {
    emailInput.current?.focus({ preventScroll: true });
    props.onLookupRetry?.();
  };
  // One row under the line: a mistake in the field, or what failed with its refresh beside it.
  const invalid = Boolean(props.invalidEmail);
  const message = invalid ? t("enterAValidEmailAddress")
    : (props.resendRemaining ?? 0) > 0 ? t("retryAfterSeconds", { seconds: props.resendRemaining ?? 0 })
    : lookupFailed ? lookupBlocked ? t("tooManyAttemptsWaitBeforeTryingAgain") : t("couldntCheckThisEmail")
    : noAccount ? props.noAccountMessage ?? <NoAccountMessage capabilities={capabilities} />
    : props.visibleError && props.visibleFailure ? t(`failures.${props.visibleFailure}`) : props.visibleError;
  const action = lookupFailed && !lookupBlocked ? (
    <RetryAction aria-label={t("tryEmailAgain")} disabled={locked} onClick={retryLookup}>{t("retry")}</RetryAction>
  ) : props.feedbackAction;

  return (
    <div data-account-email-entry="" className="flex flex-col">
      <Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="m-0 mb-6 text-[length:var(--step-heading)] leading-tight font-normal tracking-normal sm:text-[length:var(--step-heading)]">
        {/* 'Sign in' in every state but one: an account found swaps in a greeting, in the same motion as the row. The
            slot is one line high, so nothing below moves. */}
        <span className="grid h-[1.25em] overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={heading} className="col-start-1 row-start-1 whitespace-nowrap" initial={{ opacity: 0, y: "0.6em", filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: "-0.6em", filter: "blur(4px)" }} transition={headingMotion}>
              {heading}
            </motion.span>
          </AnimatePresence>
        </span>
      </Heading>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (locked || !capabilities?.emailOtp || pending || lookupFailed || noAccount) return;
        if (!classified) retryLookup();
        else if ((props.resendRemaining ?? 0) === 0) props.onCode();
      }} noValidate className="flex flex-col">
        {/* The Hideaway's underlined field (owner, 23 Nov: "the underlined one we have - one that fills the line on entry or
            click"): the line draws on focus and stays drawn while there is a value. Steady: one height in every state. */}
        <div data-ticket-email-field="" className="relative h-[68px]">
          <AnimatePresence initial={false}>
            {found ? (
              // The field becomes the account row: the label fades, an avatar circle grows in from the left, the typed email
              // slides across to make room, and the drawn line stays where it was.
              <motion.div key="row" data-account-row="" className="absolute inset-0 flex items-end gap-3 border-b border-foreground pb-[11.5px] pointer-coarse:pb-[13.5px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fadeMotion}>
                <motion.span aria-hidden="true" className="mb-[-4px] grid size-8 shrink-0 place-items-center rounded-full bg-muted text-foreground" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.4 }} transition={rowMotion}>
                  {/* A generic person, the header account button's icon (owner, tentative: "the avatar icon with the circle.. maybe?"). */}
                  <UserIcon className="size-4" />
                </motion.span>
                <motion.span className="min-w-0 flex-1 truncate text-[length:var(--step-input)] leading-6 text-foreground" initial={{ x: -44 }} animate={{ x: 0 }} exit={{ x: -44 }} transition={rowMotion}>
                  {props.email.trim()}
                </motion.span>
                <button type="button" disabled={locked} onClick={() => { refocus.current = true; props.onEmail(""); }} className="group/focus inline-flex min-h-11 shrink-0 items-center text-[length:var(--step-body)] leading-6 text-muted-foreground underline decoration-border underline-offset-4 transition-colors duration-200 hover:text-foreground disabled:opacity-40 -mb-[10px]">
                  <FocusShape className="group-focus-visible/focus:outline-current">{t("notYou")}</FocusShape>
                </button>
              </motion.div>
            ) : (
              <motion.div key="field" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fadeMotion}>
                <DrawnField steady ref={emailInput} label={t("emailAddress")} id={fieldId} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={props.email} disabled={snapshot.busy} aria-invalid={props.invalidEmail} aria-describedby={fieldId + "-feedback"} onChange={(event) => props.onEmail(event.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div id={fieldId + "-feedback"} data-ticket-email-feedback="" className="mt-1 flex h-11 items-center gap-x-4 text-[length:var(--step-body)] leading-5" aria-live="polite" aria-atomic="true">
          {/* A fixed slot: messages swap in place (up to two lines), so nothing below moves. */}
          {message ? <p role={invalid || lookupFailed || props.visibleError ? "alert" : "status"} className="m-0 line-clamp-2 min-w-0 text-muted-foreground">{message}</p> : pending ? <span className="sr-only">{t("checkingEmail")}</span> : null}
          {action}
        </div>
        {/* An email with no account cannot receive a sign-in code. */}
        {!noAccount && <Button ref={submitButton} type="submit" variant="primary" size="lg" className="w-full" loading={pending || (snapshot.busy && snapshot.pendingAction === "send-code")} disabled={locked || !capabilities?.emailOtp || lookupFailed || (classified && (props.resendRemaining ?? 0) > 0)}>
          {props.emailEntry?.state === "existing" ? t("sendSignInCode") : t("continue")}
        </Button>}
      </form>
    </div>
  );
}

/** Retry in place: a plain refresh, no box (owner, 22 Nov: error and retry are inline text plus a plain refresh action). */
function RetryAction({ pending = false, pendingLabel, children, className, ...props }: ComponentProps<"button"> & { pending?: boolean; pendingLabel?: string }) {
  return (
    <>
      <button type="button" aria-busy={pending || undefined} className={cn("group/focus inline-flex min-h-11 shrink-0 items-center text-sm text-foreground transition-opacity duration-200 hover:opacity-70 disabled:opacity-40", className)} {...props}>
        <FocusShape className="inline-flex items-center gap-1.5 group-focus-visible/focus:outline-current">
          {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} /> : <RefreshCw aria-hidden="true" className="size-4" strokeWidth={1.5} />}
          {children}
        </FocusShape>
      </button>
      {pendingLabel && <span role="status" className="sr-only">{pending ? pendingLabel : null}</span>}
    </>
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
      <div role="status" className="text-[13px] leading-5 text-muted-foreground [&:empty]:sr-only">
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
  /**
   * Once an email is in the field, the other ways in step back into one row of icon-only buttons (owner, 24 Nov:
   * "make the passkey and others compact-1 row of 3 smaller buttons, each with icons only ... animated"). Clearing the
   * field brings the labelled stack back.
   */
  compact: boolean;
}) {
  const t = useTranslations("MemberAuth");
  const expanded = props.providers.length + (props.passkeyAvailable ? 1 : 0) > 0;
  // One coherent motion: the stack's buttons travel and resize into the row (Motion layout) while the block's real
  // height eases to the row's on the same curve, so the space below closes with them and nothing is left empty.
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const node = content.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () => setHeight(node.offsetHeight || null);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const morph = { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth };
  return (
    <motion.div
      data-account-alternatives-shell=""
      data-expanded={expanded}
      initial={false}
      animate={{ height: expanded ? height ?? "auto" : 0, opacity: expanded ? 1 : 0 }}
      transition={morph}
      // The clip keeps the morph tidy; -m-1 with p-1 inside leaves 4px for the keyboard focus ring (2px outline and
      // 2px offset) on every side without moving anything.
      className="-m-1 overflow-hidden"
      inert={!expanded}
      aria-hidden={!expanded}
    >
      <div
        ref={content}
        data-account-entry-alternatives=""
        data-compact={props.compact}
        className={cn(
          "p-1",
          props.compact ? "flex flex-wrap items-center justify-center gap-3" : "grid items-stretch gap-2",
          props.underHeading ? "pt-1" : "pt-[calc(var(--account-action-gap)+0.25rem)]"
        )}
      >
        {props.passkeyAvailable && (
          <motion.div layout transition={morph} className={cn("rounded-[14px]", props.compact ? "size-12" : "w-full")}>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className={cn(props.compact ? "size-full px-0!" : "w-full")}
              aria-label={t("signInWithAPasskey")}
              disabled={props.locked}
              loading={props.snapshot.pendingAction === "passkey" && props.snapshot.busy}
              onClick={props.onPasskey}
            >
              <motion.span layout transition={morph} className="inline-flex"><KeyRound aria-hidden="true" className="size-4" strokeWidth={1.5} /></motion.span>
              {!props.compact && t("passkey")}
            </Button>
          </motion.div>
        )}
        {props.providers.map((provider) => (
          <motion.div key={provider} layout transition={morph} className={cn("rounded-[14px]", props.compact ? "size-12" : "w-full")}>
            <ProviderButton
              provider={provider}
              compact={props.compact}
              disabled={props.locked}
              busy={props.snapshot.pendingAction === provider && props.snapshot.busy}
              onClick={() => props.onSocial(provider)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Apple and Google as Arc buttons, the same size and type as Continue (owner, 23 Nov: "Arc block, underlined field").
 * Each provider's colours come in as Arc tokens on a wrapper, per its guideline (read 2026-11-16; sources in
 * docs/design/provider-marks/SOURCES.md): Apple is its white button with a black outline on light pages and on
 * dark ones, black logo file inside; Google is its light theme on light pages and its dark theme on dark ones, with
 * the matching published "G". Kakao keeps its own #FEE500 button, symbol and label.
 */
function OrDivider() {
  const t = useTranslations("MemberAuth");
  return (
    <div aria-hidden="true" className="my-5 flex items-center gap-3 text-[length:var(--step-body)] leading-none text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
      {t("or")}
    </div>
  );
}

function ProviderButton({ provider, compact, disabled, busy, onClick }: {
  provider: MemberSocialProvider;
  /** Icon only, in the compact row; the label stays as the accessible name. */
  compact: boolean;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("MemberAuth");
  const label = provider === "apple" ? t("continueWithApple") : provider === "google" ? t("continueWithGoogle") : t("loginWithKakao");
  if (provider === "kakao")
    return (
      <AccountButton
        data-social-provider={provider}
        type="button"
        aria-label={label}
        disabled={disabled}
        aria-busy={busy}
        onClick={onClick}
        className={cn(
          "relative min-w-0 gap-2 rounded-[12px] border-[#FEE500] bg-[#FEE500] py-0 text-[15px] leading-5 whitespace-nowrap text-black/85 hover:bg-[#FEE500] focus-visible:outline-offset-2 aria-busy:opacity-80",
          compact ? "size-full min-h-0 px-0!" : "h-12 min-h-12 w-full px-4"
        )}
      >
        <Image src="/auth-providers/kakao-symbol.svg" alt="" aria-hidden="true" width={15} height={15} unoptimized className="size-[14.6px] shrink-0" />
        {!compact && <span>{label}</span>}
        {busy && !compact && <LoaderCircle aria-hidden="true" className="absolute right-4 size-4 animate-spin" strokeWidth={1.5} />}
      </AccountButton>
    );
  return (
    <div
      className={cn(
        "contents",
        provider === "apple" && "[--border:#000000] [--foreground:#000000] [--surface-muted:#FFFFFF] [--surface:#FFFFFF] dark:[--border:#FFFFFF]",
        provider === "google" && "[--border:#747775] [--foreground:#1F1F1F] [--surface-muted:#FFFFFF] [--surface:#FFFFFF] dark:[--border:#8E918F] dark:[--foreground:#E3E3E3] dark:[--surface-muted:#131314] dark:[--surface:#131314]"
      )}
    >
      <Button data-social-provider={provider} type="button" variant="secondary" size="lg" className={cn(compact ? "size-full px-0!" : "w-full")} aria-label={label} disabled={disabled} loading={busy} onClick={onClick}>
        {provider === "apple" && <Image src="/auth-providers/apple-logo.svg" alt="" aria-hidden="true" width={31} height={44} unoptimized className={cn("h-11 w-auto", !compact && "-my-2 -mr-1")} />}
        {provider === "google" && <>
          <Image src="/auth-providers/google-g-light.svg" alt="" aria-hidden="true" width={20} height={20} unoptimized className="size-5 dark:hidden" />
          <Image src="/auth-providers/google-g.svg" alt="" aria-hidden="true" width={20} height={20} unoptimized className="hidden size-5 dark:block" />
        </>}
        {!compact && label}
      </Button>
    </div>
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
  // Arc's Sign in block: the email form, "or", then the other ways in. Not once the email turns out to have no account.
  const orDivider = props.presentation === "ticket-checkout" && !snapshot.codeRequested && props.emailEntry?.state !== "new"
    && ((props.flow !== "signup" && Boolean(capabilities?.passkey)) || providers.length > 0);
  return (
    <div data-account-identity="" data-authentication-presentation={presentation ?? undefined} className={cn("flex flex-col [--account-action-gap:20px] data-[authentication-presentation=modal]:[@media(max-height:600px)]:[--account-action-gap:12px]", props.presentation === "ticket-checkout" && "[--step-body:0.875rem] [--step-heading:1.5rem] [--step-input:1rem]")}>
      {props.presentation === "ticket-checkout" && !snapshot.codeRequested ? (
        <TicketEmailEntry {...props} visibleError={visibleError} visibleFailure={visibleFailure} />
      ) : <AccountPhaseViews
        phase={snapshot.codeRequested ? "email-code" : "entry"}
        flow={props.presentation === "ticket-checkout" ? "login" : props.flow ?? "login"}
        locale="en"
        headingId={props.headingId ?? "member-account-heading"}
        renderHeading={(heading) => (
          props.reauthenticating ? <div className="sr-only">{heading}</div> : props.presentation === "ticket-checkout"
            // The code step keeps the step's one heading.
            ? <Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="m-0 text-[length:var(--step-heading)] leading-tight font-normal tracking-normal sm:text-[length:var(--step-heading)]">{t("signIn")}</Heading>
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
        <p role="status" className="mt-[var(--account-action-gap)] min-h-10 text-center text-[13px] leading-5 text-muted-foreground">{t("signUpIsUnavailableTryAgainShortly")}</p>
      )}
      {orDivider && <OrDivider />}
      {!snapshot.codeRequested && ((props.flow !== "signup" && capabilities?.passkey) || providers.length > 0) && (
        <AccountEntryAlternatives
          snapshot={snapshot}
          locked={locked}
          passkeyAvailable={Boolean(props.flow !== "signup" && capabilities?.passkey)}
          providers={providers}
          underHeading={socialSignup || orDivider}
          compact={!socialSignup && Boolean(props.email.trim())}
          onPasskey={props.onPasskey}
          onSocial={props.onSocial}
        />
      )}
      {snapshot.codeRequested && capabilities?.magicLink && (
        <AccountTextButton
          className={cn("mx-auto mt-[var(--account-action-gap)] flex min-h-11 gap-2 px-3 aria-busy:opacity-80", props.presentation === "ticket-checkout" && "mt-1 font-medium no-underline")}
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
          className={cn("mx-auto mt-[var(--account-action-gap)] flex min-h-11 px-3", props.presentation === "ticket-checkout" && "mt-1 font-medium no-underline")}
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
