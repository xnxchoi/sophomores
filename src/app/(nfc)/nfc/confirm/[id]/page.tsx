import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { tapCookie } from "@/lib/nfc/tap-entry";
import { inspectTapHandoff } from "@/lib/nfc/tap-entry-runtime";
import { TapPage } from "../../_tap/tap-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, request, jar] = await Promise.all([params, headers(), cookies()]);
  return <TapPage view={await inspectTapHandoff(id, request, jar.get(tapCookie)?.value)} />;
}
