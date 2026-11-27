"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/core/Button";

/**
 * A failed load and its retry, in the same space: the failure line as plain text, then a plain refresh
 * action (owner, 22 Nov: no boxed card with a boxed button). The action is Arc's ghost Button (no border
 * or fill at rest, 44 px target, label crossfades in place). While a retry runs, the label reads
 * "Trying again…" and the action is locked (aria-disabled keeps focus on it). Keyboard focus rings the label, not
 * the 44 px target (ArcFocus). Callers own the request and
 * pass `pending`; the failure line is theirs too. Checked first: Arc Button (used), Arc ActionSwap (a
 * toggle between two settled states, not a pending one), Arc ConfirmMorph (destructive confirm) and the
 * shadcn ui/button ghost/link variants (link is underlined navigation, which retry must not look like).
 */
export function InlineRetry({ message, onRetry, pending = false, label, pendingLabel, className }: {
  message?: ReactNode;
  onRetry: () => void;
  pending?: boolean;
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const t = useTranslations("InlineRetry");
  const idle = label ?? t("retry");
  const busy = pendingLabel ?? t("retrying");
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
      {message ? <p className="mr-2 min-w-0 text-pretty">{message}</p> : null}
      <Button
        type="button"
        variant="ghost"
        aria-disabled={pending || undefined}
        aria-busy={pending || undefined}
        onClick={() => {
          if (!pending) onRetry();
        }}
        className="-ml-3"
      >
        {pending ? busy : <><RotateCw aria-hidden className="size-4" />{idle}</>}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">{pending ? busy : null}</span>
    </div>
  );
}
