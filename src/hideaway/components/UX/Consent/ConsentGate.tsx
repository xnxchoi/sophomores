"use client";

import { AUTH_PRIMARY_BUTTON_CLASS } from "@/hideaway/components/auth/auth-styles";
import { useIsHydrated } from "@/lib/auth/useIsHydrated";
import { useTranslations } from "next-intl";
import {
  ReactNode,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore
} from "react";

const POLICY_VERSION = "2026-04-15";
const COOKIE_NAME = "__rp_consent";
const COOKIE_MAX_AGE_DAYS = 365;

interface ConsentRecord {
  v: string;
  terms: string;
  privacy: string;
  age: boolean;
  marketing: boolean;
  ts: string;
}

function writeConsentCookie(record: ConsentRecord) {
  const value = encodeURIComponent(JSON.stringify(record));
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

function readConsentCookie(): boolean {
  if (typeof document === "undefined") return false;
  const row = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!row) return false;
  try {
    const record = JSON.parse(
      decodeURIComponent(row.slice(`${COOKIE_NAME}=`.length))
    ) as ConsentRecord;
    return record?.v === POLICY_VERSION;
  } catch {
    return false;
  }
}

function subscribeConsent() {
  return () => {};
}

function useConsentRecorded() {
  return useSyncExternalStore(subscribeConsent, readConsentCookie, () => false);
}

interface CheckboxRowProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  badge: { text: string; tone: "required" | "optional" };
  link?: { href: string; label: string };
}

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
  badge,
  link
}: CheckboxRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 py-2 text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        suppressHydrationWarning
        className="mt-1 size-4 shrink-0 border border-border/50 bg-transparent accent-foreground"
      />
      <span className="flex-1 leading-snug">
        <span
          className={`mr-2 font-sans text-[10px] tracking-widest uppercase ${
            badge.tone === "required"
              ? "text-foreground/70"
              : "text-foreground/40"
          }`}
        >
          [{badge.text}]
        </span>
        <span className="text-foreground/80">{label}</span>
        {link ? (
          <>
            {" · "}
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-sans text-[10px] tracking-widest text-foreground/50 uppercase underline-offset-2 hover:underline"
            >
              {link.label}
            </a>
          </>
        ) : null}
      </span>
    </label>
  );
}

interface ConsentGateProps {
  children: ReactNode;
}

export function ConsentGate({ children }: ConsentGateProps) {
  const t = useTranslations("Auth.consent");
  const isHydrated = useIsHydrated();

  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const recorded = useConsentRecorded();
  const [override, setOverride] = useState<boolean | null>(null);
  const passed = override ?? recorded;

  const allRequired = age && terms && privacy;
  const allChecked = age && terms && privacy && marketing;

  const setAll = useCallback((value: boolean) => {
    setAge(value);
    setTerms(value);
    setPrivacy(value);
    setMarketing(value);
  }, []);

  const onCommit = useCallback(() => {
    if (!allRequired) return;
    const now = new Date().toISOString();
    writeConsentCookie({
      v: POLICY_VERSION,
      terms: now,
      privacy: now,
      age,
      marketing,
      ts: now
    });
    setOverride(true);
  }, [age, allRequired, marketing]);

  const summary = useMemo(() => {
    return [
      t("age"),
      t("terms"),
      t("privacy"),
      marketing ? t("marketing") : null
    ]
      .filter((item): item is string => Boolean(item))
      .join(" · ");
  }, [marketing, t]);

  if (passed) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-xl border border-border/30 bg-faded-background/50 p-4">
          <p className="font-sans text-[10px] tracking-widest text-foreground/50 uppercase">
            {t("consented")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-foreground/60">
            {summary}
          </p>
          <button
            type="button"
            onClick={() => setOverride(false)}
            className="mt-3 font-sans text-[10px] tracking-widest text-foreground/50 uppercase underline-offset-2 hover:underline"
          >
            {t("edit")}
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-6 rounded-xl border border-border/30 bg-faded-background/50 p-5"
      data-auth-ready={isHydrated ? "true" : "false"}
    >
      <header>
        <h2 className="font-sans text-2xl font-medium tracking-tight text-off-foreground">
          {t("title")}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </header>

      <label className="flex cursor-pointer items-center gap-3 border-b border-border/20 pb-3 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={(e) => setAll(e.target.checked)}
          suppressHydrationWarning
          className="size-4 border border-border/50 bg-transparent accent-foreground"
        />
        <span>{t("selectAll")}</span>
      </label>

      <div className="flex flex-col gap-1">
        <CheckboxRow
          id="consent-age"
          checked={age}
          onChange={setAge}
          label={t("age")}
          badge={{ text: t("required"), tone: "required" }}
        />
        <CheckboxRow
          id="consent-terms"
          checked={terms}
          onChange={setTerms}
          label={t("terms")}
          badge={{ text: t("required"), tone: "required" }}
          link={{ href: "/terms", label: t("viewTerms") }}
        />
        <CheckboxRow
          id="consent-privacy"
          checked={privacy}
          onChange={setPrivacy}
          label={t("privacy")}
          badge={{ text: t("required"), tone: "required" }}
          link={{ href: "/privacy", label: t("viewPrivacy") }}
        />
        <CheckboxRow
          id="consent-marketing"
          checked={marketing}
          onChange={setMarketing}
          label={t("marketing")}
          badge={{ text: t("optional"), tone: "optional" }}
        />
      </div>

      <button
        type="button"
        onClick={onCommit}
        disabled={!allRequired || !isHydrated}
        className={AUTH_PRIMARY_BUTTON_CLASS}
      >
        {allRequired ? t("cta") : t("ctaDisabled")}
      </button>
    </div>
  );
}
