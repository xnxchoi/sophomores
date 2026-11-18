"use client";

import { useId, useRef, useState, type ComponentProps } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { XIcon } from "@phosphor-icons/react";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import type { CommerceOffer } from "@/lib/commerce/catalogue";
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle
} from "@/components/ui/sheet";

export function AccountCartSheet({ offer, initialCapabilities }: {
  offer: CommerceOffer | null;
  initialCapabilities: ComponentProps<typeof CommerceAccountGate>["initialCapabilities"];
}) {
  const account = useTranslations("Customer.app_site_me_page");
  const cart = useTranslations("Customer.app_site_shop_cart_page");
  const t = useTranslations("Customer.cartDrawer");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const popupID = useId();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <NextLink ref={trigger} href="/shop/cart" aria-haspopup="dialog" aria-expanded={open}
        aria-controls={open ? popupID : undefined}
        onNavigate={(event) => { event.preventDefault(); setOpen(true); }}
        className="group rounded-xl border border-border bg-card p-6 text-card-foreground outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2">
        <h3 className="font-heading text-2xl underline-offset-4 group-hover:underline">{account("cart.title")}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{account("cart.description")}</p>
      </NextLink>
      <SheetContent id={popupID} side="right" showCloseButton={false} finalFocus={trigger} data-lenis-prevent=""
        className="dark max-h-dvh border-border bg-background text-foreground data-[side=right]:w-full data-[side=right]:sm:max-w-[40rem] pointer-coarse:max-sm:rounded-t-3xl pointer-coarse:max-sm:max-h-[85dvh] pointer-coarse:max-sm:data-[side=right]:top-auto pointer-coarse:max-sm:data-[side=right]:h-auto pointer-coarse:max-sm:data-[side=right]:border-l-0 pointer-coarse:max-sm:data-[side=right]:border-t pointer-coarse:max-sm:data-[side=right]:data-starting-style:translate-x-0 pointer-coarse:max-sm:data-[side=right]:data-starting-style:translate-y-10 pointer-coarse:max-sm:data-[side=right]:data-ending-style:translate-x-0 pointer-coarse:max-sm:data-[side=right]:data-ending-style:translate-y-10">
        <SheetHeader className="shrink-0 border-b border-border px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-5">
          <div className="flex items-center gap-4">
            <SheetClose render={<button type="button" className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2" />}>
              <XIcon aria-hidden="true" className="size-5" />
              <span className="sr-only">{t("close")}</span>
            </SheetClose>
            <SheetTitle className="font-heading text-2xl tracking-tight">{cart("title")}</SheetTitle>
          </div>
          <SheetDescription className="mt-4 text-sm leading-relaxed">{cart("introduction")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          <CommerceAccountGate initialCapabilities={initialCapabilities}>
            <CommerceCart offer={offer} />
          </CommerceAccountGate>
        </div>
        <SheetFooter className="shrink-0 border-t border-border px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <NextLink href="/shop/cart" onNavigate={() => setOpen(false)}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2">{t("fullPage")}</NextLink>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
