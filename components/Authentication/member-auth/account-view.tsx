"use client";

import { useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { Check, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { VerificationPresentation, VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./_shared/session";
import type { MemberCapabilities } from "../../../lib/member-auth/contracts";
import { AccountPhaseViews } from "@/components/Authentication/account-phase-views";

import {
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton
} from "./account-controls";

export type MemberAccountViewProps = {
  initialCapabilities?: Readonly<MemberCapabilities>;
  headingId?: string;
  flow?: "login" | "signup";
  registrationRequested?: boolean;
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
  const capabilities = status?.capabilities ?? props.initialCapabilities;
  const locked = snapshot.busy || !status;
  const sharedEmail = !status?.authenticated;
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
    pendingSetup &&
    (props.flow === "signup" || props.registrationRequested === true);
  const phase = status?.member
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
  return (
    <Panel data-authentication-presentation={presentation ?? undefined} className={cn("!px-6 !pb-6 [font-family:system-ui] data-[authentication-presentation=modal]:[@media(max-height:600px)]:pt-4! data-[authentication-presentation=modal]:[@media(max-height:600px)]:pb-4!", mobileTray ? "!pt-0" : "!pt-6")} data-member-account-flow="">
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
          {!status?.authenticated ? (
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
      {(!sharedEmail || (!snapshot.failure && !needsStatusRetry)) && (notice || snapshot.error || (!status && !sharedEmail) || (props.refreshingStatus && !sharedEmail)) && (
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
      {!sharedEmail && statusRetry && <div className="mt-3">{statusRetry}</div>}
      </motion.div>
    </Panel>
  );
}

function IdentityStep(props: MemberAccountViewProps & { locked: boolean; reserveFeedback: boolean; feedbackAction?: ReactNode }) {
  const { snapshot, locked } = props;
  const presentation = useContext(VerificationPresentation);
  const capabilities = snapshot.status?.capabilities ?? props.initialCapabilities;
  const [settledFeedback, setSettledFeedback] = useState({ failure: snapshot.failure, error: snapshot.error });
  if (!props.refreshingStatus && (settledFeedback.failure !== snapshot.failure || settledFeedback.error !== snapshot.error))
    setSettledFeedback({ failure: snapshot.failure, error: snapshot.error });
  const visibleFailure = props.refreshingStatus ? settledFeedback.failure : snapshot.failure;
  const visibleError = props.refreshingStatus ? settledFeedback.error : snapshot.error;
  return (
    <div data-account-identity="" data-authentication-presentation={presentation ?? undefined} className="space-y-5 data-[authentication-presentation=modal]:[@media(max-height:600px)]:space-y-3">
      <AccountPhaseViews
        phase={snapshot.codeRequested ? "email-code" : "entry"}
        flow={props.flow ?? "login"}
        locale="en"
        headingId={props.headingId ?? "member-account-heading"}
        renderHeading={(heading) => (
          <VerificationTrayTitle>{heading}</VerificationTrayTitle>
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
      />
      {!snapshot.codeRequested &&
        ((props.flow !== "signup" && capabilities?.passkey) || capabilities?.google) && (
          <div data-account-entry-alternatives="" className="flex gap-2">
            {props.flow !== "signup" && capabilities?.passkey && (
              <AccountButton
                className="min-h-11 w-auto flex-1 gap-2 border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-neutral-300 aria-busy:opacity-80"
                type="button"
                aria-label="Sign in with a passkey"
                disabled={locked}
                aria-busy={snapshot.pendingAction === "passkey" && snapshot.busy}
                onClick={props.onPasskey}
              >
                {snapshot.busy && snapshot.pendingAction === "passkey" ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <KeyRound aria-hidden="true" className="size-4" strokeWidth={1.5} />
                )}
                Passkey
              </AccountButton>
            )}
            {capabilities?.google && (
              <AccountButton
                className="min-h-11 w-auto flex-1 gap-2 border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-neutral-300 aria-busy:opacity-80"
                type="button"
                aria-label="Continue with Google"
                disabled={locked}
                aria-busy={snapshot.pendingAction === "google" && snapshot.busy}
                onClick={props.onGoogle}
              >
                {snapshot.busy && snapshot.pendingAction === "google" && (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.5} />
                )}
                Google
              </AccountButton>
            )}
          </div>
        )}
      {snapshot.codeRequested && capabilities?.magicLink && (
        <AccountTextButton
          className="mx-auto flex min-h-11 gap-2 px-3 aria-busy:opacity-80"
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
      {props.flow !== "signup" && props.onRecover && (
        <AccountTextButton
          className="mx-auto flex min-h-11 px-3"
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
