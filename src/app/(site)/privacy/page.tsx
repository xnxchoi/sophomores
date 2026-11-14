import messages from "../../../../messages/en.json";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { loadBusinessInformation, parseBusinessInformation } from "@/payload/globals/business-info";
import { PolicyPage } from "../_commerce/policy-page";

export const metadata = { title: messages.PageMetadata.privacy };

export default async function PrivacyPage() {
  await connection();
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  let business = parseBusinessInformation(null);
  try { business = await loadBusinessInformation(await getPayload({ config })); }
  catch { console.error("Business information is unavailable."); }
  return <PolicyPage policy="privacy" content={disclosure?.policies.privacy} seller={disclosure?.seller}
    document={business.policies.privacy} showSeller={!business.facts} />;
}
