"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  createMemberClient,
  type MemberClient
} from "../../lib/member-auth/client";
import { BrandMark } from "../../lib/brand";
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
} from "./session";

/** One persistent shared tray; leaving a focused flow disposes its private session. */
export function MemberAccountStudy({
  client,
  initialFlow
}: {
  client?: MemberClient;
  initialFlow?: "login" | "signup";
} = {}) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<"chooser" | "login" | "signup">(
    initialFlow ?? "chooser"
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const login = useRef<HTMLButtonElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const lastChoice = useRef<"login" | "signup" | null>(initialFlow ?? null);
  const id = useId();
  const headingId = `${id}-${step}`;
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
    setStep(next);
  }
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <BrandMark asChild>
        <a
          href="/studies"
          className="text-[23px] tracking-[-1.4px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          sophomores
        </a>
      </BrandMark>
      <SecondaryButton
        ref={trigger}
        type="button"
        className="mt-8 max-w-xs"
        onClick={() => setOpen(true)}
      >
        Open account options
      </SecondaryButton>
      <VerificationTray
        open={open}
        onOpenChange={setOpen}
        returnFocusRef={trigger}
        mode={step === "chooser" ? "chooser" : "focused"}
        onCancel={() => setStep("chooser")}
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
      >
        {open &&
          (step === "chooser" ? (
            <Panel data-member-account-chooser="">
              <VerificationTrayTitle>
                <Heading id={headingId} tabIndex={-1} className="!text-xl">
                  Welcome
                </Heading>
              </VerificationTrayTitle>
              <Description className="!mb-3 text-xs">
                Log in or create an account.
              </Description>
              <PrimaryButton
                ref={login}
                type="button"
                className="!mt-3"
                onClick={() => choose("login")}
              >
                Log in <span aria-hidden="true">↗</span>
              </PrimaryButton>
              <SecondaryButton
                ref={signup}
                type="button"
                onClick={() => choose("signup")}
              >
                Sign up <span aria-hidden="true">+</span>
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
              />
            </motion.div>
          ))}
      </VerificationTray>
    </main>
  );
}

function MemberAccountFlow({
  client,
  headingId,
  flow
}: {
  client?: MemberClient;
  headingId: string;
  flow: "login" | "signup";
}) {
  const [snapshot, setSnapshot] = useState(emptyMemberSnapshot);
  const [identifierMode, setIdentifierMode] = useState<"email" | "phone">(
    "email"
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const session = useRef<MemberSession | null>(null);
  useEffect(() => {
    const current = createMemberSession(
      client ?? createMemberClient(),
      (next) => {
        setSnapshot(next);
        if (next.status?.authenticated) setOtp("");
      }
    );
    session.current = current;
    void current.initialize();
    return () => {
      current.dispose();
      session.current = null;
    };
  }, [client]);
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
      snapshot={snapshot}
      identifierMode={identifierMode}
      email={email}
      phone={phone}
      otp={otp}
      onMode={setIdentifierMode}
      onEmail={setEmail}
      onPhone={setPhone}
      onOtp={setOtp}
      onPasskey={() => {
        void session.current?.signInPasskey();
      }}
      onGoogle={() => {
        void session.current?.signInGoogle();
      }}
      onCode={() => {
        void session.current?.sendCode(email);
      }}
      onLink={() => {
        void session.current?.sendLink(email);
      }}
      onVerify={() => {
        void session.current?.verifyCode(email, otp);
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
