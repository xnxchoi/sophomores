"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";
import {
  validateSequenceDraft,
  type SequenceValidationParams,
  type SequenceDraft
} from "../_shared/sequence-editor";
import EditorButton from "./editor-button";

type Props = {
  draft: SequenceDraft;
  defaults: SequenceDraft;
  onChange: (draft: SequenceDraft) => void;
  onStatus: (status: string) => void;
};

export default function DraftTransfer({
  draft,
  defaults,
  onChange,
  onStatus
}: Props) {
  const t = useTranslations("Developer.draftTransfer");
  const sequenceText = useTranslations("Developer.sequenceData");
  const [json, setJson] = useState("");
  const [copying, setCopying] = useState(false);
  const copy = async () => {
    if (!navigator.clipboard?.writeText) {
      onStatus(t("couldNotCopyClipboardUnavailableUseExportJSONBelow"));
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      onStatus(t("copiedSequenceJSON"));
    } catch {
      onStatus(
        t("couldNotCopyCheckClipboardPermissionsOrUseExport")
      );
    } finally {
      setCopying(false);
    }
  };
  return (
    <>
      <footer className="mt-4 flex flex-wrap gap-2 border-t border-white/15 pt-3">
        <EditorButton
          onClick={() => {
            onChange(structuredClone(defaults));
            onStatus(t("resetToOriginalSequenceForThisSession"));
          }}
        >{t("resetSequence")}</EditorButton>
        <EditorButton disabled={copying} onClick={copy}>
          {copying ? t("copying") : t("copyJSON")}
        </EditorButton>
        <EditorButton
          onClick={() => {
            setJson(JSON.stringify(draft, null, 2));
            onStatus(
              t("jSONExportedBelowCopyItBeforeLeavingNothingWas")
            );
          }}
        >{t("exportJSON")}</EditorButton>
      </footer>
      <details className="mt-3 text-xs" open={json ? true : undefined}>
        <summary className="cursor-pointer py-2 focus-visible:outline-2">{t("importExportedJSON")}</summary>
        <textarea
          aria-label={t("sequenceJSON")}
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
          placeholder={t("pasteAVersion1SequenceDraft")}
          className="mb-2 h-32 w-full rounded border border-white/25 bg-black p-2 font-mono text-[11px] text-white! focus-visible:outline-2"
        />
        <EditorButton
          onClick={() => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(json);
            } catch {
              onStatus(t("invalidJSONCheckSyntaxBeforeImporting"));
              return;
            }
            const result = validateSequenceDraft(parsed);
            if (!result.success) {
              const issue = result.error.issues[0];
              const detail = issue?.code === "custom" ? issue.params as SequenceValidationParams | undefined : undefined;
              onStatus(
                t("invalidJsonDraft", { message: detail ? sequenceText(detail.messageKey, detail.values) : issue?.message ?? "undefined" })
              );
              return;
            }
            onChange(result.data);
          }}
        >{t("applyJSONDraft")}</EditorButton>
      </details>
    </>
  );
}
