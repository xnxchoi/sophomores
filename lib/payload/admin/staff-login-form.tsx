"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { cmsAdminCallbackPath } from "@/lib/auth/cms-login";
import { isStaffEmail } from "@/lib/auth/staff-email";

type PendingAction = "send-code" | "verify-code" | "magic-link" | null;
type Feedback = { kind: "error" | "notice"; message: string; field?: "email" | "otp" } | null;

export function StaffLoginForm({ nextPath, available }: {
  nextPath: string;
  available: boolean;
}) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const pendingRef = useRef<PendingAction>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const feedbackId = id + "-feedback";
  const busy = pending !== null;

  useEffect(() => {
    if (busy) return;
    const input = codeSent ? codeRef.current : emailRef.current;
    input?.focus();
    if (codeSent && feedback?.field === "otp") input?.select();
  }, [codeSent, busy, feedback?.field]);

  function staffEmail(): string | null {
    const value = email.trim().toLowerCase();
    if (!isStaffEmail(value)) {
      setFeedback({ kind: "error", message: "Use your @sophomores.co email address.", field: "email" });
      emailRef.current?.focus();
      return null;
    }
    return value;
  }

  async function sendCode() {
    if (!available || pendingRef.current) return;
    const value = staffEmail();
    if (!value) return;
    pendingRef.current = "send-code";
    setPending("send-code");
    setFeedback(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: value, type: "sign-in" });
      if (result.error) {
        setFeedback({ kind: "error", message: "Could not send the sign-in code. Try again." });
        return;
      }
      setEmail(value);
      setOtp("");
      setCodeSent(true);
    } catch {
      setFeedback({ kind: "error", message: "Could not send the sign-in code. Try again." });
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  }

  async function verifyCode() {
    if (!available || pendingRef.current) return;
    const value = staffEmail();
    const code = otp.trim().toUpperCase();
    if (!value) return;
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setFeedback({ kind: "error", message: "Enter the 6-character code.", field: "otp" });
      return;
    }
    pendingRef.current = "verify-code";
    setPending("verify-code");
    setFeedback(null);
    try {
      const result = await authClient.signIn.emailOtp({ email: value, otp: code });
      if (result.error) {
        setFeedback({ kind: "error", message: "That code was not accepted. Try again or request a new code.", field: "otp" });
        return;
      }
      window.location.assign(nextPath);
    } catch {
      setFeedback({ kind: "error", message: "That code was not accepted. Try again or request a new code.", field: "otp" });
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  }

  async function sendMagicLink() {
    if (!available || pendingRef.current) return;
    const value = staffEmail();
    if (!value) return;
    pendingRef.current = "magic-link";
    setPending("magic-link");
    setFeedback(null);
    try {
      const result = await authClient.signIn.magicLink({
        email: value,
        callbackURL: cmsAdminCallbackPath,
        newUserCallbackURL: cmsAdminCallbackPath
      });
      if (result.error) {
        setFeedback({ kind: "error", message: "Could not send the magic link. Try again." });
        return;
      }
      setFeedback({ kind: "notice", message: "Magic link sent. Open it in this browser." });
    } catch {
      setFeedback({ kind: "error", message: "Could not send the magic link. Try again." });
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  }

  const progressLabel = pending === "send-code" ? "Sending code…" : pending === "verify-code" ? "Verifying code…" : "Sending link…";

  return (
    <form
      className="staff:m-0 staff:w-full staff:min-w-0 staff:text-(--theme-text) staff:[font-family:system-ui]"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (codeSent) void verifyCode();
        else void sendCode();
      }}
    >
      <header className="staff:mb-[28px]">
        <h1 className="staff:m-0 staff:text-[24px] staff:leading-[30px] staff:font-semibold staff:tracking-tight">
          {codeSent ? "Check your email" : "Staff sign in"}
        </h1>
        <p className="staff:mt-[8px] staff:mb-0 staff:text-[14px] staff:leading-[24px] staff:text-(--theme-elevation-600)">
          {codeSent ? <>Code sent to <span className="staff:block staff:break-all staff:font-medium staff:text-(--theme-text)">{email}</span></> : "Use your @sophomores.co email address."}
        </p>
      </header>
      {codeSent ? (
        <div>
          <label htmlFor={id + "-code"} className="staff:mb-[8px] staff:block staff:text-[13px] staff:font-medium staff:text-(--theme-elevation-650)">Sign-in code</label>
          <input
            ref={codeRef}
            id={id + "-code"}
            name="otp"
            type="text"
            value={otp}
            onChange={(event) => { setOtp(event.target.value.toUpperCase()); setFeedback(null); }}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={6}
            required
            disabled={!available || busy}
            aria-invalid={feedback?.field === "otp"}
            aria-describedby={feedbackId}
            className="staff:m-0 staff:box-border staff:min-h-[52px] staff:w-full staff:rounded-[12px] staff:border staff:border-solid staff:border-(--theme-elevation-200) staff:bg-(--theme-elevation-50) staff:px-[16px] staff:py-[12px] staff:text-center staff:font-mono staff:text-[20px] staff:tracking-[0.35em] staff:text-(--theme-text) staff:shadow-none staff:selection:bg-(--theme-text) staff:selection:text-(--theme-bg) staff:outline-none staff:transition-[border-color,box-shadow] staff:duration-200 staff:focus-visible:border-(--theme-elevation-600) staff:focus-visible:outline-2 staff:focus-visible:outline-offset-2 staff:focus-visible:outline-(--theme-elevation-400) staff:aria-invalid:border-(--theme-elevation-600) staff:disabled:opacity-50"
          />
        </div>
      ) : (
        <div>
          <label htmlFor={id + "-email"} className="staff:mb-[8px] staff:block staff:text-[13px] staff:font-medium staff:text-(--theme-elevation-650)">Email</label>
          <input
            ref={emailRef}
            id={id + "-email"}
            name="email"
            type="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setOtp(""); setFeedback(null); }}
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@sophomores.co"
            required
            disabled={!available || busy}
            aria-invalid={feedback?.field === "email"}
            aria-describedby={feedbackId}
            className="staff:m-0 staff:box-border staff:min-h-[52px] staff:w-full staff:rounded-[12px] staff:border staff:border-solid staff:border-(--theme-elevation-200) staff:bg-(--theme-elevation-50) staff:px-[16px] staff:py-[12px] staff:text-[16px] staff:font-normal staff:text-(--theme-text) staff:shadow-none staff:selection:bg-(--theme-text) staff:selection:text-(--theme-bg) staff:outline-none staff:transition-[border-color,box-shadow] staff:duration-200 staff:focus-visible:border-(--theme-elevation-600) staff:focus-visible:outline-2 staff:focus-visible:outline-offset-2 staff:focus-visible:outline-(--theme-elevation-400) staff:aria-invalid:border-(--theme-elevation-600) staff:disabled:opacity-50"
          />
        </div>
      )}
      <div id={feedbackId} role={feedback?.kind === "error" ? "alert" : "status"} aria-live={feedback?.kind === "error" ? "assertive" : "polite"} className="staff:text-[13px] staff:leading-[20px] staff:text-(--theme-elevation-700)">
        {!available ? <p className="staff:mt-[12px] staff:mb-0">Sign-in is unavailable. Try again shortly.</p> : feedback ? (
          <p className="staff:mt-[12px] staff:mb-0 staff:flex staff:items-start staff:gap-[8px]">
            {feedback.kind === "notice" && <Check aria-hidden="true" className="staff:mt-[2px] staff:size-[16px] staff:shrink-0" />}
            <span>{feedback.message}</span>
          </p>
        ) : <span className="staff:sr-only">{pending ? progressLabel : codeSent ? "Sign-in code sent." : ""}</span>}
      </div>
      <button
        type="submit"
        disabled={!available || busy}
        aria-busy={pending === (codeSent ? "verify-code" : "send-code")}
        className="staff:relative staff:mt-[16px] staff:flex staff:min-h-[48px] staff:w-full staff:cursor-pointer staff:items-center staff:justify-center staff:rounded-[12px] staff:border-0 staff:bg-(--theme-text) staff:px-[20px] staff:py-[12px] staff:text-[14px] staff:font-medium staff:text-(--theme-bg) staff:transition-opacity staff:duration-200 staff:hover:opacity-85 staff:focus-visible:outline-2 staff:focus-visible:outline-offset-4 staff:focus-visible:outline-(--theme-elevation-600) staff:disabled:cursor-not-allowed staff:disabled:opacity-40 staff:disabled:aria-busy:opacity-100"
      >
        {pending === (codeSent ? "verify-code" : "send-code") ? progressLabel : codeSent ? "Verify code" : "Email a code"}
        {pending === (codeSent ? "verify-code" : "send-code") && <LoaderCircle aria-hidden="true" className="staff:absolute staff:right-[16px] staff:size-[16px] staff:animate-spin" />}
      </button>
      <div className="staff:mt-[12px] staff:flex staff:flex-col staff:items-center staff:gap-[4px]">
        <button
          type="button"
          disabled={!available || busy}
          aria-busy={pending === (codeSent ? "send-code" : "magic-link")}
          onClick={() => { if (codeSent) void sendCode(); else void sendMagicLink(); }}
          className="staff:relative staff:flex staff:min-h-[44px] staff:w-full staff:cursor-pointer staff:items-center staff:justify-center staff:rounded-[12px] staff:border-0 staff:bg-transparent staff:px-[20px] staff:py-[8px] staff:text-[13px] staff:font-medium staff:text-(--theme-elevation-650) staff:transition-colors staff:duration-200 staff:hover:text-(--theme-text) staff:focus-visible:outline-2 staff:focus-visible:outline-offset-2 staff:focus-visible:outline-(--theme-elevation-600) staff:disabled:cursor-not-allowed staff:disabled:opacity-40 staff:disabled:aria-busy:opacity-100"
        >
          {pending === (codeSent ? "send-code" : "magic-link") ? progressLabel : codeSent ? "Email a new code" : "Email a magic link"}
          {pending === (codeSent ? "send-code" : "magic-link") && <LoaderCircle aria-hidden="true" className="staff:absolute staff:right-[16px] staff:size-[16px] staff:animate-spin" />}
        </button>
        {codeSent && <button
          type="button"
          disabled={busy}
          onClick={() => { if (pendingRef.current) return; setCodeSent(false); setOtp(""); setFeedback(null); }}
          className="staff:min-h-[44px] staff:cursor-pointer staff:rounded-[8px] staff:border-0 staff:bg-transparent staff:px-[12px] staff:py-[8px] staff:text-[13px] staff:text-(--theme-elevation-600) staff:transition-colors staff:duration-200 staff:hover:text-(--theme-text) staff:focus-visible:outline-2 staff:focus-visible:outline-offset-2 staff:focus-visible:outline-(--theme-elevation-600) staff:disabled:cursor-not-allowed staff:disabled:opacity-40 staff:disabled:aria-busy:opacity-100"
        >Change email</button>}
      </div>
    </form>
  );
}
