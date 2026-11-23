"use client";

import { attachHaptics } from "../../../lib/haptics";

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
import { copyVerificationValue } from "../../../lib/phone-verification/clipboard";
import { motionTokens } from "../../../lib/motion-tokens";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { CopyButton } from "@/components/arc/copy-button/copy-button";

export const Modal = ({
  children,
  className,
  ...props
}: ComponentProps<typeof motion.div>) => {
  return (
    <motion.div
      className={cn(
        "fixed inset-x-0 bottom-3 z-50 mx-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-[440px] !touch-pan-y [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [scrollbar-gutter:stable] overflow-y-auto overscroll-contain rounded-3xl bg-background/95 p-0 text-foreground shadow-2xl ring-1 backdrop-blur-2xl outline-none after:!hidden sm:bottom-6 sm:max-h-[calc(100dvh-3rem)]",
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
        "sticky top-0 z-10 flex shrink-0 items-center justify-between bg-background/95 px-6 pt-4 pb-1 backdrop-blur-xl sm:px-7",
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
        "group/focus relative flex size-11 items-center justify-center rounded-lg text-2xl text-muted-foreground transition-colors duration-200 ease-out hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      <FocusShape className="flex items-center justify-center group-focus-visible/focus:outline-foreground">{children}</FocusShape>
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
        "mt-3 mb-3 text-left text-[30px] leading-[1.12] font-semibold tracking-[-0.045em] text-foreground outline-none sm:text-[34px]",
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
        "mb-5 max-w-[38ch] text-left text-sm leading-relaxed break-keep text-muted-foreground",
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
        "my-3 text-xs leading-relaxed break-keep text-muted-foreground",
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
        "relative mt-5 flex min-h-13 w-full items-center justify-between gap-3 rounded-lg bg-foreground px-5 py-3.5 text-sm font-semibold text-background transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
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
        "relative mt-5 flex min-h-13 w-full items-center justify-between gap-3 rounded-lg bg-foreground px-5 py-3.5 text-sm font-semibold text-background transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
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
        "relative my-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-3 text-sm font-medium text-foreground transition-colors duration-200 ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:bg-muted disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
export function TextButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "group/focus relative flex min-h-11 items-center justify-center px-1 text-xs text-muted-foreground underline-offset-4 transition-colors duration-200 ease-out hover:text-foreground hover:underline",
        className
      )}
      {...props}
    >
      <FocusShape className="inline-flex items-center justify-center gap-[inherit] group-focus-visible/focus:outline-foreground">{children}</FocusShape>
    </button>
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
      className="mt-4 border-t border-border text-muted-foreground"
      data-verification-details=""
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="group/focus flex h-11 w-full items-center justify-between text-left text-[11px] font-medium transition-colors duration-200 ease-out hover:text-foreground"
      >
        <FocusShape className="group-focus-visible/focus:outline-foreground">{label}</FocusShape>
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
      className="mt-4 border-t border-border pt-4 text-left text-[11px] leading-relaxed text-muted-foreground"
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
            className="size-1.5 rounded-full bg-foreground"
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
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground"
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
        kind === "code" ? "border-t border-border bg-muted" : ""
      )}
    >
      <div className="mb-2 flex h-12 items-center justify-between gap-3">
        <span
          className={cn(
            "text-[11px] font-medium",
            kind === "code" ? "text-foreground" : "text-muted-foreground"
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
            "group/focus relative flex min-h-11 w-28 shrink-0 items-center justify-center rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors duration-300 ease-out",
            feedback === "copied"
              ? "bg-foreground text-background"
              : feedback === "failed"
                ? "bg-muted text-muted-foreground"
                : "bg-transparent text-foreground hover:bg-muted"
          )}
          whileTap={{ scale: motionTokens.scale.press }}
          transition={{
            duration: motionTokens.duration.fast,
            ease: motionTokens.easing.smooth
          }}
        >
          <FocusShape className="inline-flex items-center justify-center gap-2 group-focus-visible/focus:outline-foreground">
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
        </FocusShape>
        </motion.button>
      </div>
      <code
        className={cn(
          "block font-sans tabular-nums leading-relaxed break-all text-foreground select-all",
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
        <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
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
    <div className="my-4 overflow-hidden rounded-lg border border-border bg-transparent">
      <div className="min-w-0 px-4 py-3.5">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-muted-foreground">{t("recipientLabel")}</span>
          <CopyButton
            key={`recipient:${recipient}`}
            value={recipient}
            label={t("copyRecipient")}
            className="!size-11 !min-h-11 !text-foreground"
            iconOnly
            variant="plain"
          />
        </div>
        <code className="block font-sans tabular-nums text-sm leading-relaxed wrap-anywhere text-foreground select-all">{recipient}</code>
      </div>
      <div className="min-w-0 border-t border-border bg-muted px-4 py-3.5">
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-foreground">{t("codeLabel")}</span>
          <CopyButton
            key={`code:${body}`}
            value={body}
            label={t("copyCode")}
            className="!size-11 !min-h-11 !text-foreground"
            variant="plain"
            iconOnly
          />
        </div>
        <code className="block font-sans tabular-nums text-[22px] leading-relaxed tracking-[-0.025em] wrap-anywhere text-foreground select-all">{body}</code>
      </div>
    </div>
  );
}
