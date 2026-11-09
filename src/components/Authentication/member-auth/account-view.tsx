"use client";

import { useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { VerificationPresentation, VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./_shared/session";
import type { MemberCapabilities } from "../../../lib/member-auth/contracts";
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
  onRecover?: () => void;
  onPasskey: () => void;
  onGoogle: () => void;
  onCode: () => void;
  onLink: () => void;
  onVerify: (value?: string) => void;
  onEditEmail: () => void;
  onIdentifier: () => void;
  onClearIdentifier: () => void;
  onAddPasskey: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
  onMode: (mode: "email" | "phone") => void;
  onEmail: (value: string) => void;
  onPhone: (value: string) => void;
  onOtp: (value: string) => void;
};

export function MemberAccountView(props: MemberAccountViewProps) {
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
  const notice = bindingConfirmed ? null : snapshot.notice;
  const needsStatusRetry = Boolean(
    props.refreshingStatus ||
    (snapshot.error &&
      (!snapshot.failure ||
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
    ? "Account ready"
    : status?.authenticated
      ? status.emailVerified
        ? embeddedPhone
          ? "Verify your phone to finish"
          : "Finish setting up your account"
        : "Email verification needed"
      : props.flow === "signup"
        ? "Sign up"
        : "Log in";
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
        aria-label="Refresh account status"
        aria-busy={props.refreshingStatus === true}
        disabled={snapshot.busy || props.refreshingStatus || (!status && snapshot.failure === "rate-limited" && Math.max(props.verificationRemaining ?? 0, props.resendRemaining ?? 0) > 0)}
        onClick={props.onRefresh}
      >
        <span data-account-refresh-icon="" aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
          <RefreshCw className={cn("size-4", props.refreshingStatus && "hidden")} strokeWidth={1.5} />
          <LoaderCircle className={cn("size-4 animate-spin", !props.refreshingStatus && "hidden")} strokeWidth={1.5} />
        </span>
        {!sharedEmail && "Refresh account status"}
      </AccountButton>
      <span role="status" className="sr-only">{props.refreshingStatus ? "Checking sign-in options…" : null}</span>
    </>
  ) : null;
  if (props.presentation === "ticket-checkout" && status?.member) {
    if (!snapshot.busy && !snapshot.error) return null;
    return <Panel ref={capturePanel} data-member-account-check="" className="px-0! pt-0! pb-0! [font-family:system-ui]">
      {snapshot.busy ? <p role="status" className="m-0 flex items-center gap-2 text-[14px] leading-6 text-neutral-300"><LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> Checking your account…</p> : snapshot.error && <p role="alert" className="m-0 text-[14px] leading-6 text-neutral-300">{snapshot.error}</p>}
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
                <AccountTextButton className="min-h-11 px-1 text-xs no-underline hover:underline [font-family:system-ui] [[data-member-account-flow]:has([data-member-phone-completion])_&]:hidden [[data-member-account-flow]:has([data-member-phone-recovery])_&]:hidden" type="button" disabled={locked} onClick={props.onSignOut}>Switch account</AccountTextButton>
              </div>
              {props.reauthenticating && <div data-member-registration-reauth="" className="space-y-4">
                <VerificationTrayTitle><Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="mt-0 mb-2 text-center text-[24px] leading-[30px] font-medium sm:text-[24px]">Sign in again</Heading></VerificationTrayTitle>
                <p className="w-full text-center text-sm leading-6 text-neutral-400">Continue registration after signing in.</p>
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
                Email and phone confirmed.
              </p>
              {props.completionAction}
              {props.completionAction ? (
                <AccountButton
                  type="button"
                  disabled={locked || !capabilities?.passkey}
                  onClick={props.onAddPasskey}
                >
                  Add a passkey
                </AccountButton>
              ) : (
                <AccountPrimaryButton
                  type="button"
                  disabled={locked || !capabilities?.passkey}
                  onClick={props.onAddPasskey}
                >
                  Add a passkey
                </AccountPrimaryButton>
              )}
              <p className="text-sm leading-6 text-neutral-400">
                Passkeys are optional. This local passkey won’t transfer to the
                hosted site.
              </p>
              <AccountButton
                type="button"
                disabled={locked}
                onClick={props.onSignOut}
              >
                Sign out
              </AccountButton>
            </>
          ) : status.emailVerified ? (
            <>
              {embeddedPhone ? (
                props.phoneStep
              ) : (
                <>
                  <p className="text-sm leading-6 text-neutral-400">
                    Verify your phone to finish.
                  </p>
                  <AccountPrimaryButton
                    type="button"
                    disabled={locked}
                    onClick={props.onContinueRegistration}
                  >
                    Continue registration
                  </AccountPrimaryButton>
                </>
              )}
              <AccountTextButton
                className={cn("min-h-11 px-1 text-xs no-underline hover:underline [font-family:system-ui]", !embeddedPhone && "w-full")}
                type="button"
                disabled={locked}
                onClick={props.onSignOut}
              >
                Switch account
              </AccountTextButton>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-neutral-400">
                Sign out and verify your email before continuing.
              </p>
              <AccountButton
                type="button"
                disabled={locked}
                onClick={props.onSignOut}
              >
                Sign out
              </AccountButton>
            </>
          )}
        </div>
      {!status && snapshot.busy && !props.refreshingStatus && (
        <span role="status" aria-live="polite" className="sr-only">Checking sign-in options…</span>
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
              {!props.refreshingStatus && snapshot.error}
            </p>
          )}
          {!status && !sharedEmail && !snapshot.error && (
            <p role="status" className="flex items-center gap-2 text-neutral-400">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              <span className="sr-only">Checking sign-in options…</span>
            </p>
          )}
        </div>
      )}
      {!embeddedPhone && !sharedEmail && statusRetry && <div className="mt-3">{statusRetry}</div>}
      </motion.div>
    </Panel>
  );
}

function TicketEmailEntry(props: MemberAccountViewProps & { locked: boolean; visibleError: string | null; feedbackAction?: ReactNode }) {
  const { snapshot, locked } = props;
  const emailInput = useRef<HTMLInputElement | null>(null);
  const capabilities = snapshot.status?.capabilities ?? props.initialCapabilities;
  const fieldId = (props.headingId ?? "member-account-heading") + "-email";
  const lookupFailed = props.emailEntry?.state === "error";
  const lookupBlocked = Boolean(props.emailEntry?.retryAt && props.emailEntry.retryAt > Date.now());
  const classified = props.emailEntry?.state === "existing" || props.emailEntry?.state === "new";
  const feedback = props.invalidEmail
    ? "Enter a valid email address."
    : (props.resendRemaining ?? 0) > 0
      ? `Try again in ${props.resendRemaining}s.`
      : lookupFailed
        ? lookupBlocked ? "Too many attempts. Wait before trying again." : "We couldn’t check this email. Try again."
        : props.visibleError;

  return (
    <div data-account-email-entry="" className="flex flex-col gap-6">
      <Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="m-0 text-[24px] leading-[30px] font-medium tracking-[-0.025em]">
        {props.emailEntry?.state === "existing" ? "Sign in" : props.emailEntry?.state === "new" ? "Create account" : "Enter your email"}
      </Heading>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (locked || !capabilities?.emailOtp || props.emailEntry?.state === "pending" || lookupFailed) return;
        if (!classified) {
          emailInput.current?.focus({ preventScroll: true });
          props.onLookupRetry?.();
        }
        else if ((props.resendRemaining ?? 0) === 0) props.onCode();
      }} noValidate>
        <div data-ticket-email-field="" className="grid gap-2">
          <label htmlFor={fieldId} className="sr-only">Email address</label>
          <div className="relative">
            <AccountInput ref={emailInput} className="mt-0! pr-12! tracking-normal!" id={fieldId} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={props.email} disabled={snapshot.busy} aria-invalid={props.invalidEmail} aria-describedby={fieldId + "-feedback"} onChange={(event) => props.onEmail(event.target.value)} />
            <div data-ticket-email-adornment="" className="absolute inset-y-0 right-1 flex w-11 items-center justify-center">
              {lookupFailed ? (
                <button type="button" aria-label="Try email again" disabled={locked || lookupBlocked} onClick={() => {
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
          {feedback ? <p role={props.invalidEmail || lookupFailed || props.visibleError ? "alert" : "status"} className="m-0">{feedback}</p> : props.emailEntry?.state === "pending" ? <span className="sr-only">Checking email…</span> : null}
        </div>
        <AccountPrimaryButton type="submit" className="mt-1 min-h-12 w-full" disabled={locked || !capabilities?.emailOtp || props.emailEntry?.state === "pending" || lookupFailed || (classified && (props.resendRemaining ?? 0) > 0)} aria-busy={props.emailEntry?.state === "pending" || (snapshot.busy && snapshot.pendingAction === "send-code")}>
          {props.emailEntry?.state === "existing" ? "Send sign-in code" : props.emailEntry?.state === "new" ? "Create account & send code" : "Continue"}
        </AccountPrimaryButton>
      </form>
    </div>
  );
}

function AccountEntryAlternatives(props: Pick<MemberAccountViewProps, "snapshot" | "onPasskey" | "onGoogle"> & {
  locked: boolean;
  passkeyAvailable: boolean;
  googleConfigured: boolean;
  googleAvailable: boolean;
}) {
  const expanded = props.passkeyAvailable || props.googleAvailable;
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
      <motion.div
        data-account-entry-alternatives=""
        initial={false}
        animate={{
          gridTemplateColumns: props.passkeyAvailable && props.googleConfigured
            ? props.googleAvailable ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 0fr)"
            : "minmax(0, 1fr)",
          // Motion runtime updates need explicit lengths, not only React's initial CSS serialization.
          columnGap: props.passkeyAvailable && props.googleAvailable ? "8px" : "0px",
        }}
        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
        className="grid items-stretch pt-[var(--account-action-gap)]"
      >
        {props.passkeyAvailable && (
          <AccountButton
            className="min-h-11 min-w-0 w-full gap-2 border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-neutral-300 focus-visible:-outline-offset-2 aria-busy:opacity-80"
            type="button"
            aria-label="Sign in with a passkey"
            disabled={props.locked}
            aria-busy={props.snapshot.pendingAction === "passkey" && props.snapshot.busy}
            onClick={props.onPasskey}
          >
            {props.snapshot.busy && props.snapshot.pendingAction === "passkey" ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} />
            ) : <KeyRound aria-hidden="true" className="size-4" strokeWidth={1.5} />}
            Passkey
          </AccountButton>
        )}
        {props.googleConfigured && (
          <motion.div
            initial={false}
            animate={{ opacity: props.passkeyAvailable && !props.googleAvailable ? 0 : 1 }}
            transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
            className="min-w-0 overflow-hidden"
            inert={!props.googleAvailable}
            aria-hidden={!props.googleAvailable}
          >
            <AccountButton
              className={cn("min-h-11 w-full gap-2 border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] whitespace-nowrap text-neutral-300 focus-visible:-outline-offset-2 aria-busy:opacity-80", !props.googleAvailable && "disabled:opacity-100")}
              type="button"
              aria-label="Continue with Google"
              disabled={props.locked || !props.googleAvailable}
              aria-busy={props.snapshot.pendingAction === "google" && props.snapshot.busy}
              onClick={props.onGoogle}
            >
              {props.snapshot.busy && props.snapshot.pendingAction === "google" && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} />}
              Google
            </AccountButton>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function IdentityStep(props: MemberAccountViewProps & { locked: boolean; reserveFeedback: boolean; feedbackAction?: ReactNode }) {
  const { locked } = props;
  // Binding failures remain in the controller; the explicit reauth form starts without repeating them.
  const snapshot = props.reauthenticating && (props.snapshot.failure === "fresh-auth-required" || props.snapshot.failure === "unauthenticated")
    ? { ...props.snapshot, failure: null, error: null }
    : props.snapshot;
  const presentation = useContext(VerificationPresentation);
  const capabilities = snapshot.status?.capabilities ?? props.initialCapabilities;
  const enteredEmail = normalizeLoginEmail(props.email);
  const googleAvailable = capabilities?.google && (!enteredEmail || /@(?:gmail|googlemail)\.com$/i.test(enteredEmail));
  const [settledFeedback, setSettledFeedback] = useState({ failure: snapshot.failure, error: snapshot.error });
  if (!props.refreshingStatus && (settledFeedback.failure !== snapshot.failure || settledFeedback.error !== snapshot.error))
    setSettledFeedback({ failure: snapshot.failure, error: snapshot.error });
  const visibleFailure = props.refreshingStatus ? settledFeedback.failure : snapshot.failure;
  const visibleError = props.refreshingStatus ? settledFeedback.error : snapshot.error;
  return (
    <div data-account-identity="" data-authentication-presentation={presentation ?? undefined} className="flex flex-col [--account-action-gap:20px] data-[authentication-presentation=modal]:[@media(max-height:600px)]:[--account-action-gap:12px]">
      {props.presentation === "ticket-checkout" && !snapshot.codeRequested ? (
        <TicketEmailEntry {...props} visibleError={visibleError} />
      ) : <AccountPhaseViews
        phase={snapshot.codeRequested ? "email-code" : "entry"}
        flow={props.presentation === "ticket-checkout" ? "login" : props.flow ?? "login"}
        locale="en"
        headingId={props.headingId ?? "member-account-heading"}
        renderHeading={(heading) => (
          props.reauthenticating ? <div className="sr-only">{heading}</div> : props.presentation === "ticket-checkout" && !snapshot.codeRequested
            ? <Heading id={props.headingId ?? "member-account-heading"} tabIndex={-1} className="m-0 text-[24px] leading-[30px] font-medium tracking-[-0.025em]">Enter your email</Heading>
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
        failure={props.invalidEmail ? null : visibleFailure}
        reserveFeedback={props.reserveFeedback}
        feedbackAction={props.feedbackAction}
        feedbackPending={props.refreshingStatus}
        feedbackMessage={
          props.reserveFeedback
            ? visibleError && !visibleFailure
              ? visibleError
              : snapshot.status && !capabilities?.emailOtp && !visibleError
                ? "Email sign-in is unavailable. Try again shortly."
                : undefined
            : undefined
        }
        codeRecovery={snapshot.codeRecovery}
        verificationRemaining={props.verificationRemaining}
        resendRemaining={props.resendRemaining ?? 0}
        googleDisabled
        resendDisabled={!capabilities?.emailOtp}
        submitDisabled={
          locked ||
          !capabilities?.emailOtp ||
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
            else props.onCode();
          }
          if (action === "retry") props.onCode();
          if (action === "google") props.onGoogle();
        }}
        onEditEmail={props.onEditEmail}
      />}
      {!snapshot.codeRequested && ((props.flow !== "signup" && capabilities?.passkey) || capabilities?.google) && (
        <AccountEntryAlternatives
          snapshot={snapshot}
          locked={locked}
          passkeyAvailable={Boolean(props.flow !== "signup" && capabilities?.passkey)}
          googleConfigured={Boolean(capabilities?.google)}
          googleAvailable={Boolean(googleAvailable)}
          onPasskey={props.onPasskey}
          onGoogle={props.onGoogle}
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
          Email a sign-in link instead
        </AccountTextButton>
      )}
      {!props.reauthenticating && (props.presentation === "ticket-checkout" || props.flow !== "signup") && props.onRecover && (
        <AccountTextButton
          className="mx-auto mt-[var(--account-action-gap)] flex min-h-11 px-3"
          type="button"
          disabled={snapshot.busy}
          onClick={props.onRecover}
        >
          Can’t sign in?
        </AccountTextButton>
      )}
    </div>
  );
}
