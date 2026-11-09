"use client";

import { useTranslations } from "next-intl";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Timeline,
  type TimelineEditor,
  type TimelineState
} from "@xzdarcy/react-timeline-editor";
import { cn } from "cn";
import {
  SEQUENCE_CLIPS,
  validateSequenceDraft,
  type SequenceClipId,
  type SequenceDomain,
  type SequenceDraft
} from "../_shared/sequence-editor";

type Props = {
  draft: SequenceDraft;
  domain: SequenceDomain;
  selected: SequenceClipId;
  time: number;
  ready: boolean;
  showEasing: boolean;
  onChange: (next: SequenceDraft) => void;
  onSelect: (id: SequenceClipId, pointerTime?: number) => void;
  onSeek: (time: number) => void;
};

export default function DomainTimeline({
  draft,
  domain,
  selected,
  time,
  ready,
  showEasing,
  onChange,
  onSelect,
  onSeek
}: Props) {
  const t = useTranslations("Developer.domainTimeline");
  const sequenceText = useTranslations("Developer.sequenceData");
  const timeline = useRef<TimelineState>(null);
  const [scaleWidth, setScaleWidth] = useState(100);
  const clips = SEQUENCE_CLIPS.filter((clip) => clip.domain === domain);
  const maximum = domain === "opening" ? draft.openingDuration : 100;
  // Only newly allocated row/action records enter the mutable vendor editor.
  const rows = useMemo(
    () => [
      ...SEQUENCE_CLIPS.filter((clip) => clip.domain === domain).flatMap(
        (clip) => {
          const range = draft.clips[clip.id];
          const action = {
            id: clip.id,
            start: range.start,
            end: range.end,
            effectId: "preview-only",
            selected: selected === clip.id,
            minStart: 0,
            maxEnd: domain === "opening" ? draft.openingDuration : 70,
            movable: clip.id !== "warpApproach" && clip.id !== "ringSettlement",
            disable: true
          };
          return [
            { id: clip.id, actions: [action] },
            ...(showEasing
              ? [
                  {
                    id: `${clip.id}:ease`,
                    rowHeight: 18,
                    actions: [
                      {
                        ...action,
                        id: `${clip.id}:ease`,
                        movable: false,
                        flexible: false
                      }
                    ]
                  }
                ]
              : [])
          ];
        }
      ),
      ...(domain === "scroll"
        ? [
            {
              id: "originalCorona",
              actions: [
                {
                  id: "originalCorona",
                  start: 70,
                  end: 100,
                  effectId: "preview-only",
                  movable: false,
                  flexible: false,
                  disable: true
                }
              ]
            }
          ]
        : [])
    ],
    [draft, domain, selected, showEasing]
  );

  useEffect(() => {
    timeline.current?.setTime(time);
  }, [time]);
  const allowEdit: NonNullable<TimelineEditor["onActionMoving"]> = ({
    action,
    start,
    end
  }) => {
    const clip = SEQUENCE_CLIPS.find((item) => item.id === action.id);
    if (!clip) return false;
    return validateSequenceDraft({
      ...draft,
      clips: {
        ...draft.clips,
        [clip.id]: { ...draft.clips[clip.id], start, end }
      }
    }).success;
  };

  return (
    <section
      aria-label={
        domain === "opening" ? t("pageRevealTimeline") : t("scrollTimeline")
      }
      className="min-h-40 min-w-0 space-y-2"
    >
      <p className="sr-only">
        {domain === "opening"
          ? t("startsWhenTheRendererIsReadyThisClockIs")
          : t("eachPropertyHasItsOwnLaneOverlappingClipsStay")}{" "}{t("dragClipsOrResizeTheirEdgesUseTheInspector")}</p>
      <div
        className="overflow-hidden rounded border border-white/20 [&>div]:h-40! [&>div]:w-full!"
        data-sequence-timeline={domain}
      >
        <Timeline
          ref={timeline}
          editorData={rows}
          effects={{}}
          autoReRender={false}
          disableDrag={!ready}
          enableRowDrag={false}
          autoScroll
          scale={domain === "opening" ? 1 : 10}
          scaleWidth={scaleWidth}
          minScaleCount={Math.ceil(maximum / (domain === "opening" ? 1 : 10))}
          maxScaleCount={Math.ceil(maximum / (domain === "opening" ? 1 : 10))}
          rowHeight={36}
          getScaleRender={(value) => (
            <span>
              {value}
              {domain === "opening" ? "s" : "%"}
            </span>
          )}
          onActionMoving={allowEdit}
          onActionResizing={allowEdit}
          onChange={(nextRows) => {
            const edits = Object.fromEntries(
              nextRows.flatMap((row) =>
                row.actions.flatMap((action) => {
                  const clip = SEQUENCE_CLIPS.find(
                    (item) => item.id === action.id
                  );
                  return clip
                    ? [
                        [
                          clip.id,
                          {
                            ...draft.clips[clip.id],
                            start: action.start,
                            end: action.end
                          }
                        ]
                      ]
                    : [];
                })
              )
            );
            onChange({ ...draft, clips: { ...draft.clips, ...edits } });
            return false;
          }}
          onClickActionOnly={(_, { action, time }) => {
            if (action.id === "originalCorona" && ready)
              onSeek(Math.min(100, Math.max(70, time)));
            const clip = SEQUENCE_CLIPS.find(
              (item) => item.id === action.id.replace(":ease", "")
            );
            if (clip) onSelect(clip.id, time);
          }}
          onClickTimeArea={(value) => {
            if (ready) onSeek(Math.min(maximum, Math.max(0, value)));
            return false;
          }}
          onCursorDrag={(value) => {
            if (ready) onSeek(Math.min(maximum, Math.max(0, value)));
          }}
          getActionRender={(action) => {
            if (action.id === "originalCorona")
              return (
                <div className="flex h-full items-center overflow-hidden border border-dashed border-white/40 bg-black/60 px-2 text-[11px] text-white/60">
                  <span className="truncate">{t("originalCorona70100ReadOnly")}</span>
                </div>
              );
            const clip = SEQUENCE_CLIPS.find(
              (item) => item.id === action.id.replace(":ease", "")
            );
            if (!clip) return null;
            const ease = draft.clips[clip.id].ease;
            return action.id.endsWith(":ease") ? (
              <svg
                aria-label={t("clipEasing", { clip: sequenceText(clip.labelKey) })}
                viewBox="0 -3 100 106"
                preserveAspectRatio="none"
                className="h-full w-full overflow-hidden bg-black/50 text-white/80"
              >
                <path
                  d={`M 0 100 C ${ease[0] * 100} ${100 - ease[1] * 100}, ${ease[2] * 100} ${100 - ease[3] * 100}, 100 0`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            ) : (
              <div
                className={cn(
                  "flex h-full items-center overflow-hidden border px-2 text-[11px]",
                  selected === clip.id
                    ? "border-white bg-white/20 text-white"
                    : "border-white/15 bg-black/50 text-white/75"
                )}
              >
                <span className="truncate">
                  {t(`groups.${clip.group}`)} · {sequenceText(clip.labelKey)}
                </span>
              </div>
            );
          }}
        />
      </div>
      <div aria-label={t("selectPropertyLane")} className="flex flex-wrap gap-1.5">
        <label className="flex items-center gap-1 text-[11px] text-white/70">{t("zoom")}<select
            aria-label={t("timelineZoom")}
            value={scaleWidth}
            onChange={(event) =>
              setScaleWidth(Number(event.currentTarget.value))
            }
            className="min-h-9 rounded border border-white/25 bg-black! px-2 text-white! focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <option value={100}>1×</option>
            <option value={150}>1.5×</option>
            <option value={200}>2×</option>
            <option value={300}>3×</option>
          </select>
        </label>
        {clips.map((clip) => (
          <button
            key={clip.id}
            type="button"
            aria-label={t("selectClip", { clip: sequenceText(clip.labelKey) })}
            aria-pressed={selected === clip.id}
            onClick={() => onSelect(clip.id)}
            className={cn(
              "min-h-9 rounded border px-2 text-[11px] focus-visible:outline-2 focus-visible:outline-offset-2",
              selected === clip.id
                ? "border-white bg-white text-black"
                : "border-white/25 text-white/70 hover:bg-white/10"
            )}
          >
            {sequenceText(clip.labelKey)}
          </button>
        ))}
      </div>
      {domain === "scroll" && (
        <p className="rounded border border-dashed border-white/25 px-3 py-2 text-[11px] text-white/65">{t("originalCorona70100ReadOnlyReferenceSeekUsing")}</p>
      )}
    </section>
  );
}
