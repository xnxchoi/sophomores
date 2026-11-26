"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/hideaway/components/core/Link/Link";
import { Drawer } from "@/hideaway/components/ui/vaul";
import { SurvivalKit } from "../SurvivalKit";
import { PillButton } from "@/hideaway/components/core/Button";
import { useLenis } from "lenis/react";
import { useEffect } from "react";

/**
 * Details drawer — a right-side Vaul sheet surfacing the event's
 * practical info without forcing the user to scroll through the loop.
 *
 * Contents (top → bottom):
 *   1. Eyebrow + Title
 *   2. Date / Time / Location rows
 *   3. Dress code summary line
 *   4. SurvivalKit (embedded)
 *   5. Reserve CTA
 *
 * Controlled drawer — `open` / `onOpenChange` come from QuickActions.
 */
interface DetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSignedIn: boolean;
}

export function DetailsDrawer({
  open,
  onOpenChange,
  isSignedIn
}: DetailsDrawerProps) {
  const t = useTranslations("Event.DayNNight");
  const survival = useTranslations("Event.DayNNight.survivalKit");
  const rsvpHref = isSignedIn ? "/day-n-night/my" : "/tickets/day-n-night";
  const lenis = useLenis();
  useEffect(() => {
    lenis && lenis[open ? "stop" : "start"]();
    return () => lenis?.start();
  }, [lenis, open]);
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] backdrop-blur-[3px]" />
        <Drawer.Content
          aria-describedby="day-night-details-description"
          className="fixed top-0 right-0 z-[81] flex h-full w-full max-w-[480px] flex-col outline-none"
          style={{
            // Opaque elevated ink — visually detached from the dark sky
            // background. Slightly LIGHTER than --dn-bg so the sheet
            // reads as floating forward, not melted into the page.
            borderLeft: "1px solid"
          }}
        >
          <Drawer.Handle className="absolute top-1/2 left-2 h-16 w-1 -translate-y-1/2 rounded-full opacity-30" />

          <header className="flex items-center justify-between border-b px-8 pt-8 pb-6">
            <div className="grid gap-2">
              <span className="font-sans text-[10px] tracking-[0.32em] uppercase">
                {t("details.eyebrow")}
              </span>
              <Drawer.Title className="font-serif text-[clamp(1.85rem,2.4vw,2.4rem)] leading-[1.05] font-bold tracking-[-0.015em]">
                {t("title")}
              </Drawer.Title>
              <Drawer.Description
                id="day-night-details-description"
                className="sr-only"
              >
                {t("opening.body")}
              </Drawer.Description>
            </div>
            <Drawer.Close
              aria-label={t("details.close")}
              className="ease inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors"
            >
              <span aria-hidden className="text-base leading-none">
                ×
              </span>
            </Drawer.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-7">
            <dl className="grid gap-[14px]">
              <DetailsRow label={t("date.weekday")} value={t("date.full")} />
              <DetailsRow
                label={t("details.time")}
                value={`${t("opening.time")}  ${t("act.night.time")}`}
              />
              <DetailsRow
                label={t("location.label")}
                value={t("location.neighborhood")}
                hint={t("location.address")}
              />
              <DetailsRow
                label={survival("dress.label")}
                value={survival("dress.value")}
              />
              <DetailsRow
                label={t("details.entry")}
                value={t("entry.amount")}
                hint={t("entry.perGuest")}
              />
            </dl>

            <div className="mt-9 border-t pt-7">
              <SurvivalKit variant="embedded" />
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t px-8 pt-5 pb-7">
            <PillButton
              className="min-w-fit py-6 text-balance"
              type="button"
              onClick={() => {
                const f = new File(
                  [
                    `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ical.marudot.com//iCal Event Maker
CALSCALE:GREGORIAN
BEGIN:VTIMEZONE
TZID:Asia/Seoul
LAST-MODIFIED:20250410T142247Z
TZURL:https://www.tzurl.org/zoneinfo-outlook/Asia/Seoul
X-LIC-LOCATION:Asia/Seoul
BEGIN:STANDARD
TZNAME:KST
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT
DTSTAMP:20260521T093627Z
UID:1779356138646-36356@ical.marudot.com
DTSTART;TZID=Asia/Seoul:20260524T183000
DTEND;TZID=Asia/Seoul:20260524T233000
SUMMARY:Day n Night | Seoul
DESCRIPTION:=========INVITE ONLY==============
LOCATION:서울시 용산구 소월로20길 64\\, 3층
ORGANIZER;CN=Sean Choi:mailto:seanschoi@lostinseoul.com
TRANSP:OPAQUE
CLASS:PRIVATE
END:VEVENT
END:VCALENDAR`
                  ],
                  "Day-n-Night_Seoul.ics",
                  { type: "text/calendar" }
                );
                const url = URL.createObjectURL(f);
                const anchor = document.createElement("a");

                anchor.href = url;
                anchor.download = "Day-n-Night_Seoul.ics";

                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);

                URL.revokeObjectURL(url);
              }}
            >
              {survival("ics")}
            </PillButton>
            <Link
              href={rsvpHref}
              className="group inline-flex w-full cursor-pointer items-center justify-between rounded-full border px-6 py-4 font-sans text-[12px] tracking-[0.28em] uppercase no-underline transition-transform duration-300 hover:-translate-y-px"
            >
              <span>{t("rsvpCta.register")}</span>
              <span
                aria-hidden
                className="text-[1.2em] leading-none transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <Link
              href="/day-n-night/guests"
              className="group inline-flex w-full cursor-pointer items-center justify-between rounded-full border px-6 py-3.5 font-sans text-[11px] tracking-[0.24em] uppercase no-underline transition-colors duration-300"
            >
              <span>{t("guestsTease.cta")}</span>
              <span
                aria-hidden
                className="text-[1.2em] leading-none transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

interface DetailsRowProps {
  label: string;
  value: string;
  hint?: string;
}

function DetailsRow({ label, value, hint }: DetailsRowProps) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-x-5 border-t pt-[14px] first:border-t-0 first:pt-0">
      <dt className="font-sans text-[10px] tracking-[0.32em] uppercase">
        {label}
      </dt>
      <dd className="grid gap-1">
        <span className="font-serif text-[clamp(1.15rem,1.3vw,1.35rem)] leading-[1.3] tracking-[-0.005em]">
          {value}
        </span>
        {hint && (
          <span className="text-[12px] leading-[1.4]">
            {hint}
          </span>
        )}
      </dd>
    </div>
  );
}
