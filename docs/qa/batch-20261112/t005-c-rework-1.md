# T005-C rework cycle 1 of 3 — custodian corrections, 2026-11-12

Candidate `250130dfe250900f97030354e475209972bbe09d` failed review. The specialist
passed it (7 LOW). Santa A failed it (1 HIGH, 2 MEDIUM, 2 LOW) and Santa B failed it
(2 HIGH, 3 MEDIUM, 1 LOW); the two reviewers did not see each other's work. The
custodian verified the source facts cited below at `6ee30d2`. Scope, owned paths and
all shared rules are unchanged: design only, no `src/`, `messages/` or `tests/` edits,
no Node workloads.

## Required corrections

1. **C08 benefit sentence (HIGH).** Admissions can be checked in before they are
   claimed (`guests.ts:168-172`, `checkInGuest` accepts `available`). A checked-in
   admission can still be claimed (`:103`), keeps `checked-in` (`:160`) and can then
   redeem benefits (`:177`). B recovery accepts `checked-in` (`:130`). So the
   preserved success screen's `I.yourAccountHasFourPartIDrinksAndPart`
   (`invitation-claim.tsx:26`) can be false after recovery, and the receipt cannot
   tell recovery apart from an initial claim. Narrow C08's ready scope to the
   acknowledgement mechanics only: the heading, clearing the token once, and the
   existing `/` link. Record the benefit sentence as a known **held** defect under
   FRONT-02/T001/T003, citing this path. Reword criterion 3 to "no new entitlement
   promise; the existing benefit sentence is a recorded held defect, not accepted".
   S1 must not change that sentence.
2. **Account-scoped terminal state (HIGH/MEDIUM).** CLAIM_CONSUMED depends on which
   account submits (`guests.ts:130`), while CLAIM_INVALID does not. Specify that a
   CONSUMED terminal state applies to the pair (bearer, confirmed account identity)
   and clears without any new CTA when the confirmed identity changes, so that the
   rightful claimant's B recovery stays reachable. A bearer-only INVALID latch may
   persist. State the actual remount mechanics: `CommerceSession` children are keyed
   by `identity.generation` (`checkout.tsx:191`), and the session-expiry path
   remounts `MemberAccountFlow` (`:35-39`). Add test-first cases for an account
   change after CONSUMED, and for the same account after CONSUMED, which stays
   blocked. Update criterion 2 and C03 to match.
3. **Original claimant can still get A rejections (MEDIUM).** On a B replay the
   original claimant can receive CLAIM_EXPIRED (`:136`, `:147`), CLAIM_UNAVAILABLE
   (`:127`) or ACCOUNT_NOT_ELIGIBLE (`:142`). Add to the protected facts for C02, C04
   and C05 that a known rejection does not prove this account has no prior claim.
   Fix C02's reader objective to cover that reader. Carry the point into the
   held-owner notes.
4. **Copy approval gate (MEDIUM).** S1 needs new `messages/en.json` entries. Make
   it a precondition of S1 that the owner approves that wording. It must be drafted
   only after reading `docs/design/identity.md` and `docs/design/brand-voice.md`
   (AGENTS.md), and reviewer agreement is not owner acceptance (registry lessons
   `docs/To-Do List.md:182-183`). The existing guessed-cause key
   `theInvitationCouldNotBeClaimedItMayBe` cannot be reused for the terminal states.

## LOW items, apply if cheap

- List the 413 (`domain.ts:51`) and the generic pre-claim parse 400
  (`domain.ts:68-69`) as counterexamples for criterion 1.
- Tighten these anchors:
  - C02 issuance: `guests.ts:104-106`.
  - C12: `domain.ts:55-61`, noting the super-admin branch at `:58`.
  - AUTH-01 error slot: `:389-404`.
  - Portone result: `:276-312`, plus the button at `:319-333`.
- Note that the 429 limiter covers all guest operations.
- Clarify that `I.useTheEmailCodeOnThisPageToKeep` renders only when a token exists.
- The handback cannot carry its own final HEAD. The custodian records final
  identities in the batch dispatch record instead.

## Handback

Commit the corrections on `codex/t005-c-20261112` as new commits. Do not amend or
rebase. Update `validation.json` and append a "Rework cycle 1" section to the
handback that maps each item above to its change. Then send one `worker_done`.
