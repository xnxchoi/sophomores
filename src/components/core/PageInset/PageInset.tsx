import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The site's page side inset, taken from the shop product page (owner, 22 Nov: "checkout and terms should have as much
 * margin on the sides as like the product page"). One source for the product pages, checkout and the terms/policy pages:
 * 24px on phones, 40px from 640px, 64px from 1280px, inside a centred 92rem (1472px) column: the /shop product view on
 * main (book-offer.tsx:19, `max-w-[92rem] px-6 sm:px-10 xl:px-16`), measured live at 390/768/1300/1440.
 * Pages add their own vertical spacing and may narrow the column with a max-width class; they never set the side inset.
 */
export function PageInset<T extends ElementType = "div">({ as, className, children, ...props }:
  { as?: T; className?: string; children?: ReactNode } & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">) {
  const Element: ElementType = as ?? "div";
  return <Element {...props} className={cn("mx-auto w-full max-w-[92rem] px-6 sm:px-10 xl:px-16", className)}>{children}</Element>;
}
