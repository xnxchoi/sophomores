"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import type { MemberStatus } from "../../../lib/member-auth/client";
import { recoveryReceiptSchema, recoveryRequestSchema } from "../../../lib/member-auth/recovery/contracts";
import { normalizeKoreanMobile } from "../../../lib/phone-verification/model";
import { normalizeLoginEmail } from "../../../lib/passwordless-login";
import { VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import { AccountButton, AccountInput, AccountPrimaryButton, AccountTextButton } from "./account-controls";

export function AccountRecoveryView({
  headingId, capabilities, onEmail, onPasskey, onGoogle
}: {
  headingId: string;
  capabilities?: MemberStatus["capabilities"];
  onEmail: () => void;
  onPasskey: () => void;
  onGoogle: () => void;
}) {
  const [step, setStep] = useState<"help" | "request" | "receipt">("help");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [invalid, setInvalid] = useState<{ phone: boolean; email: boolean }>({ phone: false, email: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    (step === "request" ? phoneInput.current : heading.current)?.focus({ preventScroll: true });
  }, [step]);
  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
    if (deadline.current !== null) clearTimeout(deadline.current);
  }, []);

  function backToHelp() {
    request.current?.abort();
    request.current = null;
    if (deadline.current !== null) clearTimeout(deadline.current);
    deadline.current = null;
    setPhone("");
    setContactEmail("");
    setInvalid({ phone: false, email: false });
    setError(null);
    setBusy(false);
    setStep("help");
  }

  // Zod validates the shared wire contract; existing normalizers validate claims.
  // TanStack Query is intentionally not used: private intake must not enter a cache.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const normalizedPhone = normalizeKoreanMobile(phone);
    const normalizedEmail = normalizeLoginEmail(contactEmail);
    setInvalid({ phone: !normalizedPhone, email: !normalizedEmail });
    if (!normalizedPhone || !normalizedEmail) {
      document.getElementById(`${headingId}-${!normalizedPhone ? "phone" : "email"}`)?.focus();
      return;
    }
    const payload = recoveryRequestSchema.safeParse({ phone: normalizedPhone, contactEmail: normalizedEmail });
    if (!payload.success) {
      setError("Check the phone number and contact email, then try again.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    deadline.current = setTimeout(() => {
      if (request.current !== controller) return;
      controller.abort();
      request.current = null;
      deadline.current = null;
      setBusy(false);
      setError("We couldn’t confirm receipt. The request took too long. Please try again.");
    }, 10_000);
    try {
      const response = await fetch("/api/member/recovery", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
        signal: controller.signal
      });
      if (request.current !== controller || controller.signal.aborted) return;
      if (response.status === 429) {
        setError("Too many requests. Please wait before trying again.");
        return;
      }
      if (response.status !== 202) throw new Error("Unconfirmed intake");
      const text = await response.text();
      if (text.length > 4096 || !recoveryReceiptSchema.safeParse(JSON.parse(text)).success) throw new Error("Invalid receipt");
      if (request.current !== controller || controller.signal.aborted) return;
      setPhone("");
      setContactEmail("");
      setStep("receipt");
    } catch {
      if (request.current === controller && !controller.signal.aborted) setError("We couldn’t confirm receipt. Please check your connection and try again.");
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (deadline.current !== null) clearTimeout(deadline.current);
        deadline.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <Panel className="px-6! pt-6! pb-6! [font-family:system-ui]" data-account-recovery={step}>
      <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }} className="space-y-4">
        <VerificationTrayTitle>
          <Heading ref={heading} id={headingId} tabIndex={-1} className="mt-0! mb-4! pr-14 text-[24px]! leading-[30px]! font-medium! tracking-[-0.025em]!">
            {step === "help" ? "Can’t sign in?" : step === "request" ? "Request staff review" : "Request received"}
          </Heading>
        </VerificationTrayTitle>
        {step === "help" ? (
          <>
            <p className="text-sm leading-6 text-neutral-300">What can you still access?</p>
            <div className="space-y-2">
              {capabilities?.emailOtp && <AccountButton type="button" onClick={onEmail}>Use email sign-in</AccountButton>}
              {capabilities?.passkey && <AccountButton type="button" onClick={onPasskey}>Use a passkey</AccountButton>}
              {capabilities?.google && <AccountButton type="button" onClick={onGoogle}>Continue with linked Google</AccountButton>}
            </div>
            <AccountTextButton type="button" className="min-h-11 px-1" onClick={() => setStep("request")}>I can’t access my email</AccountTextButton>
          </>
        ) : step === "request" ? (
          <>
            <form noValidate onSubmit={(event) => { void submit(event); }} className="space-y-4" aria-busy={busy}>
              <div>
                <label htmlFor={`${headingId}-phone`} className="text-[13px] text-neutral-300">Registered mobile number</label>
                <AccountInput className="tracking-normal!" ref={phoneInput} id={`${headingId}-phone`} type="tel" inputMode="tel" autoComplete="off" placeholder="010-1234-5678" maxLength={32} value={phone} disabled={busy} aria-invalid={invalid.phone} aria-describedby={invalid.phone ? `${headingId}-phone-error` : `${headingId}-claims`} onChange={(event) => { setPhone(event.target.value); setInvalid((value) => ({ ...value, phone: false })); }} />
                {invalid.phone && <p id={`${headingId}-phone-error`} className="mt-2 text-[13px] leading-5 text-neutral-300">Enter a valid Korean 010 mobile number.</p>}
              </div>
              <div>
                <label htmlFor={`${headingId}-email`} className="text-[13px] text-neutral-300">Contact email</label>
                <AccountInput className="tracking-normal!" id={`${headingId}-email`} type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} value={contactEmail} disabled={busy} aria-invalid={invalid.email} aria-describedby={invalid.email ? `${headingId}-email-error` : `${headingId}-claims`} onChange={(event) => { setContactEmail(event.target.value); setInvalid((value) => ({ ...value, email: false })); }} />
                {invalid.email && <p id={`${headingId}-email-error`} className="mt-2 text-[13px] leading-5 text-neutral-300">Enter an email address you can access.</p>}
              </div>
              <p id={`${headingId}-claims`} className="text-[13px] leading-5 text-neutral-400">Details are unverified. This request won’t change your account. Staff must verify ownership; restoration isn’t guaranteed.</p>
              {error && <p role="alert" className="rounded-xl border border-neutral-600 px-4 py-3 text-[13px] leading-5 text-neutral-200">{error}</p>}
              <AccountPrimaryButton type="submit" disabled={busy} aria-busy={busy} className="gap-2">
                {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {busy ? "Submitting request…" : "Request staff review"}
              </AccountPrimaryButton>
            </form>
            <AccountTextButton type="button" className="min-h-11 px-1" onClick={backToHelp}>Back to sign-in options</AccountTextButton>
          </>
        ) : (
          <>
            <p role="status" className="text-sm leading-6 text-neutral-300">Pending staff review</p>
            <p className="text-[13px] leading-5 text-neutral-400">Your account is unchanged. Ownership has not been verified.</p>
            <AccountButton type="button" onClick={backToHelp}>Back to sign-in options</AccountButton>
          </>
        )}
      </motion.div>
    </Panel>
  );
}
