# Remaining slot relationship exposure — ownership amendment needed

## Current result

The authorized five-source patch closes ordinary field projection and the two directly identified browser boundaries. Initial new suite: **64/64 PASS**; existing music regressions: **18/18 PASS**. Subsequent complete-caller audit added a real installed relationship-traversal regression: **65 total, 64 PASS, 1 FAIL**. This failure is retained, not waived. No complete candidate or security acceptance is claimed.

## Remaining path

`src/lib/music/eligibility.ts:225-248` (`getUserSetlistSlots`) queries tracks with Local API defaults: trusted override and no explicit depth. Installed Payload's default depth is 2 (`node_modules/payload/dist/config/defaults.js:47,121`). Tracks' `setlist` relationship (`src/lib/payload/collections/tracks/index.ts:100-103`) can therefore populate the related Setlist. Installed relationship traversal forwards override into the loader (`fields/hooks/afterRead/relationshipPopulationPromise.js:23-40`), and its loader forwards it into nested `payload.find` (`collections/dataloader.js:58-78`). The new deny-all ordinary field access is bypassed by that trusted override.

The full slot Track documents are serialized at:

- `src/app/api/setlists/[slug]/my-slots/route.ts:41-59`.
- `src/app/api/setlists/[slug]/slots/route.ts:144-155`.
- `src/app/api/setlists/[slug]/slots/[slotIndex]/route.ts:81-86`.

An authenticated attendee with a slot can therefore receive `slotN.setlist.appleMusic.ownerUserToken` when populated. This is a source/in-process synthetic finding, not observed live exposure.

## Deterministic evidence

`tests/music/setlist-token-access.test.ts` now includes **browser-bound slot documents do not populate the private setlist credential**. It executes the actual helper with a synthetic datastore adapter, invokes installed Tracks afterRead relationship traversal, and uses installed Setlists afterRead for the synthetic related document. The ordinary direct credential projections remain safe; this trusted populated slot path fails the boolean credential-absence assertion. No network/database/provider or real token is used. This is not live HTTP/GraphQL/database acceptance.

Exact failing run: `runtime/out/slot-red.sktqg4sj.log`; watchdog receipt beside it records exit 1, peak 375275520 bytes, no remaining PIDs and no uncertain cleanup. Final scoped lint (`lint2`) and type (`type3`) pass on current files. The latter is a strict scoped graph with canonical root generated Payload augmentation first and explicit test-only bootstrap declarations; not whole-project typing.

## Smallest amendment

Authorize **only `depth: 0` in the track query inside `getUserSetlistSlots`**, plus already-owned regression updates. No other eligibility/policy/provider changes. Native security triage inspected all four production callers: the page formats scalar fields, and the slot endpoints/clients do not require populated Track relationships. Depth zero keeps scalar fields and relationship identifiers while preventing this nested exposure at all three endpoints.

The helper is not writable under amendment 1. It remains unchanged. After explicit amendment: demonstrate this failure becomes GREEN and no relationship loader runs; retain scalars/relationship IDs; rerun affected checks; freeze the exact complete candidate; required security/code/TypeScript/React and dual independent Santa reviews; provider-free visual check of changed component indicator. No main merge/push/commit of the incomplete patch.

## Earlier failed checks retained

- `red`: 64 tests, 13 pass /51 fail. One harness failure: encoded parent module URL prevented synthetic notFound interception.
- `red2`: parent URL decoded; 64 tests, 14 pass /50 true privacy failures before any production edit.
- `green`: original 64 tests pass after the authorized five-source patch.
- `type`: 77 diagnostics from loading stale generated Payload augmentation first; canonical root generated file order corrected in a new scoped config, retaining strictness and both real generated declarations. `type2` and current `type3` pass. This does not repair the repository's competing generated type graphs.
- Browser inventory: CUA browser host unavailable. No browser render was performed; static SSR output is not visual acceptance. Final visual review is deferred while remediation is incomplete.
