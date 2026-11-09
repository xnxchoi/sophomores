import { Instrument_Serif } from "next/font/google";

/**
 * Display serif for the ticket's editorial moments — event name, date,
 * holder name, large serial. Already used elsewhere in the project for
 * the Invoice component, so no new dependency.
 *
 * Mono is *not* registered via next/font here — the project already
 * loads Inconsolata Variable globally (see src/styles/__rp_plate.scss),
 * and the ticket references it directly as a font-family value.
 */
export const ticketSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-ticket-serif"
});

export const ticketFontVariables = ticketSerif.variable;
