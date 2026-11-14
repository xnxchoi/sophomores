"use client";

import { useTranslations } from "next-intl";

import { useId, useState } from "react";
import {
  Button,
  FieldLabel,
  ReactSelect,
  TextareaInput,
  useDocumentInfo
} from "@payloadcms/ui";
import {
  recoveryReviewReceiptSchema,
  recoveryReviewSchema
} from "../../lib/member-auth/recovery/contracts";
import "@/styles/staff-login.css";

export function RecoveryReview() {
  const t = useTranslations("Staff.recoveryReview");
  const { id, data } = useDocumentInfo();
  const statusId = useId();
  const [status, setStatus] = useState("needs_proof");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [savedRevision, setSavedRevision] = useState<number | null>(null);
  const revision = savedRevision ?? data?.revision;
  const statusOptions = [
    { value: "submitted", label: t("submitted") },
    { value: "needs_proof", label: t("needsProofNoMessageSent") },
    { value: "rejected", label: t("rejected") },
    { value: "closed", label: t("closed") }
  ];
  async function save() {
    const input = recoveryReviewSchema.safeParse({
      status,
      internalNote,
      expectedRevision: revision
    });
    if (!input.success || !id) {
      setFeedback(t("aCurrentRevisionAndInternalReviewNoteAre"));
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch(
        `/api/member/recovery/${encodeURIComponent(String(id))}/review`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input.data),
          signal: AbortSignal.timeout(10_000)
        }
      );
      if (!response.ok) {
        setFeedback(
          response.status === 409
            ? t("thisRequestChangedOrExpiredReloadBeforeReviewing")
            : t("reviewCouldNotBeSaved")
        );
        return;
      }
      const result = recoveryReviewReceiptSchema.parse(await response.json());
      setSavedRevision(result.data.revision);
      setInternalNote("");
      setFeedback(
        t("reviewMetadataSavedNoMessageWasSentAnd")
      );
    } catch {
      setFeedback(t("reviewCouldNotBeSaved"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label={t("intakeOnlyStaffReview")}
      className="staff:flex staff:flex-col staff:gap-5"
    >
      <p className="staff:m-0">{t("unverifiedClaimsOnlyMarkingNeedsProofRecordsMetadata")}</p>
      <div>
        <FieldLabel htmlFor={statusId} label={t("reviewStatus")} />
        <ReactSelect
          inputId={statusId}
          value={statusOptions.find((option) => option.value === status)}
          disabled={busy}
          isClearable={false}
          onChange={(option) => {
            if (!Array.isArray(option) && option)
              setStatus(String(option.value));
          }}
          options={statusOptions}
        />
      </div>
      <TextareaInput
        label={t("internalReviewNoteMaximum2000Characters")}
        path="recoveryInternalNote"
        rows={4}
        value={internalNote}
        onChange={(event) => setInternalNote(event.target.value.slice(0, 2000))}
        readOnly={busy}
      />
      <div className="staff:flex staff:flex-wrap staff:items-center staff:gap-4">
        <Button
          className="staff:m-0"
          type="button"
          disabled={busy || typeof revision !== "number"}
          onClick={() => void save()}
        >
          {busy ? t("savingReview") : t("saveReviewMetadata")}
        </Button>
        <p className="staff:m-0 staff:text-xs staff:text-(--theme-elevation-600)">
          {t("expectedRevision")}{" "}
          {typeof revision === "number" ? revision : t("unavailable")}
        </p>
      </div>
      {feedback && (
        <p className="staff:m-0" role="status">
          {feedback}
        </p>
      )}
    </section>
  );
}
