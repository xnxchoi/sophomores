import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { cn } from "@/lib/utils";
import type { SellerInformation } from "@/lib/commerce/disclosures";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

/** Presentation only: callers retain their approved facts, visibility and surface colors. */
export function SellerDisclosure({ seller = null, className, showNavigation = true }: {
  seller?: (SellerInformation & { readonly email?: string | null }) | null;
  className?: string;
  showNavigation?: boolean;
}) {
  const t = useTranslations("Interface.seller");
  return <section aria-label={t("section")} className={cn("border-t border-current/20 px-6 py-12 text-current sm:px-10 sm:py-16", className)}>
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
        <h2 className="font-heading text-2xl tracking-tight sm:text-3xl">{t("heading")}</h2>
        {seller ? <dl className="grid gap-x-8 gap-y-6 text-sm leading-relaxed sm:grid-cols-2">
          {([
            ["name", seller.name],
            ["representative", seller.representative],
            ["registrationNumber", seller.registrationNumber],
            ["mailOrderNum", seller.mailOrderNum],
            ["address", seller.address],
            ["phone", seller.phone],
            ["email", seller.email],
          ] as const).map(([field, value]) => value ? <div key={field}>
            <dt className="text-xs opacity-65">{t(field)}</dt>
            <dd className="mt-2 break-words">
              {field === "phone" ? <a href={"tel:" + value.replace(/[^\d+]/g, "")} className="group/focus inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{value}</FocusShape></a>
                : field === "email" ? <a href={"mailto:" + value} className="group/focus inline-flex min-h-12 max-w-full items-center break-all underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{value}</FocusShape></a>
                  : value}
            </dd>
          </div> : null)}
        </dl> : <p className="max-w-lg text-sm leading-relaxed opacity-70">{t("unavailable")}</p>}
      </div>
      {showNavigation && <SellerNavigation />}
    </div>
  </section>;
}

export function SellerNavigation() {
  const t = useTranslations("Interface.seller");
  return (
    <div className="mt-10 grid gap-5 border-t border-current/20 pt-6 sm:mt-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
      <nav aria-label={t("supportNavigation")} className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Link href="/help" className="group/focus inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("help")}</FocusShape></Link>
        <Link href="/help/shipping" className="group/focus inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t("shipping")}</FocusShape></Link>
      </nav>
      <SellerPolicyLinks />
    </div>
  );
}

/** Terms, Privacy and Refund: the legal links every page keeps (site footer) and the policy pages repeat. */
export function SellerPolicyLinks({ className }: { className?: string }) {
  const t = useTranslations("Interface.seller");
  return (
    <nav aria-label={t("policies")} className={cn("flex flex-wrap gap-x-6 gap-y-1 text-sm", className)}>
      {(["terms", "privacy", "refund"] as const).map((policy) => <Link key={policy} href={"/" + policy}
        className="group/focus inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"><FocusShape className="outline-offset-4">{t(policy)}</FocusShape></Link>)}
    </nav>
  );
}
