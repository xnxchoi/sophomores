import messages from "../../../../../messages/en.json";

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { CommercePayment } from "@/components/commerce/payment";

export const metadata = { title: messages.PageMetadata.payment, robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function CommercePaymentPage() {
  const t = await getTranslations('Customer.app_site_shop_payment_page');
  await connection();
  return <main className="mx-auto min-h-[70svh] max-w-xl px-6 pb-20 pt-32 text-neutral-100">
    <h1 className="mb-4 text-3xl font-medium tracking-tight">{t('yourPayment')}</h1>
    <p className="mb-8 text-sm leading-6 text-neutral-400">{t('aReturnFromThePaymentWindowIsNotA')}</p>
    <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}><CommercePayment recovery /></CommerceAccountGate>
    <Link href="/shop" className="mt-8 inline-flex min-h-12 items-center text-sm underline underline-offset-4">{t('backToShop')}</Link>
  </main>;
}
