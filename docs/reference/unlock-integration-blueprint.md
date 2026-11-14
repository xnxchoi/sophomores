# Unlock / identity / NFC integration blueprint — P1

**2026-11-11 · P1 review checkpoint · design recommendations, not implementation approval**

The [consolidated requirements packet](ticket-account-planning-20261110.md)
supplies the settled D1–D5 policy, P1–P7 sequence and G1–G5 gates. Its matching
[commerce-plan amendment](commerce-launch-plan.md)
remains the governing delivery contract. This document proposes integration
choices; it neither amends those artifacts nor replaces their remaining commerce
work with a token experiment. Deployment remains the final delivery milestone.

## Progress / review panel

| State | Scope | Evidence / remaining gate |
| --- | --- | --- |
| Complete — P1 research | Native grants, email recipients, Events, passes, scanner and NFC options compared | Public docs plus pinned public source; §2. No hosted integration tested. |
| Complete — P1 source inspection | Current account, settlement, claims, check-in, benefits and return seams | Actual checkout `8efbb0a03baf3b82316c773f6849a6bee2aa0bf9`; §7. Not the older packet's source revision. |
| Complete — P1 design | Minimal custody candidates, two-lock mapping, issuer/recovery boundary and single check-in authority | Recommendations in §§3–6; owner decisions remain explicit. |
| Complete — design challenge | Architect source review and tool-free security review | Incorporated account-readiness terminology, native pass-access/holder-proof limits, QR freshness uncertainty and single-writer admission requirements. Not a deployed security test. |
| Current | **Human review of this stable P1 snapshot** | Choices in §9. No automatic execution after review. |
| Pending — separate approval | P2 provider-free account/allocation work; P3–P7 and scoped external proofs | §8 names the smallest probes and stop rules. |

**Highest-risk final pass:** (1) settlement-time self binding survives delayed mint;
(2) native email custody is not a shared signable wallet; (3) native check-in history
is not atomic single-use admission; (4) unknown transaction outcomes cannot trigger
another grant; (5) tag/QR possession is not account proof or anti-cloning;
(6) refunds, replacement and real-device acceptance remain gates.

No dependencies, product code, migrations, catalogues, credentials, wallets,
signatures, hosted Unlock/chain/RPC requests, contracts, hardware, runtimes,
canvases, commits, pushes or deployments were created or changed. Public docs and
public GitHub source were read. The originating chat retains To-Do ownership.

## 1. Non-negotiable model

- Launch starts with **zero minted memberships**, not zero accounts. Keep one
  purchase/activation flow. Canonical account proof is not a membership NFT.
- Authentic paid settlement assigns the first unit to the buyer if they have no
  bound package for that event. Every additional/subsequent unit is a pending gift.
  Recover that original allocation on callback replay; never decide it at NFC tap.
- One bound account/event entitlement supplies one ticket/package. The existing
  net-three purchased-coin allowance per account/release is a different constraint.
  Membership issuance consumes no additional capacity and creates no free seat.
- An unknown gift recipient has a pending entitlement, not an invented account,
  email or wallet. An eligible existing/new verified account explicitly claims it.
  A bearer gift claim needs no buyer confirmation or preselected recipient.
- The activation secret is not a login credential or door ticket. Payment,
  allocation, physical fulfillment, token issuance and attendance remain distinct.
- Pursue Unlock and wallet/physical-NFT experiences seriously. They are not a launch
  dependency; failing a proof does not authorize silently dropping or substituting
  the work. A separately configured giveaway must consume coordinated capacity.

**Current-source correction:** the existing method called `isActiveMember` checks
verified email plus canonical phone binding, not a chain token. The blueprint does
not claim current checkout already requires a minted membership. P2 should make
account readiness, token status and event allocation explicit instead of treating
that name or the profile's `membershipStatus` as proof of NFT ownership. See §7.

## 2. Native-first capability findings

Evidence labels: **D** = documented capability; **S** = inspected public source at
the revision below; **U** = unproved against a selected deployed version/service.
Neither D nor S establishes present hosted availability or production acceptance.

Public Unlock source inspected at
[`fd86ed9d85b976c93d673aefcbf4f0540950cfc7`](https://github.com/unlock-protocol/unlock/commit/fd86ed9d85b976c93d673aefcbf4f0540950cfc7)
(public `master` response, committed 2026-11-01). This is a research pin, **not** a
selected deployed contract, installed SDK or hosted-service build identity.

| Native option | Verified finding | Consequence / unproved boundary |
| --- | --- | --- |
| PublicLock issuance | **D/S:** `grantKeys` supports recipients, expirations and key managers; LockManager/KeyGranter authorization. Grants bypass the sale-supply maximum. [Minting docs][U1], [grant implementation][U2]. | Use grants after our paid/claimed allocation, not a second Unlock checkout/Stripe charge. Keep our capacity ledger. A grant has no Sophomores operation ID. |
| Per-address limit | **S:** creation checks `maxKeysPerAddress`; grants create new token IDs rather than returning a previously allocated key. [Key creation][U3]. | A proposed limit of one is defense in depth, not account/event uniqueness or retry idempotency. Transfers/burns/recovery can change address holdings. |
| Email-recipient issuance | **D/S:** walletless recipients can receive signed QR tickets; native `KeyManager` controls transfers. The current library derives a recipient address from normalized email **and lock address**. [Email flow][U4], [derivation][U5]. | Seriously viable low-friction candidate, but it is not one shared, signable customer wallet. Membership/event addresses differ across locks. Hosted email/control and transfer policy need G1/G3 proof. |
| Native Events / verifiers | **D/S:** event-scoped ticket endpoints and verifier/organizer middleware exist. [Check-in API][U6], [routes][U7], [authorization][U8]. | Reuse event identity, ticket/pass facilities where compatible. Native public registration must not create an alternate seat allocator or bypass our verified-account/paid-allocation gates. |
| Check-in consumption | **D:** API documents a possible 409. **S:** inspected handler appends check-in timestamps and upserts metadata; it does not implement a compare-and-set rejection of an already-used ticket. Notification happens after that write. [Handler][U9]. | Do not infer single-use safety from the documented status code or scanner warning. An after-check-in webhook cannot veto admission atomically. See §5. |
| Wallet passes | **D/S:** Apple export returns a pass file; Google export returns a pass-object URL. Apple source embeds a QR. [Apple API][U10], [Google API][U11], [Apple barcode][U12]. | Prefer native exports over building a pass issuer. Actual save/open/scan, access control, issuer certificates, update/revocation behavior and current service availability are U. These are QR passes, not proven NFC contactless tickets. |
| Pass access / holder proof | **S:** inspected pass router has no route-level authentication middleware; its controllers generate signed verification URLs from network/lock/key parameters without a recipient-proof check in those handlers. [Pass routes][U26], [controllers][U27]. | Global/deployed protections are U; this is not a tested hosted vulnerability. A signed native pass must not be treated as secret possession or rightful-holder proof. A Sophomores download gate alone cannot protect a separately public native export. |
| Native QR verification | **S:** QR URL contains signed token/account/network data. Native validation checks signature/expiry/event and has a special KeyManager ownership rule. [QR source][U13], [validation][U14]. | A plain token ID or decoded URL is not sufficient. Prove the selected signer trust, owner/recovery and stale/copy behavior before accepting native QRs at our door. |
| Hosted grant API | **S:** application authentication plus manager/granter middleware; dispatcher selects a signer already authorized on the lock. Controller has funding/gas refusal paths. [Route][U15], [controller][U16], [dispatcher][U17]. | Not permissionless/free guaranteed minting. The controller comment about ignored manager/expiration conflicts with dispatcher forwarding them: verify actual behavior. No blanket grants to hosted signers or application credentials. |
| Transfer controls | **D/S:** key owner, per-key manager and lock manager differ. Transfer disabling and manager recovery exist; native email transfer uses `lendKey`. [Roles][U18], [transfers][U19], [transfer source][U20], [KeyManager][U21]. | A transfer-disabled lock can also prevent the native email-to-wallet transfer. Do not promise both unrestricted native export and strict account binding without proving the selected policy. |
| Native NFC projects | **D, dated:** May 2026 describes Phoenix Gate as nearing release with burner-wallet NFC check-in. [Update][U22]. | Evaluate if cryptographic physical-wallet admission is later desired; no current release/support/compatibility proof found. It is distinct from an ordinary tag opening our activation page. |

**Availability / cost qualification:** January's funding-transition announcement
distinguishes onchain protocol continuity from Labs operations. It is not proof
of current hosted failure or availability. Public Prime source advertises event
check-in as a premium feature and its event verification page uses a Prime gate.
Confirm today's eligibility, supported network, operator, support and fee/gas facts
before selecting hosted dependencies; do not assume a historical sub-$10 experience
or an advertised approximate price is our budget. [Transition][U23],
[Prime source][U24], [scanner gate][U25]. No subscription or paid service is approved.

## 3. Minimal custody and issuer choices — G1/G3

### Recommended first candidate: native walletless email grants, conditionally

Keep Better Auth/Payload `users.id` canonical. After account verification and
explicit activation, associate the real account with the native recipient address
for **each selected lock/network**. Grant membership and event keys to their
respective mapped addresses, keeping the cross-token relationship in our DB.
Do not infer it from matching wallet addresses or from the buyer's email.

Why test this first: native recipient delivery, QR/pass access and later custody
transfer may avoid a new wallet vendor and private-key store. It is a candidate
for the smallest integration, not an assertion of seamless Better Auth federation.
Do not reproduce the derivation function or fabricate a contact alias to force it
to behave like an account-ID wallet; use native APIs only after dependency approval.

Acceptance conditions before selection:

1. Owner accepts **walletless custody plus wallet passes initially**, rather than a
   general-purpose embedded wallet that can sign at first activation. Explain who
   controls KeyManager transfer/recovery and which hosted service remains required.
2. Prove both grants, pass retrieval and recovery under canonical account control,
   including fixture-only testing of any unauthenticated native export path.
   Native email OTP/transfer is an additional custody operation, never a replacement
   for Sophomores login, verification or account/event eligibility.
3. Assess privacy: the public, unsalted email/lock derivation permits guessing
   candidate emails (an inference from source), even without plaintext onchain.
   Obtain acceptance of that risk or choose the other candidate. Store no contact,
   shipping data or activation secret in public metadata. Hosted protected metadata
   still discloses data to that operator; minimize and approve any such disclosure.
4. Bind addresses by immutable account ID, recording contact-at-issuance and proof
   history privately. Email changes, account recovery and token export must reconcile
   both credentials; they cannot silently derive a new address and mint again.
5. Settle transfer/reversal policy. **Recommended policy for approval:** no peer
   transfer/reassignment of the event entitlement; audited same-account recovery
   only through the event. Prove contract transfer restrictions, native export and
   KeyManager compatibility together. Do not grant KeyManager LockManager rights
   merely to bypass a failed transfer restriction.

### Alternative if those conditions fail: one managed/embedded wallet per account

Use a provider-supported wallet tied to canonical account proof, with explicit
custody, signer isolation, backup/recovery, export and compromise procedures.
Both locks may then issue to one address; this still does not enforce account/event
allocation onchain. No provider is selected, installed or authorized here. Never
derive private keys from email/phone/password, store raw keys in the user record,
or build a home-grown custody service. User-controlled external wallets are another
supported-design possibility only if the owner accepts connect/sign/recovery UX;
they are not the default imposed on the single customer flow.

**G1 decision:** accept native walletless/pass-first custody subject to proof, or
require a real signable embedded wallet from activation. If the latter, select and
review its provider in a separately scoped batch; do not silently downgrade the goal.

### Privileges and issuer boundary

- Owner-controlled administration/recovery holds LockManager authority; separate
  it from routine application execution. Select the actual custodian/signing system
  before any credential or contract action. No staff/admin privilege expansion.
- Routine issuance should have only the selected contracts' necessary KeyGranter
  rights. A hosted dispatcher may require its signer to receive that authority;
  a direct approved issuer can avoid hosted issuance but needs its own signer/gas
  operations. Prefer the narrow proven native path, not both running in parallel.
- Per-key manager choice governs transfer/cancellation. Native email KeyManager is
  not Sophomores' recovery signer. If our reversal policy needs rights it cannot
  supply, reject that custody configuration rather than pretending grants solve it.
- Staff check-in authorization is application/event scoped, not chain grant access.
  Never distribute lock-manager keys to door staff or use buyer wallets as issuers.

## 4. Membership / event / issuer mapping

Use **one membership PublicLock plus one event PublicLock for this event**, on one
approved supported network initially. These are logical roles: no network, contract
address, version, token lifetime or event date is selected/fabricated by P1.
Record the actual chain ID, lock address, deployed version and issuer policy after
the appropriate approval and verification. Later events receive deliberate mappings.

| Logical association | Required stable identity and rule |
| --- | --- |
| Canonical account → custody address(es) | Account ID; chain/lock scope when native email-derived; proof/custody mode, lifecycle and audited recovery history. Never use email as a new account primary key. |
| Account → membership credential | Explicit `(chainId, membershipLock, tokenId)` plus issuance operation. Ensure/reconcile valid, pending, missing or unknown before grant; membership existence never airdrops another seat. Lifetime/renewal remains a policy choice. |
| Order unit → event entitlement | Preserve existing stable `orderID:unit`; provenance self/gift/free-pool, canonical event, binding and financial/physical state. Unclaimed gifts have no recipient credential yet. |
| Event entitlement → event credential | Explicit `(chainId, eventLock, tokenId)` plus operation, bound account and membership reference. Token ID alone is not globally unique. Never remap an existing paid snapshot to a different event/lock silently. |
| Event entitlement → attendance/package | One authoritative consumption record; four Part-I drinks and the shared transport package remain one account's bounded benefits, not four/five extra NFTs. |

The membership→event relationship is **logical application binding** in this
proposal, not a native parent/child token or automatic airdrop. Do not build a new
custom smart contract/hook for that relationship without a demonstrated requirement
and approval. Native purchase must not be an unguarded second issuance path:
the minting docs recommend disabling public purchases with a zero sale maximum
while grants remain available. Configure/prove this on both chosen locks; don't
confuse sale supply, per-address limit and our own event capacity. [U1–U3]

### Deferred issuance and recovery contract

1. Settlement atomically fixes per-unit self/gift allocation and capacity using our
   existing transaction owner. No wallet or chain call is needed to reserve self.
2. Physical activation requires fresh canonical identity, entitlement eligibility,
   no financial/return hold and explicit action. For gifts, account/event binding,
   bearer consumption and durable issuance intent commit together. For self, validate
   the already bound buyer. Never hold the DB transaction open across external calls.
3. Serialize membership issuance per account/selected membership lock and event
   issuance per entitlement. Persist an immutable operation identity, target,
   custody/policy version, recipient and intended expiry/manager before dispatch.
4. Keep membership and event results independently. If membership confirms and
   event grant fails, recover the event operation only. Do not charge again, consume
   more capacity, create another package or reshuffle the allocation.
5. Record submission identity/transaction hash and final receipt/token mapping.
   A returned hash is **submitted**, not confirmed. Retain chain and indexer lag,
   finality/reorganization and expiry uncertainty separately from verified failure.
6. A timeout after a possibly accepted grant stays **unknown**. Native `grantKeys`
   has no application idempotency key. Reconcile the original submission and decoded
   mint events/recipient mapping before retry; mere absence from an indexer is not
   proof of nonexecution. If hosted submission cannot be recovered safely, hold for
   operator resolution or choose a proven direct issuer. Never blindly regrant.
7. Holds/refunds pause dispatch and credential use. A chain success racing a hold
   is an explicit reconciliation/revocation case, not a DB rollback or an automatic
   onchain money refund. PortOne remains the money authority. G3 must define whether
   returning a self/gift unit releases event binding and what happens after activation
   or benefit consumption; current code's clearing behavior is not new-policy approval.

### Purchase/claim overlap and result recovery coordination

The maintained [T001 eleven-scenario matrix](../To-Do%20List.md#purchaseclaim-overlap--owner-item-12b-investigation-recorded-2026-11-11)
and T003's typed claim/result contract are inputs to this blueprint, not another
allocation authority. Cross-check all eleven cases before P2/P4/P5 acceptance:
prior self purchase versus gift; registration/membership without a seat; prior gift
binding; claim-before-purchase and settlement races; competing gift/account claims;
different events versus replayed/separate purchases; forced first self allocation;
lost successful claim response; another bearer and invitation rotation; obsolete
unregistered check-in/expired links; and held/cancelled/returned units.

In particular, persist a successful claimant's result so the **same authenticated
account** can recover that same entitlement/issuance operation after a lost response,
without another grant. Do not make the consumed raw bearer reusable or reveal the
claimant/result to a different account. Distinguish known already-bound,
consumed/rotated/expired and held outcomes from genuinely unknown network outcomes;
T003 owns truthful UI states, while T004 retains system-owned payment recovery.
Gift claim changes the admission recipient, not the buyer, immutable shipping
recipient, financial evidence or fulfillment. Purchased gifts count against the
buyer's release allowance; claimed recipients occupy their own event binding.
Overlap never authorizes automatic refunds, transfers, account merging or forfeiture.

**Earlier-mint alternative remains separate:** known self credentials may be issued
earlier and NFC may only welcome/reveal them, if explicitly selected. Unknown gifts
still wait for a real recipient claim/custody design. Keep a versioned per-unit mode
server-side; do not encode mint timing in the tag or switch paid units silently.

## 5. One check-in authority — G4 recommendation

**Choose the Sophomores commerce admission ledger as the operational authority.**
Keep Unlock as token/ticket/pass infrastructure, not an independently writable
admission ledger. This is a justified boundary, not a proposal to rebuild all of
Unlock Events: the inspected native handler records repeated history, not our
atomic unused→used transition; it does not participate in our payment/return locks
or benefit package. Its post-write notifications cannot enforce those rules. [U9]

The intended path is: native event QR/pass → validated token/credential identity →
mapped account-bound admission → existing authorized commerce transaction checks
activation, event, financial holds and prior consumption → one committed admission
result → benefits continue through the same existing ledger.

- Reuse native pass exports and documented QR format/verification where proved.
  Inspect installed libraries and native scanner extension points before adding a
  camera reader. A native scanner may be reused only if its admission action can
  commit our authority rather than independently mark Unlock checked-in. No such
  supported pre-commit integration was established in P1.
- If no compatible extension exists, propose a **thin staff scan/input adapter**
  to the existing commerce operation, not another event engine or a copied scanner
  stack. Its scope/dependencies/UX need P5 approval. Until accepted, use the existing
  authorized staff lookup path for testing, not a second production door mode.
- Do not display admission success before our transaction commits. Repeated/racing
  scans return the original used result, not another admission or benefit grant.
  Idempotent action IDs plus real DB uniqueness/locking must prove this.
- Reject raw activation bearers as tickets. Reject forged/mismatched/stale credentials;
  prove authorized native QR signing and how copied static passes are treated. A
  static QR is bearer presentation, not proof the presenter is the canonical person.
  Inspected pass generation also lacks a route/handler recipient-proof check [U26–U27];
  token identity may be public, so do not assume only the legitimate recipient can
  obtain even a correctly signed native QR. A valid issuer signature is not holder proof.
  Require an independently authenticated bound-account interaction or an approved
  staff identity-verification procedure at the door; a matching name alone is not
  proof. Passing around a screenshot must not transfer the entitlement. The native
  validator's KeyManager owner exception and lack of an evident timestamp freshness
  check in that function require explicit stale/recovered/copied-QR tests. Do not
  invent a short QR TTL that would break saved wallet passes; identity verification
  and authoritative consumption must work with the chosen pass lifetime. Exact door
  procedure remains an acceptance gate, not a solved UX detail.
- Keep remote check-in mutation disabled for this admission path. Any later remote
  display is explicitly a projection, never an independently accepted door flag.
  Do not enable native auto-admit in parallel or rely on eventual two-way sync.
- Online authoritative validation is the recommendation. No safe disconnected,
  multi-device single-use check-in was proved. On outage, stop automated admission
  and use a separately approved, accountable operator procedure; no silent fail-open.

If the owner instead wants native Unlock to be authoritative, first prove a supported
atomic, pre-admission hold/eligibility check, duplicate rejection and benefit/reversal
coordination, then deliberately retire local write authority. A webhook mirror or
UI-level repeat warning alone cannot satisfy that replacement contract.

## 6. Physical activation / NFC — G2/G5

Baseline: one ordinary **NDEF HTTPS URI** per physical unit, opening the Sophomores
welcome/activation experience. No Web NFC API, native app, wallet key embedded in
the object or crypto chip is needed just to open a URL. This does not provide native
Wallet NFC admission, cryptographic anti-cloning or proof of delivery.

Apple documents background reading on supported iPhones, a notification tap and
Safari fallback for web links. Android documents NDEF URI dispatch, with Android 16
web links using `ACTION_VIEW` and Android 17 requiring an open-link notification.
Do not promise an immediate browser launch merely from proximity. Actual supported
phones, OS versions, locked/unlocked behavior and handoff remain device proof.
[Apple][N1], [Android][N2].

- Link a random high-entropy bearer to the unit in the server registry; store a
  digest. Extend existing claim primitives, not a parallel account/secret system.
  Keep raw bearer out of logs, analytics, URL queries, public NFT data and third-party
  QR tools. Fragment-only delivery is useful but scripts can still read fragments:
  capture/remove it before telemetry and account interaction; audit that ordering.
- Opening/GET/preloading/tapping never consumes, assigns, mints or sends a code.
  Explicit verified activation does. Self bearer cannot reassign the buyer's unit;
  gift bearer permits eligible claim only. Pre-auth welcome is generic.
- Proposed continuation: exchange the captured bearer by explicit protected POST
  for a short-lived, scoped server continuation; carry only an opaque same-site
  reference through login, with CSRF/session-rotation and concurrent-claim controls.
  Preserve explicit final activation. This is an unimplemented contract, not evidence
  of existing Google/reload support. Validate storage/expiry/logout and privacy before
  promising it; current mounted-memory-only behavior loses the bearer on reload.
- After activation, authenticated owners reopen the existing credential; other
  holders learn no private buyer/account/order data and cannot transfer the package.
  A provisioner or copied-tag holder may access an unclaimed gift: control printing,
  packing and pre-dispatch secrets. A read-only tag does not prevent cloning.
- QR/manual fallback carries the same sensitive activation capability. Choose expiry,
  unclaimed revoke/reissue, lost/damaged shipment and delayed-delivery access policy
  before dispatch. Replacing a tag must invalidate its previous capability without
  reminting or reallocating an already activated unit.
- Prove the actual metal collectible, antenna/ferrite arrangement, enclosure and
  phone/case orientation. NXP antenna guidance is relevant, not a chip/product
  selection or proof an ordinary sticker works on metal. [Antenna guidance][N3].

The proposed real physical activation remains the primary experience: delivery →
tap/notification → welcome → account proof → explicit activation → recoverable
membership/event issuance → available pass. Cinematic success must follow real
confirmation, not hide uncertainty. P6 later owns full-motion/live-render acceptance;
this documentation-only P1 does not claim visual or physical acceptance.

## 7. Current owning source and implementation deltas

The actual saved checkout contains installed dependencies (unlike the older planning
worktree). Inspected package metadata: Next `16.5.0-canary.27`, Payload/ecommerce
`3.92.1`, Better Auth `1.7.12`, PortOne server `0.19.0`, `qrcode.react` `4.2.0`.
No Unlock SDK, ethers or viem declaration/root installation was found. This is not
a dependency audit or install recommendation. Read installed Next guides before
later application work, and pass the library-first gate before introducing helpers.

| Actual source owner | Verified seam / proposed change, not implemented |
| --- | --- |
| [Account predicate](../../src/lib/member-auth/payload-repository.ts#L115), [fresh session](../../src/lib/member-auth/payload-runtime.ts#L27), [access](../../src/lib/commerce/access.ts#L28) | Account readiness already uses canonical verified identity. Add separate credential mapping/status; no token login bypass. |
| [PortOne finalization](../../src/lib/commerce/portone/adapter.ts#L148), [ecommerce success](../../src/lib/commerce/ecommerce.ts#L125) | Authentic settlement and active transaction own allocation. Add self/event binding here, not on welcome mount. |
| [Per-unit grant](../../src/lib/commerce/guests.ts#L24), [admission uniqueness](../../src/payload/collections/commerce-admissions/index.ts#L6) | Stable order-unit replay keys exist, but every current unit starts available. Event-account uniqueness is currently applied at claim, not paid self allocation. Extend both without rewriting legacy snapshots. |
| [Reservations](../../src/lib/commerce/reservations.ts#L42), [transaction locks](../../src/lib/commerce/_shared/transaction.ts#L6) | Reuse coordinated capacity and PostgreSQL transactions. Sorting locks within one call is not proof of global multi-stage lock order; review full acquisition order when adding account/event/issuance locks. |
| [Claims](../../src/lib/commerce/guests.ts#L64), [claim collection](../../src/payload/collections/commerce-claims/index.ts#L3), [continuation UI](../../src/components/commerce/invitation-claim.tsx#L10) | Random hashed, revocable, expiring claims exist. Current name prerequisite/cutoff and in-memory email-only continuation need deliberate physical/self/gift revision. |
| [Check-in](../../src/lib/commerce/guests.ts#L104), [operation authorization](../../src/lib/commerce/domain.ts#L23) | Current check-in permits named available/unclaimed admissions. Reject this obsolete route before an account-bound activation pilot. Keep current restricted staff authority. |
| [Benefits](../../src/lib/commerce/guests.ts#L112), [holds](../../src/lib/commerce/_shared/benefits.ts#L4), [returns](../../src/lib/commerce/returns.ts#L23) | Existing check-in/benefit counters and payment/return holds should govern native credentials too. Return currently clears eventAccountKey; G3 must settle new reacquisition/recovery policy. |
| [Fulfillment](../../src/lib/commerce/fulfillment.ts#L14) | Extend packing/unit mapping here. No current tag registry, custody association, durable issuer outbox or chain reconciliation was found in these owners. |

Preserved pre-existing work: owner English catalogue changes; documentation
deletions/archive/moves; Ulysses metadata; To-Do/calibration files and concurrent
work outside this document. No old-worktree source was transplanted. The referenced
`docs/CODEX-NAVIGATION-GUIDE.md` is absent in this checkout; no replacement was invented.

## 8. Smallest proofs and approval boundaries

These are **proposals**, not authorization to perform them. Separate minimal
falsification from full end-to-end acceptance; none authorizes launch or P2–P7.

### A. Smallest native-custody/pass feasibility probe

Use **one owner-designated existing disposable event-key fixture** on a named,
supported network, with its controlled email and approved operator. If no fixture
exists, stop; obtaining one requires explicit creation/grant/deployment approval.
No customer order, real customer email or production asset.

Scope approval must enumerate: limited hosted authentication/credential access,
fixture-only ticket requests and creation of one Apple/Google fixture pass, email
if needed, fixture-only unauthenticated/wrong-account pass-access checks, and device access.
Pass generation can create a remote Google pass object despite using HTTP GET;
this is not a read-only-provider probe. Never test another person's token.
Then attempt
native walletless recipient recovery/access and Apple/Google pass save/open with
that same key; inspect signed QR and confirm token/account/network mapping. Record
whether this needs a separate Unlock login, email OTP, Prime or unsupported testnet
substitution. No transaction, transfer, mint, paid subscription or fallback to a
mainnet fixture is included in this first probe. It can falsify the candidate; it
cannot prove dual issuance, atomic check-in or the Sophomores application flow.

### B. Smallest dual-credential / issuer proof after A and custody approval

Approve a named disposable network, two locks (membership/event), selected deployed
versions, named issuer/recovery roles, **two controlled real test-account/email
fixtures**, RPC/provider endpoints and an owner-set hard cost ceiling. Reuse suitable
existing locks; otherwise explicitly approve **at most two test-lock deployments**.
No wallet creation or funding is implied: authorize these separately if required.
If hosted tooling lacks the approved testnet, stop for a network/cost decision.

Bounded issuance target: **at most four intended keys** (membership + event for each
of self and gift fixtures). Prove role/expiry/manager fields and disabled public
purchase; replay one membership operation; inject a post-submit timeout for one
event operation and recover its original token without an extra grant. Keep unknown
submission held if evidence cannot resolve it. Retain sanitized operation/receipt
mapping, selected finality rule, fees and actual deployed identities. Do not add
transfer/refund transactions, more tokens or a paid service to rescue a failed test.

The fixture can mimic our allocation for issuer feasibility only. Actual settlement,
gift uniqueness and auth continuation still require the P2/P4 implementation and
real local-DB tests before any P7 application acceptance.

### C. Admission, reversal and physical acceptance — subsequent distinct scopes

- After P5's approved local adapter, test one real native pass against our authority:
  valid admission, duplicate/concurrent devices, unauthorized operator, wrong
  event/account, expiry, unactivated gift, financial hold and changed/recovered
  ownership. Expected: one committed admission/package, no local/native dual write.
  Native-hosted check-in mutation, if used purely to test its behavior on a disposable
  fixture, needs explicit separate permission and must never feed live admission.
- G3 recovery/reversal proof needs specifically approved transfer/revoke/expiry
  operations and beneficiary/refund policy. Do not invoke native monetary refunds
  to represent PortOne returns. Native pass revocation/update after reversal is U.
- G2/G5 physical proof needs approved sample and encoding/packing permission; first
  use a harmless non-claim test URL. Test an actual supported iPhone and Android on
  the intended collectible with QR fallback, then approved secret programming and
  packed-unit verification. No procurement, chip choice or production programming
  is authorized here. Device proof does not establish shipping, delivery or event timing.
- P7 is the separately accepted purchase→dispatch→activation→pass→door→benefit
  rehearsal, including failure/support paths, not merely four successful mints.

**Stop conditions:** exceeded/undefined cost ceiling; unavailable operator/service;
credential/role broader than approved; unsupported network; unresolved submission;
custody/transfer mismatch; PII/bearer disclosure; duplicate grant/admission; unsafe
memory headroom. Preserve the paid/fixture evidence and report the specific gate;
do not switch custody/mint mode, charge again, provision infrastructure or deploy.

Provider-free follow-on approval remains **P2 only** if chosen: test account-ready
versus token state, first-order self+gifts, replay/concurrent settlement, event-account
uniqueness and reversals under agreed policy. It does not include dependencies,
external proof, migrations against a database or deployment. Use the checkout guard
for later app/test workloads, one at a time, with the stricter 15 GiB aggregate
ceiling and at least 10 GiB system headroom; leave plan-canvas stopped.

## 9. Batched review decisions

| Gate | Smallest decision / recommendation | What it unlocks, only after scoped approval |
| --- | --- | --- |
| G1 | Try native walletless/pass-first custody under §3 conditions, or require a signable embedded wallet at activation. Recommend native feasibility probe first if that experience/privacy model is acceptable. | Probe A; later custody/provider selection and P4/P5 detail. |
| G2 | Choose unclaimed secret expiry/reissue and damaged/lost/delayed delivery handling. Do not infer permanent forfeiture. | P3 lifecycle and dispatch acceptance. |
| G3 | Approve logical account/token binding and propose event nontransferability except audited same-account recovery; settle self/gift returns, post-activation reversal and whether binding can be released. | Complete P2 reversal semantics and selected contract/key-manager configuration. |
| G4 | Recommend local commerce admission authority with native credentials/passes; accept only a proven pre-commit scanner integration or separately approve a thin adapter. Confirm service/cost facts before a hosted commitment. | P5 design and proof B/C; no native double-admit path. |
| G5 | Choose actual sample, device/packing proof and delayed-delivery access procedure. | Hardware experiment and P7, not procurement or dispatch by default. |

**Checkpoint outcome:** P1 blueprint delivered for review. No live integration,
custody recovery, pass installation, door/device result or commercial readiness is
claimed. Scope/links/source review is evidence about this design only; no tests,
builds, preview, database or provider acceptance was run.

The owner subsequently authorized a one-time consolidation into T002 of the saved
project's To-Do List and notification to its maintenance chat. Ongoing registry
ownership remains with that chat; this does not authorize the next implementation
or external-proof phase.

**Resource note:** the machine reports 48 GiB physical RAM. A final sample of the
shared desktop Codex CLI tree (which includes other chats and cannot be attributed
to P1) exceeded the stricter aggregate ceiling, and the guard's headroom check
reported pressure/zero usable headroom. No app workload was started; further
resource-bearing checks were withheld. Final checks were lightweight file/link
inspection and a tool-free security review. No process was terminated because idle
duplicates owned exclusively by this work could not be established. This sample
does not establish whole-chat memory compliance; recheck before any later workload.

## Public source references

Docs were queried through Context7 first (`/unlock-protocol/unlock`), then official
pages and pinned public implementation were read where API summaries were
insufficient. All public research was read-only on 2026-11-11. Historical product
announcements are labeled rather than treated as current service guarantees.

[U1]: https://docs.unlock-protocol.com/core-protocol/public-lock/minting-keys
[U2]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/smart-contracts/contracts/mixins/MixinGrantKeys.sol#L19-L48
[U3]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/smart-contracts/contracts/mixins/MixinKeys.sol#L175-L212
[U4]: https://unlock-protocol.com/blog/email-recipient
[U5]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/packages/unlock-js/src/KeyManager.ts#L167-L176
[U6]: https://docs.unlock-protocol.com/api/locksmith/check-event-ticket
[U7]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/routes/v2/ticket.ts#L39-L45
[U8]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/utils/middlewares/isVerifierMiddleware.ts#L64-L99
[U9]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/controllers/v2/ticketsController.tsx#L48-L155
[U10]: https://docs.unlock-protocol.com/api/locksmith/generate-apple-wallet-pass
[U11]: https://docs.unlock-protocol.com/api/locksmith/generate-google-wallet-pass
[U12]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/operations/generate-pass/ios/createAppleWalletPass.ts#L118-L125
[U13]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/utils/qrcode.ts#L12-L32
[U14]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/unlock-app/src/components/interface/verification/invalidMembership.ts#L16-L64
[U15]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/routes/v2/grantKeys.ts#L13-L19
[U16]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/controllers/v2/grantKeysController.ts#L38-L93
[U17]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/fulfillment/dispatcher.ts#L539-L588
[U18]: https://docs.unlock-protocol.com/core-protocol/public-lock/access-control
[U19]: https://docs.unlock-protocol.com/core-protocol/public-lock/transfers
[U20]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/smart-contracts/contracts/mixins/MixinTransfer.sol#L42-L49
[U21]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/smart-contracts/contracts/KeyManager.sol#L38-L69
[U22]: https://unlock-protocol.com/blog/unlock-dao-newsletter---may-2026
[U23]: https://unlock-protocol.com/blog/unlock-dao-newsletter---january-2026
[U24]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/unlock-app/src/components/interface/prime/PrimeContent.tsx#L216-L239
[U25]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/unlock-app/src/components/content/event/EventVerification.tsx#L47-L50
[U26]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/routes/v2/pass.ts#L1-L14
[U27]: https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/locksmith/src/controllers/v2/passController.ts#L25-L166
[N1]: https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading
[N2]: https://developer.android.com/develop/connectivity/nfc/nfc
[N3]: https://community.nxp.com/pwmxy87654/attachments/pwmxy87654/nfc/6155/1/AN11276.pdf
