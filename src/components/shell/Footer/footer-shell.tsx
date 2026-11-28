import type { ReactNode } from "react";
import { FooterLocaleSwitch } from "./locale-switch";
import { SellerPolicyLinks } from "./policy-links";
import { BrightGrains } from "./grains";
import { PageInset } from "@/components/core/PageInset/PageInset";

/**
 * The layer the lifted page reveals (Osklen study, owner 20 Nov: "legal only"): Terms · Privacy · Refund with the
 * language switch at the row's end, then the business facts under one hairline. Help and Shipping live in the Help pill
 * and the site menu. The legal links and the switch don't depend on the business-info read; the facts stream in as
 * children. Its ground is the owner's gunmetal, blended over the page (mix-blend-overlay), under --color-footer-ink.
 * Children that ask for text-foreground get the ink: the footer sets --foreground for its own subtree.
 */
export function FooterShell({ children }: { children?: ReactNode }) {
  return (
    // The owner's ground (faa7c4277, 27 Nov): mix-blend-overlay, w-screen, h-full, mt-1.5 and bg-gunmetal, carried by the
    // phone after layer too. Owner, 28 Nov: everything in the footer at about a third of its size, KO and EN; nothing goes
    // under a 9 px floor. From md the frame's 30 px bottom rail covers the footer's foot, so md:pb-10 leaves about 10 px
    // under the last line. On touch phones the bottom bar's spacer (client-layout) follows the footer with the page colour
    // and the 36 px bar leaves a sliver of it showing: the after layer carries the footer colour through that spacer, at
    // its exact height. The text sits in the pages' own column (PageInset), at the page text's left edge.
    <footer className="relative isolate mt-1.5 h-full w-screen bg-gunmetal px-page-inset pt-3 pb-3 text-foreground mix-blend-overlay [--foreground:var(--color-footer-ink)] md:pt-7 md:pb-10 phone:after:absolute phone:after:inset-x-0 phone:after:top-full phone:after:h-[calc(max(var(--bar-target),var(--frame-bottom))_+_env(safe-area-inset-bottom))] phone:after:bg-gunmetal">
      <PageInset>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {/* Small and light, with a hairline underline (1 px, 30 % ink). Each link keeps a 44 px target; the negative
              margin keeps the row as short as its 12 px line. */}
          <SellerPolicyLinks className="flex-row gap-x-3 gap-y-0 text-[9px] leading-3 font-light tracking-[-0.02em] lg:text-[11px] [&_a]:-my-4 [&_a]:min-h-11 [&_a]:decoration-current/30 [&_a]:decoration-1 [&_a]:underline-offset-[0.18em] [&_a]:hover:decoration-current" />
          <div className="-mx-3 -my-4 shrink-0">
            <FooterLocaleSwitch />
          </div>
        </div>
        <div className="mt-2 min-w-0 border-t border-current/15 pt-2 empty:hidden md:mt-3 md:pt-2">
          {children}
        </div>
      </PageInset>
      <BrightGrains />
    </footer>
  );
}
