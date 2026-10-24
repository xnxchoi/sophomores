"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode
} from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useLocale } from "next-intl";
import {
  isAuthenticationLocked,
  type AuthenticationStep
} from "../../lib/authentication-entry";
import { attachHaptics } from "../../lib/haptics";
import { motionTokens } from "../../lib/motion-tokens";
import type { VerificationLocale } from "../../lib/phone-verification/i18n";
import type { PhoneVerificationModalProps } from "./phone-verification-modal";
import {
  VerificationFlow,
  VerificationLocaleSelect,
  VerificationProvider
} from "./phone-verification";
import { TrialVerificationFlow } from "./phone-verification-trial";
import { VerificationTray, VerificationTrayTitle } from "./verification-tray";
import {
  Heading,
  Panel,
  PrimaryButton,
  SecondaryButton
} from "./verification-ui";
import { PasswordlessLoginView } from "./passwordless-login";
import type { PasswordlessLoginClient } from "../../lib/passwordless-login";

const copy = {
  en: {
    heading: "Welcome",
    or: "Or",
    login: "Log in",
    signup: "Sign up",
    close: "Close account options",
    cancel: "Cancel",
    dialog: "Choose Log in or Sign up to continue.",
    focused:
      "Complete the selected account step. Cancel returns to account options."
  },
  ko: {
    heading: "반가워요",
    or: "Or",
    login: "로그인",
    signup: "회원가입",
    close: "계정 선택 닫기",
    cancel: "취소",
    dialog: "로그인 또는 회원가입을 선택하세요.",
    focused:
      "선택한 계정 단계를 진행하세요. 취소하면 계정 선택으로 돌아갈 수 있어요."
  }
} as const;

type AuthenticationEntryProps = PhoneVerificationModalProps & {
  localTrial?: boolean;
  loginClient?: PasswordlessLoginClient;
  renderLoginOtp?: (props: { flowId: string; email: string }) => ReactNode;
};

/** The chooser and focused flows share one Vaul root, portal and surface. */
export function AuthenticationEntry({
  initialLocale = "ko",
  locale,
  onLocaleChange,
  ...props
}: AuthenticationEntryProps) {
  return (
    <VerificationProvider
      initialLocale={initialLocale}
      locale={locale}
      onLocaleChange={onLocaleChange}
    >
      <AuthenticationContent {...props} />
    </VerificationProvider>
  );
}

function AuthenticationContent({
  open,
  onOpenChange,
  returnFocusRef,
  localTrial,
  loginClient,
  renderLoginOtp
}: Omit<
  AuthenticationEntryProps,
  "locale" | "initialLocale" | "onLocaleChange"
>) {
  const locale = useLocale() as VerificationLocale;
  const t = copy[locale];
  const [step, setStep] = useState<AuthenticationStep>("chooser");
  const [visit, setVisit] = useState(0);
  const lastChoice = useRef<"login" | "signup" | null>(null);
  const login = useRef<HTMLButtonElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const id = useId();
  const headingId = `${id}-${step}-${visit}`;
  const chooserHeadingId = `${id}-chooser-${visit}`;
  const locked = isAuthenticationLocked(step);

  useEffect(() => {
    if (!open) return;
    const action =
      step === "chooser" && lastChoice.current
        ? lastChoice.current === "login"
          ? login.current
          : signup.current
        : null;
    (action ?? document.getElementById(headingId))?.focus({
      preventScroll: true
    });
  }, [open, step, headingId]);

  return (
    <VerificationTray
      open={open}
      onOpenChange={onOpenChange}
      returnFocusRef={returnFocusRef}
      mode={locked ? "focused" : "chooser"}
      onCancel={() => setStep("chooser")}
      cancelLabel={t.cancel}
      headingId={headingId}
      descriptionId={`${id}-description`}
      locale={locale}
      description={locked ? t.focused : t.dialog}
      closeLabel={t.close}
      header={
        <VerificationTrayTitle>
          <Heading
            id={chooserHeadingId}
            tabIndex={-1}
            className="!m-0 !text-lg !font-medium !tracking-[-0.02em]"
          >
            {t.heading}
          </Heading>
        </VerificationTrayTitle>
      }
    >
      <div className="relative">
        <AnimatePresence initial={false} mode="popLayout">
          {open && (
            <AuthenticationView
              key={`${step}-${visit}`}
              disposeOnExit={step === "signup"}
            >
              {step === "chooser" ? (
                <Panel
                  data-authentication-entry=""
                  className="px-4 pt-0 pb-2 sm:px-4 sm:pb-2"
                >
                  <PrimaryButton
                    ref={(element) => {
                      signup.current = element;
                      return attachHaptics(element);
                    }}
                    type="button"
                    data-authentication-choice="signup"
                    className="!mt-0 h-13 justify-center rounded-[16px] px-4 py-0 text-[15px] font-medium"
                    onClick={() => {
                      lastChoice.current = "signup";
                      setVisit((current) => current + 1);
                      setStep("signup");
                    }}
                  >
                    {t.signup}
                  </PrimaryButton>
                  <div
                    data-authentication-alternative=""
                    className="flex h-6 items-center justify-center text-xs text-neutral-400"
                  >
                    {t.or}
                  </div>
                  <SecondaryButton
                    ref={(element) => {
                      login.current = element;
                      return attachHaptics(element);
                    }}
                    type="button"
                    data-authentication-choice="login"
                    className="!my-0 h-13 min-h-13 rounded-[16px] border-white/10 bg-white/5 px-4 py-0 text-[15px]"
                    onClick={() => {
                      lastChoice.current = "login";
                      setVisit((current) => current + 1);
                      setStep("login");
                    }}
                  >
                    {t.login}
                  </SecondaryButton>
                  <div
                    data-authentication-locale=""
                    className="mt-2 flex justify-center"
                  >
                    <VerificationLocaleSelect />
                  </div>
                </Panel>
              ) : step === "login" ? (
                <PasswordlessLoginView
                  headingId={headingId}
                  locale={locale}
                  client={loginClient}
                  renderOtp={renderLoginOtp}
                />
              ) : localTrial ? (
                <TrialVerificationFlow headingId={headingId} />
              ) : (
                <VerificationFlow headingAs="h2" headingId={headingId} />
              )}
            </AuthenticationView>
          )}
        </AnimatePresence>
      </div>
    </VerificationTray>
  );
}

const AuthenticationView = forwardRef<
  HTMLDivElement,
  { children: ReactNode; disposeOnExit: boolean }
>(function AuthenticationView({ children, disposeOnExit }, ref) {
  const present = useIsPresent();
  return (
    <motion.div
      ref={ref}
      inert={!present}
      aria-hidden={!present}
      initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -4, filter: "blur(3px)" }}
      transition={{
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.smooth
      }}
    >
      {present || !disposeOnExit ? children : null}
    </motion.div>
  );
});
