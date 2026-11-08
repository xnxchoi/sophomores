"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { FieldRow } from "./FieldRow";

interface ActionFieldProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  meta?: ReactNode;
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
  className,
}: ActionFieldProps) {
  return (
    <FieldRow
      label={label}
      description={description}
      icon={icon}
      meta={meta}
      className={cn(
        tone === "danger" && "border-red-500/20 bg-red-950/20 text-red-200",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {children}
      </div>
    </FieldRow>
  );
}

export function ActionButton({
  children,
  onClick,
  disabled,
  loading,
  icon,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  tone?: "neutral" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors",
        tone === "danger"
          ? "bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30"
          : "bg-white/10 text-white hover:bg-white/20 border border-white/10",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
    >
      {loading ? (
        <motion.span className="size-3 rounded-full border border-white/40 border-t-white" animate={{ rotate: 360 }} transition={{ duration: 1, ease: "linear", repeat: Infinity }} />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
