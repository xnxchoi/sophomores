import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { loadPublicMemberCapabilities } from "@/lib/member-auth/public-capabilities.server";
import { CommerceAccountGate } from "@/components/commerce/checkout";
import { OrderAdmissions } from "@/components/commerce/order-admissions";

export const metadata = { title: "Guest admissions — Sophomores", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function OrderAdmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const result = z.uuid().safeParse((await params).id);
  if (!result.success) notFound();
  return <main className="mx-auto min-h-[70svh] max-w-2xl px-6 pb-20 pt-32 text-neutral-100">
    <h1 className="mb-8 text-3xl font-medium tracking-tight">Your order</h1>
    <CommerceAccountGate initialCapabilities={loadPublicMemberCapabilities()}><OrderAdmissions orderID={result.data} /></CommerceAccountGate>
  </main>;
}
