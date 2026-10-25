"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore
} from "react";
import { AnimatePresence, useIsPresent } from "motion/react";
import { motionTokens } from "../../lib/motion-tokens";
import { normalizeLoginEmail } from "../../lib/passwordless-login";
import { normalizeKoreanMobile } from "../../lib/phone-verification/model";
import { copyVerificationValue } from "../../lib/phone-verification/clipboard";
import { AccountPhaseViews } from "./account-phase-views";
import type {
  AccountPhase,
  AccountPhaseStudyProps,
  PhaseAction
} from "./account-phase-types";

const message = "PREVIEW 728314";
const recipient = "verify@example.invalid";
const resendCooldownMs = 30_000;

function historyFor(
  phase: AccountPhase,
  flow: "login" | "signup"
): AccountPhase[] {
  if (phase === "entry") return ["entry"];
  if (phase === "passkey") return ["entry", "passkey"];
  if (phase === "email-code") return ["entry", "email-code"];
  if (phase === "email-recovery")
    return ["entry", "email-code", "email-recovery"];
  if (phase === "complete" && flow === "login")
    return ["entry", "email-code", "complete"];
  const prefix: AccountPhase[] = ["entry", "email-code", "phone"];
  if (phase === "phone") return prefix;
  if (phase === "expired" || phase === "used") return [...prefix, phase];
  if (phase === "waiting") return [...prefix, "waiting"];
  if (phase === "complete")
    return [...prefix, "waiting", "phone-confirmed", "complete"];
  return [...prefix, "waiting", phase];
}

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function documentVisible() {
  return document.visibilityState !== "hidden";
}

/** UI fixtures only: no client, fetch, storage, OAuth, WebAuthn or message transport. */
export function AccountPhaseStudy({
  flow,
  locale,
  headingId,
  navigationRef,
  initialPhase = "entry",
  onPhaseChange,
  onPreviewNotice
}: AccountPhaseStudyProps) {
  const [trail, setTrail] = useState(() => historyFor(initialPhase, flow));
  const phase = trail[trail.length - 1];
  const [email, setEmail] = useState("you@example.com");
  const [phone, setPhone] = useState("010-0000-0000");
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState<"email" | "code" | "phone" | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(() =>
    initialPhase === "waiting" ? Date.now() + 180_000 : null
  );
  const [now, setNow] = useState(() => Date.now());
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);
  const resendAvailableAtRef = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const latestPhase = useRef(phase);
  const present = useIsPresent();
  const visible = useSyncExternalStore(
    subscribeVisibility,
    documentVisible,
    () => true
  );

  const cancelPending = useCallback(() => {
    generation.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelPending();
    };
  }, [cancelPending]);

  useEffect(() => {
    if (!present) cancelPending();
  }, [present, cancelPending]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase !== "waiting" || !visible || !present || !expiresAt) return;
    const clock = setInterval(() => {
      if (latestPhase.current !== "waiting") return;
      const time = Date.now();
      setNow(time);
      if (time >= expiresAt) {
        clearInterval(clock);
        cancelPending();
        setBusy(false);
        latestPhase.current = "expired";
        setTrail((current) => [...current.slice(0, -1), "expired"]);
        onPhaseChange?.("expired");
      }
    }, 1000);
    return () => clearInterval(clock);
  }, [phase, expiresAt, visible, present, cancelPending, onPhaseChange]);

  useEffect(() => {
    if (
      (phase !== "email-code" && phase !== "email-recovery") ||
      !visible ||
      !present ||
      resendAvailableAt === null
    )
      return;
    const time = Date.now();
    const catchUp = setTimeout(() => setNow(Date.now()), 0);
    if (time >= resendAvailableAt) return () => clearTimeout(catchUp);
    const clock = setInterval(() => {
      if (
        latestPhase.current !== "email-code" &&
        latestPhase.current !== "email-recovery"
      )
        return;
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= resendAvailableAt) clearInterval(clock);
    }, 1000);
    return () => {
      clearTimeout(catchUp);
      clearInterval(clock);
    };
  }, [phase, resendAvailableAt, visible, present]);

  function startResendCooldown() {
    const time = Date.now();
    const availableAt = time + resendCooldownMs;
    resendAvailableAtRef.current = availableAt;
    setResendAvailableAt(availableAt);
    setNow(time);
  }

  function replaceTrail(next: AccountPhase[]) {
    cancelPending();
    latestPhase.current = next[next.length - 1];
    setTrail(next);
    setBusy(false);
    setInvalid(null);
    setCopied(false);
    setCopyFailed(false);
    setChecked(false);
    onPreviewNotice?.("");
    onPhaseChange?.(latestPhase.current);
  }

  function go(next: AccountPhase) {
    replaceTrail([...trail, next]);
  }

  function run(task: () => void) {
    if (timer.current || !present) return;
    cancelPending();
    const epoch = generation.current;
    setBusy(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!mounted.current || generation.current !== epoch) return;
      setBusy(false);
      task();
    }, motionTokens.duration.normal * 1000);
  }

  useImperativeHandle(navigationRef, () => ({
    back() {
      if (trail.length < 2) {
        cancelPending();
        setBusy(false);
        return false;
      }
      replaceTrail(trail.slice(0, -1));
      return true;
    },
    preview(next) {
      const time = Date.now();
      setNow(time);
      if (next === "expired") setExpiresAt(time - 1);
      else if (next === "waiting" || expiresAt === null || expiresAt <= time)
        setExpiresAt(time + 180_000);
      if (!normalizeLoginEmail(email)) setEmail("you@example.com");
      replaceTrail(historyFor(next, flow));
    }
  }));

  function submit() {
    if (busy || timer.current) return;
    if (phase === "entry") {
      const normalized = normalizeLoginEmail(email);
      if (!normalized) return setInvalid("email");
      setEmail(normalized);
      setInvalid(null);
      run(() => {
        startResendCooldown();
        go("email-code");
      });
    } else if (phase === "email-code") {
      if (code !== "12345678") return setInvalid("code");
      setInvalid(null);
      run(() => go(flow === "signup" ? "phone" : "complete"));
    } else if (phase === "phone") {
      if (!normalizeKoreanMobile(phone)) return setInvalid("phone");
      setInvalid(null);
      run(() => {
        const time = Date.now();
        setNow(time);
        setExpiresAt(time + 180_000);
        go("waiting");
      });
    }
  }

  function onAction(action: PhaseAction) {
    switch (action) {
      case "submit":
        return submit();
      case "google":
        return onPreviewNotice?.(
          locale === "ko"
            ? "Google 로그인은 미리보기예요. 계정 요청은 보내지 않았어요."
            : "Google sign-in is simulated. No account request was sent."
        );
      case "passkey":
        return onPreviewNotice?.(
          locale === "ko"
            ? "패스키 화면은 미리보기예요. 기기 인증을 요청하지 않았어요."
            : "The passkey prompt is simulated. No device authentication was requested."
        );
      case "email-code":
        startResendCooldown();
        return go("email-code");
      case "recover-email":
        if (phase === "email-code" && !busy && !timer.current)
          go("email-recovery");
        return;
      case "compose":
        return onPreviewNotice?.(
          locale === "ko"
            ? "메시지 앱은 열지 않았어요. 이 화면은 발송하지 않는 미리보기예요."
            : "Messages was not opened. This is a no-send preview."
        );
      case "check":
        if (phase === "waiting") run(() => setChecked(true));
        return;
      case "copy": {
        const epoch = generation.current;
        setCopyFailed(false);
        void copyVerificationValue(
          message,
          typeof navigator === "undefined" ? undefined : navigator.clipboard
        ).then((ok) => {
          if (!mounted.current || epoch !== generation.current) return;
          setCopied(ok);
          setCopyFailed(!ok);
        });
        return;
      }
      case "edit-email":
        setCode("");
        return replaceTrail(["entry"]);
      case "edit-phone":
        setExpiresAt(null);
        return replaceTrail(historyFor("phone", flow));
      case "finish":
        if (phase === "phone-confirmed") run(() => go("complete"));
        return;
      case "retry":
        if (phase === "email-code" || phase === "email-recovery") {
          if (
            busy ||
            timer.current ||
            !present ||
            Date.now() < (resendAvailableAtRef.current ?? 0)
          )
            return;
          startResendCooldown();
          run(() => {
            setCode("");
            setInvalid(null);
            if (phase === "email-recovery") replaceTrail(trail.slice(0, -1));
            onPreviewNotice?.(
              locale === "ko"
                ? "미리보기 코드는 12345678이에요. 이메일은 보내지 않았어요."
                : "The preview code is 12345678. No email was sent."
            );
          });
        } else if (phase === "complete") {
          setCode("");
          setExpiresAt(null);
          replaceTrail(["entry"]);
        } else {
          setExpiresAt(null);
          replaceTrail(historyFor("phone", flow));
        }
    }
  }

  const seconds = Math.max(
    0,
    Math.ceil(((expiresAt ?? now + 180_000) - now) / 1000)
  );
  const remaining = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const resendRemaining = Math.max(
    0,
    Math.ceil(((resendAvailableAt ?? now) - now) / 1000)
  );

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <AccountPhaseViews
        key={phase}
        phase={phase}
        flow={flow}
        locale={locale}
        headingId={`${headingId}-${phase}`}
        email={email}
        phone={phone}
        code={code}
        invalid={invalid}
        busy={busy}
        copied={copied}
        copyFailed={copyFailed}
        remaining={remaining}
        resendRemaining={resendRemaining}
        checked={checked}
        visible={visible && present}
        recipient={recipient}
        message={message}
        onField={(field, value) => {
          setInvalid(null);
          if (field === "email") setEmail(value);
          else if (field === "phone") setPhone(value);
          else setCode(value);
        }}
        onAction={onAction}
      />
    </AnimatePresence>
  );
}
