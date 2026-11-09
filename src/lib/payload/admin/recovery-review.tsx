"use client";

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
} from "../../member-auth/recovery/contracts";
import "@/styles/staff-login.css";

export function RecoveryReview() {
  const { id, data } = useDocumentInfo();
  const statusId = useId();
  const [status, setStatus] = useState("needs_proof");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [savedRevision, setSavedRevision] = useState<number | null>(null);
  const revision = savedRevision ?? data?.revision;
  const statusOptions = [
    { value: "submitted", label: "Submitted" },
    { value: "needs_proof", label: "Needs proof (no message sent)" },
    { value: "rejected", label: "Rejected" },
    { value: "closed", label: "Closed" }
  ];
  async function save() {
    const input = recoveryReviewSchema.safeParse({
      status,
      internalNote,
      expectedRevision: revision
    });
    if (!input.success || !id) {
      setFeedback("A current revision and internal review note are required.");
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
            ? "This request changed or expired. Reload before reviewing again."
            : "Review could not be saved."
        );
        return;
      }
      const result = recoveryReviewReceiptSchema.parse(await response.json());
      setSavedRevision(result.data.revision);
      setInternalNote("");
      setFeedback(
        "Review metadata saved. No message was sent and no account was changed. Reload to view the updated audit log."
      );
    } catch {
      setFeedback("Review could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Intake-only staff review"
      className="staff:flex staff:flex-col staff:gap-5"
    >
      <p className="staff:m-0">
        Unverified claims only. Marking “needs proof” records metadata; it does
        not contact the claimant. No recovery or email-change action is
        available.
      </p>
      <div>
        <FieldLabel htmlFor={statusId} label="Review status" />
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
        label="Internal review note (maximum 2000 characters)"
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
          {busy ? "Saving review…" : "Save review metadata"}
        </Button>
        <p className="staff:m-0 staff:text-xs staff:text-(--theme-elevation-600)">
          Expected revision:{" "}
          {typeof revision === "number" ? revision : "unavailable"}
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
