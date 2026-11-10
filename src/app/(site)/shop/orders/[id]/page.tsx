import messages from "../../../../../../messages/en.json";

import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { OrderAdmissions } from "@/components/commerce/order-admissions";

export const metadata = { title: messages.PageMetadata.guestAdmissions, robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function OrderAdmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('Customer.app_site_shop_orders_id_page');
  await connection();
  const result = z.uuid().safeParse((await params).id);
  if (!result.success) notFound();
  return <main className="mx-auto min-h-[70svh] max-w-2xl px-6 pb-20 pt-32 text-neutral-100">
    <h1 className="mb-8 text-3xl font-medium tracking-tight">{t('yourOrder')}</h1>
    <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}><OrderAdmissions orderID={result.data} /></CommerceAccountGate>
  </main>;
}
