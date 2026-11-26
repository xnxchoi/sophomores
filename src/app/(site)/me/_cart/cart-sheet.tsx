"use client";

import { useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { animate, resize, type AnimationPlaybackControls } from "motion";
import { XIcon } from "@phosphor-icons/react";
import { motionTokens } from "@/components/arc/_shared/motion-tokens";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { CommerceCart } from "@/components/commerce/cart";
import type { CartProduct } from "@/lib/commerce/cart-products";
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle
} from "@/components/ui/sheet";

export function AccountCartSheet({ products, initialCapabilities }: {
  products: readonly CartProduct[];
  initialCapabilities: ComponentProps<typeof CommerceAccountGate>["initialCapabilities"];
}) {
  const account = useTranslations("Customer.app_site_me_page");
  const cart = useTranslations("Customer.app_site_shop_cart_page");
  const t = useTranslations("Customer.cartDrawer");
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const leavingForCartPage = useRef(false);
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const popupID = useId();

  useLayoutEffect(() => {
    const inner = content.current;
    if (!popup || !inner) return;
    const property = "--cart-drawer-height";
    // The independent inner box stays content-sized, even while the outer phone tray is moving.
    let target = inner.getBoundingClientRect().height + 1;
    popup.style.setProperty(property, `${target}px`);
    let animation: AnimationPlaybackControls | undefined;
    const stop = resize(inner, () => {
      const next = inner.getBoundingClientRect().height + 1;
      if (next === target) return;
      target = next;
      animation?.stop();
      animation = animate(popup, { [property]: `${target}px` }, motionTokens.spring.smooth);
    });
    return () => {
      stop();
      animation?.stop();
      popup.style.removeProperty(property);
    };
  }, [popup]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <NextLink ref={trigger} href="/shop/cart" aria-haspopup="dialog" aria-expanded={open}
        aria-controls={open ? popupID : undefined}
        onNavigate={(event) => {
          event.preventDefault();
          leavingForCartPage.current = false;
          setOpen(true);
        }}
        className="group rounded-xl border border-border bg-card p-6 text-card-foreground outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2">
        <h3 className="font-heading text-2xl underline-offset-4 group-hover:underline">{account("cart.title")}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{account("cart.description")}</p>
      </NextLink>
      <SheetContent ref={setPopup} id={popupID} side="right" showCloseButton={false} finalFocus={() => leavingForCartPage.current ? false : trigger.current} data-lenis-prevent=""
        className="max-h-dvh border-border bg-background text-foreground transition-[opacity,translate] data-[side=right]:w-full data-[side=right]:sm:max-w-[36rem] pointer-coarse:max-sm:rounded-t-3xl pointer-coarse:max-sm:max-h-[85dvh] pointer-coarse:max-sm:data-[side=right]:top-auto pointer-coarse:max-sm:data-[side=right]:h-[var(--cart-drawer-height,auto)] pointer-coarse:max-sm:overflow-hidden pointer-coarse:max-sm:data-[side=right]:border-l-0 pointer-coarse:max-sm:data-[side=right]:border-t pointer-coarse:max-sm:data-[side=right]:data-starting-style:translate-x-0 pointer-coarse:max-sm:data-[side=right]:data-starting-style:translate-y-10 pointer-coarse:max-sm:data-[side=right]:data-ending-style:translate-x-0 pointer-coarse:max-sm:data-[side=right]:data-ending-style:translate-y-10">
        <div ref={content} className="flex h-full min-h-0 shrink-0 flex-col pointer-coarse:max-sm:h-auto pointer-coarse:max-sm:max-h-[calc(85dvh-1px)]">
          <SheetHeader className="shrink-0 border-b border-border px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6">
            <div className="flex items-center gap-4">
              <SheetClose render={<button type="button" className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2" />}>
                <XIcon aria-hidden="true" className="size-5" />
                <span className="sr-only">{t("close")}</span>
              </SheetClose>
              <SheetTitle className="font-heading text-2xl tracking-tight">{cart("title")}</SheetTitle>
            </div>
            <SheetDescription className="sr-only">{t("description")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            <CommerceAccountGate initialCapabilities={initialCapabilities}>
              <CommerceCart products={products} />
            </CommerceAccountGate>
          </div>
          <SheetFooter className="shrink-0 border-t border-border px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            <NextLink href="/shop/cart" onNavigate={() => {
              leavingForCartPage.current = true;
              setOpen(false);
            }}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-5 text-sm outline-offset-4 transition-colors hover:bg-muted focus-visible:outline-2">{t("fullPage")}</NextLink>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
