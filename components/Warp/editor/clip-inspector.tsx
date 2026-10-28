"use client";

import { BezierCurveEditor } from "react-bezier-curve-editor";
import { useEffect, useRef } from "react";
import {
  SEQUENCE_CLIPS,
  type Bezier,
  type SequenceClipId,
  type SequenceDraft
} from "../_shared/sequence-editor";
import NumericField from "./numeric-field";

type Props = {
  draft: SequenceDraft;
  selected: SequenceClipId;
  onChange: (next: SequenceDraft) => void;
};
const PRESETS: { label: string; value: Bezier }[] = [
  { label: "Linear", value: [0, 0, 1, 1] },
  { label: "Ease", value: [0.25, 0.1, 0.25, 1] },
  { label: "Ease in", value: [0.42, 0, 1, 1] },
  { label: "Ease out", value: [0, 0, 0.58, 1] },
  { label: "Ease in out", value: [0.42, 0, 0.58, 1] }
];

export default function ClipInspector({ draft, selected, onChange }: Props) {
  const curve = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Version 2.1 exposes handle class hooks but no accessible-name props.
    // Fixed endpoint editing is off, so these are its two control handles.
    curve.current?.querySelectorAll("button").forEach((button, index) => {
      button.setAttribute(
        "aria-label",
        index === 0
          ? "First Bézier handle; keyboard users edit x1 and y1"
          : "Second Bézier handle; keyboard users edit x2 and y2"
      );
      button.tabIndex = -1;
    });
  }, [selected]);
  const metadata = SEQUENCE_CLIPS.find((item) => item.id === selected)!;
  const clip = draft.clips[selected];
  const updateEase = (ease: Bezier) =>
    onChange({
      ...draft,
      clips: { ...draft.clips, [selected]: { ...clip, ease } }
    });
  const preset = PRESETS.find((item) =>
    item.value.every(
      (value, index) => Math.abs(value - clip.ease[index]) < 0.00001
    )
  );
  return (
    <section
      aria-label="Clip inspector"
      className="min-w-0 border-t border-white/20 pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-3"
    >
      <h3 className="text-sm font-medium">{metadata.label}</h3>
      <p className="sr-only">{metadata.description}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["start", "end"] as const).map((edge) => (
          <label
            key={edge}
            className="flex min-w-0 flex-col gap-1 text-[11px] text-white/70"
          >
            {edge === "start" ? "Start" : "End"} (
            {metadata.domain === "opening" ? "seconds" : "%"})
            <NumericField
              key={`${selected}-${edge}`}
              aria-label={`Clip ${edge}`}
              min={0}
              max={metadata.domain === "opening" ? draft.openingDuration : 70}
              step={metadata.domain === "opening" ? 0.05 : 0.1}
              value={Number(clip[edge].toFixed(4))}
              disabled={
                (selected === "warpApproach" && edge === "start") ||
                (selected === "ringSettlement" && edge === "end")
              }
              onValueChange={(value) =>
                onChange({
                  ...draft,
                  clips: {
                    ...draft.clips,
                    [selected]: { ...clip, [edge]: value }
                  }
                })
              }
            />
          </label>
        ))}
      </div>
      <label className="mt-2 flex flex-col gap-1 text-[11px] text-white/70">
        Easing preset
        <select
          aria-label="Easing preset"
          value={preset?.label ?? "Custom"}
          onChange={(event) => {
            const next = PRESETS.find(
              (item) => item.label === event.currentTarget.value
            );
            if (next) updateEase([...next.value]);
          }}
          className="min-h-9 rounded border border-white/25 bg-black! px-2 text-white! focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <option value="Custom">Custom</option>
          {PRESETS.map((item) => (
            <option key={item.label}>{item.label}</option>
          ))}
        </select>
      </label>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div
          ref={curve}
          aria-label="Pointer easing editor"
          className="shrink-0 overflow-hidden rounded border border-white/20"
        >
          <BezierCurveEditor
            value={[...clip.ease]}
            onChange={updateEase}
            size={105}
            outerAreaSize={12}
            enablePreview={false}
            innerAreaColor="#171717"
            outerAreaColor="#101010"
            rowColor="#252525"
            curveLineColor="#ffffff"
            startHandleColor="#cccccc"
            endHandleColor="#888888"
          />
        </div>
        <fieldset className="grid min-w-24 flex-1 grid-cols-2 gap-2">
          <legend className="mb-2 text-[11px] text-white/65">
            Control points · keyboard editable
          </legend>
          {(["x1", "y1", "x2", "y2"] as const).map((label, index) => (
            <label
              key={label}
              className="flex min-w-0 flex-col gap-1 text-[11px] text-white/70"
            >
              {label}
              <NumericField
                key={`${selected}-${label}`}
                aria-label={`Easing ${label}`}
                min={index % 2 === 0 ? 0 : -3}
                max={index % 2 === 0 ? 1 : 3}
                step={0.01}
                value={Number(clip.ease[index].toFixed(4))}
                onValueChange={(value) =>
                  updateEase(
                    clip.ease.map((previous, position) =>
                      position === index ? value : previous
                    ) as Bezier
                  )
                }
              />
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}
