"use client";

import { useState } from "react";
import {
  validateSequenceDraft,
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
  const [json, setJson] = useState("");
  const [copying, setCopying] = useState(false);
  const copy = async () => {
    if (!navigator.clipboard?.writeText) {
      onStatus("Could not copy: clipboard unavailable. Use Export JSON below.");
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
      onStatus("Copied sequence JSON.");
    } catch {
      onStatus(
        "Could not copy. Check clipboard permissions or use Export JSON below."
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
            onStatus("Reset to original sequence for this session.");
          }}
        >
          Reset sequence
        </EditorButton>
        <EditorButton disabled={copying} onClick={copy}>
          {copying ? "Copying…" : "Copy JSON"}
        </EditorButton>
        <EditorButton
          onClick={() => {
            setJson(JSON.stringify(draft, null, 2));
            onStatus(
              "JSON exported below. Copy it before leaving; nothing was saved to production."
            );
          }}
        >
          Export JSON
        </EditorButton>
      </footer>
      <details className="mt-3 text-xs" open={json ? true : undefined}>
        <summary className="cursor-pointer py-2 focus-visible:outline-2">
          Import / exported JSON
        </summary>
        <textarea
          aria-label="Sequence JSON"
          value={json}
          onChange={(event) => setJson(event.currentTarget.value)}
          placeholder="Paste a version 1 sequence draft"
          className="mb-2 h-32 w-full rounded border border-white/25 bg-black p-2 font-mono text-[11px] text-white! focus-visible:outline-2"
        />
        <EditorButton
          onClick={() => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(json);
            } catch {
              onStatus("Invalid JSON: check syntax before importing.");
              return;
            }
            const result = validateSequenceDraft(parsed);
            if (!result.success) {
              onStatus(
                `Invalid JSON draft: ${result.error.issues[0]?.message}`
              );
              return;
            }
            onChange(result.data);
          }}
        >
          Apply JSON draft
        </EditorButton>
      </details>
    </>
  );
}
