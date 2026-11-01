"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion } from "motion/react";
import {
  createMemberClient,
  type MemberClient
} from "../../../lib/member-auth/client";
import { BrandMark } from "../../../lib/brand";
import { subscribeVisibility } from "../../../utils/browser/visibility";
import { normalizeLoginEmail } from "../../../lib/passwordless-login";
import {
  VerificationTray,
  VerificationTrayTitle
} from "../phone-verification/verification-tray";
import {
  Description,
  Heading,
  Panel,
  PrimaryButton,
  SecondaryButton
} from "../phone-verification/verification-ui";
import { MemberAccountView } from "./account-view";
import { MemberPhoneStep } from "./phone-step";
import {
  createMemberSession,
  emptyMemberSnapshot,
  type MemberSession
} from "./_shared/session";

/** Standalone account/callback entry; contextual callers host MemberAccountDialog. */
export function MemberAccountStudy({
  client,
  initialFlow,
  completionAction
}: {
  client?: MemberClient;
  initialFlow?: "login" | "signup";
  completionAction?: ReactNode;
} = {}) {
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <BrandMark asChild>
        {/* Plain anchor: this study renders in node tests, where next/link touches `self`. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-[23px] tracking-[-1.4px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          sophomores
        </a>
      </BrandMark>
      <SecondaryButton ref={trigger} type="button" className="mt-8 max-w-xs" onClick={() => setOpen(true)}>
        Open account options
      </SecondaryButton>
      <MemberAccountDialog open={open} onOpenChange={setOpen} returnFocusRef={trigger}
        client={client} initialFlow={initialFlow} completionAction={completionAction} />
    </main>
  );
}

/** Caller-owned surface: closing disposes private flow, not the caller or Vaul root. */
export function MemberAccountDialog({
  open, onOpenChange, returnFocusRef, client, initialFlow, completionAction
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  client?: MemberClient;
  initialFlow?: "login" | "signup";
  completionAction?: ReactNode;
}) {
  const [entry, setEntry] = useState<{ open: boolean; choice: "chooser" | "login" | "signup" | null }>({ open, choice: null });
  if (entry.open !== open) setEntry({ open, choice: null });
  const step = entry.choice ?? initialFlow ?? "chooser";
  const login = useRef<HTMLButtonElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const lastChoice = useRef<"login" | "signup" | null>(initialFlow ?? null);
  const id = useId();
  const headingId = `${id}-${step}`;
  useEffect(() => {
    if (!open) {
      lastChoice.current = initialFlow ?? null;
    }
  }, [open, initialFlow]);
  useEffect(() => {
    if (!open) return;
    const choice =
      step === "chooser" && lastChoice.current
        ? lastChoice.current === "login"
          ? login.current
          : signup.current
        : document.getElementById(headingId);
    choice?.focus({ preventScroll: true });
  }, [open, step, headingId]);
  function choose(next: "login" | "signup") {
    lastChoice.current = next;
    setEntry({ open, choice: next });
  }
  return (
      <VerificationTray
        open={open}
        chrome="compact"
        onOpenChange={onOpenChange}
        returnFocusRef={returnFocusRef}
        mode={step === "chooser" ? "chooser" : "focused"}
        onCancel={() => setEntry({ open, choice: "chooser" })}
        cancelLabel="Cancel"
        headingId={headingId}
        descriptionId={`${id}-description`}
        locale="en"
        description={
          step === "chooser"
            ? "Choose Log in or Sign up to continue."
            : "Complete your account step. Use Cancel to return to account options."
        }
        closeLabel="Close account options"
        header={step === "chooser" ? (
          <div data-member-account-intro="" className="flex w-full flex-col items-center gap-2">
            <VerificationTrayTitle>
              <Heading id={headingId} tabIndex={-1} className="m-0! w-full px-10 text-center! text-[24px]! leading-[30px]! font-medium! tracking-[-0.025em]!">
                Welcome
              </Heading>
            </VerificationTrayTitle>
            <Description className="m-0! w-full max-w-none text-center text-[14px] leading-5">
              Log in or create an account.
            </Description>
          </div>
        ) : undefined}
      >
        {open &&
          (step === "chooser" ? (
            <Panel data-member-account-chooser="" className="px-6! pt-6! pb-8! [font-family:system-ui]">
              <PrimaryButton
                ref={login}
                type="button"
                className="mt-0! h-12 min-h-12 justify-center px-5 py-0 text-center text-[15px] leading-5 font-medium"
                onClick={() => choose("login")}
              >
                Log in
              </PrimaryButton>
              <SecondaryButton
                ref={signup}
                type="button"
                className="mt-3 mb-0 h-12 min-h-12 justify-center px-5 py-0 text-center text-[15px] leading-5 font-medium"
                onClick={() => choose("signup")}
              >
                Sign up
              </SecondaryButton>
            </Panel>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              <MemberAccountFlow
                client={client}
                headingId={headingId}
                flow={step}
                completionAction={completionAction}
              />
            </motion.div>
          ))}
      </VerificationTray>
  );
}

function MemberAccountFlow({
  client,
  headingId,
  flow,
  completionAction
}: {
  client?: MemberClient;
  headingId: string;
  flow: "login" | "signup";
  completionAction?: ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(emptyMemberSnapshot);
  const [registrationRequested, setRegistrationRequested] = useState(false);
  const [identifierMode, setIdentifierMode] = useState<"email" | "phone">(
    "email"
  );
  const [email, setEmail] = useState("");
  const [invalidEmail, setInvalidEmail] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [timerNow, setTimerNow] = useState(Date.now);
  const [visible, setVisible] = useState(true);
  const resendRemaining = snapshot.resendAvailableAt
    ? Math.max(0, Math.ceil((snapshot.resendAvailableAt - timerNow) / 1000))
    : 0;
  const verificationRemaining = snapshot.verificationAvailableAt
    ? Math.max(
        0,
        Math.ceil((snapshot.verificationAvailableAt - timerNow) / 1000)
      )
    : 0;
  const session = useRef<MemberSession | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Math.max(
      snapshot.resendAvailableAt ?? 0,
      snapshot.verificationAvailableAt ?? 0
    );
    const update = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      const isVisible = document.visibilityState !== "hidden";
      setVisible(isVisible);
      const now = Date.now();
      const remaining = deadline
        ? Math.max(0, Math.ceil((deadline - now) / 1000))
        : 0;
      setTimerNow(now);
      if (remaining > 0 && isVisible) timer = setTimeout(update, 1000);
    };
    update();
    const unsubscribe = subscribeVisibility(update);
    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [snapshot.resendAvailableAt, snapshot.verificationAvailableAt]);
  useEffect(() => {
    const current = createMemberSession(
      client ?? createMemberClient(),
      (next) => {
        setTimerNow(Date.now());
        setSnapshot(next);
        if (!next.status?.authenticated) setRegistrationRequested(false);
        if (next.status?.authenticated) setOtp("");
      }
    );
    session.current = current;
    const callbackError = new URLSearchParams(window.location.search).get(
      "error"
    );
    void current.initialize(
      callbackError && callbackError.length > 128 ? "unknown" : callbackError
    );
    return () => {
      current.dispose();
      session.current = null;
    };
  }, [client]);
  function verifyCode(value: string) {
    const current = session.current;
    if (
      !current ||
      current.snapshot().busy ||
      !current.snapshot().codeRequested ||
      value.length !== 6 ||
      !/^[A-Z0-9]{6}$/.test(value)
    )
      return;
    return current.verifyCode(email, value);
  }
  async function clearIdentifier() {
    const current = session.current;
    await current?.clearIdentifier();
    if (
      current &&
      session.current === current &&
      !current.snapshot().error &&
      !current.snapshot().phoneIdentified
    ) {
      setIdentifierMode("email");
      setOtp("");
    }
  }
  return (
    <MemberAccountView
      headingId={headingId}
      flow={flow}
      registrationRequested={registrationRequested}
      onContinueRegistration={() => {
        if (
          snapshot.status?.authenticated &&
          snapshot.status.emailVerified &&
          !snapshot.status.member
        )
          setRegistrationRequested(true);
      }}
      snapshot={snapshot}
      completionAction={completionAction}
      identifierMode={identifierMode}
      email={email}
      invalidEmail={invalidEmail}
      phone={phone}
      otp={otp}
      resendRemaining={resendRemaining}
      verificationRemaining={verificationRemaining}
      visible={visible}
      onMode={(mode) => {
        setInvalidEmail(false);
        setIdentifierMode(mode);
      }}
      onEmail={(value) => {
        setInvalidEmail(false);
        setEmail(value);
      }}
      onPhone={setPhone}
      onOtp={setOtp}
      onPasskey={() => {
        setInvalidEmail(false);
        void session.current?.signInPasskey();
      }}
      onGoogle={() => {
        setInvalidEmail(false);
        void session.current?.signInGoogle();
      }}
      onCode={() => {
        const normalized = normalizeLoginEmail(email);
        if (!normalized) {
          setInvalidEmail(true);
          return;
        }
        setInvalidEmail(false);
        setEmail(normalized);
        const current = session.current;
        if (!current) return;
        const previousDelivery = current.snapshot().resendAvailableAt;
        void current.sendCode(normalized).then(() => {
          const result = current.snapshot();
          if (
            session.current === current &&
            !result.error &&
            result.codeRequested &&
            result.resendAvailableAt !== previousDelivery
          )
            setOtp("");
        });
      }}
      onLink={() => {
        const normalized = normalizeLoginEmail(email);
        if (!normalized) {
          setInvalidEmail(true);
          return;
        }
        setInvalidEmail(false);
        setEmail(normalized);
        void session.current?.sendLink(normalized);
      }}
      onVerify={(value) => {
        void verifyCode(value ?? otp);
      }}
      onIdentifier={() => {
        void session.current?.identifyPhone(phone);
      }}
      onEditEmail={() => {
        session.current?.editEmail();
        setOtp("");
      }}
      onClearIdentifier={() => {
        void clearIdentifier();
      }}
      onAddPasskey={() => {
        void session.current?.addPasskey();
      }}
      onSignOut={() => {
        void session.current?.signOut();
      }}
      onRefresh={() => {
        void session.current?.refresh();
      }}
      phoneStep={
        <MemberPhoneStep
          busy={snapshot.busy}
          onBind={(id, value) => {
            void session.current?.bindPhone(id, value);
          }}
        />
      }
    />
  );
}
