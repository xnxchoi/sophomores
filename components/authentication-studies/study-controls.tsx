"use client";

import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

export function StudyPrimaryAction({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-13 min-w-0 items-center justify-center rounded-[14px] bg-neutral-100 px-4 text-[15px] font-medium text-neutral-950 shadow-[inset_0_1px_0_#ffffff80,0_1px_2px_#00000030] transition-[background-color,transform] duration-200 ease-out hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35",
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
  ...props
}: ComponentProps<"input"> & { label: ReactNode; id: string }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-medium text-neutral-400"
      >
        {label}
      </label>
      <input
        id={id}
        className="!m-0 !h-14 !w-full !rounded-[14px] !border !border-solid !border-white/15 !bg-black/15 !px-4 !py-0 !text-base !font-normal !tracking-normal !text-neutral-100 !shadow-none transition-[border-color,box-shadow] duration-200 ease-out focus:!border-white/50 focus:!outline-2 focus:!outline-offset-2 focus:!outline-white/30"
        {...props}
      />
    </div>
  );
}
