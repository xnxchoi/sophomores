"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../lib/utils";
import { VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import type { MemberSnapshot } from "./session";

import {
  AccountButton,
  AccountPrimaryButton,
  AccountTextButton,
  AccountInput
} from "./account-controls";

export type MemberAccountViewProps = {
  headingId?: string;
  flow?: "login" | "signup";
  snapshot: MemberSnapshot;
  identifierMode: "email" | "phone";
  email: string;
  phone: string;
  otp: string;
  phoneStep: ReactNode;
  onPasskey: () => void;
  onGoogle: () => void;
  onCode: () => void;
  onLink: () => void;
  onVerify: () => void;
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
  const phase = status?.member
    ? "member"
    : status?.authenticated
      ? "phone"
      : "identity";
  const embeddedPhone = Boolean(
    status?.authenticated && status.emailVerified && !status.member
  );
  const heading = status?.member
    ? "Account ready"
    : status?.authenticated
      ? status.emailVerified
        ? "Verify your phone to finish"
        : "Email verification needed"
      : props.flow === "signup"
        ? "Sign up"
        : "Log in";
  return (
    <Panel aria-busy={snapshot.busy} data-member-account-flow="">
      <VerificationTrayTitle>
        <Heading
          id={props.headingId ?? "member-account-heading"}
          tabIndex={-1}
          className={cn(embeddedPhone && "sr-only")}
        >
          {heading}
        </Heading>
      </VerificationTrayTitle>
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
              {props.phoneStep}
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
      {!embeddedPhone && (
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
          <AccountPrimaryButton
            type="button"
            disabled={locked || !capabilities?.passkey}
            onClick={props.onPasskey}
          >
            Sign in with a passkey
          </AccountPrimaryButton>
          <p className="text-xs leading-5 text-neutral-500">
            Preferred for returning members. Confirm with your device’s
            biometric or PIN.
          </p>
          <AccountButton
            type="button"
            disabled={locked || !capabilities?.google}
            onClick={props.onGoogle}
          >
            Continue with Google
          </AccountButton>
          <form
            className="space-y-4 border-t border-neutral-800 pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (snapshot.codeRequested) props.onVerify();
              else props.onCode();
            }}
          >
            <div>
              <label htmlFor="member-email" className="text-sm">
                Email
              </label>
              <AccountInput
                id="member-email"
                name="email"
                type="email"
                autoComplete="username webauthn"
                maxLength={254}
                value={props.email}
                onChange={(event) => props.onEmail(event.target.value)}
                disabled={locked || snapshot.codeRequested}
                required
              />
            </div>
            {snapshot.codeRequested && (
              <div>
                <label htmlFor="member-email-code" className="text-sm">
                  Email code
                </label>
                <AccountInput
                  id="member-email-code"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  value={props.otp}
                  onChange={(event) =>
                    props.onOtp(event.target.value.replace(/[^0-9]/g, ""))
                  }
                  disabled={locked}
                  required
                />
              </div>
            )}
            <AccountButton
              type="submit"
              disabled={locked || !capabilities?.emailOtp}
            >
              {snapshot.codeRequested ? "Verify email code" : "Send email code"}
            </AccountButton>
            {snapshot.codeRequested && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <AccountTextButton
                  type="button"
                  disabled={locked}
                  onClick={props.onEditEmail}
                >
                  Change email
                </AccountTextButton>
                <AccountTextButton
                  type="button"
                  disabled={locked || !capabilities?.emailOtp}
                  onClick={props.onCode}
                >
                  Send a new code
                </AccountTextButton>
              </div>
            )}
            <AccountTextButton
              type="button"
              disabled={
                locked || !capabilities?.magicLink || !props.email.trim()
              }
              onClick={props.onLink}
            >
              Send a magic link
            </AccountTextButton>
          </form>
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
