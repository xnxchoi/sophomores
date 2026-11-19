import { connection } from "next/server";
import { getPayload } from "payload";
import { Suspense, type ReactNode } from "react";
import { loadBusinessInformation, type BusinessFacts } from "@/payload/globals/business-info";
import { SellerDisclosure, SellerNavigation } from "./seller-disclosure";

/** Navigation does not depend on the business-info read. */
export function BusinessFooterView({ children }: { children?: ReactNode }) {
  return (
    <footer className="bg-background pt-16 pb-12 text-foreground sm:pt-24 sm:pb-16">
      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        <SellerNavigation centered />
      </div>
      {children}
    </footer>
  );
}

export function BusinessFooterFacts({ facts }: { facts: BusinessFacts | null }) {
  if (!facts) return null;
  return (
    <SellerDisclosure
      colophon
      showNavigation={false}
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
  );
}

export function BusinessFooter() {
  return (
    <BusinessFooterView>
      <Suspense fallback={null}>
        <PublishedBusinessFacts />
      </Suspense>
    </BusinessFooterView>
  );
}

/** Only approved data is streamed into the already-present footer. */
async function PublishedBusinessFacts() {
  await connection();
  let facts: BusinessFacts | null = null;
  try {
    // Lazy so the presentational view stays importable without Payload configuration.
    const { default: config } = await import("@payload-config");
    facts = (await loadBusinessInformation(await getPayload({ config }))).facts;
  }
  catch { console.error("Business information is unavailable."); }
  return <BusinessFooterFacts facts={facts} />;
}
