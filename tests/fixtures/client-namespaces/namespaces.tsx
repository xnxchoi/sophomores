"use client";
import { useTranslations } from "next-intl";

// One literal namespace, one literal Customer subtree, and one non-literal namespace the walker cannot read.
export function Reader({ namespace }: { namespace: "Common" }) {
  const common = useTranslations("Common");
  const policy = useTranslations("Customer.policy.sections");
  const dynamic = useTranslations(namespace);
  return `${common("cancel")} ${policy("title")} ${dynamic("cancel")}`;
}
