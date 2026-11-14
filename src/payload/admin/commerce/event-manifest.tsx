"use client";

import { useTranslations } from "next-intl";

import { useEffect, useState } from "react";
import { Button, useConfig, useDocumentInfo, useFormModified } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { z } from "zod";
import "@/styles/staff-login.css";

const manifestSchema = z.strictObject({
  docs: z.array(z.strictObject({ admissionID: z.string(), name: z.string(), checkedIn: z.boolean(), transferRedeemed: z.boolean(), reviewRequired: z.boolean(), registered: z.boolean(), transferEligible: z.boolean() })).max(100),
  page: z.int().min(1), totalDocs: z.int().min(0), hasNextPage: z.boolean()
});
export function EventManifest() {
  const t = useTranslations("Staff.eventManifest");
  const { id } = useDocumentInfo();
  return id ? <SavedManifest key={String(id)} id={String(id)} /> : <p>{t("saveThisEventBeforeLoadingItsManifest")}</p>;
}
function SavedManifest({ id }: { id: string }) {
  const t = useTranslations("Staff.eventManifest");
  const { config } = useConfig();
  const modified = useFormModified();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<z.infer<typeof manifestSchema> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    if (modified) { setResult(null); return () => controller.abort(); }
    setBusy(true); setError(false); setResult((current) => current?.page === page ? current : null);
    const url = formatAdminURL({ apiRoute: config.routes.api, path: `/commerce/events/${encodeURIComponent(id)}/manifest?page=${page}` });
    void (async () => {
      try {
        const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (!response.ok) throw new Error("manifest");
        const receipt = manifestSchema.parse(await response.json());
        if (receipt.page !== page) throw new Error("page");
        if (!controller.signal.aborted) setResult(receipt);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [id, page, revision, modified, config.routes.api]);
  return <section aria-label={t("eventGuestManifest")} className="staff:my-6 staff:flex staff:flex-col staff:gap-4">
    <h3 className="staff:m-0">{t("guestSharedTransferManifest")}</h3>
    <p className="staff:m-0">{t("savedEventOnlyUpTo100AdmissionsPer")}</p>
    {modified ? <p role="status">{t("saveOrDiscardEventEditsBeforeLoadingThe")}</p> : <>
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>{t("refreshManifest")}</Button>
      <p role="status" className="staff:m-0 staff:min-h-6">{busy ? t("loadingManifest") : error ? t("manifestUnavailableUseRefreshManifestToRetry") : result ? t("manifestAtLastReadRefreshToCheckCurrent") : ""}</p>
      {result && <>
        <p className="staff:m-0">{t("pagePageTotalAdmissions", { page: result.page, total: result.totalDocs })}</p>
        <div className="staff:overflow-x-auto"><table className="staff:w-full staff:text-left"><caption className="staff:sr-only">{t("namedAdmissionsAndTransferStatus")}</caption><thead><tr><th scope="col">{t("guest")}</th><th scope="col">{t("admission")}</th><th scope="col">{t("checkIn")}</th><th scope="col">{t("sharedTransfer")}</th></tr></thead><tbody>{result.docs.map((row) => <tr key={row.admissionID}>
          <td>{row.name || t("unnamed")}{row.reviewRequired ? t("reviewRequired") : ""}</td><td><a className="staff:inline-flex staff:min-h-[44px] staff:items-center staff:underline" href={formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/commerce-admissions/${encodeURIComponent(row.admissionID)}` })}>{row.admissionID}</a></td><td>{row.checkedIn ? t("checkedIn") : t("notCheckedIn")}{row.registered ? t("registered") : t("unregistered")}</td><td>{row.transferRedeemed ? t("redeemed") : row.transferEligible ? t("eligibleAtLastRead") : t("notEligible")}</td>
        </tr>)}</tbody></table></div>
      </>}
      {(result || page > 1) && <div className="staff:flex staff:gap-3"><Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || page <= 1} onClick={() => setPage((value) => value - 1)}>{t("previous")}</Button><Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || !result?.hasNextPage} onClick={() => setPage((value) => value + 1)}>{t("next")}</Button></div>}
    </>}
  </section>;
}
