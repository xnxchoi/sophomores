"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { cn } from "../../lib/utils";
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
        "flex h-13 w-full min-w-0 items-center justify-center rounded-[14px] border px-5 text-[15px] font-medium tracking-[-0.01em] transition-[background-color,border-color,color,transform] duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.985]",
        tone === "primary"
          ? "border-transparent bg-[#efefed] text-neutral-950 shadow-[0_1px_2px_#00000026] hover:bg-white"
          : "border-white/15 bg-white/5 text-neutral-100 shadow-[inset_0_1px_0_#ffffff08] hover:bg-white/10 active:bg-white/15",
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
        "flex h-12 min-w-0 items-center justify-center rounded-xl bg-[#e8e8e6] px-5 text-[15px] font-medium text-neutral-950 shadow-[inset_0_1px_0_#ffffff60,0_1px_2px_#00000026] transition-[background-color,color,opacity,transform] duration-200 ease-out hover:bg-[#f5f5f3] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 aria-busy:cursor-wait aria-busy:opacity-80",
        className
      )}
      {...props}
    />
  );
}

export function StudyTextAction({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-11 min-w-0 items-center justify-center rounded-[14px] px-4 text-[15px] font-medium text-neutral-200 transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98]",
        className
      )}
      {...props}
    />
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
        "group flex size-11 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        className
      )}
      {...props}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-white/5 transition-colors duration-200 ease-out group-hover:bg-white/9">
        {children}
      </span>
    </button>
  );
}

export function StudyBackAction({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-11 items-center justify-center rounded-full text-neutral-400 transition-[background-color,color,transform] duration-200 ease-out hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-white active:scale-95",
        className
      )}
      {...props}
    />
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
        className="min-h-11 appearance-none rounded-lg border-0 bg-transparent py-2 pr-7 pl-3 text-[11px] text-neutral-400 [color-scheme:dark] shadow-none transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <option value="en">English</option>
        <option value="ko">한국어</option>
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
        className="mb-2 block text-[13px] leading-[18px] font-medium text-neutral-400"
      >
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "!m-0 !h-13 !w-full !rounded-xl !border !border-solid !border-white/12 !bg-black/10 !px-4 !py-0 !text-base !font-normal !tracking-normal !text-neutral-100 !shadow-[inset_0_1px_3px_#00000018] transition-[border-color,box-shadow,opacity] duration-200 ease-out focus:!border-white/45 focus:!shadow-[inset_0_0_0_1px_#ffffff24] focus:!outline-none disabled:opacity-60",
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
            "grid w-full min-w-0 grid-cols-6 gap-1 has-aria-invalid:border-transparent has-aria-invalid:ring-0 min-[400px]:gap-2 dark:has-aria-invalid:ring-0 [&_[data-slot=input-otp-caret]]:bg-neutral-100"
          )}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <StudyCodeSlot key={index} index={index} invalid={invalid} caretPaused={!visible} />
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
      className="h-13 w-full min-w-0 rounded-[10px] border border-white/15 bg-black/10 text-[22px] font-medium text-neutral-100 tabular-nums shadow-[inset_0_1px_3px_#00000018] transition-[border-color,background-color,box-shadow,color] duration-200 ease-out [font-family:system-ui] first:rounded-[10px] last:rounded-[10px] aria-invalid:border-white/50 aria-invalid:bg-white/4 data-[active=true]:border-white/60 data-[active=true]:ring-1 data-[active=true]:ring-white/20 data-[active=true]:aria-invalid:border-white/70 data-[active=true]:aria-invalid:ring-white/20 dark:bg-black/10 dark:data-[active=true]:aria-invalid:ring-white/20"
    />
  );
}
