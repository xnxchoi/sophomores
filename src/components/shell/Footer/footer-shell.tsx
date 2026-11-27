import type { ReactNode } from "react";
import { FooterLocaleSwitch } from "./locale-switch";
import { SellerPolicyLinks } from "./policy-links";
import { BrightGrains } from "./grains";
import { PageInset } from "@/components/core/PageInset/PageInset";

/**
 * The layer the lifted page reveals (Osklen study, owner 20 Nov: "legal only"): Terms · Privacy · Refund with the
 * language switch at the row's end, then the business facts under one hairline. Help and Shipping live in the Help pill
 * and the site menu. The legal links and the switch don't depend on the business-info read; the facts stream in as
 * children. Its own ground from the owner's palette (globals.css --color-footer, "Carbon lighter +2", under
 * --color-footer-ink), the same in both themes, so the page visibly lifts off it. Children that ask for text-foreground
 * get the ink: the footer sets --foreground for its own subtree.
 */
export function FooterShell({ children }: { children?: ReactNode }) {
  return (
    // From md the frame's 30 px bottom rail covers the footer's foot, so md:pb-16 leaves about 34 px under the last line.
    // On touch phones the bottom bar's spacer (client-layout) follows the footer with the page colour and the 36 px bar
    // leaves a sliver of it showing: the after layer carries the footer colour through that spacer, at its exact height.
    // The text sits in the pages' own column (PageInset) inside the page's side inset, so it starts at the same left edge
    // as the page's text.
    <footer className="relative isolate bg-footer px-page-inset pt-8 pb-8 text-foreground [--foreground:var(--color-footer-ink)] md:pt-20 md:pb-16 phone:after:absolute phone:after:inset-x-0 phone:after:top-full phone:after:h-[calc(max(var(--bar-target),var(--frame-bottom))_+_env(safe-area-inset-bottom))] phone:after:bg-footer">
      <PageInset>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
          {/* Large and light, so a hairline underline (1 px, 30 % ink) is enough to mark them as links. */}
          <SellerPolicyLinks className="flex-col gap-x-8 gap-y-0 text-[22px] leading-tight font-light tracking-[-0.02em] max-md:text-shadow-footer-ground sm:flex-row md:text-[28px] lg:text-[34px] [&_a]:decoration-current/30 [&_a]:decoration-1 [&_a]:underline-offset-[0.18em] [&_a]:hover:decoration-current" />
          <div className="-mx-3 shrink-0 self-start md:self-auto">
            <FooterLocaleSwitch />
          </div>
        </div>
        <div className="mt-6 min-w-0 border-t border-current/15 pt-5 empty:hidden md:mt-10 md:pt-6">
          {children}
        </div>
      </PageInset>
      <BrightGrains />
    </footer>
  );
}
