"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../../lib/utils";
import { VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./_shared/session";
import { AccountPhaseViews } from "@/components/Authentication/account-phase-views";

import {
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton,
  AccountInput
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
  const { snapshot, identifierMode } = props;
  const status = snapshot.status;
  const capabilities = status?.capabilities;
  const choosingPhone = identifierMode === "phone" && !snapshot.phoneIdentified;
  const locked = snapshot.busy || !status;
  const sharedEmail = !status?.authenticated && !choosingPhone;
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
    <Panel aria-busy={snapshot.busy} data-member-account-flow="">
      {!sharedEmail && (
        <VerificationTrayTitle>
          <Heading
            id={props.headingId ?? "member-account-heading"}
            tabIndex={-1}
            className={cn(embeddedPhone && "sr-only")}
          >
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
          className="space-y-5"
        >
          {!status?.authenticated ? (
            <IdentityStep
              {...props}
              locked={locked}
              choosingPhone={choosingPhone}
            />
          ) : status.member ? (
            <>
              <p className="text-sm leading-6 text-neutral-400">
                Email and phone confirmed for this local account.
              </p>
              <AccountPrimaryButton
                type="button"
                disabled={locked || !capabilities?.passkey}
                onClick={props.onAddPasskey}
              >
                Add a passkey
              </AccountPrimaryButton>
              <p className="text-sm leading-6 text-neutral-400">
                This is optional. This study’s passkeys belong to localhost and
                do not migrate to the hosted site.
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
                className="min-h-11 px-1 text-xs no-underline hover:underline"
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
                An authenticated session alone is not membership. Sign out and
                authenticate your email before verifying your phone.
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
      {!(sharedEmail && snapshot.failure) && (
        <div className="mt-5 space-y-3 text-sm leading-6" aria-live="polite">
          {snapshot.notice && (
            <p role="status" className="text-neutral-300">
              {snapshot.notice}
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
          {!status && !snapshot.error && (
            <p role="status" className="text-neutral-400">
              Checking sign-in options…
            </p>
          )}
        </div>
      )}
      {!pendingSetup && (
        <>
          <AccountTextButton
            className="mt-4"
            type="button"
            disabled={snapshot.busy}
            onClick={props.onRefresh}
          >
            Refresh account status
          </AccountTextButton>
          <p className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-5 text-neutral-400">
            Local account study. Email and phone required. Passkeys optional.
            Local SKT pilot only. Production and account recovery remain
            disabled. This is not identity or age verification.
          </p>
        </>
      )}
    </Panel>
  );
}

function IdentityStep(
  props: MemberAccountViewProps & { locked: boolean; choosingPhone: boolean }
) {
  const { snapshot, locked, choosingPhone, identifierMode } = props;
  const capabilities = snapshot.status?.capabilities;
  return (
    <>
      {choosingPhone ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            props.onIdentifier();
          }}
        >
          <div>
            <label htmlFor="member-identifier-phone" className="text-sm">
              Phone number
            </label>
            <AccountInput
              id="member-identifier-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={20}
              value={props.phone}
              onChange={(event) => props.onPhone(event.target.value)}
              disabled={locked}
              required
            />
          </div>
          <p className="text-sm leading-6 text-neutral-400">
            Your passkey or email still authenticates you. The phone number only
            identifies the account.
          </p>
          <AccountPrimaryButton type="submit" disabled={locked}>
            Use this phone
          </AccountPrimaryButton>
          <AccountTextButton
            type="button"
            disabled={locked}
            onClick={props.onClearIdentifier}
          >
            Use email instead
          </AccountTextButton>
        </form>
      ) : (
        <>
          {snapshot.phoneIdentified && (
            <p role="status" className="text-sm text-neutral-400">
              Phone selected. Enter your email or use a passkey for that
              account.
            </p>
          )}
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
            googleDisabled={!capabilities?.google}
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
          <AccountTextButton
            className="min-h-11 px-3"
            type="button"
            disabled={locked || !capabilities?.passkey}
            onClick={props.onPasskey}
          >
            Sign in with a passkey
          </AccountTextButton>
          <AccountTextButton
            type="button"
            disabled={locked || !capabilities?.magicLink || !props.email.trim()}
            onClick={props.onLink}
          >
            Send a magic link
          </AccountTextButton>
          {(!capabilities?.google ||
            !capabilities?.emailOtp ||
            !capabilities?.magicLink) && (
            <p className="text-xs leading-5 text-neutral-500">
              {!capabilities?.google &&
              !capabilities?.emailOtp &&
              !capabilities?.magicLink
                ? "Google and outbound email need operator setup. Existing passkeys may still sign in."
                : "Unavailable methods need operator setup."}
            </p>
          )}
          <AccountTextButton
            type="button"
            disabled={locked}
            onClick={
              identifierMode === "phone"
                ? props.onClearIdentifier
                : () => props.onMode("phone")
            }
          >
            {identifierMode === "phone"
              ? "Change identifier"
              : "Use phone to identify account"}
          </AccountTextButton>
        </>
      )}
    </>
  );
}
