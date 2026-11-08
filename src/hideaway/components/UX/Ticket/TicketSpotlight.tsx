"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { RP_Btn } from "@/hideaway/components/core/Button";
import { cn } from "@/lib/utils";
import { TicketSpotlightStage } from "@/hideaway/components/UX/Ticket/Ticket3D/TicketSpotlightStage";
import {
  StatusChip,
  type TicketStatus
} from "@/hideaway/components/UX/Ticket/StatusChip";
import { TicketQR } from "@/hideaway/components/UX/Ticket/TicketQR";

interface TicketSpotlightProps {
  open: boolean;
  onClose: () => void;
  ticket: {
    eventName: string;
    ticketNumber: number | null;
    dateShort: string | null;
    dateLong: string | null;
    location: string | null;
    status: TicketStatus;
    checkedIn: boolean;
    checkInUrl: string;
    ticketPrice: number;
    flipped: boolean;
    onFlip: () => void;
  };
}

const FADE = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

/**
 * Spotlight / focused-mode overlay for a single ticket. The page UI fades
 * out behind a backdrop over ~700ms, the ticket sits centred, and a small
 * row of contextual actions (Save image / Share / Show QR) appears.
 *
 * - Escape and the close button both dismiss.
 * - The ticket renders into the project's shared canvas via <View>, same
 *   as the page-level instance.
 * - This is a "spotlight" surface — flashy interactions (hover-tilt,
 *   tap-to-flip) are intentional and welcome here, distinct from the
 *   subdued list/pager presentation.
 */
export function TicketSpotlight({
  open,
  onClose,
  ticket
}: TicketSpotlightProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Reset transient state when the overlay closes.
  useEffect(() => {
    if (!open) {
      setQrOpen(false);
      setShareToast(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: ticket.eventName,
      text: `My ticket for ${ticket.eventName}`,
      url: typeof window !== "undefined" ? window.location.href : ""
    };
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard && shareData.url) {
        await navigator.clipboard.writeText(shareData.url);
        setShareToast("Link copied");
        setTimeout(() => setShareToast(null), 1800);
      }
    } catch {
      // User cancelled or share failed silently — no-op.
    }
  }, [ticket.eventName]);

  const handleSaveImage = useCallback(() => {
    // The shared canvas hosts multiple Views; exporting a clean per-view
    // image needs an offscreen render. For now, surface a polite hint —
    // the wiring lives here so we can drop in the real export later.
    setShareToast("Save coming soon");
    setTimeout(() => setShareToast(null), 1800);
  }, []);

  const canShowQR = ticket.status === "active" && Boolean(ticket.checkInUrl);

  return (
    <AnimatePresence>
      {open ? (
        <m.div
          key="spotlight"
          className="fixed inset-0 z-[60] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop — clicking it dismisses.
              Solid background, NOT a backdrop-blur. The page's shared
              canvas (which hosts other 3D content) sits behind this
              overlay; a backdrop-blur would smear the canvas through the
              shroud and ghost the page-level ticket into the spotlight.
              The spotlight stage uses its own dedicated <Canvas> so it
              renders above this backdrop without being affected by it. */}
          <button
            type="button"
            aria-label="Close spotlight"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-background"
          />

          {/* Top bar — close + meta */}
          <div className="relative z-[1] flex items-center justify-between px-6 pt-6 xl:px-10 xl:pt-8">
            <div className="min-w-0">
              <p className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-xs">
                Spotlight · {String(ticket.ticketNumber ?? 0).padStart(4, "0")}
              </p>
              <p className="mt-0.5 truncate text-base font-light tracking-tight xl:text-lg">
                {ticket.eventName}
              </p>
            </div>
            <RP_Btn
              onClick={onClose}
              aria-label="Close"
              className="font-sans text-[11px] tracking-widest text-muted-foreground/70 uppercase transition-colors hover:text-foreground xl:text-xs"
            >
              Close ✕
            </RP_Btn>
          </div>

          {/* Stage — the ticket, centred */}
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-10 px-6 xl:gap-12">
            <m.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={FADE}
              className="w-full"
              style={{ maxWidth: "min(56rem, 100%)" }}
            >
              <TicketSpotlightStage
                eventName={ticket.eventName}
                ticketNumber={ticket.ticketNumber}
                date={ticket.dateShort}
                location={ticket.location}
                flipped={ticket.flipped}
                onFlip={ticket.onFlip}
              />
            </m.div>

            <m.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              transition={{ ...FADE, delay: 0.1 }}
              className="flex w-full flex-col items-center gap-3 text-center"
            >
              <StatusChip status={ticket.status} checkedIn={ticket.checkedIn} />
              <h2 className="text-2xl font-light tracking-tight xl:text-4xl">
                {ticket.eventName}
              </h2>
              {ticket.dateLong ? (
                <p className="font-sans text-[11px] tracking-widest text-foreground/70 uppercase xl:text-xs">
                  {ticket.dateLong}
                  {ticket.location ? ` · ${ticket.location}` : ""}
                </p>
              ) : null}
            </m.div>
          </div>

          {/* Action rail — bottom */}
          <m.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ ...FADE, delay: 0.15 }}
            className="relative z-[1] flex flex-col items-center gap-3 px-6 pb-8 xl:pb-12"
          >
            <div className="flex flex-wrap items-center justify-center gap-3">
              <SpotlightAction
                label="Save image"
                onClick={handleSaveImage}
                glyph="↧"
              />
              <SpotlightAction label="Share" onClick={handleShare} glyph="↗" />
              <SpotlightAction
                label="Show QR"
                onClick={() => setQrOpen((v) => !v)}
                glyph="▦"
                disabled={!canShowQR}
                pressed={qrOpen}
              />
              <SpotlightAction
                label={ticket.flipped ? "Flip back" : "Flip"}
                onClick={ticket.onFlip}
                glyph="↺"
              />
            </div>

            <p
              aria-live="polite"
              className={cn(
                "h-4 font-sans text-[10px] tracking-widest text-muted-foreground/60 uppercase xl:text-[11px]",
                shareToast ? "opacity-100" : "opacity-0"
              )}
            >
              {shareToast ?? ""}
            </p>
          </m.div>

          {/* QR drawer — rises over the action rail when toggled */}
          <AnimatePresence>
            {qrOpen && canShowQR ? (
              <m.div
                key="qr"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                className="absolute right-0 bottom-28 left-0 z-2 flex justify-center px-6"
              >
                <div className="rounded-xl border border-border/30 bg-background/95 p-6 backdrop-blur-xl">
                  <p className="mb-4 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">
                    At the door
                  </p>
                  <TicketQR value={ticket.checkInUrl} size={220} />
                </div>
              </m.div>
            ) : null}
          </AnimatePresence>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}

interface SpotlightActionProps {
  label: string;
  onClick: () => void;
  glyph: string;
  disabled?: boolean;
  pressed?: boolean;
}

function SpotlightAction({
  label,
  onClick,
  glyph,
  disabled = false,
  pressed = false
}: SpotlightActionProps) {
  return (
    <RP_Btn
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed || undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border/40 px-4 py-2.5 font-sans text-[11px] tracking-widest uppercase transition-colors xl:text-xs",
        disabled
          ? "cursor-not-allowed border-border/20 text-muted-foreground/30"
          : pressed
            ? "border-foreground/60 text-foreground"
            : "text-foreground/75 hover:border-border hover:text-foreground"
      )}
    >
      <span aria-hidden className="text-sm leading-none">
        {glyph}
      </span>
      {label}
    </RP_Btn>
  );
}
