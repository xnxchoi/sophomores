import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { PolicyPage } from "../_commerce/policy-page";

export const metadata = { title: "개인정보처리방침" };

export default async function PrivacyPage() {
  await connection();
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  return <PolicyPage policy="privacy" content={disclosure?.policies.privacy} seller={disclosure?.seller} />;
}
