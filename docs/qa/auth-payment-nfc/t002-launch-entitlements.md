# T002: Signet, free launch Ticket, and QR read boundary

Status: source-only contract and projection, not a live read, grant, or delivery. The 16 November flow and ADR-0011/0012/0014 govern entitlements; apply the 17 November product and account-binding overlays without creating a new wallet custody or product eligibility rule.

| Slot | Authoritative evidence | Not evidence |
| --- | --- | --- |
| Signet | A unique member-bound Signet entitlement and its confirmed issuance state. Future settlement uses an explicitly approved eligible edition and a confirmed purchase; payment does not itself prove issuance. | Member account status, passkey, wallet record, or a generic legacy grant. |
| Free launch Ticket | A distinct free entitlement bound to the issued Signet, the same member, and the separately configured launch event. Grant and capacity are independently tracked. | Signet alone, an event inferred from the URL, or a paid guest Ticket. |
| QR availability | A private delivery receipt for that exact issued Ticket, event, and recipient member. A ready receipt means the credential is known available for that member; not scanned, not checked in. | Token ID, transaction hash, QR image inferred from issuance, member email, or NFC. |
| Check-in | An independently authorized, fresh event-Ticket-level observation from the Unlock EVENTS flow, after its contract is reviewed. | QR delivery, previous attendance, or member/card activation. This slice always returns unavailable. |

The 17 November product direction distinguishes book-only from the limited membership bundle, whose terms remain unpublished; no blanket book-to-Signet entitlement or seller policy is inferred. The existing owner-scoped wallet record proves custody bookkeeping only. No passkey owns a Safe, no password or phone is needed to read membership after a valid NFC/account authorization, and this slice doesn't change how authentication or door entry works.

## Read adapter design

1. Resolve the fresh canonical, verified, unrestricted own-account principal server-side and take launch event identity from trusted configuration. Reject route-supplied member, event, or QR identities. Keep the key contract independent of pages.
2. Future server-owned storage needs immutable lineage, explicit kind discrimination, and uniqueness for the Signet/member, the free Ticket/Signet/launch event, and active QR delivery per Ticket. Keep separated consent, edition, payment and confirmed grant evidence at the write boundary. Query the three slots in a consistent snapshot; duplicates, damaged lineage, unavailable authority, and failures must never become a negative proof. The adapter may use null only for a successful uniquely scoped read that found no row; otherwise omit the slot. A current inactive/missing Signet cannot validate a Ticket projection in this slice; our display withholding is not a grant reversal or a legal/policy statement about cancellation.
3. Project narrow states server-side. No IDs, credentials, Safe addresses, token IDs, raw QR, provider errors, or check-in inference are returned. Do not expose evidence inputs as a route/endpoint. For an issued Ticket, authoritative lack of a receipt is not-ready; an unsupported/failed receipt read is unavailable. An absent Ticket paired with a receipt in the same scoped snapshot makes both issuance and QR unavailable; it is not negative proof. A QR value, if supplied in a later protected download surface, needs its own exact-Ticket/recipient authorization and private no-store delivery.
4. Paid guest admissions are distinct Ticket identities linked to their paying member, not the free slot. The paying member receives each QR, with no guest-email provider delivery or public lookup. Count actual Tickets against capacity; hold the owner-set guest cap as a setting. Do not treat a legacy name/claim row as an issued Ticket or a delivery receipt. Guest rows and all gift/refund policy remain outside this slice.

## Canonical evidence and deferred work

Canonical legacy grant rows are one per legacy admission, without Signet/free-Ticket kinds or per-Ticket QR receipts. Do not reinterpret them, add a fake repository, or wire the welcome/account UI to synthetic data. This patch adds a projection plus authored tests, not a collection, migration, provider adapter or UI consumer. Existing welcome remains unavailable for these slots.

Next evidence: eligible edition and paid settlement contract; durable identities and coherent read adapter; separately admitted verification that one wallet with multiple Tickets gets distinct QRs privately delivered to the member, that staff scan through Unlock EVENTS, and what a second scan shows. No grant, chain, transport, checkout activation, refund, or catch-up work is included. Tests are authored for branch separation, explicit absence, identity mismatches and no credential/check-in leakage; none executed.
