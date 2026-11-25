"use client";

import { useTranslations } from "next-intl";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeVisibility } from "@/utils/browser/visibility";
import { recoveryReceiptSchema, recoveryRequestSchema } from "../../../lib/member-auth/recovery/contracts";
import { normalizeKoreanMobile } from "../../../lib/phone-verification/model";
import { normalizeLoginEmail } from "../../../lib/passwordless-login";
import { VerificationPresentation, VerificationTrayTitle } from "../phone-verification/verification-tray";
import { Heading, Panel } from "../phone-verification/verification-ui";
import { AccountButton, AccountInput, AccountPrimaryButton, AccountTextButton } from "./account-controls";
import { DrawnField } from "@/components/ui/input";

/**
 * Account recovery. On the sign-in page ("page" presentation) it is laid out like the entry step: no panel inset,
 * the page's h1 carries its title (reported through onTitle), its own title stays only as the focus target, and the
 * fields are the same underlined DrawnField as the email field (critique, 26 Nov). The sheet keeps its panel.
 */
export function AccountRecoveryView({
  headingId, presentation, onTitle, onBack
}: {
  headingId: string;
  presentation?: "page";
  onTitle?: (title: string) => void;
  onBack: () => void;
}) {
  const page = presentation === "page";
  const t = useTranslations("MemberAuth");
  const mobileTray = useContext(VerificationPresentation) === "tray";
  const [step, setStep] = useState<"request" | "receipt">("request");
  const [phone, setPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [invalid, setInvalid] = useState<{ phone: boolean; email: boolean }>({ phone: false, email: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"checkThePhoneNumberAndContactEmailThenTryAgain" | "weCouldntConfirmReceiptTheRequestTookTooLongPleaseTryAgain" | "weCouldntConfirmReceiptPleaseCheckYourConnectionAndTryAgain" | null>(null);
  const [retryAvailableAt, setRetryAvailableAt] = useState(0);
  const [timerNow, setTimerNow] = useState(Date.now);
  const retryRemaining = Math.max(0, Math.ceil((retryAvailableAt - timerNow) / 1000));
  const heading = useRef<HTMLElement | null>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    (step === "request" ? phoneInput.current : heading.current)?.focus({ preventScroll: true });
  }, [step]);
  const title = step === "request" ? t("accountRecovery") : t("requestReceived");
  useEffect(() => { onTitle?.(title); }, [onTitle, title]);
  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
    if (deadline.current !== null) clearTimeout(deadline.current);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      const now = Date.now();
      setTimerNow(now);
      if (retryAvailableAt > now && document.visibilityState !== "hidden") {
        timer = setTimeout(update, 1000);
      }
    };
    update();
    const unsubscribe = subscribeVisibility(update);
    return () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [retryAvailableAt]);

  function backToLogin() {
    request.current?.abort();
    request.current = null;
    if (deadline.current !== null) clearTimeout(deadline.current);
    deadline.current = null;
    setBusy(false);
    onBack();
  }

  // Zod validates the shared wire contract; existing normalizers validate claims.
  // TanStack Query is intentionally not used: private intake must not enter a cache.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current || retryAvailableAt > Date.now()) return;
    const normalizedPhone = normalizeKoreanMobile(phone);
    const normalizedEmail = normalizeLoginEmail(contactEmail);
    setInvalid({ phone: !normalizedPhone, email: !normalizedEmail });
    if (!normalizedPhone || !normalizedEmail) {
      document.getElementById(`${headingId}-${!normalizedPhone ? "phone" : "email"}`)?.focus();
      return;
    }
    const payload = recoveryRequestSchema.safeParse({ phone: normalizedPhone, contactEmail: normalizedEmail });
    if (!payload.success) {
      setError("checkThePhoneNumberAndContactEmailThenTryAgain");
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
      setError("weCouldntConfirmReceiptTheRequestTookTooLongPleaseTryAgain");
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
        const retry = Number(response.headers.get("Retry-After"));
        const seconds = Number.isInteger(retry) && retry > 0 && retry <= 86400 ? retry : 60;
        const now = Date.now();
        setTimerNow(now);
        setRetryAvailableAt((current) => Math.max(current, now + seconds * 1000));
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
      if (request.current === controller && !controller.signal.aborted) setError("weCouldntConfirmReceiptPleaseCheckYourConnectionAndTryAgain");
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
    <Panel className={cn(page ? "px-0! pt-0! pb-0!" : "px-6! pb-6! [font-family:system-ui]", !page && (mobileTray ? "pt-0!" : "pt-6!"))} data-account-recovery={step}>
      <motion.div key={step} initial={mobileTray ? { opacity: 0 } : { opacity: 0, y: 6 }} animate={mobileTray ? { opacity: 1 } : { opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }} className="space-y-4">
        {page ? (
          <div ref={(element) => { heading.current = element; }} id={headingId} tabIndex={-1} data-phase-focus="" className="sr-only">{title}</div>
        ) : (
          <VerificationTrayTitle>
            <Heading ref={(element) => { heading.current = element; }} id={headingId} tabIndex={-1} className="mt-0! mb-4! text-center! text-[24px]! leading-[30px]! font-medium! tracking-[-0.025em]!">
              {title}
            </Heading>
          </VerificationTrayTitle>
        )}
        {step === "request" ? (
          <>
            <form noValidate onSubmit={(event) => { void submit(event); }} className="space-y-4" aria-busy={busy}>
              <div>
                {page ? <DrawnField steady label={t("registeredMobileNumber")} ref={phoneInput} id={`${headingId}-phone`} type="tel" inputMode="tel" autoComplete="off" maxLength={32} value={phone} disabled={busy} aria-invalid={invalid.phone} aria-describedby={invalid.phone ? `${headingId}-phone-error` : `${headingId}-claims`} onChange={(event) => { setPhone(event.target.value); setInvalid((value) => ({ ...value, phone: false })); }} /> : (
                  <>
                    <label htmlFor={`${headingId}-phone`} className="text-[13px] text-muted-foreground">{t("registeredMobileNumber")}</label>
                    <AccountInput className="tracking-normal!" ref={phoneInput} id={`${headingId}-phone`} type="tel" inputMode="tel" autoComplete="off" placeholder={t("01012345678")} maxLength={32} value={phone} disabled={busy} aria-invalid={invalid.phone} aria-describedby={invalid.phone ? `${headingId}-phone-error` : `${headingId}-claims`} onChange={(event) => { setPhone(event.target.value); setInvalid((value) => ({ ...value, phone: false })); }} />
                  </>
                )}
                {invalid.phone && <p id={`${headingId}-phone-error`} className="mt-2 text-[13px] leading-5 text-muted-foreground">{t("enterAValidKorean010MobileNumber")}</p>}
              </div>
              <div>
                {page ? <DrawnField steady label={t("contactEmail")} id={`${headingId}-email`} type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} value={contactEmail} disabled={busy} aria-invalid={invalid.email} aria-describedby={invalid.email ? `${headingId}-email-error` : `${headingId}-claims`} onChange={(event) => { setContactEmail(event.target.value); setInvalid((value) => ({ ...value, email: false })); }} /> : (
                  <>
                    <label htmlFor={`${headingId}-email`} className="text-[13px] text-muted-foreground">{t("contactEmail")}</label>
                    <AccountInput className="tracking-normal!" id={`${headingId}-email`} type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} value={contactEmail} disabled={busy} aria-invalid={invalid.email} aria-describedby={invalid.email ? `${headingId}-email-error` : `${headingId}-claims`} onChange={(event) => { setContactEmail(event.target.value); setInvalid((value) => ({ ...value, email: false })); }} />
                  </>
                )}
                {invalid.email && <p id={`${headingId}-email-error`} className="mt-2 text-[13px] leading-5 text-muted-foreground">{t("enterAnEmailAddressYouCanAccess")}</p>}
              </div>
              <p id={`${headingId}-claims`} className="text-[13px] leading-5 text-muted-foreground">{t("detailsAreUnverifiedThisRequestWontChangeYourAccountStaffMustVerifyOwnershipRestorationIsntGuaranteed")}</p>
              {error && <p role="alert" className="rounded-xl border border-border px-4 py-3 text-[13px] leading-5 text-foreground">{t(error)}</p>}
              {!error && retryAvailableAt > 0 && (
                <p className="min-h-5 text-[13px] leading-5 text-muted-foreground">
                  {retryRemaining > 0 && <span role="status" className="sr-only">{t("tooManyRequests")}</span>}
                  <span role={retryRemaining > 0 ? "timer" : "status"} aria-live={retryRemaining > 0 ? "off" : "polite"}>
                    {retryRemaining > 0 ? <>{t("tryAgainIn")} <span className="font-sans tabular-nums">{Math.floor(retryRemaining / 60)}:{String(retryRemaining % 60).padStart(2, "0")}</span></> : t("youCanTryAgain")}
                  </span>
                </p>
              )}
              <AccountPrimaryButton type="submit" disabled={busy || retryRemaining > 0} aria-busy={busy} className="gap-2">
                {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {busy ? t("submittingRequest") : t("requestStaffReview")}
              </AccountPrimaryButton>
            </form>
            <AccountTextButton type="button" className={cn("min-h-11 px-1", page && "mx-auto flex px-3")} onClick={backToLogin}>{t("backToLogIn")}</AccountTextButton>
          </>
        ) : (
          <>
            <p role="status" className="text-sm leading-6 text-muted-foreground">{t("pendingStaffReview")}</p>
            <p className="text-[13px] leading-5 text-muted-foreground">{t("yourAccountIsUnchangedOwnershipHasNotBeenVerified")}</p>
            <AccountButton type="button" onClick={backToLogin}>{t("backToLogIn")}</AccountButton>
          </>
        )}
      </motion.div>
    </Panel>
  );
}
