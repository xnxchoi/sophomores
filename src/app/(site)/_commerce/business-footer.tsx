import { connection } from "next/server";
import { getPayload } from "payload";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { SellerDisclosure } from "./seller-disclosure";

/** Renders nothing until the owner has filled every required business fact. */
export function BusinessFooterView({ facts }: { facts: BusinessFacts | null }) {
  if (!facts) return null;
  return (
    <footer>
      <SellerDisclosure
        className="bg-[#f5f4f0] pb-16 text-[#171717]"
        seller={{
          name: facts.tradeName,
          representative: facts.representative,
          address: facts.businessAddress,
          registrationNumber: facts.businessRegistrationNumber,
          mailOrderRegistrationNumber: facts.mailOrderRegistration,
          phone: facts.customerServicePhone,
          email: facts.customerServiceEmail
        }}
      />
    </footer>
  );
}

/** Site footer; streamed so the business-info read never blocks or breaks a page. */
export async function BusinessFooter() {
  await connection();
  let facts: BusinessFacts | null = null;
  try {
    // Lazy so the presentational view stays importable without Payload configuration.
    const { default: config } = await import("@payload-config");
    facts = (await loadBusinessInformation(await getPayload({ config }))).facts;
  }
  catch { console.error("Business information is unavailable."); }
  return <BusinessFooterView facts={facts} />;
}
