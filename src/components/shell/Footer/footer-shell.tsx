import type { ReactNode } from "react";
import { FooterLocaleSwitch } from "./locale-switch";
import { SellerPolicyLinks } from "./policy-links";
import { BrightGrains } from "./grains";
import { PageInset } from "@/components/core/PageInset/PageInset";

/**
 * The layer the lifted page reveals (Osklen study, owner 20 Nov: "legal only"): Terms · Privacy · Refund with the
 * language switch at the row's end, then the business facts under one hairline. Help and Shipping live in the Help pill
 * and the site menu. The legal links and the switch don't depend on the business-info read; the facts stream in as
 * children. Its ground is the owner's gunmetal (solid, the same in both themes), under --color-footer-ink.
 * Children that ask for text-foreground get the ink: the footer sets --foreground for its own subtree.
 */
export function FooterShell({ children }: { children?: ReactNode }) {
  return (
    // The owner's ground (faa7c4277, 27 Nov): w-screen, h-full, mt-1.5 and bg-gunmetal, carried by the phone after layer
    // too. His mix-blend-overlay is off (Courtney, 28 Nov, after the owner's "It's fucking illegible"): blended, the
    // gunmetal read as a pale band under the light ink; solid, Titanium ink is 12.5:1 and Singer Stone 10.4:1 on it.
    // Owner, 28 Nov: everything in the footer at about a third of its size, KO and EN; nothing goes under a 9 px floor.
    // Every 44 px target reaches 16 px past its 12 px line (the email's 32 px down), so the padding holds them: pt-4 on
    // phones; pb-8 under the email's reach. From md the footer tucks a net 22 px under the page's rounded end (FooterGate's
    // 28 px less mt-1.5), so md:pt-10 starts the links' targets just clear of the page; md:pb-10 keeps the email's target
    // above the frame's 30 px bottom rail's reach as far as it goes.
    // On touch phones the bottom bar's spacer (client-layout) follows the footer with the page colour
    // and the 36 px bar leaves a sliver of it showing: the after layer carries the footer colour through that spacer, at
    // its exact height. The text sits in the pages' own column (PageInset), at the page text's left edge.
    <footer className="relative isolate mt-1.5 h-full w-screen bg-gunmetal px-page-inset pt-4 pb-8 text-foreground [--foreground:var(--color-footer-ink)] md:pt-10 md:pb-10 phone:after:pointer-events-none phone:after:absolute phone:after:inset-x-0 phone:after:top-full phone:after:h-[calc(max(var(--bar-target),var(--frame-bottom))_+_env(safe-area-inset-bottom))] phone:after:bg-gunmetal">
      <PageInset>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-8">
          {/* Small, so regular weight (light at 9 px goes faint), with a 1 px full-ink underline. Each link keeps a 44 x 44
              px target (min-w for the short Korean names, label at its start so the row keeps the facts' left edge); the
              negative margin keeps the row as short as its 12 px line, and a wrapped line sits 32 px down, clear of the
              line above's targets. */}
          <SellerPolicyLinks className="flex-row gap-x-3 gap-y-8 text-[9px] leading-3 font-normal lg:text-[11px] [&_a]:-my-4 [&_a]:min-h-11 [&_a]:min-w-11 [&_a]:decoration-current [&_a]:decoration-1 [&_a]:underline-offset-[0.18em] [&_a]:hover:decoration-current" />
          <div className="-mx-3 -my-4 shrink-0">
            <FooterLocaleSwitch />
          </div>
        </div>
        <div className="mt-2 min-w-0 border-t border-current/50 pt-2 empty:hidden md:mt-3 md:pt-2">
          {children}
        </div>
      </PageInset>
      <BrightGrains />
    </footer>
  );
}
