"use client";

import { attachHaptics } from "../../lib/haptics";

import {
  ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { copyVerificationValue } from "../../lib/phone-verification/clipboard";
import { motionTokens } from "../../lib/motion-tokens";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/arc/copy-button/copy-button";

export const Modal = ({
  children,
  className,
  ...props
}: ComponentProps<typeof motion.div>) => {
  return (
    <motion.div
      className={cn(
        "fixed inset-x-0 bottom-3 z-50 mx-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[440px] !touch-pan-y [scrollbar-width:thin] [scrollbar-color:#525252_transparent] [scrollbar-gutter:stable] overflow-y-auto overscroll-contain rounded-3xl bg-teaser-card/95 p-0 text-white shadow-[0_24px_64px_-24px_#000000b3,inset_0_1px_0_#ffffff12] ring-1 ring-white/12 backdrop-blur-2xl outline-none after:!hidden sm:bottom-6 sm:max-h-[calc(100dvh-3rem)]",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
export const Bar = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex shrink-0 items-center justify-between bg-teaser-card/95 px-6 pt-4 pb-1 backdrop-blur-xl sm:px-7",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
export const Close = ({
  children,
  className,
  ...props
}: ComponentProps<"button">) => {
  return (
    <button
      type="button"
      className={cn(
        "relative flex size-11 items-center justify-center rounded-lg text-2xl text-neutral-400 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
export const Panel = ({
  children,
  className,
  ...props
}: ComponentProps<"section">) => {
  return (
    <section
      className={cn("px-6 pt-1 pb-6 font-message sm:px-7 sm:pb-7", className)}
      {...props}
    >
      {children}
    </section>
  );
};
export const Heading = ({
  children,
  className,
  as: Component = "h2",
  ...props
}: ComponentProps<"h2"> & {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}) => {
  return (
    <Component
      className={cn(
        "mt-3 mb-3 text-left text-[30px] leading-[1.12] font-semibold tracking-[-0.045em] text-white outline-none sm:text-[34px]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};
export const Description = ({
  children,
  className,
  ...props
}: ComponentProps<"p">) => {
  return (
    <p
      className={cn(
        "mb-5 max-w-[38ch] text-left text-sm leading-relaxed break-keep text-neutral-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
};
export function Note({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "my-3 text-xs leading-relaxed break-keep text-neutral-400",
        className
      )}
      {...props}
    />
  );
}
export function PrimaryButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "relative mt-5 flex min-h-13 w-full items-center justify-between gap-3 rounded-lg bg-white px-5 py-3.5 text-sm font-semibold text-teaser-card shadow-[0_1px_2px_#00000050,inset_0_1px_0_#ffffff80] transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-neutral-500",
        className
      )}
      {...props}
    />
  );
}

export function PrimaryLink({ className, ...props }: ComponentProps<"a">) {
  return (
    <a
      className={cn(
        "relative mt-5 flex min-h-13 w-full items-center justify-between gap-3 rounded-lg bg-white px-5 py-3.5 text-sm font-semibold text-teaser-card shadow-[0_1px_2px_#00000050,inset_0_1px_0_#ffffff80] transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-neutral-500",
        className
      )}
      {...props}
    />
  );
}
export function SecondaryButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "relative my-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white shadow-[inset_0_1px_0_#ffffff08] transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:bg-white/15 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
export function TextButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "relative flex min-h-11 items-center justify-center px-1 text-xs text-neutral-400 underline-offset-4 transition-colors duration-200 ease-out hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-white",
        className
      )}
      {...props}
    />
  );
}

export function VerificationDetails({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div
      className="mt-4 border-t border-white/10 text-neutral-400"
      data-verification-details=""
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-full items-center justify-between text-left text-[11px] font-medium transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {label}
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.24, ease: motionTokens.easing.smooth }}
        >
          +
        </motion.span>
      </button>
      <motion.div
        id={id}
        inert={!open}
        aria-hidden={!open}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="overflow-hidden text-xs leading-relaxed"
      >
        <div className="pb-3">{children}</div>
      </motion.div>
    </div>
  );
}

export function VerificationBoundary({ children }: { children: ReactNode }) {
  return (
    <p
      data-verification-boundary=""
      className="mt-4 border-t border-white/10 pt-4 text-left text-[11px] leading-relaxed text-neutral-400"
    >
      {children}
    </p>
  );
}

export function VerificationMark({
  state
}: {
  state: "entry" | "pending" | "success" | "error";
}) {
  if (state === "entry") return null;
  const pending = state === "pending";
  return (
    <div
      className="flex h-5 items-center gap-1"
      aria-hidden="true"
      data-verification-mark={state}
    >
      {pending ? (
        [0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="size-1.5 rounded-full bg-white"
            animate={{ opacity: [0.25, 1, 0.25], scaleX: [0.8, 1, 0.8] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))
      ) : (
        <motion.span
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.24, ease: motionTokens.easing.smooth }}
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-sm",
            state === "success"
              ? "bg-white text-teaser-card"
              : "bg-amber-300/15 text-amber-200"
          )}
        >
          {state === "success" ? "✓" : "!"}
        </motion.span>
      )}
    </div>
  );
}

function CopyValue({
  value,
  kind
}: {
  value: string;
  kind: "recipient" | "code";
}) {
  const t = useTranslations("Verification");
  const [feedback, setFeedback] = useState<"idle" | "copied" | "failed">(
    "idle"
  );
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  useEffect(
    () => () => {
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  async function copy() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const current = ++generation.current;
    if (timer.current) clearTimeout(timer.current);
    const copied = await copyVerificationValue(value, navigator.clipboard);
    if (current !== generation.current) return;
    inFlight.current = false;
    setBusy(false);
    setFeedback(copied ? "copied" : "failed");
    timer.current = setTimeout(() => setFeedback("idle"), 2400);
  }

  return (
    <div
      className={cn(
        "min-w-0 px-4 py-3.5",
        kind === "code" ? "border-t border-white/15 bg-white/3" : ""
      )}
    >
      <div className="mb-2 flex h-12 items-center justify-between gap-3">
        <span
          className={cn(
            "text-[11px] font-medium",
            kind === "code" ? "text-white" : "text-neutral-400"
          )}
        >
          {t(kind === "code" ? "codeLabel" : "recipientLabel")}
        </span>
        <motion.button
          ref={attachHaptics}
          type="button"
          onClick={() => void copy()}
          disabled={busy}
          aria-label={t(kind === "code" ? "copyCode" : "copyRecipient")}
          className={cn(
            "relative flex min-h-11 w-28 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors duration-300 ease-out focus-visible:outline-2 focus-visible:outline-white",
            feedback === "copied"
              ? "bg-white text-teaser-card"
              : feedback === "failed"
                ? "bg-amber-300/15 text-amber-200"
                : "bg-white/8 text-white hover:bg-white/15"
          )}
          whileTap={{ scale: motionTokens.scale.press }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.smooth
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              className="inline-block w-4 text-center"
              key={feedback}
              initial={{ y: 3, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -3, opacity: 0 }}
              transition={{
                duration: motionTokens.duration.fast,
                ease: motionTokens.easing.smooth
              }}
            >
              {feedback === "copied" ? "✓" : feedback === "failed" ? "!" : "⧉"}
            </motion.span>
          </AnimatePresence>
          {t(
            feedback === "copied"
              ? "copied"
              : feedback === "failed"
                ? "copyRetry"
                : "copy"
          )}
        </motion.button>
      </div>
      <code
        className={cn(
          "block font-mono leading-relaxed break-all text-white select-all",
          kind === "code" ? "text-[22px] tracking-[-0.025em]" : "text-sm"
        )}
      >
        {value}
      </code>
      <p role="status" className="sr-only">
        {feedback === "failed"
          ? t("copyFailed")
          : feedback === "copied"
            ? t("copied")
            : ""}
      </p>
      <motion.div
        data-copy-error=""
        aria-hidden="true"
        initial={false}
        animate={{
          height: feedback === "failed" ? "auto" : 0,
          opacity: feedback === "failed" ? 1 : 0
        }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="overflow-hidden"
      >
        <p className="pt-2 text-[11px] leading-relaxed text-amber-200">
          {t("copyFailed")}
        </p>
      </motion.div>
    </div>
  );
}

export function ChallengeCard({
  recipient,
  body
}: {
  recipient: string;
  body: string;
}) {
  const t = useTranslations("Verification");
  return (
    <div className="my-4 overflow-hidden rounded-lg border border-white/15 bg-black/20 shadow-[inset_0_1px_0_#00000030]">
      <div className="min-w-0 px-4 py-3.5">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-neutral-400">{t("recipientLabel")}</span>
          <CopyButton
            key={`recipient:${recipient}`}
            value={recipient}
            label={t("copyRecipient")}
            className="!size-11 !min-h-11 !text-white"
            iconOnly
            variant="plain"
          />
        </div>
        <code className="block font-mono text-sm leading-relaxed wrap-anywhere text-white select-all">{recipient}</code>
      </div>
      <div className="min-w-0 border-t border-white/15 bg-white/3 px-4 py-3.5">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-white">{t("codeLabel")}</span>
          <CopyButton
            key={`code:${body}`}
            value={body}
            label={t("copyCode")}
            className="!size-11 !min-h-11 !text-white"
            variant="plain"
            iconOnly
          />
        </div>
        <code className="block font-mono text-[22px] leading-relaxed tracking-[-0.025em] wrap-anywhere text-white select-all">{body}</code>
      </div>
    </div>
  );
}
