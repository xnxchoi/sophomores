import type { ReactNode } from "react";

/** Arc's non-colour roles this project has no global value for, set once around commerce's Arc items (custom properties inherit
 * through display: contents). Colour roles live in the theme adapter (globals.css); 16px fields so iOS does not zoom on focus. */
export function ArcRoles({ children }: { children: ReactNode }) {
  return <div className="contents [--control-height-lg:3rem] [--control-height-sm:3rem] [--control-height-md:3rem] [--duration-considered:480ms] [--duration-standard:240ms] [--font-body:var(--font-sans)] [--font-display:var(--font-sans)] [--leading-body:1.5] [--space-5:1.25rem] [--space-6:1.5rem] [--space-8:2rem] [--text-field:1rem] [--tracking-body:normal] [--tracking-display:normal]">{children}</div>;
}
