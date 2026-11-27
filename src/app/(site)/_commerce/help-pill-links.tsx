import { Button } from "@/components/core/Button";
import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

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
        <li><Link href="/help" onClick={onClose} className="group/focus flex min-h-11 items-center transition-opacity hover:opacity-60"><FocusShape>{t("help")}</FocusShape></Link></li>
        <li><Link href="/help/shipping" onClick={onClose} className="group/focus flex min-h-11 items-center transition-opacity hover:opacity-60"><FocusShape>{t("shipping")}</FocusShape></Link></li>
        <li><Link href="/me/orders" onClick={onClose} className="group/focus flex min-h-11 items-center transition-opacity hover:opacity-60"><FocusShape>{t("orders")}</FocusShape></Link></li>
        {onOpenGuide ? <li><Button variant="bare" type="button" onClick={() => { onOpenGuide(); onClose(); }} className="group/focus flex min-h-11 w-full items-center transition-opacity hover:opacity-60"><FocusShape>{tour("siteGuide")}</FocusShape></Button></li> : null}
        {contactEmail ? <li><a href={"mailto:" + contactEmail} onClick={onClose} className="group/focus flex min-h-11 items-center transition-opacity hover:opacity-60"><FocusShape>{t("contact")}</FocusShape></a></li> : null}
        <li><Button variant="bare" type="button" onClick={onClose} className="group/focus flex min-h-11 w-full items-center transition-opacity hover:opacity-60"><FocusShape>{closeLabel ?? t("close")}</FocusShape></Button></li>
      </ul>
    </nav>
  );
}
