import assert from "node:assert/strict";
import test from "node:test";
import {
  envelopeErrorReducer,
  INITIAL_ENVELOPE_ERRORS
} from "../../components/Devtools/flame-editor/flame-editor";

test("successful image retry clears only recoverable mask failures, never a fatal renderer error", () => {
  const maskFailed = envelopeErrorReducer(INITIAL_ENVELOPE_ERRORS, {
    type: "mask-failed",
    message: "Image failed"
  });
  const fatal = envelopeErrorReducer(maskFailed, {
    type: "renderer-failed",
    message: "Context lost"
  });
  const recoveredMask = envelopeErrorReducer(fatal, { type: "mask-ready" });
  assert.deepEqual(recoveredMask, { fatal: "Context lost", mask: "" });
  assert.deepEqual(maskFailed, { fatal: "", mask: "Image failed" });
  assert.deepEqual(INITIAL_ENVELOPE_ERRORS, { fatal: "", mask: "" });
});

test("a healthy renderer recovers from a missing mask without preserving a stale alert", () => {
  const failed = envelopeErrorReducer(INITIAL_ENVELOPE_ERRORS, {
    type: "mask-failed",
    message: "Missing file"
  });
  assert.deepEqual(
    envelopeErrorReducer(failed, { type: "mask-ready" }),
    INITIAL_ENVELOPE_ERRORS
  );
});
