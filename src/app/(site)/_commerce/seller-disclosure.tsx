import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SellerInformation } from "@/lib/commerce/disclosures";

/** Presentation only: callers retain their approved facts, visibility and surface colors. */
export function SellerDisclosure({ seller = null, className, showNavigation = true, colophon = false }: {
  seller?: (SellerInformation & { readonly email?: string | null }) | null;
  className?: string;
  showNavigation?: boolean;
  colophon?: boolean;
}) {
  const t = useTranslations("Interface.seller");
  return <section aria-label={t("section")} className={cn("border-t border-current/20 px-6 py-12 text-current sm:px-10 sm:py-16", colophon && "border-t-0 pt-8 pb-6 text-center sm:pt-10 sm:pb-8", className)}>
    <div className="mx-auto max-w-7xl">
      <div className={cn("grid gap-8", colophon ? "mx-auto max-w-3xl gap-5" : "lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16")}>
        <h2 className={cn("font-heading tracking-tight", colophon ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl")}>{t("heading")}</h2>
        {seller ? <dl className={cn("grid gap-x-8 gap-y-6 text-sm leading-relaxed sm:grid-cols-2", colophon && "gap-y-4")}>
          {([
            ["name", seller.name],
            ["representative", seller.representative],
            ["registrationNumber", seller.registrationNumber],
            ["mailOrderRegistrationNumber", seller.mailOrderRegistrationNumber],
            ["address", seller.address],
            ["phone", seller.phone],
            ["email", seller.email],
          ] as const).map(([field, value]) => value ? <div key={field}>
            <dt className="text-xs opacity-65">{t(field)}</dt>
            <dd className="mt-2 break-words">
              {field === "phone" ? <a href={"tel:" + value.replace(/[^\d+]/g, "")} className="inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{value}</a>
                : field === "email" ? <a href={"mailto:" + value} className="inline-flex min-h-12 max-w-full items-center break-all underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{value}</a>
                  : value}
            </dd>
          </div> : null)}
        </dl> : <p className="max-w-lg text-sm leading-relaxed opacity-70">{t("unavailable")}</p>}
      </div>
      {showNavigation && <SellerNavigation />}
    </div>
  </section>;
}

export function SellerNavigation({ centered = false }: { centered?: boolean }) {
  const t = useTranslations("Interface.seller");
  return (
    <div className={cn("grid gap-2 border-current/20", centered ? "border-t pt-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10" : "mt-10 gap-5 border-t pt-6 sm:mt-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16")}>
      <nav aria-label={t("supportNavigation")} className={cn("flex flex-wrap gap-x-6 gap-y-1 text-sm", centered && "justify-center")}>
        <Link href="/help" className="inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("help")}</Link>
        <Link href="/help/shipping" className="inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t("shipping")}</Link>
      </nav>
      <nav aria-label={t("policies")} className={cn("flex flex-wrap gap-x-6 gap-y-1 text-sm", centered && "justify-center")}>
        {(["terms", "privacy", "refund"] as const).map((policy) => <Link key={policy} href={"/" + policy}
          className="inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{t(policy)}</Link>)}
      </nav>
    </div>
  );
}
