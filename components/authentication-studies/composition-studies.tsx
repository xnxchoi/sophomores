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
import { ChevronLeft, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { motionTokens } from "../../lib/motion-tokens";
import { attachHaptics } from "../../lib/haptics";
import { AccountPhaseStudy } from "./account-phase-study";
import { phaseLabels } from "./account-phase-copy";
import type { AccountPhase, PhaseNavigation } from "./account-phase-types";
import {
  StudyChoiceAction,
  StudyBackAction,
  StudyIconAction,
  StudyLocale,
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
    language: "Language",
    close: "Close preview",
    cancel: "Cancel",
    back: "Back",
    open: "Open preview",
    welcome: "Welcome",
    boundary:
      "Presentation-only study. No account or verification requests are sent."
  },
  ko: {
    signup: "회원가입",
    login: "로그인",
    language: "언어",
    close: "미리보기 닫기",
    cancel: "취소",
    back: "뒤로",
    open: "미리보기 열기",
    welcome: "환영합니다",
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
            Vertical composition at actual CSS size. Try either action, then
            Back or Cancel. This is an isolated study—not the working
            authentication flow.
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
  const [phase, setPhase] = useState<AccountPhase>("entry");
  const [previewNotice, setPreviewNotice] = useState("");
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const signup = useRef<HTMLButtonElement>(null);
  const login = useRef<HTMLButtonElement>(null);
  const phaseNavigation = useRef<PhaseNavigation>(null);
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
        ? null
        : lastChoice.current === "login"
          ? login.current
          : signup.current;
    target?.focus({ preventScroll: true });
  }, [focused, open, view]);

  function choose(next: "signup" | "login") {
    interacted.current = true;
    lastChoice.current = next;
    setPhase("entry");
    setPreviewNotice("");
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
      <header className="flex items-center justify-between gap-5 px-1">
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
        <StudyLocale locale={locale} onChange={setLocale} label={t.language} />
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
                setPhase("entry");
                setPreviewNotice("");
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
              aria-labelledby={focused ? `${headingId}-${phase}` : headingId}
              className={cn(
                "absolute inset-x-0 mx-auto w-[calc(100%-1.5rem)] max-w-[440px] overflow-hidden rounded-[28px] bg-[#181818] text-neutral-100 shadow-[0_24px_64px_-28px_#000000b3,inset_0_1px_0_#ffffff06] ring-1 ring-white/8 outline-none",
                focused ? "font-[system-ui]" : "font-message"
              )}
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ ...geometry, opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: motionTokens.distance.md }}
              transition={transition}
            >
              <div
                data-composition-scroll=""
                className="h-full [scrollbar-width:none] overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
              >
                <div ref={content} className="flow-root">
                  <div
                    data-composition-chrome=""
                    className={cn(
                      "relative flex h-18 items-center justify-between",
                      focused ? "px-3 pt-3" : "px-4 pt-4"
                    )}
                  >
                    {focused ? (
                      <>
                        <StudyBackAction
                          aria-label={t.back}
                          onClick={() => {
                            if (!phaseNavigation.current?.back())
                              setView("chooser");
                          }}
                        >
                          <ChevronLeft
                            aria-hidden="true"
                            size={20}
                            strokeWidth={1.75}
                          />
                        </StudyBackAction>
                        <StudyTextAction
                          className="px-3 text-[13px] font-normal text-neutral-400"
                          onClick={dismiss}
                        >
                          {t.cancel}
                        </StudyTextAction>
                      </>
                    ) : (
                      <>
                        <span
                          data-composition-handle=""
                          aria-hidden="true"
                          className="absolute top-7 left-1/2 h-1 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/15"
                        />
                        <StudyIconAction
                          data-composition-close=""
                          aria-label={t.close}
                          className="absolute top-1.5 right-1.5"
                          onClick={dismiss}
                        >
                          <X aria-hidden="true" size={16} strokeWidth={1.5} />
                        </StudyIconAction>
                      </>
                    )}
                  </div>
                  <div
                    data-composition-body=""
                    className="relative px-6 pt-0 pb-6"
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <StudyView key={view}>
                        {view === "chooser" ? (
                          <>
                            <h3
                              id={headingId}
                              className="mb-6 text-[22px] leading-7 font-medium tracking-[-0.02em]"
                            >
                              {t.welcome}
                            </h3>
                            <div
                              data-composition-actions=""
                              className={cn(
                                composition === "paired"
                                  ? "grid grid-cols-2 gap-3"
                                  : "flex flex-col gap-3"
                              )}
                            >
                              <StudyChoiceAction
                                ref={(element) => {
                                  signup.current = element;
                                  return attachHaptics(element);
                                }}
                                data-composition-choice="signup"
                                tone="primary"
                                onClick={() => choose("signup")}
                              >
                                {t.signup}
                              </StudyChoiceAction>
                              <StudyChoiceAction
                                ref={(element) => {
                                  login.current = element;
                                  return attachHaptics(element);
                                }}
                                data-composition-choice="login"
                                tone="secondary"
                                onClick={() => choose("login")}
                              >
                                {t.login}
                              </StudyChoiceAction>
                            </div>
                          </>
                        ) : (
                          <AccountPhaseStudy
                            flow={view}
                            locale={locale}
                            headingId={headingId}
                            navigationRef={phaseNavigation}
                            onPhaseChange={setPhase}
                            onPreviewNotice={setPreviewNotice}
                          />
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
      {focused && open && (
        <div className="mt-3 px-1 text-[11px] leading-5 text-neutral-500">
          <p>
            {locale === "ko"
              ? "모의 흐름 · 이메일 코드 "
              : "Simulated flow · Email code "}
            <code className="font-mono text-neutral-300">12345678</code>
          </p>
          <details className="mt-2">
            <summary className="w-fit cursor-pointer rounded-md py-2 text-neutral-400 outline-none focus-visible:outline-2 focus-visible:outline-white">
              {locale === "ko" ? "다른 상태 미리보기" : "Preview another state"}
            </summary>
            <label className="mt-2 flex flex-wrap items-center gap-3">
              {locale === "ko" ? "미리보기 상태" : "Preview state"}
              <select
                aria-label={locale === "ko" ? "미리보기 상태" : "Preview state"}
                value={phase}
                onChange={(event) => {
                  const next = event.target.value;
                  if (Object.hasOwn(phaseLabels[locale], next)) {
                    phaseNavigation.current?.preview(next as AccountPhase);
                  }
                }}
                className="min-h-11 rounded-lg border border-white/15 bg-neutral-900 px-3 text-xs text-neutral-200 [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-white"
              >
                {(Object.keys(phaseLabels[locale]) as AccountPhase[]).map(
                  (option) => (
                    <option key={option} value={option}>
                      {phaseLabels[locale][option]}
                    </option>
                  )
                )}
              </select>
            </label>
          </details>
          {previewNotice && (
            <p role="status" className="mt-2 text-neutral-300">
              {previewNotice}
            </p>
          )}
        </div>
      )}
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
