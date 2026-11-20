import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The Help pill's list (owner, 20 Nov: "the functional but boring stuff pages? Like customer support etc").
 * UI-Shell owns the pill: its placement, open state, surface and motion. Each item is a direct `li`, so the pill can
 * stagger them through `className`. Signed-out visitors who pick Orders are sent to `/account?next=/me/orders`.
 * `contactEmail` is the published customer-service email (`loadBusinessInformation(...).facts?.customerServiceEmail`);
 * Contact shows only when it is set. `onOpenGuide` adds Site guide after Orders (owner, 21 Nov: "Put it into the help list"); it opens
 * the guide, then closes the list. `closeLabel` replaces the Close text (UI-Shell passes `t("classDismissed")` for the easter egg). Terms, Privacy and Refund stay in the footer: they are legal, not support.
 */
export function HelpPillLinks({ contactEmail = null, onClose, onOpenGuide, closeLabel, className }: {
  contactEmail?: string | null;
  onClose: () => void;
  onOpenGuide?: () => void;
  closeLabel?: string;
  className?: string;
}) {
  const t = useTranslations("Interface.seller");
  const tour = useTranslations("Interface.tour");
  return (
    <nav aria-label={t("help")}>
      <ul className={cn("flex flex-col text-sm", className)}>
        <li><Link href="/help" onClick={onClose} className="flex min-h-11 items-center outline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2">{t("help")}</Link></li>
        <li><Link href="/help/shipping" onClick={onClose} className="flex min-h-11 items-center outline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2">{t("shipping")}</Link></li>
        <li><Link href="/me/orders" onClick={onClose} className="flex min-h-11 items-center outline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2">{t("orders")}</Link></li>
        {onOpenGuide ? <li><button type="button" onClick={() => { onOpenGuide(); onClose(); }} className="flex min-h-11 w-full items-center outline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2">{tour("siteGuide")}</button></li> : null}
        {contactEmail ? <li><a href={"mailto:" + contactEmail} onClick={onClose} className="flex min-h-11 items-center outline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2">{t("contact")}</a></li> : null}
        <li><button type="button" onClick={onClose} className="flex min-h-11 w-full items-center outline-offset-2 transition-opacity hover:opacity-60 focus-visible:outline-2">{closeLabel ?? t("close")}</button></li>
      </ul>
    </nav>
  );
}
