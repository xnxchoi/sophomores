# Unlock Protocol from the integrator's side: what Unlock returns to us

Research date: 2026-11-13. This report describes behaviour only. It contains no design proposals.

## Conventions

**Labels**
- **[D] Documented.** Stated on docs.unlock-protocol.com, or in an unlock-protocol.com guide or blog post. This includes the Locksmith OpenAPI reference rendered at docs.unlock-protocol.com/api/locksmith/*.
- **[S] Source-only.** Present in code with no matching documentation.
- **[U] Unknown.** Not established by either.
- **CONFLICT** marks a point where documentation and source disagree.

**Source citations**
- `path:Lx` points into the `unlock-protocol/unlock` monorepo at commit `fd86ed9d85b976c93d673aefcbf4f0540950cfc7` (2026-11-01).
- Permalink form: `https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/<path>#L<x>`

**Documentation citations**
- Docs pages are cited by URL. Their source is in the same repo, at `docs/docs/<page>.md`, and line numbers refer to that file.
- I spot-checked three live pages against the repo copies on 2026-11-13: Sign-in with Ethereum, Paywall and Checkout configuration. They matched.
- Blog posts are cited as `https://unlock-protocol.com/blog/<slug>`. Their source is `unlock-protocol-com/blog/<slug>.md`.
- Guides are not in the repo. They were fetched live on 2026-11-13.
- Two docs pages are cited by filename below. Their URLs are:
  - `access-control.md`: https://docs.unlock-protocol.com/core-protocol/public-lock/access-control
  - `deploying-locks.md`: https://docs.unlock-protocol.com/core-protocol/public-lock/deploying-locks
- Every cited unlock-protocol.com and docs.unlock-protocol.com URL returned HTTP 200 with real content on 2026-11-13.

---

## 1. Integration surfaces

### 1.1 Paywall script and `@unlock-protocol/paywall` (embedded modal)

**Status: current [D].**

- **[D]** There are two ways to load it.
  - CDN script: `https://paywall.unlock-protocol.com/static/unlock.latest.min.js`, configured through a global `unlockProtocolConfig`.
  - npm module: `@unlock-protocol/paywall`, used as `new Paywall(networks)` and then `loadCheckoutModal(config)`.
  - Sources: https://docs.unlock-protocol.com/tools/checkout/paywall (paywall.md:L11–40) and https://docs.unlock-protocol.com/tutorials/front-end/locking-page (locking-page.md:L15–59).
- **[S]** The current npm package version is `0.8.0` (`packages/paywall/package.json`).
- **[S]** The modal is an iframe of `${unlockAppUrl}/checkout`, connected through Postmate (`packages/paywall/src/Paywall.ts:L180–193`). Events cross the iframe boundary as `checkout.*` messages and are re-dispatched on `window` as `unlockProtocol.*` CustomEvents (`Paywall.ts:L39–49`, `L194–228`; `packages/paywall/src/utils/index.ts:L37–43`).
- **[D]** The docs say Unlock Accounts are *not* available inside the embedded paywall. Integrators should pass an EIP-1193 provider instead with `paywall.connect(provider)` (https://docs.unlock-protocol.com/tools/sign-in-with-ethereum/unlock-accounts, unlock-accounts.md:L10–21).
- **CONFLICT [S].** Source configures Privy inside any iframe with `loginMethods: ['wallet','email']`. Outside an iframe it uses `['wallet','email','google','farcaster']` (`unlock-app/src/config/PrivyProvider.tsx:L257–267`). So email login appears to be offered in the embedded modal; only Google and Farcaster are dropped.
- **[S] Deprecated or legacy pieces of the paywall.**
  - `Paywall.ts:L313–336` is a block titled "Legacy/deprecated methods": `getUserAccountAddress`, `getState`, `cacheUserInfo` and `loadCache`.
  - The bare `unlockProtocol` event (detail = `'locked'|'unlocked'`) is kept "because it will break legacy integrations" (`utils/index.ts:L12–15`).

### 1.2 Checkout URL with `redirectUri`

**Status: current [D].**

- **[D]** The base URL is `https://app.unlock-protocol.com/checkout?`.
  - It needs either `id=<saved Checkout Builder config id>`, or both `paywallConfig=<URL-encoded JSON>` and `redirectUri=<URL-encoded URL>`.
  - Optional parameters: `referrerAddress` and `promo`.
  - Source: https://docs.unlock-protocol.com/tools/checkout/configuration (configuration.md:L15–31).
- **[S]** The redirect target can come from several places (`unlock-app/src/components/interface/checkout/CheckoutContainer.tsx:L42–53`):
  - `paywallConfig.redirectUri`; or
  - any query key matching `redirecturi`, `redirect-uri`, `redirect-url` or `redirecturl`, case-insensitive.
- **[S]** A minimal form `?lock=<addr>&network=<id>&title=` is also accepted (`unlock-app/src/utils/paywallConfig.ts:L66–79`).
- **[S]** A `paywallConfig` passed in the URL is applied with `JSON.parse` and a validator, without zod schema defaults (`paywallConfig.ts:L49–61`).

### 1.3 "Sign in with Unlock" / Sign-In with Ethereum (`client_id`, `redirect_uri`, `code`)

**Status: current [D].**

- **[D]** Uses the same `https://app.unlock-protocol.com/checkout?` endpoint with `client_id` and `redirect_uri`. `client_id` "MUST match the host part of the redirect_uri" (https://docs.unlock-protocol.com/tools/sign-in-with-ethereum, README.md:L23–30).
- **[S]** That rule is enforced. If the host does not match, the OAuth config is dropped (`unlock-app/src/utils/oauth.ts:L15–21`).
- **[S]** `response_type` and `state` are also read from the query (`oauth.ts:L6–9`).
- **[D]** Users can sign in with a wallet, or with an Unlock Account using email or Google (README.md:L13).

### 1.4 Locksmith API

**Status: current [D] as a hosted service.**

- **[D]** Locksmith is Unlock's hosted API for metadata, renewals, fiat payment, tickets, webhooks and emails. The docs say it "can (and should!) be replaced by 3rd party applications who want to implement the protocol natively" (https://docs.unlock-protocol.com/tools/locksmith, README.mdx:L6–15).
- **[D] Authentication.**
  - Flow: SIWE message → `POST /v2/auth/login` → `{accessToken, walletAddress, refreshToken}` → `Authorization: Bearer <accessToken>` (README.mdx:L17–52).
  - The OpenAPI `AuthResult` schema contains only `{walletAddress: string|null, accessToken: string}` (`packages/unlock-js/openapi.yml:L37–50`). **CONFLICT:** the docs prose also mentions a `refreshToken`.
- **[S]** API-key ("application") authentication exists. The key can be sent as `?api-key=<key>` or `Authorization: Api-key <key>` (`locksmith/src/utils/middlewares/auth.ts:L77–95`).
- **[D]** Applications are created and managed at `POST /v2/applications` and `GET /v2/applications/list` (openapi.yml:L1069–1124; https://docs.unlock-protocol.com/api/locksmith/create-application).
- **[S]** Endpoints most relevant to us:
  - `POST /v2/claim/:network/locks/:lock` (free-lock claim). Also **[D]** via https://docs.unlock-protocol.com/api/locksmith/claim.
  - `POST /v2/api/grant/:network/:lock` (grant keys). **Source-only:** it is not in the OpenAPI spec, which contains no "grant" path. Implementation: `locksmith/src/routes/v2/grantKeys.ts:L13–19`.
  - `GET /v2/api/metadata/:network/locks/:lock/keys/:keyId` (key metadata). Also **[D]** via https://docs.unlock-protocol.com/api/locksmith/key-metadata.
  - `GET /v2/api/:network/locks/:lock/keys-by-page`, which needs authentication. Also **[D]** via https://docs.unlock-protocol.com/api/locksmith/keys-by-page.
- **[S] Deprecated Locksmith routes.**
  - `GET /v2/api/:network/locks/:lock/keys` is marked "Deprecated. Remove me by June 1st 2024" but is still mounted (`locksmith/src/routes/v2/key.ts:L9–16`).
  - `/v2/og` is marked "deprecated!" (`locksmith/src/routes/index.ts:L112`).
  - `KeyPricer` is `@deprecated` (`locksmith/src/utils/keyPricer.ts:L6`).
  - Legacy email-account endpoints remain in the spec: `/users/{email}/privatekey`, `/recoveryphrase`, `/v2/api/users/{email}/{provider}/waas` and `existNextAuth` (openapi.yml:L2046, L2096, L2255, L2282).

### 1.5 Webhooks / event subscriptions

**Status: current [D].**

- **[D]** Locksmith implements WebSub. "Currently, locksmith support sending updates on new locks and keys" (https://docs.unlock-protocol.com/tools/locksmith/webhooks, webhooks.md:L10–22). Topics:
  - `…/api/hooks/:network/locks`
  - `…/api/hooks/:network/keys`
  - `…/api/hooks/:network/locks/:lock/keys`
- **[S]** A fourth topic, `…/api/hooks/:network/expired-keys`, also exists (`locksmith/src/routes/hook.ts:L30–33`).
- **Answer: yes, Unlock can push "new key" to our server.** It does so by polling, not in real time. Details are in §2.9.

### 1.6 Unlock Accounts (email) versus the user's own wallet

**Status: Unlock Accounts are current, now backed by Privy [D].**

- **[D]** Unlock Accounts are "powered by Privy" (unlock-accounts.md:L8). Privy was announced with wallet, email, Google and email-code login (https://unlock-protocol.com/blog/unlock-labs-integrates-privy-for-streamlined-onboarding-and-login, 2024-10-30).
- **[S]** After a Privy login, the app exchanges the Privy access token plus an EVM wallet address at `POST /v2/auth/privy` for a Locksmith token (`PrivyProvider.tsx:L61–91`; openapi.yml:L989).
- **[S]** If the user has no EVM wallet, one is created with Privy's `createWallet` (`PrivyProvider.tsx:L216–223`).
- **[S]** Legacy account types (`EMAIL_CODE`, `UNLOCK_ACCOUNT`, `GOOGLE_ACCOUNT`, `PASSKEY_ACCOUNT`) trigger a migration modal (`PrivyProvider.tsx:L36–55`, `L198–212`). The `unlock-app/src/components/legacy-auth/` directory also exists. Together these show the pre-Privy Unlock Account system is legacy.

---

## 2. What we receive, event by event

### 2.0 Event shapes (embedded paywall)

All events are `window` CustomEvents and carry their payload in `event.detail`.

| Event | Documented fields [D] | Source-emitted fields [S] |
|---|---|---|
| `unlockProtocol.status` | `state: 'locked'\|'unlocked'` (paywall.md:L52–64) | `{state, locks?: string[]}` (`Paywall.ts:L357–370`) |
| `unlockProtocol.authenticated` | `address: string`, `signedMessage: string`; no payload means logged out (paywall.md:L66–77) | `{address?, signedMessage?, message?}` (`useCheckoutCommunication.ts:L8–12`) |
| `unlockProtocol.transactionSent` | `hash: string`, `lock: string` (paywall.md:L79–86) | `{hash, lock?, tokenIds?: string[], metadata?, network?}` (`useCheckoutCommunication.ts:L14–20`; `Paywall.ts:L244–253`) |
| `unlockProtocol.metadata` | "collected metadata about all the recipients", sent "on confirmation" (paywall.md:L88–92) | Raw `metadata` object (`Minting.tsx:L186`; `Confirm.tsx:L44`) |
| `unlockProtocol.closeModal` | "triggered when the modal is closed by the user"; carries no status (locking-page.md:L105–109) | `{}` (`Paywall.ts:L308–311`) |
| `unlockProtocol` (legacy) | Used in an example (locking-page.md:L144) | detail = the state string (`utils/index.ts:L12–15`) |

- **[S]** `await paywall.loadCheckoutModal()` resolves when the modal closes, with `{userAddress?, transactionInfo?}` (`Paywall.ts:L128–156`). **CONFLICT:** the README comment says the response "may include hash … and lock" (`packages/paywall/README.md`).
- **CONFLICT (between two docs pages).**
  - The Paywall page documents the field as `signedMessage` (paywall.md:L75).
  - The Configuration page says "`unlockProtocol.authenticated` includes the `signature` attribute" (configuration.md:L50).
  - Source matches the Paywall page and emits **`signedMessage`** (`Returning.tsx:L57`; `MessageToSign.tsx:L42`; `Minting.tsx:L182–185`).

### 2.1 (a) Successful login or sign-in

**SIWE redirect flow**

- **[D]** On success the user is redirected to `redirect_uri?code=<base64>`. `JSON.parse(atob(code))` gives `{d: <signed message string>, s: <signature hex>}`, and the address is recovered with ethers `verifyMessage` or viem `recoverMessageAddress` (README.md:L32–54).
- **[S]** `code` is `base64(JSON.stringify({d: message, s: signature}))`, and `state` is appended alongside it (`unlock-app/src/components/interface/checkout/Connect/ConfirmConnect.tsx:L31–47`).
  - If no `state` was supplied, source passes `oauthConfig.state`, which comes from `search.get('state')` and is `null` (`oauth.ts:L9`). It is then appended with `URLSearchParams.append` (`Connect/index.tsx:L63–69`). The likely result is `state=null`. **[U]** Not tested.
- **[D]** The documented example message:

  ```
  ouvre-boite.com wants you to sign in with your Ethereum account:
  0xDD8e2548da5A992A63aE5520C6bC92c37a2Bcc44

  URI: https://app.unlock-protocol.com/login
  Version: 1
  Nonce: rokvh2jf
  Issued At: 2022-02-04T18:43:17.178Z
  ```

  (README.md:L58–68)
- **CONFLICT [S].** In the standalone (non-iframe) flow, source builds the message differently from the docs (`unlock-app/src/hooks/useSIWE.tsx:L67–97`; `ConfirmConnect.tsx:L54–60`):
  - `domain = window.location.host`, that is `app.unlock-protocol.com`, not our host.
  - `uri = app origin`.
  - `resources = ['https://<client_id>/']`.
  - `chainId` is the wallet's current chain.
  - `statement` is empty, because `ConfirmConnect` is not given the `paywallConfig`.
  - No `expirationTime` is set.
  - The nonce comes from `siwe.generateNonce()` in Unlock's browser code. It is not ours and not Locksmith's.

  When a delegated parent provider is used, `domain` is the parent's host instead (`useSIWE.tsx:L82–86`). The docs tell us to "ignore any signed message where the host does not match your application" (README.md:L74). Under the source above, our host appears in `Resources`, not in `domain`.
- **[S] Without a wallet (Unlock Account).** The flow is the same, because Privy always ends with an EVM wallet address: an embedded wallet is created if missing (`PrivyProvider.tsx:L216–223`). The `code` therefore always carries an address and signature. **[U]** Whether that wallet is an EOA or a smart wallet, which affects whether `verifyMessage` works or EIP-1271 is needed, was not verified.

**Embedded paywall**

- **[S]** `checkout.userInfo` carries `{address}` when an account connects, or `{}` when none is connected (`main/index.tsx:L76–81`). The paywall turns this into `unlockProtocol.authenticated` and then runs a key check (`Paywall.ts:L259–264`).
- **[S]** No email, user id or Privy id is ever sent to the parent page. The only identity fields are `address`, `message` and `signedMessage` (`useCheckoutCommunication.ts:L8–12`).

**Locksmith login response**

- **[D]** `POST /v2/auth/login` with `{message, signature}` returns `{walletAddress, accessToken}` (openapi.yml:L957–988, L37–50).

**Server-side verification of `code`**

- **[D]** Decode, then recover the signer with ethers `verifyMessage`, viem `recoverMessageAddress` or web3 `recover`. Check `domain`, nonce uniqueness and `Issued At` freshness. For smart-contract wallets, use the address in the message (EIP-1271) (README.md:L38–78). This is all done in our own code; there is no documented Unlock endpoint for verifying a `code`.
- **[S]** Locksmith's own login verifies with the `siwe` library's `message.verify({signature},{provider})` and falls back to ERC-6492 through `@ambire/signature-validator`. It rejects reused nonces but does **not** check `domain` (`locksmith/src/controllers/v2/authController.ts:L15–117`).
- **[U] Unverified inference from source.**
  - The `code` nonce is generated client-side and is never registered with Locksmith (`ConfirmConnect.tsx:L54–56`).
  - Locksmith login checks neither domain nor expiry (`authController.ts:L23–37`, `L91–104`).
  - It therefore *may* be possible to post a `code`'s `d`/`s` pair to `POST /v2/auth/login` and receive a Locksmith session for that wallet. This is untested; see the open unknowns.

### 2.2 (b) Successful mint or purchase

**Embedded paywall, default optimistic mode**

- **[S]** When the transaction is sent, Checkout emits `transactionInfo {hash, lock, metadata, network}` with **no** `tokenIds`, followed by `userInfo` and `metadata` (`Confirm.tsx:L30–45`).
- **[S]** The paywall then immediately emits `unlockProtocol.status {state:'unlocked', locks:[lock]}`, without any on-chain check (`Paywall.ts:L244–253`).
- **[S]** After one confirmation with receipt `status === 1`, Checkout polls `latestTokenOfOwner` every 1 s until a token id appears. It then emits `transactionInfo` a second time, now with `tokenIds` (`Minting.tsx:L163–186`).
- **In optimistic mode, `transactionSent` therefore fires twice [S].**

**Pessimistic mode (`pessimistic: true`)**

- **[D]** The page waits for confirmation (paywall.md:L94–100).
- **[S]** Only the post-confirmation `transactionInfo` with `tokenIds` is emitted (`Confirm.tsx:L33`; `Minting.tsx:L176–181`).

**Example payload [S]**, from the `TransactionInfo` type and the emit site (`Minting.tsx:L176–181`):

```json
{"hash":"0x…","lock":"0xLock…","tokenIds":["12"],"metadata":{…}}
```

**Checkout URL with `redirectUri`**

- **[D]** "redirected when their membership is valid" (configuration.md:L24).
- **[S]** On close, the redirect carries **no transaction hash and no token id** (`main/index.tsx:L86–112`). The only parameters added are:
  - `error=access-denied` if the mint ended in `ERROR`;
  - `signature=<sig>&address=<addr>` if `messageToSign` was signed;
  - `error=user did not sign message` if `messageToSign` was configured but not signed.
- **[D]** `messageToSign` → "a `signature` query param is then appended to the `redirectUri`" (configuration.md:L50). Source also appends `address`.
- **[S] Replay note.** `messageToSign` is a static string from our config, signed with `personal_sign` (`Returning.tsx:L40–47`). The `address` + `signature` pair is identical every time unless the message itself varies.

**Server-pushed confirmation**

- **[S]** Webhook delivery: see §2.9.

### 2.3 (c) New account created without a wallet

- **[S]** Unlock does **not** notify the integrator that an account was created.
  - Account creation happens in Privy inside Unlock's app (`PrivyProvider.tsx:L198–223`).
  - The integrator only ever receives a wallet address, through `authenticated`, the SIWE `code` or the redirect `address`.
- **[S]** Email addresses are not sent to the parent (`useCheckoutCommunication.ts:L8–12`).
- **[D]** If `emailRequired: true`, the email is "stored as metadata and be visible to any lock manager" (configuration.md:L67). We would read it through Locksmith as a lock manager, not as an event (§3).
- **[S] Walletless keys by email** are a different path.
  - Locksmith claim or the dashboard airdrop derive an address deterministically: `getAddress(id(JSON.stringify({email: lowercased, lock: lowercased})).slice(0,42))` (`packages/unlock-js/src/KeyManager.ts:L170–176`).
  - The key manager is set to the network's `keyManagerAddress` (`locksmith/src/controllers/v2/claimController.ts:L56–65`, `L174`).
- **[D]** These are "Wallet-less airdrops" (https://unlock-protocol.com/blog/email-recipient; https://unlock-protocol.com/blog/email-airdrop-nft).

### 2.4 (d) User already holds a key

- **[S]** The Checkout state machine routes existing members to `RETURNING` (`checkoutMachine.ts:L279–280`).
  - `Returning` emits only `userInfo` (with a signature, if `messageToSign` is set) (`Returning.tsx:L57–61`).
  - No `transactionInfo` is emitted.
  - The paywall's own `getHasValidKey`-style check then emits `status: unlocked` (`Paywall.ts:L338–355`).
- **[S]** With `redirectUri`, a returning member's redirect looks the same as a new purchase's. Neither carries a hash or token id (`main/index.tsx:L92–112`).
- **[D]** "If the user already has an active membership, they will not be prompted to complete the metadata form!" (https://docs.unlock-protocol.com/tools/checkout/collecting-metadata, collecting-metadata.md:L118–121).
- **[S]** The Locksmith claim API returns `400 {"message":"User already has key"}` (`claimController.ts:L117–123`).
  - An *expired* key is extended rather than re-minted (`claimController.ts:L141–165`).

### 2.5 (e) User cancels or closes the modal

- **[D]** `unlockProtocol.closeModal` "does not give any information about the status of the user" (locking-page.md:L105–109).
- **[S]** On close, the paywall emits `closeModal {}` and hides the iframe. `loadCheckoutModal` resolves with whatever was collected (`Paywall.ts:L145–147`, `L194–198`, `L308–311`).
- **[S]** If `useDelegatedProvider` is set, closing also signs the user out of the iframe (`main/index.tsx:L113–121`).
- **[D]** `persistentCheckout: true` makes the modal non-closable. "When closed, the user will be redirected to the `redirect` query param" (configuration.md:L48).
- **[S]** With `redirectUri`, closing redirects with *no* parameters, unless `messageToSign` was configured, in which case it adds `error=user did not sign message` (`main/index.tsx:L92–112`).
- **[S]** The close button is hidden when `persistentCheckout` is set (`main/index.tsx:L249`).
- **SIWE flow.**
  - **[D]** Refusal → `?error=access-denied` (README.md:L34).
  - **[S]** The **Deny** button sends `error=access-denied` (`ConfirmConnect.tsx:L97–101`).
  - **[S]** The **X** button calls `onClose()` with no parameters, so we get a plain redirect with no `code` and no `error` (`Connect/index.tsx:L61–69`, `L101`; `Shell.tsx:L82`).

### 2.6 (f) Failed or pending transaction

- **[S] Pending.** In optimistic mode the page is unlocked on the *sent* hash (§2.2). The UI treats `PROCESSING` as `FINISHED` unless `pessimistic` is set (`Minting.tsx:L58–59`).
- **[S] Failed.** If the receipt is missing or `status !== 1`, Checkout shows a toast and sets `ERROR` (`Minting.tsx:L172–206`).
  - **No event is sent to the parent page.** A previously emitted optimistic `unlocked` status is not retracted by any failure event. A later `checkKeysAndLock` only runs on `userInfo` or config changes (`Paywall.ts:L159–174`, `L259–264`).
  - With `redirectUri`, the redirect gets `error=access-denied` (`main/index.tsx:L94–96`).
- **[S] Claim API failures** (Locksmith):

  | Status | Body | Meaning | Citation |
  |---|---|---|---|
  | 401 | `{"message":"You are not authenticated."}` | No recipient and no email | `claimController.ts:L67–72` |
  | 400 | `{"message":"Claim disabled for this lock"}` | Lock is on Unlock's disabled list | `claimController.ts:L74–83` |
  | 402 | `{"message":"Lock is not free"}` | — | `claimController.ts:L103–108` |
  | 422 | `{"message":"<reason>"}` | Gas too high, or purchaser balance too low | `claimController.ts:L110–115` |
  | 429 | `{"message":"Too many requests"}` | Rate limited | `locksmith/src/utils/middlewares/rateLimit.ts:L33–37` |
  | 403 | Missing or invalid captcha | — | `locksmith/src/utils/middlewares/recaptchaMiddleware.ts:L32–52` |

  - Success returns `{transactionHash, owner}` before confirmation (`claimController.ts:L176–182`; **[D]** openapi.yml:L2895–2948).

### 2.7 (g) Cap reached or lock sold out

- **[S] Checkout.**
  - Computes `isSoldOut = numberOfAvailableKeys(lockData) <= 0` (`Select.tsx:L269`).
  - Shows a "Sold out" label and disables continuing for non-members (`Select.tsx:L141–149`, `L373–379`).
  - Hides sold-out locks if `hideSoldOut` is set (`Select.tsx:L275`; **[D]** configuration.md:L52).
  - No event is sent to the parent page.
- **[S] Locksmith.** The `can-claim` check returns `400 {"message":"Lock is sold out"}` (`locksmith/src/controllers/purchaseController.ts:L251–256`).
- **[D] On-chain.** `maxNumberOfKeys` is a lock property; set it to 0 to disable purchases (https://docs.unlock-protocol.com/core-protocol/public-lock/minting-keys, minting-keys.md:L15–17).
- **[U]** The exact revert reason for a purchase past the cap was not traced.

### 2.8 (h) Wrong network or wrong wallet

- **[S] Network.** Checkout calls `wallet_switchEthereumChain`. On error 4902 or -32603 it calls `wallet_addEthereumChain` (`unlock-app/src/hooks/useProvider.ts:L78–93`).
- **[S] Wallet.** `ensureCorrectWallet` asks the user to connect the authenticated address (`useProvider.ts:L98–125`).
- **[D]** `expectedAddress` asks the user to switch wallet address before proceeding (configuration.md:L53).
- **[S]** A mismatch with `expectedAddress` disables continuing (`Select.tsx:L358–379`).
- **[S]** No dedicated event reaches the parent page for either case.

### 2.9 Webhooks: exact behaviour

- **[D] Subscribing.** POST `hub.topic`, `hub.callback`, `hub.mode=subscribe` and `hub.secret` to the topic URL.
  - The hub then sends an intent-verification GET. Our endpoint must return 200 with `hub.challenge` in the body (https://docs.unlock-protocol.com/tutorials/back-end/locksmith-webhooks, locksmith-webhooks.md:L10–45).
- **[S]** The request must have exactly `Content-Type: application/x-www-form-urlencoded`, or the hub returns 415 (`locksmith/src/controllers/hookController.ts:L29–37`).
  - The tutorial's example sends a `FormData` body with that header (locksmith-webhooks.md:L20–33). Whether that body parses correctly is **[U]**.
- **[S] Lease.** Default 864000 s (10 days), maximum 9 × 864000 s (90 days). We must re-subscribe before it lapses (`locksmith/src/routes/hook.ts:L5–11`; `hookController.ts:L74–85`).
- **[S] Delivery mechanics.**
  - Delivery is a POST with JSON body `{"network": <id>, "data": [<subgraph Key>…]}` (`locksmith/src/worker/jobs/keys.ts:L97–113`).
  - With a secret, it carries the header `X-Hub-Signature: sha256=<hex HMAC-SHA256 of the raw JSON body>` (`locksmith/src/worker/helpers/notify.ts:L33–41`, `L76–85`).
- **[S] Key object fields**, from the subgraph `AllKeys` query (`packages/unlock-js/src/subgraph/schema.graphql:L39–79`):
  - `id`, `tokenId`, `owner`, `manager`, `expiration`, `tokenURI`, `createdAt`, `createdAtBlock`, `cancelled`, `transactionsHash`;
  - `lock{id, address, name, expirationDuration, tokenAddress, symbol, price, lockManagers, keyGranters, version, maxNumberOfKeys, maxKeysPerAddress, createdAtBlock, totalKeys}`.
- **[S] Reliability characteristics.**
  - Polled, not real time. The production cron runs `allJobs` every 5 minutes, plus a daily full scan at 03:00 (`locksmith/src/worker/worker.ts:L26–29`).
  - It reads the subgraph for keys created within the last week, 20 per page (`keys.ts:L15`, `L33–48`). Subgraph lag therefore adds latency.
  - Each delivery has a 1 s timeout. Retries are 3, with `maxRetryTime` 1000 ms (`notify.ts:L20`, `L151–153`).
  - Retries are aborted if the hook's last 3 events all failed (`notify.ts:L117–119`, `L144–149`).
  - Keys are recorded as processed **whether or not delivery succeeded** (`keys.ts:L95–124`). A failed delivery is not resent.
  - **[U]** Whether the daily full scan redelivers anything already recorded as processed. Reading `keys.ts:L50–62`, it skips processed items.

---

## 3. Trust and verification

- **[D] Front-end locking is circumventable.** "This tutorial implements a front-end locking approach, which is possible to circumvent… requires a back-end integration" (locking-page.md:L207).
- **[D] A free lock is self-serve.** `purchase` is "self-served, which means that anyone can call this function to mint an NFT, whether these keys are free or paid" (minting-keys.md:L13).
  - Holding a key on a free lock with no purchase hook therefore proves neither a PortOne payment nor an account on our site.
  - `grantKeys` "is not limited by the maximum number of keys for sale" (minting-keys.md:L27).

### What is spoofable client-side

| Item | Why it can be forged | Label and citation |
|---|---|---|
| All `unlockProtocol.*` window events | They are ordinary `window` CustomEvents that any script on the page can dispatch. | [S] `utils/index.ts:L9–32` |
| `status: unlocked` in optimistic mode | It is emitted on a sent hash, before any receipt. | [S] `Paywall.ts:L250–252` |
| The paywall's cached user address | `localStorage.userInfo` is read back without verification. | [S] `Paywall.ts:L325–336`; `utils/localStorage.ts:L30–46` |
| Redirect query parameters (`signature`, `address`, `error`, `code`, `state`) | Anyone can construct the URL. | [S] |
| A SIWE `code` issued to a different integrator | In the standalone flow the signed `domain` is always app.unlock-protocol.com. Only the `Resources: https://<client_id>/` line ties a `code` to us, so a `code` minted for another site verifies on signature alone unless `Resources` is checked and the nonce is recorded. `state` is not part of the signed message. | [S] `useSIWE.tsx:L67–97`; `ConfirmConnect.tsx:L31–60` |

- **[S]** `code` and `signature` are verifiable cryptographically. `address` alone is not.

### Re-verification options

- **`getHasValidKey(address)`**
  - **[D]** "Checks if the user has a non-expired key" (https://docs.unlock-protocol.com/core-protocol/smart-contracts-api/PublicLock, PublicLock.md:L114–120).
  - **[D]** The `onValidKeyHook` "has a final say" (public-lock/README.md:L81; hooks.md:L123–137).
  - **[S]** The paywall's client check does this with a raw `eth_call` of selector `0x6d8ea5b4` in a helper named `hasValidKey`. It returns `false` on any error, so an RPC failure looks like "not a member" (`packages/paywall/src/utils/hasValidKey.ts:L1–40`).
  - **[S]** When configured with `@unlock-protocol/networks`, that call goes through Unlock's RPC (`provider: 'https://rpc.unlock-protocol.com/137'` and `/8453`; `packages/networks/src/networks/polygon.ts:L94`, `base.ts:L104`).
- **`balanceOf`**
  - **[D]** Returns only valid, non-expired keys (PublicLock.md:L826–832; public-lock/README.md:L173).
  - **[D]** It is also subject to the valid-key hook (hooks.md:L125).
- **Locksmith key metadata `GET /v2/api/metadata/:network/locks/:lock/keys/:keyId`**
  - **[S]** Merges on-chain data (`fetchChainData`) with Locksmith-stored data (`locksmith/src/operations/metadataOperations.ts:L45–77`).
  - **[S]** Served through a cache middleware (`createCacheMiddleware`, `ttl: 300`; `locksmith/src/routes/v2/metadata.ts:L19–23`; `utils/middlewares/cacheMiddleware.ts:L16–17`). Units were not verified.
  - **[S]** Protected fields are included only for the key owner or a lock verifier (`locksmith/src/controllers/v2/metadataController.ts:L47–63`).
  - **[D]** Protected metadata is visible only to the user and lock owner (metadata.md:L34–44).
  - **[U]** No documentation calls Locksmith authoritative for validity.
- **Subgraph**
  - **[D]** The Graph indexes Unlock contracts (https://docs.unlock-protocol.com/tools/subgraph).
  - **[S]** Webhooks are driven off it (§2.9), so they inherit indexing lag. A webhook is a notification, not proof.
- **[D]** For any decision our server takes, the documented primitives are on-chain `getHasValidKey` / `balanceOf` (PublicLock.md) and the express plugin. The plugin "ensure[s] that the current visitor owns a valid membership" (https://docs.unlock-protocol.com/tutorials/back-end/backend-locking-with-express.js, L27).

---

## 4. Lock settings in the dashboard

- **[D]** "Nearly all functions available via the contract interfaces can be handled in the user interface" (https://docs.unlock-protocol.com/tools/dashboard, dashboard.md:L23–27).
- **[S]** Dashboard settings forms (`unlock-app/src/components/interface/locks/Settings/forms/`): `UpdatePriceForm`, `UpdateQuantityForm`, `UpdateMaxKeysPerAddress`, `UpdateDurationForm`, `UpdateTransferFee`, `UpdateHooksForm`, `KeyGranterForm`, `LockManagerForm`, `CreditCardWithStripeForm`, `CreditCardCustomPrice`, `CancellationForm`, `UpdateReferralFee`, `UpdateGasRefundForm`, `SubscriptionForm`, `UpdateVersionForm` and the email forms.

### Price and free

- **[D]** `updateKeyPricing(_keyPrice, _tokenAddress)` (PublicLock.md:L70–76).
- **[S]** The create form has an `isFree` toggle (`Create/elements/CreateLockForm.tsx:L106`). "Free" is simply a key price of 0. Enforced on-chain.

### `maxNumberOfKeys`

- **[D]** Set through `updateLockConfig(_newExpirationDuration, _maxNumberOfKeys, _maxKeysPerAcccount)`. It "can't be smaller than the existing supply" (PublicLock.md:L89–112).
- **[D]** Set it to 0 to disable purchases (minting-keys.md:L15–17).
- **[D]** It does not limit `grantKeys` (minting-keys.md:L27).
- **Enforced by the contract.**

### `maxKeysPerAddress`

- **[D]** Defaults to 1, changeable (public-lock/README.md:L17; PublicLock.md:L95–112). Enforced on-chain.

### Duration

- **[D]** `expirationDuration`; changing it does not affect existing keys (PublicLock.md:L95–101).
- **[S]** The create form asks for it "In days", with an unlimited option (`CreateLockForm.tsx:L225–267`).

### Transfers and soulbound

- **[D]** A 100% transfer fee disables transfers, making the key soulbound. Lock managers can still transfer keys (https://docs.unlock-protocol.com/core-protocol/public-lock/transfers, transfers.md:L35–39).
- **[D]** Expired keys cannot be transferred (transfers.md:L9–11).
- **[D]** Only the key manager can transfer (transfers.md:L13–21).

### Hooks

- **[D]** Seven hooks exist (onKeyPurchase, onKeyCancel, onValidKey, onTokenURI, onKeyTransfer, onKeyExtend, onGrantKey), registered with `setEventHooks`. If a purchase-hook function fails, "the whole purchase will revert" (https://docs.unlock-protocol.com/core-protocol/public-lock/hooks, hooks.md:L12–20, L74–87, L170–190).
- **[S]** Dashboard presets for the purchase hook: Password, Captcha, Guild.xyz, Discount code, Gitcoin Passport, Allow List and Custom Contract (`UpdateHooksForm.tsx:L63–109`).

### "Daily cap" or rate limit

- **Not found [U].** No dashboard form, `paywallConfig` key or hook contract implements a per-day mint limit.
  - Searched: dashboard settings forms, `packages/core/src/schema.ts` and `smart-contracts/contracts/hooks/*.sol`. A grep for `daily`, `per day` and `rate limit` returned only a placeholder string, "Daily NFT membership lock" (`locks/metadata/AdvancedForm.tsx:L44`).
- **[U]** Candidates for the "50" the owner recalls. None is a daily cap, and I have not picked one:
  - The dashboard bulk airdrop `MAX_SIZE = 50` (`members/airdrop/AirdropBulkForm.tsx:L17`). The airdrop guide says "you can only upload up to 50 recipients at a time" (https://unlock-protocol.com/guides/how-to-airdrop-memberships/).
  - `maxNumberOfKeys = 50`.
  - A password-hook cap.
  - A discount-code cap.
- **[S]** The only time-windowed limit found is Locksmith's IP rate limit on the claim API: 10 requests per 5 minutes per IP (`locksmith/src/routes/v2/claim.ts:L9–14`). Unlock enforces it, not the contract.

### Approvals and allowlists

- **[D]** Allow List hook (https://unlock-protocol.com/blog/unlock-labs-feature-announcement--allow-list-hook, 2025-01-09).
- **[S]** `AllowListHook.sol` exists. Allow-list, password and promo values are stored in Locksmith lock settings (`locksmith/src/models/lockSetting.ts:L24–26`) and returned only to lock managers (`lockSettingController.ts:L135–147`).

### Password hook

- **[D]** https://unlock-protocol.com/blog/password-required-hook.
- **[S]** `setSigner(lock, signer, usages)` can be called only by a lock manager. Each purchase increments a per-signer counter. A purchase reverts with `WRONG_PASSWORD` once the counter reaches `usages`. This is a **total**, not a daily, cap (`smart-contracts/contracts/hooks/PasswordRequiredHook.sol:L21–45`, `L94`).

### Who enforces caps

- **[D]** Price, `maxNumberOfKeys`, `maxKeysPerAddress`, transfer fee and hooks are enforced by the lock contract. Lock managers and key granters bypass `maxNumberOfKeys` through `grantKeys` (minting-keys.md:L27).
- **[S]** The Checkout UI and Locksmith only mirror these checks (§2.7). Anyone calling the contract directly bypasses the Unlock UI.

---

## 5. Paid off-chain purchases (PortOne)

### Credit cards

- **[D]** Stripe only: "we rely on Stripe Connect" (https://unlock-protocol.com/guides/enabling-credit-cards/, updated 2023-03-05).
  - Requirements: a USD price of at least $0.50, a currency Coinbase can price, and Unlock granted the key-granter role.
  - Fees: Stripe 2.9% + $0.30 plus Unlock's added 10%.
- **[D]** Unlock "buys the key from the lock, and then grants it to the user" (access-control.md:L23–25).
- **[S]** Checkout payment methods: `card`, `crypto`, `crossmint`, `swap`, `crosschain` and `claim` (`packages/core/src/schema.ts:L144–151`).
- **[D]** Crossmint is announced at https://unlock-protocol.com/blog/crossmint-unlock-integration.
- **No PortOne or other Korean PG is mentioned anywhere [U].**

### "Custom" or hook-based pricing

- **[D]** `onKeyPurchaseHook.keyPurchasePrice` allows dynamic pricing (hooks.md:L74–87).
- **[S]** The dashboard offers "Custom Contract" (`UpdateHooksForm.tsx:L63–69`).
- **[S]** `CreditCardCustomPrice.tsx` sets a Stripe-side fiat price (`lockSetting.creditCardPrice`, `lockSetting.ts:L14`). This applies to Stripe only.

### Locksmith claim for free locks

- **[D]** `POST /v2/claim/{network}/locks/{lock}` needs a `captcha` header and takes a body `{data?, email?, recipient?, referrer?}`. It returns `{transactionHash, owner}` (openapi.yml:L2895–2948).
- **[S] Conditions.**
  - The lock must be free.
  - The recipient must not already hold a valid key.
  - The gas must be affordable to Unlock (§7).
  - In production a Google reCAPTCHA token is required. Only one hard-coded wallet bypasses this (`recaptchaMiddleware.ts:L10–38`).
  - Requests from RU and UA are blocked by geo-restriction (`routes/v2/claim.ts:L16–24`).
  - `recipient` may be any address (`claimController.ts:L42–46`).
- **[S] Consequence.** A server-to-server claim from our backend would need a reCAPTCHA token valid for Unlock's site. **[U]** Whether Unlock issues bypasses to integrators is not documented.

### Captcha, password, Guild, Gitcoin and allowlist hooks

- **[D]** Checkout has `captcha`, `password` and `promo` options, which "work with" matching hooks (configuration.md:L55, L68–69).
- **[S] CaptchaHook.**
  - Verifies a signature over the recipient address by a signer the hook *owner* added (`smart-contracts/contracts/hooks/CaptchaHook.sol:L14`, `L23–32`).
  - The comment says it is "signature by Unlock Lab's backend service". The signer set is controlled by Unlock, not by us.
- **[D]** Guild hook: https://unlock-protocol.com/blog/guild-hook. Gitcoin Passport hook: https://unlock-protocol.com/blog/unlock-labs-feature-announcement--gitcoin-passport-hook.

### `dataBuilder`: our own off-chain data in the purchase

- **[D]** If set, Checkout "will call the URL through a proxy with `recipient`, `lockAddress`, and `network`" and passes the JSON `data` string "to the purchase function when user is claiming or buying the key as is" (configuration.md:L70).
- **[S] Mechanics.**
  - The call is `GET https://rpc.unlock-protocol.com/data?url=<our URL>?network=…&lockAddress=…&recipient=…` with a 5 s timeout (`unlock-app/src/components/interface/checkout/main/utils.ts:L8–47`; `usePurchaseData.ts:L35–48`).
  - Because the call is proxied by Unlock, our endpoint receives none of the user's cookies or session. It sees only the query parameters. **[U]** Whether the proxy forwards any other headers.
  - The `return result` sits inside the recipient loop, so only the first recipient's data is fetched (`utils.ts:L46`).

### Airdrop / `grantKeys`

- **[D]** Dashboard airdrop: one recipient at a time or CSV in batches of 50 (airdrop guide). Lock managers and key granters call `grantKeys`, choosing expiration and key manager (minting-keys.md:L25–29).
- **[S]** Dashboard airdrops are sent from the connected lock manager's own wallet, so the lock manager pays gas (`members/airdrop/AirdropDrawer.tsx:L169–181`).
- **[S] Locksmith grant API** `POST /v2/api/grant/:network/:lock`.
  - Requires an application API key whose owner wallet is a lock manager or key granter (`routes/v2/grantKeys.ts:L13–19`; `utils/middlewares/lockManagerOrKeyGranter.ts:L30–47`).
  - The transaction is sent by one of **Unlock's purchaser wallets, which must itself be a key granter on the lock** (`locksmith/src/fulfillment/dispatcher.ts:L539–553`, `L171–196`).
  - Body: `{keys:[{recipient, expiration:number, manager}]}` (`grantKeysController.ts:L9–17`). A code comment says duration and manager "are ignored for now", which contradicts the dispatcher code that uses them (`grantKeysController.ts:L44`; `dispatcher.ts:L564–574`).
  - Returns 422 if gas exceeds 5 cents (`grantKeysController.ts:L47–56`) or the purchaser lacks funds (`L58–66`).
  - On success, returns `{hash}` (`L80–82`).
  - Not in the OpenAPI spec or the docs.
  - **Unlock's purchaser address per network** is published at `GET https://locksmith.unlock-protocol.com/purchase`, which returns balances for purchaser addresses on each network.
    - **[D]** openapi.yml:L2620–2634; https://docs.unlock-protocol.com/api/locksmith/balance.
    - **[S]** The dashboard reads `data[network].address` from it and adds that address as key granter for card payments (`unlock-app/src/hooks/useKeyGranter.ts:L7–19`; `CreditCardWithStripeForm.tsx:L132–139`).
    - **[S]** `getSignerWhoIsKeyGranterOnLock` checks *all* purchasers (`dispatcher.ts:L180–196`). **[U]** Whether that endpoint lists every one.

### Documented pattern for gating a free mint behind our own off-chain check

- **[D]** No guide covers this exact case.
- **[D]** The closest documented statements:
  - Disable self-serve purchase with `maxNumberOfKeys = 0`, and mint through a key granter with `grantKeys`. Key managers should be set to avoid abuse (minting-keys.md:L15–29).
  - The key-granter role exists for "credit-card purchases, where a user pays… and then grants it to the user" (access-control.md:L25).
  - `purchase` with a different recipient is appropriate "when a payment happens off-chain (using credit card or other mechanism) and the payment provider then wants to mint" (minting-keys.md:L21–23).
  - Purchase hooks can implement "invite-only purchases" (hooks.md:L87).
  - Checkout `dataBuilder` passes site-generated data to the purchase (configuration.md:L70).
- **[D]** The password hook tutorial: https://docs.unlock-protocol.com/tutorials/smart-contracts/hooks/using-on-key-purchase-hook-to-password-protect.

---

## 6. Modal customization

- **[D] Top-level keys** (configuration.md:L42–55):
  - `locks`, `title`, `icon`, `persistentCheckout`, `referrer`, `messageToSign`, `pessimistic`, `hideSoldOut`, `expectedAddress`, `skipSelect`, `promo`.
- **[D] Per-lock keys** (configuration.md:L57–71):
  - `network`, `name`, `recurringPayments`, `metadataInputs`, `minRecipients`, `maxRecipients`, `emailRequired`, `captcha`, `password`, `dataBuilder`, `skipRecipient`.
- **[D]** `metadataInputs` entries have the shape `{name, type: text|date|color|email|url|hidden|checkbox, required, defaultValue?, value?, public?, placeholder?}`. Metadata is protected by default (collecting-metadata.md:L21–51).
- **[S] Schema keys not in the docs** (`packages/core/src/schema.ts`):
  - `redirectUri` (L179), `useDelegatedProvider` (L186), `network` (top level, L187), `endingCallToAction` (L200), `autoconnect` (L296), `recipient` (L138, L303), `paymentMethods` (L144, L309), `order` (L57), `default` (L124), and top-level duplicates of `captcha`, `password`, `emailRequired`, `dataBuilder`, `recurringPayments`, `skipRecipient`, `minRecipients` and `maxRecipients`.
  - The schema is `.passthrough()`, so unknown keys are kept.
- **CONFLICT on the `pessimistic` default.**
  - The docs say it defaults to `false` (configuration.md:L51).
  - The schema says `.default(true)` (`schema.ts:L206–212`).
  - A config passed raw in the URL skips the schema (`paywallConfig.ts:L52–61`), so `pessimistic` is unset and behaves as false.
  - A config saved through Locksmith and loaded with `?id=` passes through `PaywallConfig.strip().parseAsync` (`locksmith/src/controllers/v2/checkoutController.ts:L30`), which applies the schema default of `true`. **[S]**
  - **[U]** Which value a downloaded Checkout Builder JSON contains.
- **Styling and white-label.**
  - **[D]** Only `title` and `icon` are documented. The dashboard mentions customizing "look and feel, upload a logo" (dashboard.md:L29–35).
  - **[S]** The modal renders a fixed Tailwind shell with `TopNavigation`, `CheckoutHead(icon, title)` and a "Powered by Unlock" footer (`main/index.tsx:L246–254`).
  - **[S]** The only parent-side CSS is the iframe container class `.unlock-protocol-checkout` (`packages/paywall/src/iframe.css`).
  - **[U]** Neither the docs nor the blog mention full theming, white-labelling or an enterprise tier. Searches for "white label", "enterprise" and "theming" found only unrelated blog text. Search scope: the repo's `docs/docs` and `unlock-protocol-com/blog` only. The unlock-protocol.com/guides site was not searched, because it is not in the repo.

---

## 7. Gas and network

- **[D] Gas-free claims.** "Unlock Labs covers the gas fee" when all three conditions hold (https://unlock-protocol.com/guides/gas-free-nft-minting/, updated 2024-04-17):
  - the mint is free;
  - it is on a supported L2;
  - the purchaser holds none of the native token.
- **[D]** The 2023 blog named Polygon and Gnosis Chain (https://unlock-protocol.com/blog/gasless-minting, 2023-07-15). The 2024 guide uses Base and Polygon as examples but gives no list.
- **[S] The third condition is enforced in Checkout.** Claim is offered only if `canClaim && isReceiverAccountOnly && !balance.isGasPayable`. A user who holds gas pays it themselves (`checkout/main/Payment.tsx:L158–163`).
- **[S] Locksmith limits** (`locksmith/src/utils/keyPricer.ts:L8–35`; `utils/constants.ts:L5`):
  - A network with no `maxFreeClaimCost` gets "No free claim on this network".
  - `fullySubsidizedGas` means always affordable.
  - Otherwise the estimated cost of 350,000 gas, in USD cents, must be ≤ `maxFreeClaimCost`, and the purchaser wallet must hold enough balance.
- **[S] Network settings.**

  | Network | `maxFreeClaimCost` | `fullySubsidizedGas` | Citation |
  |---|---|---|---|
  | Polygon (137) | 100 cents | not set | `packages/networks/src/networks/polygon.ts:L72` |
  | Base (8453) | 100 cents | **false** | `base.ts:L33`, `L84` |
  | Arbitrum, Gnosis, Optimism | 100 | — | — |
  | Linea | 10 | — | — |
  | Scroll | 500 | — | — |
  | Mainnet, Avalanche, BSC, Celo | 1 | — | — |
  | Sepolia, Base Sepolia | 1000 | true | — |

  - Units are cents (`packages/types/src/types/unlockTypes.ts:L164`).
- **[S]** The grant API caps gas at 5 cents per transaction (`grantKeysController.ts:L50–56`).
- **[S] Supported networks** (`packages/networks/src/networks/`): Ethereum mainnet, Polygon, Base, Arbitrum, Optimism, Gnosis, Avalanche, BSC, Celo, Linea, Scroll, plus the Sepolia and Base Sepolia testnets.
- **[D]** The networks page renders from this same package (https://docs.unlock-protocol.com/core-protocol/unlock/networks).
- **[D] Protocol fee.** 1% since June 2024. Per-network values are on the Networks page (minting-keys.md:L31–33).
- **Polygon versus Base.**
  - **[D]** Unlock was deployed to Base in 2023 (https://unlock-protocol.com/blog/base).
  - **[D]** The DAO migrated governance to Base (https://unlock-protocol.com/blog/unlock-protocol-dao-completes-migration-to-base).
  - **[S]** Both have the same 100-cent free-claim ceiling. Neither is fully subsidized.
  - **[S]** Base deploys PublicLock v14 (`base.ts:L106`).
  - **[U]** No document compares lock-deployment cost between the two. The owner's roughly $8 deployment cost on Polygon is not explained by any source.

---

## 8. Risks and edge cases

### Rate limits

- **[S]** Claim: 10 requests per 5 minutes per IP, backed by Postgres, returning 429 (`routes/v2/claim.ts:L9–14`; `rateLimit.ts:L11–39`). Separate limiters exist on images and transfer (`routes/v2/images.ts:L14`; `routes/v2/transfer.ts:L11`).
- **[D]** The express plugin's default RPC providers may be rate limited (backend-locking-with-express.js.md:L37).
- **[U]** No documented Locksmith-wide rate limit or SLA.

### Unlock downtime

- **[S] Single points of dependency on Unlock-run infrastructure.**
  - The Checkout iframe (`app.unlock-protocol.com`).
  - The paywall CDN (`paywall.unlock-protocol.com`).
  - Unlock's RPC (`rpc.unlock-protocol.com`, the default provider and the `dataBuilder` proxy).
  - Locksmith (auth, claim, metadata, webhooks).
  - The subgraph (webhooks).
- **[S]** The paywall's key check returns `false` on error (`hasValidKey.ts:L34–39`), so an outage looks like "locked".
- **[D]** Keys and locks are on-chain and readable without Locksmith (locksmith README.mdx:L6).
- **[D]** "The core team, the DAO, or anyone else are **not** able to upgrade locks" (deploying-locks.md:L58).

### Users who lose their Unlock Account

- **[D]** A lock manager can transfer even a soulbound key, "handy… when a user loses access to their wallet" (transfers.md:L39).
- **[S]** Unlock Accounts are Privy accounts, so recovery depends on Privy login (`PrivyProvider.tsx`).
- **[U]** No Unlock documentation covers account recovery or Privy wallet export.

### Email changes

- **[S]** Walletless email keys are bound to a hash of `{email, lock}` (`KeyManager.ts:L170–176`). A new email therefore derives a different address.
- **[S]** Privy accounts are keyed by login method, so a new email can mean a new Privy user and a new wallet (`PrivyProvider.tsx:L198–223`). **[U]** Privy's account-linking behaviour inside Unlock's app was not verified.
- **[S]** User metadata (including email) is per user and lock, and does not transfer with a key. **[D]** https://docs.unlock-protocol.com/tools/locksmith/metadata (metadata.md:L22–29).

### Other

- **[S]** Unlock can unilaterally disable claims for a lock through a hard-coded list (`claimController.ts:L24–26`, `L74–83`).
- **[S]** The captcha hook signer is owned by Unlock (`CaptchaHook.sol:L14`).
- **[S]** The Checkout UI does not tell the parent page about failures, sold-out locks or network problems (§2.6–2.8).

---

## What we control

- **[D] Lock contract configuration**, as a lock manager: price, currency, duration, `maxNumberOfKeys`, `maxKeysPerAddress`, transfer fee, hooks, lock managers and key granters, metadata, and upgrades. Unlock cannot upgrade our lock. Sources: PublicLock.md, hooks.md, access-control.md, deploying-locks.md:L58.
- **[D] Who may mint outside `purchase`.** The key-granter role. Granting it to Unlock for card payments can be revoked "at any point" (enabling-credit-cards guide).
- **[D] Checkout configuration:** the documented keys in §6.
- **[S] Our endpoints:** the `redirect_uri` / `redirectUri` handler, any `dataBuilder` endpoint, and a webhook callback with its HMAC secret.
- **[D] Server-side verification:** SIWE signature recovery and the domain, nonce and time checks (README.md:L70–78), plus our own on-chain reads (`getHasValidKey`, `balanceOf`) through any RPC we choose.

## What Unlock controls

- **[S]** The Checkout UI and its event payloads.
- **[S]** Privy-based accounts and wallet creation.
- **[S]** SIWE message construction, including the nonce and domain.
- **[S]** Locksmith authentication, rate limits, captcha and geo rules.
- **[S]** Free-claim gas sponsorship and its ceilings.
- **[S]** Purchaser wallets for claims and grants.
- **[S]** The webhook poller and its reliability.
- **[S]** The RPC proxy.
- **[S]** The hard-coded list of locks with claims disabled.

---

## Open unknowns to test empirically

1. **Real on-chain state of the owner's lock.** Read `maxNumberOfKeys`, `maxKeysPerAddress`, `keyPrice`, `expirationDuration`, transfer fee, hook addresses, lock managers, key granters and `publicLockVersion`. This identifies the "cap 50" and confirms whether the lock is self-serve.
2. **The owner's downloaded Checkout JSON.** Does it contain `pessimistic`? Which keys did the builder emit?
3. **SIWE `code` on our domain.**
   - The actual `domain`, `uri` and `resources` in `d`.
   - Whether `state` is echoed and signed; it appears unsigned.
   - The `state=null` behaviour.
   - Whether the Privy-created wallet's signature verifies with `verifyMessage` (EOA) or needs EIP-1271 or ERC-6492.
4. **Whether a returned `code` can be exchanged at `POST /v2/auth/login`** for a Locksmith session. This is a source-only inference (§2.1).
5. **Email login inside the embedded paywall.** Is it actually offered, contrary to the docs (§1.1)?
6. **Event sequence on a real mint**, in optimistic and pessimistic modes: two `transactionSent` events and the timing of `tokenIds`. Also the behaviour on a reverted mint.
7. **Webhook delivery.**
   - Latency from mint to POST.
   - Behaviour when our endpoint is down: is the event lost?
   - Whether the tutorial's `FormData` subscription body is accepted.
   - The re-subscription cadence.
8. **Locksmith grant API.**
   - Whether integrators may use it for our lock.
   - Confirm that the address returned by `GET /purchase` for our network is the one the grant dispatcher signs with (§5).
   - Behaviour under the 5-cent gas cap on Polygon versus Base.
9. **Free-claim sponsorship in practice** on our network: does `can-claim` return true, and how often does it fail on "Gas costs too high" or purchaser balance?
10. **`dataBuilder` proxy:** which headers and source IP reach our endpoint, and whether caching or retries occur.
11. **Behaviour past the cap:** the actual revert reason and how the Checkout UI shows it.
12. **Account loss and email change:** what Unlock support or Privy allow (wallet export, linking a new email).
