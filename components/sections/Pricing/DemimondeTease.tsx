"use client";

import { MarkerLink } from "@/components/UX/MarkerStroke";
import s from "./DemimondeTease.module.scss";

/**
 * One-line editorial tease pointing at /demimonde — the past-events archive.
 * Replaces the heavier parallax FOMO section. Scrolls past quickly; the only
 * interactive moment is the marker-underlined link, which draws-in on hover.
 */
export function DemimondeTease() {
  return (
    <section className={s.section} aria-label="Past events">
      <p className={s.line}>
        <span className={s.muted}>
          Patrons get the address two days before. Phones at the door.
        </span>{" "}
        <MarkerLink href="/demimonde" variant="underline">
          See where we've been.
        </MarkerLink>
      </p>
    </section>
  );
}
