"use client";

import { Link } from "@/hideaway/components/core/Link/Link";
import * as m from "motion/react-m";

export type TicketStubStatus = "pending" | "active" | "used" | "canceled";

export interface TicketStubProps {
  href: string;
  ticketNumber: number | null;
  status: TicketStubStatus;
  checkedIn: boolean;
  eventName: string;
  eventDate: string | null;
  eventLocation: string | null;
  /** Index used to stagger the entrance animation. */
  index?: number;
}

const padNumber = (n: number | null): string => {
  if (n === null || n === undefined) return "0000";
  return String(n).padStart(4, "0");
};

const formatShortDate = (d: string | null): string | null => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return d;
  }
};

const STATUS_TINT: Record<TicketStubStatus, string> = {
  pending: "oklch(0.7 0.16 70)",
  active: "oklch(0.85 0.01 60)",
  used: "oklch(0.5 0.01 30)",
  canceled: "oklch(0.6 0.18 30)"
};

const PAPER = "oklch(0.965 0.008 80)";
const PAPER_INK = "oklch(0.18 0.012 30)";

export function TicketStub({
  href,
  ticketNumber,
  status,
  checkedIn,
  eventName,
  eventDate,
  eventLocation,
  index = 0
}: TicketStubProps) {
  const num = padNumber(ticketNumber);
  const date = formatShortDate(eventDate);

  return (
    <m.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        bounce: 0.1,
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.4)
      }}
    >
      <Link
        href={href}
        className="group relative block focus:outline-none"
        aria-label={`Open ticket #${num} for ${eventName}`}
      >
        {/* Paper card */}
        <div
          className="relative overflow-hidden rounded-[3px] transition-transform duration-300 group-hover:-translate-y-0.5"
          style={{
            background: PAPER,
            color: PAPER_INK,
            boxShadow:
              "0 14px 26px -16px rgba(0,0,0,0.5), 0 2px 6px -2px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)"
          }}
        >
          {/* Stub split: left main, right tear-off with the number */}
          <div className="flex">
            <div className="relative flex-1 px-5 py-5">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="font-sans text-[9px] uppercase"
                  style={{ letterSpacing: "0.32em", opacity: 0.5 }}
                >
                  Admit One
                </span>
                <StatusDot status={status} checkedIn={checkedIn} />
              </div>

              <p
                className="mt-3 line-clamp-2 text-base leading-snug font-light tracking-tight"
                style={{ wordBreak: "break-word" }}
              >
                {eventName}
              </p>

              <p
                className="mt-2 font-sans text-[10px]"
                style={{ opacity: 0.6 }}
              >
                {date ?? "—"}
                {eventLocation ? ` · ${eventLocation}` : ""}
              </p>
            </div>

            {/* Vertical perforation */}
            <div className="relative w-px" aria-hidden="true">
              <span
                className="absolute inset-y-3 left-0"
                style={{
                  width: 2,
                  backgroundImage:
                    "radial-gradient(circle, oklch(0.18 0.012 30 / 0.35) 1px, transparent 1.5px)",
                  backgroundSize: "2px 8px",
                  backgroundRepeat: "repeat-y",
                  backgroundPosition: "center"
                }}
              />
              <span
                className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full"
                style={{
                  background: "var(--ticket-page-bg, transparent)",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)"
                }}
              />
              <span
                className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full"
                style={{
                  background: "var(--ticket-page-bg, transparent)",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)"
                }}
              />
            </div>

            {/* Stub */}
            <div
              className="flex w-20 flex-col items-center justify-center px-3 py-5 text-center"
              style={{
                background:
                  "linear-gradient(180deg, oklch(0.945 0.012 80) 0%, oklch(0.965 0.008 80) 100%)"
              }}
            >
              <span
                className="font-sans text-[8px] uppercase"
                style={{ letterSpacing: "0.32em", opacity: 0.45 }}
              >
                No.
              </span>
              <span className="mt-1 font-sans text-base">{num}</span>
              {checkedIn ? (
                <span
                  className="mt-2 font-sans text-[8px] uppercase"
                  style={{
                    letterSpacing: "0.22em",
                    color: "oklch(0.45 0.16 150)"
                  }}
                >
                  ✓ in
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </m.li>
  );
}

interface StatusDotProps {
  status: TicketStubStatus;
  checkedIn: boolean;
}

function StatusDot({ status, checkedIn }: StatusDotProps) {
  const label = checkedIn ? "On site" : status;
  const color = checkedIn ? "oklch(0.45 0.16 150)" : STATUS_TINT[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
      />
      <span
        className="font-sans text-[9px] uppercase"
        style={{ letterSpacing: "0.22em", color: PAPER_INK, opacity: 0.65 }}
      >
        {label}
      </span>
    </span>
  );
}
