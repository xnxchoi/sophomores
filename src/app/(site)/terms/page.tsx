import messages from "../../../../messages/en.json";
import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { PolicyPage } from "../_commerce/policy-page";

export const metadata = { title: messages.PageMetadata.terms };

export default async function TermsPage() {
  await connection();
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  return <PolicyPage policy="terms" content={disclosure?.policies.terms} seller={disclosure?.seller} />;
}
