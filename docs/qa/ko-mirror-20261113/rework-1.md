# SPH-I18N-KOMIRROR-20261113-01 rework cycle 1 of 3, 2026-11-13

Candidate `305061e2fc3906793bb85a67a63538f237750cbf` (full diff from `32a3045`:
`5cb024ff…efea1`). Reviews:

- TypeScript/i18n specialist: **PASS**, LOW only.
- Santa A: **FAIL**, 1 MEDIUM.
- Santa B: **FAIL**, 1 MEDIUM.

The two Santa reviews were independent of each other. All three confirmed mirror
fidelity, fallback coverage for every consumer (the only runtime import of `ko.json` is
`messages.ts`), test strength and evidence. Both failures are stale rule wording that
still contradicts the owner's decision.

## Required

1. **Plan owner contract (MEDIUM, Santa A).** `docs/reference/i18n-consolidation-plan.md:10-12`
   still says "**Do not modify `messages/ko.json`** … baseline SHA-256 44d2db28…" in the
   live Owner contract section. Restate it as the mirror rule, keeping the hash only
   as the historical pre-mirror baseline.
2. **Brand-voice guide (MEDIUM, Santa B).** `docs/design/brand-voice.md:185` still
   says to "leave `messages/ko.json` unchanged unless the owner requests translation"
   and that the fallback "remains inactive". The custodian adds this file to your owned
   paths for that one sentence only. Change it to say:
   - English-first authoring stays as it is;
   - `ko.json` mirrors `en.json` structurally, with `""` for any untranslated key;
   - existing Korean text is not translated or overwritten without an owner request;
   - the owner activated the empty-string fallback on 2026-11-13.

   Make no other edit to that guide.

## LOW, apply

- Add one test asserting that the real `messagesByLocale.ko` contains no `""` leaf,
  which proves the fallback over the whole catalogue (specialist LOW 2).
- Leave `docs/reference/korean-copy-calibration.md:17` and
  `korean-copy-passes/05-coverage-findings-and-task.md:144` unchanged as historical
  records. Mention them in the handback.

## Checks

Run the focused i18n tests under the shared limits, and run one full typecheck only if
a `.ts` file changed. `git diff --check 32a3045 HEAD` must stay clean. Commit new commits
with no amend, append a "Rework cycle 1" section to the handback, and send one
`worker_done`.
