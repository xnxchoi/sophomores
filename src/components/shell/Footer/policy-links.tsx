import { useTranslations } from "next-intl";
import { Link } from "@/components/core/Link/Link";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { cn } from "@/lib/utils";

/** Terms, Privacy and Refund: the legal links every page keeps (site footer) and the policy pages repeat. */
export function SellerPolicyLinks({ className }: { className?: string }) {
  const t = useTranslations("Interface.seller");
  return (
    <nav aria-label={t("policies")} className={cn("flex flex-wrap gap-x-6 gap-y-1 text-sm", className)}>
      {(["terms", "privacy", "refund"] as const).map((policy) => (
        <Link
          key={policy}
          href={"/" + policy}
          className="group/focus inline-flex min-h-12 items-center underline decoration-current/40 underline-offset-4 hover:decoration-current"
        >
          <FocusShape className="outline-offset-4">{t(policy)}</FocusShape>
        </Link>
      ))}
    </nav>
  );
}
