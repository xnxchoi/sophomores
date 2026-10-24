"use client";

import {
  forwardRef,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject
} from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { motionTokens } from "../../lib/motion-tokens";
import { attachHaptics } from "../../lib/haptics";
import {
  StudyField,
  StudyIconAction,
  StudyLocale,
  StudyPrimaryAction,
  StudyTextAction
} from "./study-controls";

type Composition = "stacked" | "paired";
type View = "chooser" | "signup" | "login";
type Locale = "en" | "ko";
const transition = {
  duration: motionTokens.duration.normal,
  ease: motionTokens.easing.smooth
};
const copy = {
  en: {
    signup: "Sign up",
    login: "Log in",
    or: "Or",
    language: "Language",
    close: "Close preview",
    cancel: "Cancel",
    back: "Back",
    open: "Open preview",
    options: "Account options",
    email: "Email address",
    phone: "Mobile number",
    continue: "Continue",
    loginNote: "Use the email associated with your account.",
    signupNote: "Start with your mobile number.",
    boundary:
      "Presentation-only study. No account or verification requests are sent."
  },
  ko: {
    signup: "회원가입",
    login: "로그인",
    or: "Or",
    language: "언어",
    close: "미리보기 닫기",
    cancel: "취소",
    back: "뒤로",
    open: "미리보기 열기",
    options: "계정 선택",
    email: "이메일 주소",
    phone: "휴대폰 번호",
    continue: "계속",
    loginNote: "계정에 연결된 이메일을 사용하세요.",
    signupNote: "휴대폰 번호로 시작하세요.",
    boundary:
      "화면 구성만 비교하는 미리보기입니다. 계정 생성이나 인증 요청은 전송하지 않아요."
  }
} as const;

export function AuthenticationCompositionStudies() {
  return (
    <main className="min-h-svh bg-[#090909] px-4 py-8 font-message text-neutral-100 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[640px]">
        <header className="mb-10 flex max-w-xl flex-col gap-3">
          <p className="text-[11px] tracking-[0.12em] text-neutral-500 uppercase">
            Account entry study
          </p>
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.035em]">
            Account entry
          </h1>
          <p className="text-sm leading-relaxed text-neutral-400">
            Vertical composition at actual CSS size. Try either action, then Back
            or Cancel. This is an isolated study—not the working authentication
            flow.
          </p>
        </header>
        <CompositionPreview composition="stacked" />
      </div>
    </main>
  );
}

/** Inline studies, deliberately not two modal dialogs or real authentication clients. */
export function CompositionPreview({
  composition,
  locale: initialLocale = "en"
}: {
  composition: Composition;
  locale?: Locale;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const [view, setView] = useState<View>("chooser");
  const [open, setOpen] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const login = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const reopen = useRef<HTMLButtonElement>(null);
  const lastChoice = useRef<View>("signup");
  const interacted = useRef(false);
  const id = useId();
  const t = copy[locale];
  const focused = view !== "chooser";
  const headingId = `${id}-${view}`;
  const geometry = usePreviewGeometry(frame, content, focused, open);

  useLayoutEffect(() => {
    if (!interacted.current) return;
    const target = !open
      ? reopen.current
      : focused
        ? field.current
        : lastChoice.current === "login"
          ? login.current
          : signup.current;
    target?.focus({ preventScroll: true });
  }, [focused, open, view]);

  function choose(next: "signup" | "login") {
    interacted.current = true;
    lastChoice.current = next;
    setView(next);
  }
  function dismiss() {
    interacted.current = true;
    setOpen(false);
  }

  return (
    <article
      data-composition-preview={composition}
      className="min-w-0 border-t border-white/10 pt-5"
      lang={locale}
    >
      <header className="flex items-start justify-between gap-5 px-1">
        <div>
          <h2 className="text-sm font-medium text-neutral-200">
            {composition === "stacked"
              ? "Vertical · Selected direction"
              : "B · Compact pairing"}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            {composition === "stacked"
              ? "One filled action. One quiet alternative."
              : "One decision, on a single line."}
          </p>
        </div>
        <span className="text-[10px] whitespace-nowrap text-neutral-600">
          1:1 CSS size
        </span>
      </header>
      <div
        ref={frame}
        data-composition-frame=""
        className="relative isolate mt-4 h-[440px] overflow-hidden bg-[#0c0c0c] sm:h-[500px]"
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            dismiss();
          }
        }}
      >
        {!open && (
          <div className="absolute inset-0 flex items-center justify-center">
            <StudyTextAction
              ref={reopen}
              className="border border-white/15 px-5 text-sm"
              onClick={() => {
                interacted.current = true;
                lastChoice.current = "signup";
                setView("chooser");
                setOpen(true);
              }}
            >
              {t.open}
            </StudyTextAction>
          </div>
        )}
        <AnimatePresence initial={false}>
          {open && (
            <motion.section
              key="surface"
              data-composition-surface=""
              data-composition-view={view}
              role="group"
              aria-labelledby={headingId}
              className="absolute inset-x-0 mx-auto w-[calc(100%-1.5rem)] max-w-[380px] overflow-hidden rounded-[28px] bg-[#1a1a1a] font-message text-neutral-100 shadow-[0_16px_40px_-18px_#000000cc,inset_0_1px_0_#ffffff0a] ring-1 ring-white/9 outline-none"
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ ...geometry, opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: motionTokens.distance.md }}
              transition={transition}
            >
              <div className="h-full [scrollbar-width:thin] [scrollbar-color:#525252_transparent] overflow-y-auto overscroll-contain">
                <div ref={content} className="flow-root">
                  <div className="relative flex h-16 items-center justify-between px-3 pt-3">
                    {focused ? (
                      <>
                        <StudyIconAction
                          aria-label={t.back}
                          onClick={() => setView("chooser")}
                        >
                          <ArrowLeft
                            aria-hidden="true"
                            size={16}
                            strokeWidth={1.5}
                          />
                        </StudyIconAction>
                        <StudyTextAction
                          className="px-3 text-xs text-neutral-400"
                          onClick={dismiss}
                        >
                          {t.cancel}
                        </StudyTextAction>
                      </>
                    ) : (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute top-5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-white/15"
                        />
                        <StudyIconAction
                          aria-label={t.close}
                          className="ml-auto"
                          onClick={dismiss}
                        >
                          <X aria-hidden="true" size={16} strokeWidth={1.5} />
                        </StudyIconAction>
                      </>
                    )}
                  </div>
                  <div className="relative px-6 pt-4 pb-5">
                    <AnimatePresence initial={false} mode="popLayout">
                      <StudyView key={view}>
                        {view === "chooser" ? (
                          <>
                            <h3 id={headingId} className="sr-only">
                              {t.options}
                            </h3>
                            <div
                              data-composition-actions=""
                              className={cn(
                                composition === "paired" &&
                                  "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
                              )}
                            >
                              <StudyPrimaryAction
                                ref={(element) => {
                                  signup.current = element;
                                  return attachHaptics(element);
                                }}
                                data-composition-choice="signup"
                                className="w-full px-2"
                                onClick={() => choose("signup")}
                              >
                                {t.signup}
                              </StudyPrimaryAction>
                              <span
                                data-composition-alternative=""
                                className={cn(
                                  "flex items-center justify-center text-[11px] text-neutral-400",
                                  composition === "stacked" ? "h-6" : "px-0.5"
                                )}
                              >
                                {t.or}
                              </span>
                              <StudyTextAction
                                ref={(element) => {
                                  login.current = element;
                                  return attachHaptics(element);
                                }}
                                data-composition-choice="login"
                                className={cn(
                                  "w-full px-2",
                                  composition === "paired" &&
                                    "h-13 bg-white/6 shadow-[inset_0_1px_0_#ffffff0a] hover:bg-white/10"
                                )}
                                onClick={() => choose("login")}
                              >
                                {t.login}
                              </StudyTextAction>
                            </div>
                            <div className="mt-1 flex justify-end">
                              <StudyLocale
                                locale={locale}
                                onChange={setLocale}
                                label={t.language}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="px-1 pt-1 pb-3">
                            <h3
                              id={headingId}
                              className="mb-3 text-2xl leading-tight font-medium tracking-[-0.035em]"
                            >
                              {view === "login" ? t.login : t.signup}
                            </h3>
                            <p className="mb-6 text-sm leading-relaxed text-neutral-400">
                              {view === "login" ? t.loginNote : t.signupNote}
                            </p>
                            <form onSubmit={(event) => event.preventDefault()}>
                              <StudyField
                                ref={field}
                                id={`${id}-${view}-field`}
                                label={view === "login" ? t.email : t.phone}
                                type={view === "login" ? "email" : "tel"}
                                inputMode={view === "login" ? "email" : "tel"}
                                readOnly
                                value={
                                  view === "login"
                                    ? "you@example.com"
                                    : "010-0000-0000"
                                }
                              />
                              <StudyPrimaryAction
                                type="submit"
                                disabled
                                className="mt-5 w-full"
                              >
                                {t.continue}
                              </StudyPrimaryAction>
                            </form>
                          </div>
                        )}
                      </StudyView>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-neutral-500">
        {t.boundary}
      </p>
    </article>
  );
}

const StudyView = forwardRef<HTMLDivElement, { children: ReactNode }>(
  function StudyView({ children }, ref) {
    const present = useIsPresent();
    return (
      <motion.div
        ref={ref}
        inert={!present}
        aria-hidden={!present}
        initial={{ opacity: 0, y: motionTokens.distance.sm }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -motionTokens.distance.sm }}
        transition={{
          duration: motionTokens.duration.fast,
          ease: motionTokens.easing.smooth
        }}
      >
        {children}
      </motion.div>
    );
  }
);

function usePreviewGeometry(
  frame: RefObject<HTMLDivElement | null>,
  content: RefObject<HTMLDivElement | null>,
  focused: boolean,
  open: boolean
) {
  const [bounds, setBounds] = useState({ width: 0, height: 500, content: 0 });
  useLayoutEffect(() => {
    if (!open) return;
    function measure() {
      if (!frame.current || !content.current) return;
      const rect = frame.current.getBoundingClientRect();
      const height = content.current.getBoundingClientRect().height;
      setBounds((current) =>
        current.width === rect.width &&
        current.height === rect.height &&
        current.content === height
          ? current
          : { width: rect.width, height: rect.height, content: height }
      );
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, [frame, content, focused, open]);
  const height = bounds.content
    ? Math.min(bounds.content, Math.max(0, bounds.height - 48))
    : undefined;
  return {
    width: bounds.width
      ? Math.min(focused ? 440 : 380, Math.max(0, bounds.width - 24))
      : undefined,
    height: height ?? "auto",
    bottom: focused && height ? (bounds.height - height) / 2 : 24
  };
}
