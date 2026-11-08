"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { FieldRow } from "./FieldRow";
import { Button } from "@/hideaway/components/core/Button";

/**
 * Tier 4 — Verified action field.
 *
 * Triggers a focused destructive / verified flow — usually a modal.
 * Use for: change password, enable/disable 2FA, add/remove passkey,
 * sign out other devices, delete account.
 *
 * The component itself doesn't own the modal — callers pass any element
 * (a DialogTrigger, a button) as `children`. We provide the row chrome,
 * the optional caption, and a loading indicator surface for in-place
 * actions that don't need a modal.
 */
interface ActionFieldProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  /** The action trigger — typically a `<DialogTrigger>` or a `<button>`. */
  children: ReactNode;
  /** Optional ambient meta — small text trailing the label area. */
  meta?: ReactNode;
  /** Tone — affects the inset row's background hint. Defaults to neutral. */
  tone?: "neutral" | "danger";
  className?: string;
}

export function ActionField({
  label,
  description,
  icon,
  children,
  meta,
  tone = "neutral",
  className
}: ActionFieldProps) {
  return (
    <FieldRow
      label={label}
      description={description}
      icon={icon}
      meta={meta}
      className={cn(
        tone === "danger" && "bg-rouge-700/[0.06] dark:bg-rouge-700/[0.08]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {children}
        {/* Directional glyph — disambiguates a neutral ActionField from a
            ToggleField at rest. The chevron implies a forward flow (modal,
            irreversible action) rather than a flippable state. Only renders
            when there's no danger-tone background already carrying the
            differentiation. */}
        {tone !== "danger" ? (
          <ChevronRight
            size={14}
            strokeWidth={1.4}
            aria-hidden="true"
            className="shrink-0 text-foreground/40 transition-colors group-hover:text-foreground/70 dark:text-foreground/35"
          />
        ) : null}
      </div>
    </FieldRow>
  );
}

/**
 * The button language used by ActionField triggers. Sans pill, hairline
 * border, never filled. The single signature button across the admin
 * surface. Compose any modal trigger over this.
 */
interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  icon?: ReactNode;
  className?: string;
  type?: "button" | "submit";
}

export function ActionButton({
  children,
  onClick,
  loading = false,
  disabled = false,
  tone = "neutral",
  icon,
  className,
  type = "button"
}: ActionButtonProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-tight transition-colors",

        tone === "danger"
          ? "border-rouge-700/40 text-rouge-700/85 hover:border-rouge-700 hover:text-rouge-700"
          : "border-foreground/30 text-foreground/85 hover:border-foreground/55 hover:text-foreground",
        (disabled || loading) && "opacity-50",
        className
      )}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : icon ? (
        <span className="flex size-3 items-center justify-center">{icon}</span>
      ) : null}
      {children}
    </Button>
  );
}
