import { connection } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";
import { PolicyPage } from "../_commerce/policy-page";

export const metadata = { title: "취소·환불 안내" };

export default async function RefundPage() {
  await connection();
  let disclosure = null;
  try { disclosure = await loadPublishedCommerceDisclosure(await getPayload({ config })); }
  catch { console.error("Published commerce information is unavailable."); }
  return <PolicyPage policy="refund" content={disclosure?.policies.refund} seller={disclosure?.seller} />;
}
