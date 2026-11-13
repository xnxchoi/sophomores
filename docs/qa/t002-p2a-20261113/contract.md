# Provider-free P2a kernel — integration boundary

Authority: [accepted T002-A](../t002-a-20261113/model.md#p2a--paid-allocation-uniqueness-and-activation-races), superseded only by the four selected owner answers in the dispatch (`34ee4ab`). This is a local decision model, not an integrated ledger or production acceptance.

## Records and decisions

- Paid order: copied verified snapshot, immutable ordered unit IDs and original self-unit identity. Units retain transaction/snapshot, shipping/financial evidence, buyer, event and rule version. Partial, mismatched or corrupt allocation replay is an integrity refusal, not regeneration.
- Each unit has its token entitlement, event admission and digest-only versioned capability. No raw bearer, expiry, issuer, submission, delivery or success is invented. `pending-policy` carries its affected right and pending commercial decision alongside **completed** allocation.
- `settlePaidUnits` uses only the payment owner's verified snapshot and event occupancy; it never reads membership slots. `buyerHoldsToken` is upstream verified event-rule evidence, not a kernel membership read. The payment owner must make that evidence authoritative at its existing transaction boundary; this kernel does not prove that integration.
- With `holdersAdmitted: true` **and** a verified already-holder buyer, all units are gifts. Otherwise the first absent buyer/event self occupancy is reserved; remaining and subsequent units are gifts. No activation or membership reservation happens at settlement.
- `activateUnit` requires matching canonical proof, explicit POST intent, approved timing and no financial/benefit hold. An existing holder gets `ALREADY_HOLDS_TOKEN`, without consuming or granting gift access. A tokenless account commits bearer consumption, the same admission's binding, one account-wide membership reservation and immutable target/operation intent together. Activated does **not** mean minted. Event end is not an expiry or timing-policy hold.
- Self activation only promotes the original buyer's reserved unit. It cannot turn a self code into a gift. Legacy checked-in evidence without valid activation is held, never erased or used as entry proof.
- `regenerateActivationCode` is buyer-authorized digest rotation only, with stable request replay and no allocation/account change. Rotation and activation share the admission lock in later wiring. Changed rotation replay refuses; a prior successful rotation can still be read after activation without rotating again.
- `recordAttendance` requires event operator authority, fresh canonical account proof and event-rule eligibility. It sets the original admission's check-in time once. An eligible confirmed holder can instead receive a holder-admission record only under explicit per-event `holdersAdmitted: true`; no sold unit is consumed. `capacityCount` counts gross sold obligations plus those attending holders, **not** cancellation-adjusted availability.
- All failures preserve the identical input state reference and return only a typed refusal. Success/recovery values are internal domain results, not HTTP responses. In particular, do not serialize the internal decision/state to a guest. Authorization/proof/capability validation belongs to separately approved production owners.

## Held policies remain fixtures

No-name link eligibility is an explicit proposal fixture, not removal of the existing guest-name prerequisite. Staff-assisted activation requires an explicitly trusted guest-scoped proof/consent fixture; a staff role or supplied ID alone never suffices. No authentication/consent mechanism is selected here.

Forced-self already-holder commercial disposition when holders are not admitted remains held. No reuse/separate-beneficiary bundle option is selected; tests check the actual intact right and unchanged membership/intent state after refusal. The owner selected intact rejection for gifts, replacing the old gift-holder policy hold. Late-event expired-perk flags are test data, not a new benefit or loyalty calculation.

Cancellation is not implemented or imported: verified cancellation must free allowance, but capacity only for unused, unreturned units, exactly once. Used attendance remains occupancy evidence; this gross counter is not permission to resell it. No token reversal, refund legality or provider acceptance is inferred.

## Required future command ownership and lock map

Kernel functions never acquire locks or end transactions. Each later owner must reread under the locks and persist a successful decision atomically, replacing the existing decision, not running a parallel engine.

| Owner / command | Ranked resources before decision |
| --- | --- |
| Existing confirmOrder payment transaction / settle | Existing reservation attempt → event/product/allowance context → order-admissions → event-account buyer. No membership/issuance lock or read; optional policy cannot restart/defer paid allocation. No preparation/cart locks are assumed in confirmOrder. |
| Existing gift claim transaction / activate | order-benefits → admission → event-account claimant → account-membership → original issuance-operation |
| New reserved-self command, production owner still missing | Same activation ranks, for immutable buyer. Must replace dispatch/decision wiring in domain.ts and guests.ts under separate approval. |
| Event-operator transaction / attendance | order-benefits → admission → event-account. Combined on-spot activation takes its entire activation superset upfront; never reacquire earlier locks after membership/operation. Issuance-required eligibility stays pending and later resumes fresh attendance. |
| Buyer-link transaction / regeneration or eligibility | order-benefits → admission; same admission resource as activation; no new event/membership/operation mutation |
| Authorized result read | order-benefits → admission → event-account → account-membership, plus operation only for mutable operation result |

For batches gather immutable targets first, then sort/deduplicate **within each rank**, not globally across ranks. Reread after locking; non-settlement target changes restart from the command-owner boundary instead of acquiring an earlier rank late. Terminal membership/operation resources must never lead back to reservation/order/admission/event-account resources. P2b's issuer/return/recovery ranks remain the model owner's separate contract; no P2b execution exists here.

## Test map and validation limits

`tests/commerce/domain/token-entitlements.test.ts` labels the accepted list's 13 rows as `01`–`13`, followed by selected owner branches and hardening regressions. Fixtures are pure records and an optimistic revision scheduler. The scheduler intentionally globally over-conflicts, discards stale decisions and reevaluates them; it is **not** a database, a per-key lock proof or a PostgreSQL emulator.

Races cover both first-order winners, both settlement/activation orderings, same gift competing accounts, same account competing gifts within/across events, both regeneration/activation winners, and duplicate arrival. Checks retain losing bearers, immutable financial/shipping evidence and stable replay IDs. Separate owner cases cover true/false/unspecified holder-admission policy and holder attendance without a sold unit. Combined on-spot decisions are exercised locally; no production coordinator is installed.

Reuse gate: installed zod 4.6.7 and tsx 4.23.15 inspected; existing commerce helpers and allocation/storage fake inspected read-only. Native immutable array operations and JSON tuple serialization suffice; no new generic serializer, lock, retry, ID, store or validation library is warranted. Small result/update/occupancy compositions stay private to this domain module. Existing Payload fake cannot represent rollback/revision decisions and was not imported. No Next entrypoint, library API or UI styling changes are involved.

Custodian owns independent specialist and Santa review after handback (batch rule forbids nested agents). Passing synthetic tests/source review is not actual database, provider, door, physical-device, UI or production acceptance.

## Rework cycle 1 — corrected decision boundaries

- Bearer validation now immediately follows activation's unit lookup. Missing unit, wrong digest and wrong generation all return `UNAVAILABLE` before financial, historical, ownership or occupancy state is inspected. Account-only existing-holder refusal remains independent of gift state; same-account result recovery still validates its bearer and committed binding graph. Buyer-link decisions likewise return `UNAVAILABLE` for both missing and non-owned units. Internal state is never a guest response.
- Settlement replay compares immutable paid order/transaction snapshot identity, not the `holdersAdmitted` / `buyerHoldsToken` evidence used solely on the first settlement. A later membership change returns the original allocation and does not reshuffle it.
- Activation recovery and paid attendance validate the same committed entitlement/admission/capability/intent/membership graph. A corrupt graph or corrupt stored attendance is an `INTEGRITY` refusal, never recovered success. Holder attendance replay validates its canonical record identity, recorded arrival, single confirmed membership and absence of conflicting sold occupancy. Legacy checked-in flags without activation history remain review-held, not a fabricated successful replay.
- Client activation timestamps do not form replay identity; the original committed activation time is retained. Unknown runtime actor modes are invalid input. Valid-bearer activation refuses a conflicting existing admission account rather than overwriting it.
- Gift acquisition and holder-admitted buyer purchases no longer carry a fictitious unselected-disposition hold. A known already-holder forced into a self unit when holders are not admitted still has an unresolved commercial disposition; only that self right retains `TOKEN_DISPOSITION_UNSELECTED`. A tokenless/unknown buyer's self unit records an acquisition right, not a policy selection for a later change in holder status.
- Small domain-local cross-record consistency validation is reused for activation recovery and paid attendance; it uses native record/array checks and introduces no general validator, store or dependency. Optional discriminated record variants were not introduced because this review can be resolved without widening the record API.

### Known gap — reserved self buyer becomes a holder elsewhere

A tokenless buyer can reserve a self unit and then become a token holder through a different unit/event before activating the reserved self unit. Activating the self unit then returns `ALREADY_HOLDS_TOKEN`; once the separate membership is authoritatively confirmed, holder attendance for the original event returns `EVENT_ALREADY_BOUND` because the buyer's own self reservation remains. The original unit, token right, paid access and occupancy remain intact. This kernel neither reassigns that unit, splits the bundle, releases capacity nor chooses a reconciliation policy. The new test records this gap using an explicit confirmation fixture only; resolution remains an owner decision before production integration.

The single final rework coverage run is named `rework1-final-coverage` in the receipt manifest. Earlier cycle-zero coverage is historical, not current acceptance; the manifest explicitly identifies the final rework coverage/source hashes and the one final rework typecheck/default run.
