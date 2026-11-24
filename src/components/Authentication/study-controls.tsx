//TODO: Check each file/code with "Study" in its name for relevance; rename if useful in some way, delete otherwise

"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { cn } from "../../lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";

export function StudyChoiceAction({
  tone,
  className,
  ...props
}: ComponentProps<"button"> & { tone: "primary" | "secondary" }) {
  return (
    <button
      type="button"
      data-composition-choice-tone={tone}
      className={cn(
        "flex h-13 w-full min-w-0 items-center justify-center rounded-[14px] border px-5 text-[15px] font-medium tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground active:scale-[0.985]",
        tone === "primary"
          ? "border-transparent bg-foreground text-background hover:bg-foreground/90"
          : "border-border bg-transparent text-foreground hover:bg-muted active:bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function StudyPrimaryAction({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 min-w-0 items-center justify-center rounded-xl bg-foreground px-5 text-[15px] font-medium text-background transition-[background-color,color,opacity,transform] duration-200 ease-out hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground active:scale-[0.985] disabled:opacity-40 aria-busy:opacity-80",
        className
      )}
      {...props}
    />
  );
}

export function StudyTextAction({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group/focus flex min-h-11 min-w-0 items-center justify-center rounded-[14px] px-4 text-[15px] font-medium text-foreground transition-[background-color,color,transform] duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-[0.98]",
        className
      )}
      {...props}
    >
      <FocusShape className="inline-flex items-center justify-center gap-[inherit] outline-offset-4 group-focus-visible/focus:outline-foreground">{children}</FocusShape>
    </button>
  );
}

export function StudyIconAction({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group group/focus flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground",
        className
      )}
      {...props}
    >
      <FocusShape className="flex size-7 items-center justify-center rounded-full bg-transparent transition-colors duration-200 ease-out group-hover:bg-muted group-focus-visible/focus:outline-foreground">
        {children}
      </FocusShape>
    </button>
  );
}

export function StudyBackAction({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "group/focus flex size-11 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-200 ease-out hover:bg-muted hover:text-foreground active:scale-95",
        className
      )}
      {...props}
    >
      <FocusShape className="flex items-center justify-center group-focus-visible/focus:outline-foreground">{children}</FocusShape>
    </button>
  );
}

export function StudyLocale({
  locale,
  onChange,
  label
}: {
  locale: "en" | "ko";
  onChange: (locale: "en" | "ko") => void;
  label: string;
}) {
  return (
    <div className="relative w-fit">
      <select
        aria-label={label}
        value={locale}
        onChange={(event) =>
          onChange(event.target.value === "ko" ? "ko" : "en")
        }
        className="min-h-11 appearance-none rounded-lg border-0 bg-transparent py-2 pr-7 pl-3 text-[11px] text-muted-foreground shadow-none transition-colors duration-200 ease-out hover:text-foreground focus-visible:text-foreground"
      >
        <option value="en">English</option>
        <option value="ko">한국어</option>
      </select>
      <ChevronDown
        aria-hidden="true"
        size={12}
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export function StudyField({
  label,
  id,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode; id: string }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[13px] leading-[18px] font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "!m-0 !h-13 !w-full !rounded-xl !border !border-solid !border-border !bg-transparent !px-4 !py-0 !text-base !font-normal !tracking-normal !text-foreground transition-[border-color,box-shadow,opacity] duration-200 ease-out focus:!border-foreground focus:!outline-none disabled:opacity-60",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function StudyCodeField({
  id,
  label,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  descriptionId,
  visible
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
  descriptionId: string;
  visible: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <InputOTP
        id={id}
        maxLength={6}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="one-time-code"
        value={value}
        onChange={(next) => {
          const normalized = next.toUpperCase();
          onChange(normalized);
          // Native completion handles partial → full, not replacing a rejected full code.
          if (
            invalid &&
            value.length === 6 &&
            normalized.length === 6 &&
            normalized !== value &&
            !disabled &&
            visible
          )
            onComplete(normalized);
        }}
        onComplete={(completed: string) => {
          if (!disabled && visible) onComplete(completed.toUpperCase());
        }}
        pasteTransformer={(pasted) => pasted.replace(/[\s-]/g, "")}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={descriptionId}
        containerClassName="mx-auto w-full max-w-88 min-w-0"
        className="!m-0 !border-0 !p-0 !shadow-none !outline-none"
      >
        <InputOTPGroup
          aria-hidden="true"
          className={cn(
            "grid w-full min-w-0 grid-cols-6 gap-1 has-aria-invalid:border-transparent has-aria-invalid:ring-0 min-[400px]:gap-2 dark:has-aria-invalid:ring-0 [&_[data-slot=input-otp-caret]]:bg-foreground"
          )}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <StudyCodeSlot
              key={index}
              index={index}
              invalid={invalid}
              caretPaused={!visible}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

function StudyCodeSlot({
  index,
  invalid,
  caretPaused
}: {
  index: number;
  invalid: boolean;
  caretPaused: boolean;
}) {
  return (
    <InputOTPSlot
      index={index}
      caretPaused={caretPaused}
      aria-invalid={invalid}
      className="h-13 w-full min-w-0 rounded-[10px] border border-border bg-transparent [font-family:system-ui] text-[22px] font-medium text-foreground tabular-nums transition-[border-color,background-color,box-shadow,color] duration-200 ease-out first:rounded-[10px] last:rounded-[10px] aria-invalid:border-foreground aria-invalid:bg-muted data-[active=true]:border-foreground data-[active=true]:aria-invalid:border-foreground"
    />
  );
}
