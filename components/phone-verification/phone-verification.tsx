"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import {
  messagesByLocale,
  type VerificationLocale
} from "../../lib/phone-verification/i18n";
import { VerificationCountdown } from "./verification-countdown";
import Link from "next/link";
import { PhoneNumberField } from "./phone-number-field";
import {
  createPreviewChallenge,
  messagingPlatform,
  normalizeKoreanMobile,
  type MessagingPlatform,
  type PreviewChallenge
} from "../../lib/phone-verification/model";

type Screen =
  "number" | "message" | "waiting" | "success" | "mismatch" | "expired";

const headingKeys = {
  number: "headingNumber",
  message: "headingMessage",
  waiting: "headingWaiting",
  success: "headingSuccess",
  mismatch: "headingMismatch",
  expired: "headingExpired"
} as const;

const LocaleControl = createContext<(locale: VerificationLocale) => void>(
  () => {}
);

type VerificationProviderProps = {
  children: ReactNode;
  initialLocale?: VerificationLocale;
  locale?: VerificationLocale;
  onLocaleChange?: (locale: VerificationLocale) => void;
};

export function VerificationProvider({
  children,
  initialLocale = "ko",
  locale,
  onLocaleChange
}: VerificationProviderProps) {
  const [localLocale, setLocalLocale] = useState(initialLocale);
  const currentLocale = locale ?? localLocale;
  const changeLocale = useCallback(
    (next: VerificationLocale) => {
      if (locale === undefined) setLocalLocale(next);
      onLocaleChange?.(next);
    },
    [locale, onLocaleChange]
  );

  return (
    <LocaleControl.Provider value={changeLocale}>
      <NextIntlClientProvider
        locale={currentLocale}
        messages={messagesByLocale[currentLocale]}
        timeZone="Asia/Seoul"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleControl.Provider>
  );
}

export function VerificationLanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Verification");
  const changeLocale = useContext(LocaleControl);
  return (
    <div
      className="pv-language-switcher"
      role="group"
      aria-label={t("language")}
    >
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => changeLocale("en")}
      >
        {t("english")}
      </button>
      <button
        type="button"
        aria-pressed={locale === "ko"}
        onClick={() => changeLocale("ko")}
      >
        {t("korean")}
      </button>
    </div>
  );
}

export function PhoneVerification({
  initialLocale = "ko"
}: {
  initialLocale?: VerificationLocale;
}) {
  return (
    <VerificationProvider initialLocale={initialLocale}>
      <StandaloneVerification />
    </VerificationProvider>
  );
}

function StandaloneVerification() {
  const locale = useLocale();
  const t = useTranslations("Verification");
  return (
    <div className="phone-verification" lang={locale}>
      <header className="pv-header">
        <Link
          href="/"
          prefetch={false}
          aria-label={t("home")}
          className="pv-wordmark"
        >
          sophomores
        </Link>
      </header>
      <main className="pv-main">
        <VerificationFlow />
      </main>
    </div>
  );
}

function displayPhone(phone: string) {
  return phone.replace(/^\+8210(\d{4})(\d{4})$/, "010 $1 $2");
}

export function VerificationFlow({
  headingId = "pv-heading",
  descriptionId = "pv-preview",
  headingAs: Heading = "h1"
}: {
  headingId?: string;
  descriptionId?: string;
  headingAs?: "h1" | "h2";
}) {
  const t = useTranslations("Verification");
  const locale = useLocale();
  const [screen, setScreen] = useState<Screen>("number");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<"invalidPhone" | "">("");
  const [notice, setNotice] = useState<"statusUnavailable" | "">("");
  const [challenge, setChallenge] = useState<PreviewChallenge | null>(null);
  const [platform, setPlatform] = useState<MessagingPlatform>("manual");
  const heading = useRef<HTMLHeadingElement>(null);
  const phoneInput = useRef<HTMLInputElement>(null);
  const active = screen === "message" || screen === "waiting";

  useEffect(() => {
    heading.current?.focus();
  }, [screen]);

  const expire = useCallback(() => {
    setScreen((current) =>
      current === "message" || current === "waiting" ? "expired" : current
    );
  }, []);

  function prepare() {
    const normalized = normalizeKoreanMobile(phone);
    if (!normalized) {
      setError("invalidPhone");
      phoneInput.current?.focus();
      return;
    }
    const time = Date.now();
    setPlatform(
      messagingPlatform(navigator.userAgent, navigator.maxTouchPoints)
    );
    setNotice("");
    setChallenge(createPreviewChallenge(normalized, time));
    setError("");
    setScreen("message");
  }

  function editNumber() {
    setChallenge(null);
    setScreen("number");
    setError("");
    setNotice("");
  }

  return (
    <section className="pv-panel" lang={locale} aria-labelledby={headingId}>
      <VerificationLanguageSwitcher />
      <div className="pv-content">
        <Heading id={headingId} ref={heading} tabIndex={-1}>
          {t(headingKeys[screen])}
        </Heading>
        {screen === "number" ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              prepare();
            }}
            noValidate
          >
            <p className="pv-description">{t("numberDescription")}</p>
            <PhoneNumberField
              value={phone}
              inputRef={phoneInput}
              error={error ? t(error) : ""}
              onChange={(value) => {
                setPhone(value);
                setError("");
              }}
            />
            <button type="submit" className="pv-primary">
              {t("next")}
            </button>
            <p className="pv-note pv-cost">{t("privacyNote")}</p>
          </form>
        ) : (
          challenge && (
            <>
              <div className="pv-number-summary">
                <span>{displayPhone(challenge.phone)}</span>
                <button type="button" onClick={editNumber}>
                  {t("editNumber")}
                </button>
              </div>
              {screen === "message" && (
                <>
                  <p className="pv-description">{t("messageDescription")}</p>
                  <div className="pv-message-card">
                    <div>
                      <span>{t("recipientExample")}</span>
                      <code>{challenge.recipient}</code>
                    </div>
                    <div>
                      <span>{t("messageExample")}</span>
                      <code>{challenge.body}</code>
                    </div>
                  </div>
                  <p className="pv-note">{t("configurationNote")}</p>
                  <button
                    type="button"
                    className="pv-primary"
                    disabled
                    aria-describedby="pv-disconnected"
                  >
                    {t("openMessages")}
                  </button>
                  <p id="pv-disconnected" className="pv-note">
                    {t("disconnected")}
                  </p>
                  <button
                    className="pv-secondary"
                    type="button"
                    onClick={() => setScreen("waiting")}
                  >
                    {t("previewWaiting")}
                  </button>
                  <DeviceHelp platform={platform} />
                </>
              )}
              {screen === "waiting" && (
                <>
                  <div className="pv-waiting-mark" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="pv-description">{t("waitingDescription")}</p>
                  <p className="pv-note">{t("waitingNote")}</p>
                  <button
                    type="button"
                    className="pv-secondary"
                    onClick={() => setNotice("statusUnavailable")}
                  >
                    {t("checkStatus")}
                  </button>
                  <button
                    type="button"
                    className="pv-text-button"
                    onClick={() => setScreen("message")}
                  >
                    {t("backToMessage")}
                  </button>
                </>
              )}
              {screen === "success" && (
                <>
                  <div className="pv-result-symbol" aria-hidden="true">
                    ↗
                  </div>
                  <p className="pv-description">{t("successDescription")}</p>
                  <p className="pv-simulation">{t("successPreview")}</p>
                  <button
                    type="button"
                    className="pv-primary"
                    onClick={editNumber}
                  >
                    {t("restart")}
                  </button>
                </>
              )}
              {(screen === "expired" || screen === "mismatch") && (
                <>
                  <p className="pv-description">
                    {screen === "expired"
                      ? t("expiredDescription")
                      : t("mismatchDescription")}
                  </p>
                  <p className="pv-simulation">{t("resultPreview")}</p>
                  <button
                    type="button"
                    className="pv-primary"
                    onClick={prepare}
                  >
                    {t("retry")}
                  </button>
                </>
              )}
              {active && (
                <VerificationCountdown
                  expiresAt={challenge.expiresAt}
                  visible={screen === "waiting"}
                  onExpire={expire}
                />
              )}
              <p className="pv-status" role="status">
                {notice ? t(notice) : ""}
              </p>
              <details className="pv-preview-controls">
                <summary>{t("screenTests")}</summary>
                <div>
                  {(
                    [
                      ["waiting", "testWaiting"],
                      ["success", "testSuccess"],
                      ["mismatch", "testMismatch"],
                      ["expired", "testExpired"]
                    ] as const
                  ).map(([state, label]) => (
                    <button
                      type="button"
                      key={state}
                      onClick={() => {
                        if (state === "waiting") {
                          const time = Date.now();
                          setChallenge(
                            createPreviewChallenge(challenge.phone, time)
                          );
                        }
                        setNotice("");
                        setScreen(state);
                      }}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </details>
            </>
          )
        )}
      </div>
      <p id={descriptionId} className="pv-preview">
        {t("previewBoundary")}
      </p>
    </section>
  );
}

function DeviceHelp({ platform }: { platform: MessagingPlatform }) {
  const t = useTranslations("Verification");
  return (
    <details className="pv-help">
      <summary>{t("helpTitle")}</summary>
      <div>
        <p>{t(platform === "manual" ? "helpManual" : "helpDevice")}</p>
        <p>{t("helpMms")}</p>
        <p>{t("helpIphone")}</p>
        <p>{t("helpLimitations")}</p>
      </div>
    </details>
  );
}
