import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createTranslator } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { createDefaultSequence, SEQUENCE_CLIPS, validateSequenceDraft } from "@/components/Warp/_shared/sequence-editor";
import { DEFAULT_WARP_TUNING, WARP_TUNING_CONTROLS } from "@/components/Warp/_shared/tuning";

test("developer interface copy remains canonical without translating sequence identifiers or exported values", () => {
  const t = createTranslator({ locale: "en", messages: messagesByLocale.en, namespace: "Developer" });
  assert.equal(t("devControls.warpControls"), "Warp controls");
  assert.equal(t("sequenceEditor.sequenceEditor"), "Sequence editor");
  assert.equal(t("clipInspector.easingCoordinate", { coordinate: "x1" }), "Easing x1");
  assert.deepEqual(SEQUENCE_CLIPS.map(({ id }) => id), ["openingText", "openingField", "headlineSplit", "headlineScale", "headlineFade", "passageLine1", "passageLine2", "passageTravel", "passageFadeIn", "passageFadeOut", "warpApproach", "ringSettlement"]);
  assert.equal(SEQUENCE_CLIPS.find(({ id }) => id === "ringSettlement")?.domain, "scroll");
  assert.equal(WARP_TUNING_CONTROLS.find(({ key }) => key === "interiorBrightness")?.group, "Interior");
  assert.equal(DEFAULT_WARP_TUNING.interiorColor, "#ffffff");
  assert.deepEqual(Object.keys(createDefaultSequence().clips), SEQUENCE_CLIPS.map(({ id }) => id));
});

test("canonical developer validation retains exact bounds and actionable English feedback", () => {
  const draft = createDefaultSequence();
  const invalid = { ...draft, clips: { ...draft.clips, openingText: { ...draft.clips.openingText, end: draft.clips.openingText.start } } };
  const result = validateSequenceDraft(invalid);
  assert.equal(result.success, false);
  if (!result.success) {
    const issue = result.error.issues[0];
    assert.equal(issue.message, "Clip duration must be at least 0.001.");
    assert.equal(issue.code, "custom");
    if (issue.code === "custom") assert.deepEqual(issue.params, { messageKey: "clipDurationMinimum", values: { minimum: 0.001 } });
  }
  assert.equal(validateSequenceDraft(draft).success, true);
  assert.equal(draft.clips.ringSettlement.end, 70);
  assert.equal(draft.clips.warpApproach.start, 0);
});

test("developer presentation resolves captions without translating easing or grouping protocol", () => {
  const controls = readFileSync("src/components/Warp/dev-controls.tsx", "utf8");
  const inspector = readFileSync("src/components/Warp/editor/clip-inspector.tsx", "utf8");
  assert.match(controls, /group === "Interior"/);
  assert.match(inspector, /\["x1", "y1", "x2", "y2"\]/);
  assert.match(inspector, /useTranslations\("Developer\.clipInspector"\)/);
  assert.match(inspector, /value=\{item\.label\}/);
  assert.match(inspector, /sequenceText\(metadata\.descriptionKey\)/);
  assert.match(controls, /tuningText\(control\.labelKey\)/);
  assert.doesNotMatch(controls, /aria-label=\{control\.label\}/);
});
