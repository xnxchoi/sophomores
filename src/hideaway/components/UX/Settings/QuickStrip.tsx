"use client";

import { Link } from "@/hideaway/components/core/Link/Link";
import { ChevronRight, Loader2, Moon, ShieldCheck, Sun } from "lucide-react";
import {
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode
} from "react";

import { useTheme } from "@/hideaway/providers/Theme";
import { setLocaleAction } from "@/app/(frontend)/(site)/(auth)/me/settings/_helpers/setLocale";
import { cn } from "@/lib/utils";

/**
 * Quick toggles strip — most-frequented settings as direct flips, no
 * drill-in. Lives at the top of the settings hub, just below the
 * masthead. Theme + locale as direct controls; 2FA + active sessions
 * as a status tile that drills into Security.
 *
 * The inner radio control is inlined here rather than reusing
 * <ChoiceField/> because ChoiceField wraps in <FieldRow/> with its own
 * label, which would double-render against the QuickTile column label.
 */
interface QuickStripProps {
  initialLocale: "en" | "ko";
  twoFactorEnabled: boolean;
  activeSessionsCount: number;
}

export function QuickStrip({
  initialLocale,
  twoFactorEnabled,
  activeSessionsCount
}: QuickStripProps) {
  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-3">
      <ThemeQuick />
      <LocaleQuick initialLocale={initialLocale} />
      <SecurityQuick
        twoFactorEnabled={twoFactorEnabled}
        activeSessionsCount={activeSessionsCount}
      />
    </section>
  );
}

function ThemeQuick() {
  const theme = useTheme((s) => s.theme);
  const setTheme = useTheme((s) => s.setTheme);
  const saveTheme = useTheme((s) => s.saveTheme);

  return (
    <QuickTile label="Theme">
      <RadioGroup<"light" | "dark">
        ariaLabel="Theme"
        value={(theme as "light" | "dark") ?? "light"}
        options={[
          { value: "light", label: "Light", icon: <Sun size={12} /> },
          { value: "dark", label: "Dark", icon: <Moon size={12} /> }
        ]}
        onChange={async (next) => {
          setTheme(next);
          saveTheme(next);
        }}
      />
    </QuickTile>
  );
}

function LocaleQuick({ initialLocale }: { initialLocale: "en" | "ko" }) {
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useState<"en" | "ko">(initialLocale);

  const onChange = async (next: "en" | "ko") => {
    if (next === active) return;
    setActive(next);
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await setLocaleAction(next);
          resolve();
        } catch (e) {
          setActive(initialLocale);
          reject(e);
        }
      });
    });
  };

  return (
    <QuickTile label="Language">
      <RadioGroup<"en" | "ko">
        ariaLabel="Language"
        value={active}
        disabled={pending}
        options={[
          { value: "en", label: "EN" },
          { value: "ko", label: "KO" }
        ]}
        onChange={onChange}
      />
    </QuickTile>
  );
}

function SecurityQuick({
  twoFactorEnabled,
  activeSessionsCount
}: {
  twoFactorEnabled: boolean;
  activeSessionsCount: number;
}) {
  return (
    <Link
      href="/me/settings/security"
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors",
        "bg-foreground/[0.025] hover:bg-foreground/[0.045] dark:bg-foreground/[0.03] dark:hover:bg-foreground/[0.05]",
        "focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            twoFactorEnabled
              ? "bg-[oklch(70%_0.14_160/0.18)] text-[oklch(85%_0.10_160)]"
              : "bg-foreground/[0.06] text-foreground/70 dark:bg-foreground/[0.08]"
          )}
        >
          <ShieldCheck size={14} strokeWidth={1.4} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-foreground/55 dark:text-foreground/50">
            Security
          </span>
          <span className="truncate text-sm text-foreground">
            {twoFactorEnabled ? "2FA on" : "2FA off"}
            <span className="mx-1.5 text-foreground/40" aria-hidden="true">
              ·
            </span>
            <span className="tabular-nums">{activeSessionsCount} active</span>
          </span>
        </span>
      </span>
      <ChevronRight
        size={16}
        strokeWidth={1.4}
        aria-hidden="true"
        className="shrink-0 text-foreground/40 transition-colors group-hover:text-foreground/75 dark:text-foreground/35"
      />
    </Link>
  );
}

/**
 * Quick-tile chrome — same inset pill language as FieldRow / SectionLink,
 * but with a small column label above the control so the strip reads as
 * a labelled cluster rather than three loose controls.
 */
function QuickTile({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 rounded-lg px-4 py-3",
        "bg-foreground/[0.025] dark:bg-foreground/[0.03]"
      )}
    >
      <span className="text-xs text-foreground/55 dark:text-foreground/50">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Inlined radio-group used inside QuickTile. Implements the same WAI-
 * ARIA roving-tabindex pattern as ChoiceField but skips the FieldRow
 * shell so the tile's column label doesn't duplicate.
 */
interface RadioOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface RadioGroupProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: RadioOption<T>[];
  onChange: (next: T) => void | Promise<void>;
  disabled?: boolean;
}

function RadioGroup<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  disabled = false
}: RadioGroupProps<T>) {
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
    <div
      role="radiogroup"
      aria-label={ariaLabel}
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
              "inline-flex items-center gap-1.5 border px-3 py-1 text-xs tracking-tight transition-colors",
              "focus-visible:ring-1 focus-visible:ring-foreground/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none",
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
            {isPending ? <Loader2 size={10} className="animate-spin" /> : null}
          </button>
        );
      })}
    </div>
  );
}
