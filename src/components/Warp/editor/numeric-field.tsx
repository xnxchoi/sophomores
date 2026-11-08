"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "cn";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
};

// Preserve intermediate text (for example '-' or '3' while typing '35').
// Valid values still preview immediately; blur restores the last accepted value.
export default function NumericField({
  value,
  onValueChange,
  className,
  ...props
}: Props) {
  const [entry, setEntry] = useState({ accepted: value, text: String(value) });
  if (entry.accepted !== value)
    setEntry({ accepted: value, text: String(value) });
  return (
    <input
      {...props}
      type="number"
      value={entry.text}
      onChange={(event) => {
        setEntry({ accepted: value, text: event.currentTarget.value });
        const next = event.currentTarget.valueAsNumber;
        if (Number.isFinite(next)) onValueChange(next);
      }}
      onBlur={() => setEntry({ accepted: value, text: String(value) })}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={cn(
        "min-h-9 w-full rounded border border-white/25 bg-black! px-2 text-white! focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40",
        className
      )}
    />
  );
}
