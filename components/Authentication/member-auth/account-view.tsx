"use client";

import type { ReactNode } from "react";
import { Check, KeyRound, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./_shared/session";
import { AccountPhaseViews } from "@/components/Authentication/account-phase-views";

import {
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton
} from "./account-controls";

export type MemberAccountViewProps = {
  headingId?: string;
  flow?: "login" | "signup";
  registrationRequested?: boolean;
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
  const { snapshot } = props;
  const status = snapshot.status;
  const capabilities = status?.capabilities;
  const locked = snapshot.busy || !status;
  const sharedEmail = !status?.authenticated;
  const bindingConfirmed = Boolean(
    status?.member &&
    snapshot.notice === "Email and phone binding confirmed for this local account."
  );
  const notice = bindingConfirmed ? null : snapshot.notice;
  const needsStatusRetry = Boolean(
    (snapshot.error &&
      (!snapshot.failure ||
        snapshot.failure === "network" ||
        snapshot.failure === "timeout" ||
        snapshot.failure === "unavailable")) ||
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
  return (
    <Panel className="!px-6 !pt-6 !pb-6 [font-family:system-ui]" data-member-account-flow="">
      {!sharedEmail && (
        <VerificationTrayTitle>
          <Heading
            id={props.headingId ?? "member-account-heading"}
            tabIndex={-1}
            className={cn("pr-14 !text-[24px] !leading-[30px] !font-medium", status?.member && "!mt-0 !mb-4 flex items-center gap-2.5", embeddedPhone && "sr-only")}
          >
            {status?.member && <Check aria-hidden="true" data-account-confirmed="" className="size-5 shrink-0 text-neutral-200" strokeWidth={1.5} />}
            {heading}
          </Heading>
        </VerificationTrayTitle>
      )}
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={cn(status?.member ? "space-y-4" : "space-y-5")}
        >
          {!status?.authenticated ? (
            <IdentityStep
              {...props}
              locked={locked}
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
                    You’re signed in, but registration isn’t finished. Continue
                    to verify your phone and complete your account.
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
                className="min-h-11 px-1 text-xs no-underline hover:underline [font-family:system-ui]"
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
        </motion.div>
      </AnimatePresence>
      {(!sharedEmail || !snapshot.failure) && (notice || snapshot.error || (!status && !sharedEmail)) && (
        <div className="mt-4 space-y-2 text-[13px] leading-5" aria-live="polite">
          {notice && (
            <p role="status" className="text-neutral-300">
              {notice}
            </p>
          )}
          {snapshot.error && (
            <p
              role="alert"
              className="rounded-xl border border-neutral-500 px-4 py-3 text-neutral-200"
            >
              {snapshot.error}
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
      {needsStatusRetry && (
        <div className="mt-3">
          {status && !capabilities?.emailOtp && !snapshot.error && (
            <p role="status" className="text-[13px] leading-5 text-neutral-400">
              Email sign-in is unavailable. Try again shortly.
            </p>
          )}
          <AccountTextButton type="button" disabled={snapshot.busy} onClick={props.onRefresh}>
            Refresh account status
          </AccountTextButton>
        </div>
      )}
    </Panel>
  );
}

function IdentityStep(props: MemberAccountViewProps & { locked: boolean }) {
  const { snapshot, locked } = props;
  const capabilities = snapshot.status?.capabilities;
  return (
    <>
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
        pendingAction={snapshot.pendingAction}
        invalid={
          props.invalidEmail
            ? "email"
            : snapshot.failure === "invalid-code"
              ? "code"
              : null
        }
        failure={props.invalidEmail ? null : snapshot.failure}
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
        onCodeComplete={(value) => props.onVerify(value)}
        onAction={(action) => {
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
          <div data-account-entry-alternatives="" className="mt-3 flex gap-2">
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
    </>
  );
}
