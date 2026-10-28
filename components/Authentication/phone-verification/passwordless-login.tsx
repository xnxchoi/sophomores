"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useIsPresent } from "motion/react";
import {
  createPasswordlessLoginSession,
  type PasswordlessLoginClient,
  type PasswordlessLoginSnapshot
} from "../../lib/passwordless-login";
import { VerificationTrayTitle } from "./verification-tray";
import {
  Description,
  Heading,
  Panel,
  PrimaryButton,
  SecondaryButton
} from "./verification-ui";

const copy = {
  en: {
    title: "Log in",
    description: "Use the email associated with your account.",
    email: "Email address",
    continue: "Continue",
    checking: "Checking…",
    google: "Continue with Google",
    passkey: "Try passkey again",
    otp: "Send a sign-in code",
    or: "or",
    unavailable: "Customer login isn’t connected in this preview yet.",
    invalidEmail: "Enter a valid email address.",
    requestFailed: "We couldn’t complete sign-in. Please try again.",
    passkeyCancelled: "Passkey sign-in was cancelled. Try again or use a code.",
    otpPending:
      "Code requested. The verification view isn’t connected in this preview yet.",
    authenticated: "Sign-in confirmed by the authentication service."
  },
  ko: {
    title: "로그인",
    description: "계정에 연결된 이메일을 입력해 주세요.",
    email: "이메일 주소",
    continue: "계속",
    checking: "확인 중…",
    google: "Google로 계속",
    passkey: "패스키 다시 시도",
    otp: "로그인 코드 받기",
    or: "또는",
    unavailable: "이 미리보기에는 회원 로그인이 아직 연결되지 않았어요.",
    invalidEmail: "올바른 이메일 주소를 입력해 주세요.",
    requestFailed: "로그인을 완료하지 못했어요. 다시 시도해 주세요.",
    passkeyCancelled:
      "패스키 로그인이 취소됐어요. 다시 시도하거나 코드를 이용해 주세요.",
    otpPending:
      "코드를 요청했어요. 이 미리보기에는 인증 화면이 아직 연결되지 않았어요.",
    authenticated: "인증 서비스에서 로그인을 확인했어요."
  }
} as const;
const transition = { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const };
const initial: PasswordlessLoginSnapshot = {
  email: "",
  attempt: null,
  status: "email",
  busy: false,
  error: null
};

export type PasswordlessLoginViewProps = {
  headingId: string;
  locale: "en" | "ko";
  client?: PasswordlessLoginClient;
  renderOtp?: (attempt: { flowId: string; email: string }) => ReactNode;
};

/** Presentation and cancellation only; authentication and OTP belong to the injected service. */
export function PasswordlessLoginView({
  headingId,
  locale,
  client,
  renderOtp
}: PasswordlessLoginViewProps) {
  const text = copy[locale];
  const present = useIsPresent();
  const [snapshot, setSnapshot] = useState<PasswordlessLoginSnapshot>(initial);
  const [previousClient, setPreviousClient] = useState(client);
  if (previousClient !== client) {
    setPreviousClient(client);
    setSnapshot(initial);
  }
  const session = useRef<ReturnType<
    typeof createPasswordlessLoginSession
  > | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const emailId = `${headingId}-email`;
  const errorId = `${headingId}-error`;
  const unavailableId = `${headingId}-unavailable`;
  useLayoutEffect(() => {
    if (!present) return;
    const active = createPasswordlessLoginSession(client, setSnapshot);
    session.current = active;
    heading.current?.focus({ preventScroll: true });
    return () => {
      active.dispose();
      if (session.current === active) session.current = null;
    };
  }, [client, present]);
  const choice = snapshot.attempt && snapshot.status === "choice";
  return (
    <Panel lang={locale} aria-labelledby={headingId} data-passwordless-login="">
      <VerificationTrayTitle>
        <Heading id={headingId} tabIndex={-1} ref={heading}>
          {text.title}
        </Heading>
      </VerificationTrayTitle>
      <Description>{text.description}</Description>
      <form
        noValidate
        aria-busy={snapshot.busy}
        onSubmit={(event) => {
          event.preventDefault();
          void session.current?.begin();
        }}
      >
        <label
          htmlFor={emailId}
          className="mb-2 block text-xs font-medium text-neutral-300"
        >
          {text.email}
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={254}
          required
          value={snapshot.email}
          onChange={(event) => session.current?.setEmail(event.target.value)}
          aria-invalid={snapshot.error === "invalidEmail"}
          aria-describedby={snapshot.error ? errorId : undefined}
          className="!m-0 h-14 w-full min-w-0 !rounded-xl !border !border-white/20 !bg-black/20 !px-4 !text-base !font-normal !tracking-normal !text-white !shadow-[inset_0_1px_2px_#00000040] transition-[border-color,box-shadow] duration-200 ease-out placeholder:text-neutral-500 focus:!border-white/70 focus:!outline-2 focus:!outline-offset-2 focus:!outline-white/30"
        />
        {!choice &&
          snapshot.status !== "otp" &&
          snapshot.status !== "authenticated" && (
            <PrimaryButton type="submit" disabled={snapshot.busy}>
              {snapshot.busy ? text.checking : text.continue}
              <span aria-hidden="true">↗</span>
            </PrimaryButton>
          )}
      </form>
      <AnimatePresence initial={false}>
        {snapshot.error && (
          <motion.div
            key="error"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <p
              id={errorId}
              role="alert"
              className="pt-3 text-xs leading-relaxed text-neutral-300"
            >
              {text[snapshot.error]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {choice && (
        <div className="mt-4 space-y-3">
          {snapshot.attempt?.methods.includes("passkey") && (
            <SecondaryButton
              data-login-passkey=""
              type="button"
              disabled={snapshot.busy}
              onClick={() => {
                void session.current?.retryPasskey();
              }}
            >
              {snapshot.busy ? text.checking : text.passkey}
            </SecondaryButton>
          )}
          {snapshot.attempt?.methods.includes("otp") && (
            <PrimaryButton
              type="button"
              disabled={snapshot.busy}
              onClick={() => {
                void session.current?.requestOtp();
              }}
            >
              {text.otp}
            </PrimaryButton>
          )}
        </div>
      )}
      {snapshot.status === "otp" &&
        snapshot.attempt &&
        (renderOtp ? (
          renderOtp({ flowId: snapshot.attempt.id, email: snapshot.email })
        ) : (
          <p
            role="status"
            aria-live="polite"
            className="mt-4 text-sm leading-relaxed text-neutral-300"
          >
            {text.otpPending}
          </p>
        ))}
      {snapshot.status === "authenticated" && (
        <p role="status" aria-live="polite" className="mt-4 text-sm leading-relaxed text-white">
          {text.authenticated}
        </p>
      )}
      <div className="my-5 flex items-center gap-3 text-[11px] text-neutral-500">
        <span className="h-px flex-1 bg-white/10" />
        {text.or}
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <SecondaryButton
        data-login-google=""
        type="button"
        disabled={!client || snapshot.busy}
        aria-describedby={!client ? unavailableId : undefined}
        onClick={() => {
          void session.current?.google();
        }}
      >
        <span aria-hidden="true" className="text-base font-semibold">
          G
        </span>
        {text.google}
      </SecondaryButton>
      {!client && (
        <p
          id={unavailableId}
          data-login-unavailable=""
          className="mt-3 text-[11px] leading-relaxed text-neutral-400"
        >
          {text.unavailable}
        </p>
      )}
    </Panel>
  );
}
