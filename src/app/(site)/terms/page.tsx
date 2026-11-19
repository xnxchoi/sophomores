import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { loadBusinessInformation, parseBusinessInformation } from "@/payload/globals/business-info";
import { PolicyPage } from "../_commerce/policy-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PageMetadata");
  return { title: t("terms") };
}

export default async function TermsPage() {
  await connection();
  let disclosure = null;
  let readFailed = false;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { readFailed = true; console.error("Published commerce information is unavailable."); }
  let business = parseBusinessInformation(null);
  try { business = await loadBusinessInformation(await getPayload({ config })); }
  catch { readFailed = true; console.error("Business information is unavailable."); }
  return <PolicyPage policy="terms" content={disclosure?.policies.terms} seller={disclosure?.seller}
    document={business.policies.terms} showSeller={!business.facts} readFailed={readFailed} />;
}
