"use client";

import { cn } from "@/lib/utils";

const BAR_DELAYS = [
  "delay-[0s]",
  "delay-[-0.4s]",
  "delay-[-0.2s]",
  "delay-[-0.4s]"
];

export function AudioBars({
  active,
  className,
  barClassName
}: {
  active: boolean;
  className?: string;
  barClassName?: string;
}) {
  return (
    <span
      aria-hidden
      data-active={active ? "true" : "false"}
      className={cn(
        "inline-flex h-4 items-center justify-center gap-[2px]",
        className
      )}
    >
      {BAR_DELAYS.map((delayClass, index) => (
        <span
          key={index}
          className={cn(
            "c-soundwave__bar h-[6px] w-[2px] origin-center rounded-full bg-current transition-opacity duration-300",
            active ? "opacity-80" : "opacity-45",
            delayClass,
            barClassName
          )}
        />
      ))}
    </span>
  );
}
