import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  type SellerInformation
} from "@/lib/commerce/disclosures";

/** One persistent, server-rendered disclosure surface for home and checkout. */
export function SellerDisclosure({
  seller = null,
  className
}: {
  seller?: SellerInformation | null;
  className?: string;
}) {
  const t = useTranslations("Interface.seller");
  return (
    <section
      aria-label={t("section")}
      className={cn(
        "border-t border-current/20 px-6 py-8 text-current sm:px-10",
        className
      )}
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="text-sm font-medium">{t("heading")}</h2>
        {seller ? (
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm leading-relaxed sm:grid-cols-2">
            <div>
              <dt className="text-xs opacity-60">{t("name")}</dt>
              <dd className="mt-1 break-words">{seller.name}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">{t("registrationNumber")}</dt>
              <dd className="mt-1 break-words">{seller.registrationNumber}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">{t("representative")}</dt>
              <dd className="mt-1 break-words">{seller.representative}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">{t("address")}</dt>
              <dd className="mt-1 break-words">{seller.address}</dd>
            </div>
            <div>
              <dt className="text-xs opacity-60">{t("phone")}</dt>
              <dd className="mt-1 break-words">{seller.phone}</dd>
            </div>
            {seller.mailOrderRegistrationNumber ? (
              <div>
                <dt className="text-xs opacity-60">{t("mailOrderRegistrationNumber")}</dt>
                <dd className="mt-1 break-words">
                  {seller.mailOrderRegistrationNumber}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-relaxed opacity-70">
            {t("unavailable")}
          </p>
        )}
        <nav
          aria-label={t("policies")}
          className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm"
        >
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
          >
            {t("terms")}
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
          >
            {t("privacy")}
          </Link>
          <Link
            href="/refund"
            className="inline-flex min-h-11 items-center underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2"
          >
            {t("refund")}
          </Link>
        </nav>
      </div>
    </section>
  );
}
