# Unlock investigations — ownership boundary (custodian ruling, 2026-11-13)

Both cycle-1 reviews found that the two investigations overlap or leave gaps. From now on:

| Area | Owner |
|---|---|
| Lock per type, network, lock settings (expiry, transfer, max keys, purchase disabled), key manager value | **unlock-shape** |
| Issuer choice (hosted or direct KeyGranter), **issuer signer key custody and security**, nonce and fee policy | **unlock-shape** |
| Canonical schema: `token_type_targets`, issuance operation, attempt and evidence tables, holder access, holder benefits and capacity | **unlock-shape** |
| Customer wallet custody options, the auth bridge (Better Auth → wallet), the JWT/OIDC controls, wallet creation timing, recovery, email change, deletion and export | **unlock-auth** |
| Customer-wallet binding table (`users.id` → wallet/address, per scope) | **unlock-auth**, which references unlock-shape's tables and does not redefine them |

Each document names the other as a dependency, with the exact input it needs and a
latest acceptable date. Both build orders share one dated calendar to **2026-12-04**,
with a **go/no-go checkpoint on 2026-11-26**.
