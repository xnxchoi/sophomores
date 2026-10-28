import { z } from "zod";

// Feature-private data shared by the Warp owner, editor and native Motion compiler.
// Motion owns interpolation; Zod owns parsing. No generic timeline engine is needed.
export type Bezier = [number, number, number, number];
export type SequenceDomain = "opening" | "scroll";
export type SequenceClipId =
  | "openingText"
  | "openingField"
  | "headlineSplit"
  | "headlineScale"
  | "headlineFade"
  | "passageLine1"
  | "passageLine2"
  | "passageTravel"
  | "passageFadeIn"
  | "passageFadeOut"
  | "warpApproach"
  | "ringSettlement";
export type ClipTiming = { start: number; end: number; ease: Bezier };
export type SequenceDraft = {
  version: 1;
  openingDuration: number;
  clips: Record<SequenceClipId, ClipTiming>;
};

export const SEQUENCE_CLIPS = [
  {
    id: "openingText",
    label: "Headline reveal",
    group: "Opening",
    domain: "opening",
    description:
      "Character reveal, including the final character's full animation."
  },
  {
    id: "openingField",
    label: "Field reveal",
    group: "Opening",
    domain: "opening",
    description: "Streak field fades into view after renderer readiness."
  },
  {
    id: "headlineSplit",
    label: "Headline split",
    group: "Headline",
    domain: "scroll",
    description: "Headline separates horizontally."
  },
  {
    id: "headlineScale",
    label: "Headline scale",
    group: "Headline",
    domain: "scroll",
    description: "Headline settles from full size to its split pose."
  },
  {
    id: "headlineFade",
    label: "Headline fade",
    group: "Headline",
    domain: "scroll",
    description: "Split headline fades out."
  },
  {
    id: "passageLine1",
    label: "Passage line 1",
    group: "Passage",
    domain: "scroll",
    description: "First passage line reveals with a whole-line vertical wipe."
  },
  {
    id: "passageLine2",
    label: "Passage line 2",
    group: "Passage",
    domain: "scroll",
    description: "Second passage line reveals with a whole-line vertical wipe."
  },
  {
    id: "passageTravel",
    label: "Passage travel",
    group: "Passage",
    domain: "scroll",
    description: "Passage travels upward through the viewport."
  },
  {
    id: "passageFadeIn",
    label: "Passage fade in",
    group: "Passage",
    domain: "scroll",
    description: "Passage becomes visible at its entry."
  },
  {
    id: "passageFadeOut",
    label: "Passage fade out",
    group: "Passage",
    domain: "scroll",
    description: "Passage disappears after clearing the viewport."
  },
  {
    id: "warpApproach",
    label: "Warp approach",
    group: "Field",
    domain: "scroll",
    description: "Original field expansion reaches its held pre-corona pose."
  },
  {
    id: "ringSettlement",
    label: "Ring settlement",
    group: "Field",
    domain: "scroll",
    description: "Material settles into the exact corona pose at 70%."
  }
] as const satisfies ReadonlyArray<{
  id: SequenceClipId;
  label: string;
  group: string;
  domain: SequenceDomain;
  description: string;
}>;

export function createDefaultSequence(characterCount = 25): SequenceDraft {
  if (
    !Number.isFinite(characterCount) ||
    !Number.isInteger(characterCount) ||
    characterCount < 0
  ) {
    throw new RangeError(
      "Character count must be a finite, non-negative integer."
    );
  }
  // Authored in the sequence editor. The owner scales glyph duration/stagger to
  // this complete clip, so changing copy never silently retimes the page reveal.
  return {
    version: 1,
    openingDuration: 2.4,
    clips: {
      openingText: {
        start: 0.1, end: 1.62,
        ease: [0.42, 0, 0.30258184523809517, 1.0132068452380953]
      },
      openingField: {
        start: 0.7, end: 2.33,
        ease: [0.501748511904762, 0.009709821428571429, 0.4370312499999999, 0.9958333333333333]
      },
      headlineSplit: { start: 0.5, end: 7, ease: [0.25, 0.6, 0.35, 1] },
      headlineScale: { start: 0.5, end: 7, ease: [0.22, 0.4, 0.4, 1] },
      headlineFade: { start: 22, end: 29, ease: [0.42, 0, 0.58, 1] },
      passageLine1: { start: 7, end: 15, ease: [0.42, 0, 0.58, 1] },
      passageLine2: { start: 10, end: 18, ease: [0.42, 0, 0.58, 1] },
      passageTravel: { start: 7, end: 60, ease: [0, 0, 1, 1] },
      passageFadeIn: { start: 7, end: 8, ease: [0, 0, 1, 1] },
      passageFadeOut: { start: 60, end: 61, ease: [0, 0, 1, 1] },
      warpApproach: { start: 0, end: 60, ease: [0, 0, 1, 1] },
      ringSettlement: { start: 60, end: 70, ease: [0, 0, 1, 1] }
    }
  };
}

const clipSchema = z.strictObject({
  start: z.number().finite().min(0),
  end: z.number().finite().positive(),
  ease: z.tuple([
    z.number().finite().min(0).max(1),
    z.number().finite().min(-3).max(3),
    z.number().finite().min(0).max(1),
    z.number().finite().min(-3).max(3)
  ])
});

const sequenceSchema = z
  .strictObject({
    version: z.literal(1),
    openingDuration: z.number().finite().positive(),
    clips: z.strictObject({
      openingText: clipSchema,
      openingField: clipSchema,
      headlineSplit: clipSchema,
      headlineScale: clipSchema,
      headlineFade: clipSchema,
      passageLine1: clipSchema,
      passageLine2: clipSchema,
      passageTravel: clipSchema,
      passageFadeIn: clipSchema,
      passageFadeOut: clipSchema,
      warpApproach: clipSchema,
      ringSettlement: clipSchema
    })
  })
  .superRefine((draft, context) => {
    for (const { id, domain } of SEQUENCE_CLIPS) {
      const clip = draft.clips[id];
      const minimum = domain === "opening" ? 0.001 : 0.05;
      if (clip.end - clip.start < minimum - 1e-12) {
        context.addIssue({
          code: "custom",
          path: ["clips", id, "end"],
          message: `Clip duration must be at least ${minimum}.`
        });
      }
      if (clip.end > (domain === "opening" ? draft.openingDuration : 70)) {
        context.addIssue({
          code: "custom",
          path: ["clips", id, "end"],
          message: "Clip exceeds its timeline domain."
        });
      }
    }
    if (draft.clips.ringSettlement.end !== 70) {
      context.addIssue({
        code: "custom",
        path: ["clips", "ringSettlement", "end"],
        message: "Ring settlement must end at the 70% corona handoff."
      });
    }
    if (draft.clips.ringSettlement.start > 68) {
      context.addIssue({
        code: "custom",
        path: ["clips", "ringSettlement", "start"],
        message: "Ring settlement must start no later than 68%."
      });
    }
    if (draft.clips.warpApproach.start !== 0) {
      context.addIssue({
        code: "custom",
        path: ["clips", "warpApproach", "start"],
        message: "Warp approach must start at 0%."
      });
    }
    if (draft.clips.warpApproach.end > draft.clips.ringSettlement.start) {
      context.addIssue({
        code: "custom",
        path: ["clips", "warpApproach", "end"],
        message: "Warp approach must finish before ring settlement starts."
      });
    }
  });

// Zod's successful parse is a deep-cloned snapshot, never a reference into input.
export function validateSequenceDraft(input: unknown) {
  return sequenceSchema.safeParse(input);
}
