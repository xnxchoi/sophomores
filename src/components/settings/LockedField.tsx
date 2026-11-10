import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { FieldRow } from "./FieldRow";

interface LockedFieldProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  value: ReactNode;
  reason?: string;
  className?: string;
}

export function LockedField({
  label,
  description,
  icon,
  value,
  reason,
  className,
}: LockedFieldProps) {
const t = useTranslations("Customer.settingsControls");
const lockReason = reason ?? t("locked");
  return (
    <FieldRow
      label={label}
      description={description}
      icon={icon}
      className={className}
    >
      <span className="flex items-center gap-2">
        <span className="text-sm text-neutral-200">{value}</span>
        <span className="sr-only">{t("lockedReason", { reason: lockReason })}</span>
        <span
          aria-hidden="true"
          title={lockReason}
          className="inline-flex size-3.5 shrink-0 items-center justify-center text-neutral-500"
        >
          <Lock size={12} strokeWidth={1.5} />
        </span>
      </span>
    </FieldRow>
  );
}
