"use client";

import { BrandMark } from "../../../lib/brand";

import { attachHaptics } from "../../../lib/haptics";
import { ChevronDown } from "lucide-react";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { NextIntlClientProvider, useLocale, useTranslations } from "next-intl";
import {
  messagesByLocale,
  type VerificationLocale
} from "../../../lib/phone-verification/i18n";
import { VerificationCountdown } from "./verification-countdown";
import Link from "next/link";
import { PhoneNumberField } from "./phone-number-field";
import { VerificationTrayTitle } from "./verification-tray";
import {
  createPreviewChallenge,
  messagingPlatform,
  type MessagingPlatform,
  normalizeKoreanMobile,
  type PreviewChallenge
} from "../../../lib/phone-verification/model";
import { AnimatePresence, motion } from "motion/react";
import { motionTokens } from "../../../lib/motion-tokens";
import {
  ChallengeCard,
  Description,
  Heading,
  Note,
  Panel,
  PrimaryButton,
  SecondaryButton,
  TextButton,
  VerificationBoundary,
  VerificationDetails,
  VerificationMark
} from "./verification-ui";
import { cn } from "@/lib/utils";

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

/** Compact chooser utility; keep language out of the account-action hierarchy. */
export function VerificationLocaleSelect() {
  const locale = useLocale();
  const t = useTranslations("Verification");
  const changeLocale = useContext(LocaleControl);
  return (
    <div className="relative w-fit">
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) =>
          changeLocale(event.target.value === "en" ? "en" : "ko")
        }
        className="min-h-11 appearance-none rounded-lg border-0 bg-transparent py-2 pr-7 pl-3 text-xs text-neutral-400 [color-scheme:dark] shadow-none transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <option value="en">{t("english")}</option>
        <option value="ko">{t("korean")}</option>
      </select>
      <ChevronDown
        aria-hidden="true"
        size={12}
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-neutral-500"
      />
    </div>
  );
}

export function VerificationLanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Verification");
  const changeLocale = useContext(LocaleControl);
  const toKo = useCallback(() => changeLocale("ko"), [changeLocale]);
  const toEn = useCallback(() => changeLocale("en"), [changeLocale]);
  return (
    <div
      className="flex shrink-0 items-center justify-end gap-0.5 whitespace-nowrap"
      role="group"
      aria-label={t("language")}
    >
      <button
        type="button"
        className="min-h-11 shrink-0 rounded-md px-2 text-[11px] whitespace-nowrap text-neutral-400 transition-colors duration-200 ease-out hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-white aria-pressed:text-white aria-pressed:underline aria-pressed:decoration-white aria-pressed:underline-offset-4"
        aria-pressed={locale === "en"}
        onClick={toEn}
      >
        {t("english")}
      </button>
      <button
        type="button"
        className="min-h-11 shrink-0 rounded-md px-2 text-[11px] whitespace-nowrap text-neutral-400 transition-colors duration-200 ease-out hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-white aria-pressed:text-white aria-pressed:underline aria-pressed:decoration-white aria-pressed:underline-offset-4"
        aria-pressed={locale === "ko"}
        onClick={toKo}
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
    <div
      className="min-h-svh bg-teaser-card p-6 font-message text-white"
      lang={locale}
    >
      <header className="h-11">
        <BrandMark asChild>
          <Link
            href="/"
            prefetch={false}
            aria-label={t("home")}
            data-brand-mark=""
            className="text-[25px] tracking-[-1.5px]"
          >
            sophomores
          </Link>
        </BrandMark>
      </header>
      <main className="mx-auto mt-12 max-w-[460px]">
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
  headingAs = "h1"
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
    <Panel lang={locale} aria-labelledby={headingId}>
      <div className="mb-1 flex h-11 items-center justify-between">
        <div className="w-7">
          <VerificationMark
            state={
              screen === "waiting"
                ? "pending"
                : screen === "success"
                  ? "success"
                  : screen === "expired" || screen === "mismatch"
                    ? "error"
                    : "entry"
            }
          />
        </div>
        <VerificationLanguageSwitcher />
      </div>
      <div className="min-w-0">
        <VerificationTrayTitle>
          <Heading as={headingAs} id={headingId} ref={heading} tabIndex={-1}>
            {t(headingKeys[screen])}
          </Heading>
        </VerificationTrayTitle>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.24, ease: motionTokens.easing.smooth }}
          >
            {screen === "number" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  prepare();
                }}
                noValidate
              >
                <Description>{t("numberDescription")}</Description>
                <PhoneNumberField
                  value={phone}
                  inputRef={phoneInput}
                  error={error ? t(error) : ""}
                  onChange={(value) => {
                    setPhone(value);
                    setError("");
                  }}
                />
                <PrimaryButton ref={attachHaptics} type="submit">
                  {t("next")}
                  <span aria-hidden="true">↗</span>
                </PrimaryButton>
                <Note className="text-center">{t("privacyNote")}</Note>
              </form>
            ) : (
              challenge && (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3 text-sm text-neutral-400 [&>button]:min-h-11 [&>button]:px-2 [&>button]:text-xs [&>button]:underline">
                    <span>{displayPhone(challenge.phone)}</span>
                    <button type="button" onClick={editNumber}>
                      {t("editNumber")}
                    </button>
                  </div>
                  {screen === "message" && (
                    <>
                      <Description>{t("messageDescription")}</Description>
                      <ChallengeCard
                        recipient={challenge.recipient}
                        body={challenge.body}
                      />
                      <Note>{t("configurationNote")}</Note>
                      <PrimaryButton
                        ref={attachHaptics}
                        type="button"
                        disabled
                        aria-describedby="pv-disconnected"
                      >
                        {t("openMessages")}
                      </PrimaryButton>
                      <Note id="pv-disconnected">{t("disconnected")}</Note>
                      <SecondaryButton
                        type="button"
                        onClick={() => setScreen("waiting")}
                      >
                        {t("previewWaiting")}
                      </SecondaryButton>
                      <DeviceHelp platform={platform} />
                    </>
                  )}
                  {screen === "waiting" && (
                    <>
                      <Description>{t("waitingDescription")}</Description>
                      <Note>{t("waitingNote")}</Note>
                      <SecondaryButton
                        type="button"
                        onClick={() => setNotice("statusUnavailable")}
                      >
                        {t("checkStatus")}
                      </SecondaryButton>
                      <TextButton
                        type="button"
                        onClick={() => setScreen("message")}
                      >
                        {t("backToMessage")}
                      </TextButton>
                    </>
                  )}
                  {screen === "success" && (
                    <>
                      <Description>{t("successDescription")}</Description>
                      <p className="my-4 text-center text-xs text-neutral-300">
                        {t("successPreview")}
                      </p>
                      <PrimaryButton
                        ref={attachHaptics}
                        type="button"
                        onClick={editNumber}
                      >
                        {t("restart")}
                      </PrimaryButton>
                    </>
                  )}
                  {(screen === "expired" || screen === "mismatch") && (
                    <>
                      <Description>
                        {screen === "expired"
                          ? t("expiredDescription")
                          : t("mismatchDescription")}
                      </Description>
                      <p className="my-4 text-center text-xs text-neutral-300">
                        {t("resultPreview")}
                      </p>
                      <PrimaryButton
                        ref={attachHaptics}
                        type="button"
                        onClick={prepare}
                      >
                        {t("retry")}
                      </PrimaryButton>
                    </>
                  )}
                  {active && (
                    <VerificationCountdown
                      expiresAt={challenge.expiresAt}
                      visible={screen === "waiting"}
                      onExpire={expire}
                    />
                  )}
                  <p
                    className={cn(
                      notice
                        ? "my-2 text-xs leading-relaxed text-neutral-300"
                        : "sr-only"
                    )}
                    role="status"
                  >
                    {notice ? t(notice) : ""}
                  </p>
                  <VerificationDetails label={t("screenTests")}>
                    <div className="[&_button]:min-h-11 [&_button]:rounded-lg [&_button]:bg-white/8 [&_button]:px-3 [&_div]:flex [&_div]:flex-wrap [&_div]:gap-2">
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
                    </div>
                  </VerificationDetails>
                </>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div id={descriptionId}>
        <VerificationBoundary>{t("previewBoundary")}</VerificationBoundary>
      </div>
    </Panel>
  );
}

function DeviceHelp({ platform }: { platform: MessagingPlatform }) {
  const t = useTranslations("Verification");
  return (
    <VerificationDetails label={t("helpTitle")}>
      {" "}
      <div>
        <p>{t(platform === "manual" ? "helpManual" : "helpDevice")}</p>
        <p>{t("helpMms")}</p>
        <p>{t("helpIphone")}</p>
        <p>{t("helpLimitations")}</p>
      </div>
    </VerificationDetails>
  );
}
