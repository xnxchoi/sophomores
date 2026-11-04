import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { FieldRow } from "./FieldRow";

/**
 * Tier 1 — Locked field.
 *
 * Read-only by design. Cursor stays default (not `not-allowed`, which reads
 * as "this is broken" rather than "this is locked"). The trailing 12px lock
 * glyph is the sole visual cue. No web-conventional dotted underline — that
 * cliché reads anachronistically against the Fey tone.
 *
 * Use for: email, handle, member-since, account ID, anything that is
 * intentionally not user-editable on this surface.
 */
interface LockedFieldProps {
  label: string;
  description?: string;
  /** Optional leading icon (16px). */
  icon?: ReactNode;
  /** The locked value. Sans, body weight. */
  value: ReactNode;
  /**
   * Optional explanation surfaced as a `title` tooltip on the lock glyph.
   * Defaults to "Locked".
   */
  reason?: string;
  className?: string;
}

export function LockedField({
  label,
  description,
  icon,
  value,
  reason = "Locked",
  className
}: LockedFieldProps) {
  return (
    <FieldRow
      label={label}
      description={description}
      icon={icon}
      className={className}
    >
      <span className="flex items-center gap-2.5">
        <span className="text-sm text-foreground/85">{value}</span>
        {/* Lock glyph carries the locked state. Opacity meets the project's
            UI-label legibility floor (`/55` dark, `/60` light) so the cue
            actually reads, not just decorates. The accompanying sr-only
            text is what conveys "this is locked" to screen readers — the
            glyph itself is decorative once the text exists. */}
        <span className="sr-only">{`Locked. ${reason}`}</span>
        <span
          aria-hidden="true"
          title={reason}
          className="inline-flex size-3 shrink-0 items-center justify-center text-foreground/60 dark:text-foreground/55"
        >
          <Lock size={12} strokeWidth={1.5} />
        </span>
      </span>
    </FieldRow>
  );
}
