import { createTranslator } from "next-intl";
import english from "@/../messages/en.json";
import { z } from "zod";

const validationMessage = createTranslator({ locale: "en", messages: english, namespace: "Developer.sequenceData" });

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
    label: english.Developer.sequenceData.headlineReveal,
    labelKey: "headlineReveal",
    group: "Opening",
    domain: "opening",
    description:
      english.Developer.sequenceData.characterRevealIncludingTheFinalCharacterSFullAnimation,
    descriptionKey: "characterRevealIncludingTheFinalCharacterSFullAnimation"
  },
  {
    id: "openingField",
    label: english.Developer.sequenceData.fieldReveal,
    labelKey: "fieldReveal",
    group: "Opening",
    domain: "opening",
    description: english.Developer.sequenceData.streakFieldFadesIntoViewAfterRendererReadiness,
    descriptionKey: "streakFieldFadesIntoViewAfterRendererReadiness"
  },
  {
    id: "headlineSplit",
    label: english.Developer.sequenceData.headlineSplit,
    labelKey: "headlineSplit",
    group: "Headline",
    domain: "scroll",
    description: english.Developer.sequenceData.headlineSeparatesHorizontally,
    descriptionKey: "headlineSeparatesHorizontally"
  },
  {
    id: "headlineScale",
    label: english.Developer.sequenceData.headlineScale,
    labelKey: "headlineScale",
    group: "Headline",
    domain: "scroll",
    description: english.Developer.sequenceData.headlineSettlesFromFullSizeToItsSplitPose,
    descriptionKey: "headlineSettlesFromFullSizeToItsSplitPose"
  },
  {
    id: "headlineFade",
    label: english.Developer.sequenceData.headlineFade,
    labelKey: "headlineFade",
    group: "Headline",
    domain: "scroll",
    description: english.Developer.sequenceData.splitHeadlineFadesOut,
    descriptionKey: "splitHeadlineFadesOut"
  },
  {
    id: "passageLine1",
    label: english.Developer.sequenceData.passageLine1,
    labelKey: "passageLine1",
    group: "Passage",
    domain: "scroll",
    description: english.Developer.sequenceData.firstPassageLineRevealsWithAWholeLineVertical,
    descriptionKey: "firstPassageLineRevealsWithAWholeLineVertical"
  },
  {
    id: "passageLine2",
    label: english.Developer.sequenceData.passageLine2,
    labelKey: "passageLine2",
    group: "Passage",
    domain: "scroll",
    description: english.Developer.sequenceData.secondPassageLineRevealsWithAWholeLineVertical,
    descriptionKey: "secondPassageLineRevealsWithAWholeLineVertical"
  },
  {
    id: "passageTravel",
    label: english.Developer.sequenceData.passageTravel,
    labelKey: "passageTravel",
    group: "Passage",
    domain: "scroll",
    description: english.Developer.sequenceData.passageTravelsUpwardThroughTheViewport,
    descriptionKey: "passageTravelsUpwardThroughTheViewport"
  },
  {
    id: "passageFadeIn",
    label: english.Developer.sequenceData.passageFadeIn,
    labelKey: "passageFadeIn",
    group: "Passage",
    domain: "scroll",
    description: english.Developer.sequenceData.passageBecomesVisibleAtItsEntry,
    descriptionKey: "passageBecomesVisibleAtItsEntry"
  },
  {
    id: "passageFadeOut",
    label: english.Developer.sequenceData.passageFadeOut,
    labelKey: "passageFadeOut",
    group: "Passage",
    domain: "scroll",
    description: english.Developer.sequenceData.passageDisappearsAfterClearingTheViewport,
    descriptionKey: "passageDisappearsAfterClearingTheViewport"
  },
  {
    id: "warpApproach",
    label: english.Developer.sequenceData.warpApproach,
    labelKey: "warpApproach",
    group: "Field",
    domain: "scroll",
    description: english.Developer.sequenceData.originalFieldExpansionReachesItsHeldPreCoronaPose,
    descriptionKey: "originalFieldExpansionReachesItsHeldPreCoronaPose"
  },
  {
    id: "ringSettlement",
    label: english.Developer.sequenceData.ringSettlement,
    labelKey: "ringSettlement",
    group: "Field",
    domain: "scroll",
    description: english.Developer.sequenceData.materialSettlesIntoTheExactCoronaPoseAt70,
    descriptionKey: "materialSettlesIntoTheExactCoronaPoseAt70"
  }
] as const satisfies ReadonlyArray<{
  id: SequenceClipId;
  label: string;
  labelKey: keyof typeof english.Developer.sequenceData;
  group: string;
  domain: SequenceDomain;
  description: string;
  descriptionKey: keyof typeof english.Developer.sequenceData;
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

export type SequenceValidationParams =
  | { messageKey: "clipDurationMinimum"; values: { minimum: number } }
  | { messageKey: "clipExceedsItsTimelineDomain" | "ringSettlementMustEndAtThe70CoronaHandoff" | "ringSettlementMustStartNoLaterThan68" | "warpApproachMustStartAt0" | "warpApproachMustFinishBeforeRingSettlementStarts"; values?: never };

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
          message: validationMessage("clipDurationMinimum", { minimum }),
          params: { messageKey: "clipDurationMinimum", values: { minimum } } satisfies SequenceValidationParams
        });
      }
      if (clip.end > (domain === "opening" ? draft.openingDuration : 70)) {
        context.addIssue({
          code: "custom",
          path: ["clips", id, "end"],
          message: english.Developer.sequenceData.clipExceedsItsTimelineDomain,
          params: { messageKey: "clipExceedsItsTimelineDomain" } satisfies SequenceValidationParams
        });
      }
    }
    if (draft.clips.ringSettlement.end !== 70) {
      context.addIssue({
        code: "custom",
        path: ["clips", "ringSettlement", "end"],
        message: english.Developer.sequenceData.ringSettlementMustEndAtThe70CoronaHandoff,
        params: { messageKey: "ringSettlementMustEndAtThe70CoronaHandoff" } satisfies SequenceValidationParams
      });
    }
    if (draft.clips.ringSettlement.start > 68) {
      context.addIssue({
        code: "custom",
        path: ["clips", "ringSettlement", "start"],
        message: english.Developer.sequenceData.ringSettlementMustStartNoLaterThan68,
        params: { messageKey: "ringSettlementMustStartNoLaterThan68" } satisfies SequenceValidationParams
      });
    }
    if (draft.clips.warpApproach.start !== 0) {
      context.addIssue({
        code: "custom",
        path: ["clips", "warpApproach", "start"],
        message: english.Developer.sequenceData.warpApproachMustStartAt0,
        params: { messageKey: "warpApproachMustStartAt0" } satisfies SequenceValidationParams
      });
    }
    if (draft.clips.warpApproach.end > draft.clips.ringSettlement.start) {
      context.addIssue({
        code: "custom",
        path: ["clips", "warpApproach", "end"],
        message: english.Developer.sequenceData.warpApproachMustFinishBeforeRingSettlementStarts,
        params: { messageKey: "warpApproachMustFinishBeforeRingSettlementStarts" } satisfies SequenceValidationParams
      });
    }
  });

// Zod's successful parse is a deep-cloned snapshot, never a reference into input.
export function validateSequenceDraft(input: unknown) {
  return sequenceSchema.safeParse(input);
}
