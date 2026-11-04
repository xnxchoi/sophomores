import s from "./Pricing.module.scss";

const MAILTO =
  "mailto:concierge@hideawayseoul.com?subject=Cofounder%20application";

/**
 * CofounderApply — the deliberately under-invested 100vh tease.
 *
 * Cofounder is invite-only, by application. The marketing posture is to
 * make people curious, not to sell them. So this section is monolithic:
 * eyebrow, one short heading, one CTA. No subtitle. No benefit list. No
 * price. No seat count. The under-investment IS the design.
 *
 * If the user later wants a real `/apply/cofounder` route or a contact
 * form, swap the Link href for the route — the surrounding section
 * doesn't change.
 */
export function CofounderApply() {
  return (
    <section aria-labelledby="cofounder-apply" className={s.cofounderApply}>
      <p className={s.eyebrow}>Apply</p>
      <h2 id="cofounder-apply" className={s.cofounderTitle}>
        You really wanna know?
      </h2>
      {/* Plain <a>, not the project's <Link>: the custom Link runs through
          next-transition-router's click handler, which fires page-transition
          state (setIsTransitioningWipe) for non-anchor hrefs regardless of
          scheme. For mailto: that state never resets because no navigation
          actually happens, leaving the page in a wipe state. The plain anchor
          bypasses the handler entirely. */}
      <a href={MAILTO} className={s.cofounderCta} rel="noopener noreferrer">
        Write to us
      </a>
    </section>
  );
}
