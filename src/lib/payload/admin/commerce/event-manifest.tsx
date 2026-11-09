"use client";

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
  const { id } = useDocumentInfo();
  return id ? <SavedManifest key={String(id)} id={String(id)} /> : <p>Save this event before loading its manifest.</p>;
}
function SavedManifest({ id }: { id: string }) {
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
  return <section aria-label="Event guest manifest" className="staff:my-6 staff:flex staff:flex-col staff:gap-4">
    <h3 className="staff:m-0">Guest & shared-transfer manifest</h3>
    <p className="staff:m-0">Saved event only. Up to 100 admissions per page; eligibility can change after this read.</p>
    {modified ? <p role="status">Save or discard event edits before loading the manifest.</p> : <>
      <Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>Refresh manifest</Button>
      <p role="status" className="staff:m-0 staff:min-h-6">{busy ? "Loading manifest…" : error ? "Manifest unavailable. Use Refresh manifest to retry." : result ? "Manifest at last read. Refresh to check current status." : ""}</p>
      {result && <>
        <p className="staff:m-0">Page {result.page} · {result.totalDocs} admissions</p>
        <div className="staff:overflow-x-auto"><table className="staff:w-full staff:text-left"><caption className="staff:sr-only">Named admissions and transfer status</caption><thead><tr><th scope="col">Guest</th><th scope="col">Admission</th><th scope="col">Check-in</th><th scope="col">Shared transfer</th></tr></thead><tbody>{result.docs.map((row) => <tr key={row.admissionID}>
          <td>{row.name || "Unnamed"}{row.reviewRequired ? " · Review required" : ""}</td><td><a className="staff:inline-flex staff:min-h-[44px] staff:items-center staff:underline" href={formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/commerce-admissions/${encodeURIComponent(row.admissionID)}` })}>{row.admissionID}</a></td><td>{row.checkedIn ? "Checked in" : "Not checked in"}{row.registered ? " · Registered" : " · Unregistered"}</td><td>{row.transferRedeemed ? "Redeemed" : row.transferEligible ? "Eligible at last read" : "Not eligible"}</td>
        </tr>)}</tbody></table></div>
      </>}
      {(result || page > 1) && <div className="staff:flex staff:gap-3"><Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button className="staff:m-0 staff:min-h-[44px]" type="button" disabled={busy || !result?.hasNextPage} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
    </>}
  </section>;
}
