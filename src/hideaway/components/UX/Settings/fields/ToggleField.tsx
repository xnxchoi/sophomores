"use client";

import { CircleNotchIcon as Loader2 } from "@phosphor-icons/react";
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";

import { cn } from "@/lib/utils";
import { FieldRow } from "./FieldRow";

/**
 * Tier 3 — Soft control field.
 *
 * Self-explanatory by definition: the control IS the affordance. We just
 * provide the layout chrome. Use `<ToggleField/>` for boolean switches and
 * the radio-style `<ChoiceField/>` for small finite selectors (theme,
 * locale, density).
 *
 * The accent color (orange, by default) is the only place the
 * categorical-token palette ever shows up on a row pill — and only for the
 * "on" state. Off is monochrome.
 */
interface ToggleFieldProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Current value. */
  value: boolean;
  /** Set the new value. */
  onChange: (next: boolean) => void | Promise<void>;
  /** Optional ambient meta — small text trailing the label area. */
  meta?: ReactNode;
  /** Disable the toggle. Reserved for sensitive flips that need a modal. */
  disabled?: boolean;
  className?: string;
}

export function ToggleField({
  label,
  description,
  icon,
  value,
  onChange,
  meta,
  disabled = false,
  className
}: ToggleFieldProps) {
  const [pending, setPending] = useState(false);
  const inputId = useId();

  const onClick = async () => {
    if (disabled || pending) return;
    setPending(true);
    try {
      await onChange(!value);
    } finally {
      setPending(false);
    }
  };

  return (
    <FieldRow
      label={label}
      description={description}
      icon={icon}
      meta={meta}
      className={className}
    >
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        aria-busy={pending}
        disabled={disabled || pending}
        onClick={onClick}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",

          value
            ? // "On" state — the only saturated hue we allow on a row pill.
              "bg-[oklch(72%_0.10_50)]"
            : "bg-foreground/15 dark:bg-foreground/12",
          (disabled || pending) && "opacity-50"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-4 items-center justify-center rounded-full bg-background shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-transform",
            value ? "translate-x-4" : "translate-x-0.5"
          )}
        >
          {pending ? (
            <Loader2 size={9} className="animate-spin text-foreground/60" />
          ) : null}
        </span>
      </button>
    </FieldRow>
  );
}

/**
 * Radio-style finite selector. Composes the same FieldRow chrome but
 * exposes a row of inline pill buttons instead of a switch. Keep choice
 * sets small (2–4 options) — anything larger should be a Combobox.
 *
 * Implements the WAI-ARIA radiogroup roving-tabindex pattern:
 * - Only the active radio is in the tab order.
 * - Arrow keys move focus (and selection) among radios within the group.
 * - Home/End jump to the first / last option.
 */
interface ChoiceFieldProps<T extends string> {
  label: string;
  description?: string;
  icon?: ReactNode;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (next: T) => void | Promise<void>;
  meta?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function ChoiceField<T extends string>({
  label,
  description,
  icon,
  value,
  options,
  onChange,
  meta,
  disabled = false,
  className
}: ChoiceFieldProps<T>) {
  const [pending, setPending] = useState<T | null>(null);
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map());

  const select = async (next: T) => {
    if (disabled || pending || next === value) return;
    setPending(next);
    try {
      await onChange(next);
    } finally {
      setPending(null);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % options.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + options.length) % options.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    const target = options[nextIndex];
    if (!target) return;
    buttonRefs.current.get(target.value)?.focus();
    void select(target.value);
  };

  return (
    <FieldRow
      label={label}
      description={description}
      icon={icon}
      meta={meta}
      className={className}
    >
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex items-center gap-0 [&>*:not(:first-child)]:-ml-px"
      >
        {options.map((opt, index) => {
          const active = value === opt.value;
          const isPending = pending === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                if (el) buttonRefs.current.set(opt.value, el);
                else buttonRefs.current.delete(opt.value);
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-busy={isPending}
              tabIndex={active ? 0 : -1}
              disabled={disabled || isPending}
              onClick={() => void select(opt.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs tracking-tight transition-colors",

                active
                  ? "border-foreground text-foreground"
                  : "border-foreground/25 text-foreground/65 hover:border-foreground/45 hover:text-foreground/90",
                (disabled || isPending) && "opacity-50"
              )}
            >
              {opt.icon ? (
                <span className="flex size-3 items-center justify-center">
                  {opt.icon}
                </span>
              ) : null}
              {opt.label}
              {isPending ? (
                <Loader2 size={10} className="animate-spin" />
              ) : null}
            </button>
          );
        })}
      </div>
    </FieldRow>
  );
}
