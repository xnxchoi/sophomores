import { cn } from "@/lib/utils";

export type TicketStatus = "pending" | "active" | "used" | "canceled";

const STATUS_LABEL: Record<TicketStatus, string> = {
  pending: "Awaiting payment",
  active: "Active",
  used: "Used",
  canceled: "Canceled"
};

interface StatusChipProps {
  status: TicketStatus;
  checkedIn?: boolean;
  className?: string;
}

export function StatusChip({
  status,
  checkedIn = false,
  className
}: StatusChipProps) {
  const label = checkedIn ? "Checked in" : STATUS_LABEL[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-sans text-[10px] tracking-widest text-foreground/70 uppercase xl:text-[11px]",
        className
      )}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full"
      />
      {label}
    </span>
  );
}
