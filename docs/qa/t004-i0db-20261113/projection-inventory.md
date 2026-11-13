# Remediation 1 — installed adapter request inventory, before source change

Read on source HEAD `61edde818e425ca74e151c0a40407088cb23981f`.
Installed Payload, `@payloadcms/db-postgres`, and `@payloadcms/drizzle`: **3.92.1**;
Drizzle ORM: **0.45.2**. No network documentation lookup or dependency changes.

Method: TypeScript AST traversal of **832 installed runtime JavaScript files**
(excluding shipped `*.spec.js`) under the three `dist/` roots, initially finding
159 `.db` / adapter `this` call sites; supplemented by text search for aliases,
`this.adapter`, spreads, argument variables, `isolateObjectProperty`, and request
construction. Argument variables/spreads and upstream request aliases below were
read in the actual installed source. This is an installed-code inventory, not a
claim about arbitrary application hooks or future package versions.

## Non-original requests and whether this payment guard may accept them

All paths below are relative to `node_modules/`. Shapes describe **req**, not the
outer adapter argument object. `Proxy(original, …)` has the original request's
dynamic keys; it is not a finite transaction-only projection.

| Installed call / construction site | Exact request shape or identity | Decision |
| --- | --- | --- |
| `payload/dist/collections/operations/findByID.js:101-110`, passed to `db.findOne` at `:148` and `:152` | Fresh object `{ transactionID: req.transactionID }`; sole own key `transactionID` | Accept on adapter surface only when the non-empty current owned transaction ID strictly matches |
| `payload/dist/queues/operations/runJobs/index.js:69-76` → `db.find` | Fresh `{ transactionID: undefined }` | Reject: missing owned ID |
| `payload/dist/queues/utilities/updateJob.js:53-73` → `db.updateJobs` | Fresh `jobReq = { transactionID: db.name !== 'mongoose' ? await db.beginTransaction() : undefined }`; forwarded through either `args` branch at `:60-72` | Same one-key shape, but independently created/undefined ID is rejected; inner begin/commit restrictions unchanged |
| `payload/dist/kv/adapters/DatabaseKVAdapter.js:1`; adapter calls `:10` deleteMany, `:17` deleteOne, `:28` findOne, `:48` count, `:60` find, `:72` upsert | Module-scoped empty object `{}`; deliberately not caller's request | Reject: no transaction ID |
| `payload/dist/auth/operations/forgotPassword.js:75-76`, updateOne calls `:77-85` and `:114-122` | `isolateObjectProperty(req, 'transactionID')`, then `reservationReq.transactionID = undefined` | Reject: full proxy plus cleared ID, not the allowed shape |
| `payload/dist/collections/operations/restoreVersion.js:163-168`, updateOne `:242-246`, saveVersion forwarding `:253-261` | Proxy isolating `['fallbackLocale', 'locale']`, assigning `fallbackLocale = null`, `locale = validationLocale`; all other request properties delegated | Reject: full proxy, not an enumerated finite shape |
| `payload/dist/collections/operations/update.js:217-225`, forwarded to updateDocument `:270` → `payload/dist/collections/operations/utilities/update.js:236` findOne and `:312` updateOne, and its version helpers | Upload-only proxy isolating `['file', 'payloadUploadSizes']`, with `file = documentFile`, `payloadUploadSizes = {}`; otherwise `documentReq === req` | Proxy rejected; identical original request still accepted |

Only the first row justifies the new acceptance branch. The one-key shape does not
grant ownership: the existing private owner/session checks run before and after
every operation. Empty objects, extra keys, foreign/missing IDs and Local API
projections remain contaminated. Full-request proxies above stay out of scope.

## Upstream non-original Local API requests (not adapter exceptions)

- `payload/dist/database/queryValidation/validateSearchParams.js:110-120` passes
  `isolateObjectProperty(req, 'transactionID')` to `getEntityPermissions` with
  `fetchData: false`; full request proxy for access evaluation, not a finite
  adapter projection. Permission/hook code must not use it to bypass ownership.
- `payload/dist/fields/hooks/beforeChange/promise.js:137-139,183` gives localized
  validators `isolateObjectProperty(req, 'locale')`, with that locale assigned.
  Relationship filter validation forwards it through the data loader at
  `payload/dist/fields/validations.js:458-466`, whose `find` forwards arguments to
  `payload.find` at `payload/dist/collections/dataloader.js:125`. No Local API
  exception is authorized.
- `payload/dist/query-presets/preventLockout.js:17-25` constructs a new Local API
  request using `req: { user: incomingReq.user }` and
  `context: { _preventLockout: true }`; `createLocalReq` expands it to a full
  request, then `initTransaction` creates a separate transaction at `:27`.
  Neither the initial user-only object nor the expanded request is an allowed
  adapter projection or Local API exception.
- `payload/dist/queues/operations/runJobs/index.js:250` creates a transactionID
  isolation proxy for job execution. Job/hook operations can forward that full
  proxy; it does not become an allowed finite projection.
- `payload/dist/utilities/createLocalReq.js:65-108` uses supplied `req` in place
  (otherwise `{}`), including reassigning `req.payload`; this existing rebinding
  contract is unchanged. The request wrapper is not relaxed for any Local API.

## CRUD, versions and globals: audited forwarding sites

These operations pass their incoming `req` unchanged, except the explicit rows
above. A caller that already holds a full proxy is **not** thereby accepted.

| Family | Installed paths and adapter calls (under `payload/dist/`) |
| --- | --- |
| Find | `collections/operations/find.js:112` queryDrafts, `:136` find; `findByID.js:121,135` queryDrafts use original req while its two findOne calls use the projection above; `findDistinct.js:220` findDistinct |
| Count | `collections/operations/count.js:59` count; `countVersions.js:55` countVersions |
| Create | `collections/operations/create.js:291` create; `auth/strategies/local/register.js:66` create |
| Update | `collections/operations/update.js:164` queryDrafts, `:178` find; `collections/operations/utilities/update.js:236` findOne, `:312` updateOne; updateByID delegates to the same updateDocument helper |
| Delete | `collections/operations/delete.js:77` find, `:149` deleteOne; `deleteByID.js:55` findOne, `:127` deleteOne |
| Collection versions | `collections/operations/findVersionByID.js:71` findVersions; `findVersions.js:85` findVersions; `restoreVersion.js:42` findVersions and `:90-101` findOneArgs retains req (later validation proxy noted above) |
| Globals | `globals/operations/findOne.js:61` findGlobal; `update.js:261` findGlobal, `:313` updateGlobal, `:320` createGlobal; `restoreVersion.js:39` findGlobalVersions, `:97,106` findGlobal, `:114` updateGlobal, `:120` createGlobalVersion, `:129` createGlobal |
| Global version reads/counts | `globals/operations/findVersionByID.js:45-60` findGlobalVersionsArgs contains original req; `findVersions.js:57` findGlobalVersions; `countGlobalVersions.js:52` countGlobalVersions |
| Version helper argument variables/spreads | `versions/saveVersion.js:34-55` createVersionArgs includes req for createVersion/createGlobalVersion; `saveSnapshot.js:9-33` sharedCreateVersionArgs includes req in both spreads; `updateLatestVersion.js:9-31` findVersionArgs includes req for both reads, `:53,59` updateVersion/updateGlobalVersion and `:78,92` fallback reads also retain req; `enforceMaxVersions.js:44-53` deleteVersionsArgs retains req |
| Other version helpers | `versions/deleteCollectionVersions.js:3` deleteVersions; `deleteScheduledPublishJobs.js:4` deleteMany; `getLatestCollectionVersion.js:34,47` findVersions/findOne; `getLatestGlobalVersion.js:17,26,32` findGlobalVersions/findGlobal; `enforceMaxVersions.js:11,22` version reads; `versions/drafts/replaceWithDraftIfAvailable.js:72-89` shared findVersionsArgs retains req for both global and collection reads |
| Preferences | `preferences/operations/findOne.js:26` find; `update.js:35` upsert; `delete.js:28` deleteOne |

## Adapter-internal forwarding and deliberately requestless calls

- `@payloadcms/drizzle/dist/upsert.js:1-10` forwards the original destructured
  `req` to `this.updateOne`. No new request shape is constructed in the installed
  Postgres/Drizzle adapter CRUD/version/global methods.
- Drizzle's `utilities/getTransaction.js` resolves the provided transaction ID
  against its sessions; request-preserving entrypoints pass that same `req`.
  Internal `countDistinct`, `deleteWhere`, execute/upsert-row helpers take an
  already selected `db`/transaction, not a newly projected request. The guard
  still invokes underlying adapter methods with their original target as `this`.
- `@payloadcms/drizzle/dist/utilities/blocksToJsonMigrator.js:191,206,216,225`
  forwards its incoming req to updateOne/updateVersion/updateGlobal/
  updateGlobalVersion. Its independent collection phase omits req for count
  `:275`, countVersions `:280`, countGlobalVersions `:289`, find `:319`,
  findVersions `:348`, findGlobal `:376`, findGlobalVersions `:397`.
- Payload deliberately omits req in `utilities/checkDocumentLockStatus.js:45`
  (`find`); its `deleteMany` at `:67-70` passes undefined for Mongoose but original
  req for Postgres. `auth/strategies/local/incrementLoginAttempts.js:11,38,63,103`
  (`updateOne`) and `:81` (`findOne`) omit req. So does
  `queues/operations/runJobs/index.js:414` (`deleteMany`). These are **not**
  permission to use an unscoped pool inside payment ownership.
- Lifecycle/DDL/transaction methods (`init`, `connect`, `destroy`, migration,
  begin/commit/rollback) are not request projections. Installed migration runners
  create their own `createLocalReq({}, payload)`; they do not borrow a payment
  request. No lifecycle or transaction-end check is changed by this remediation.

This inventory records broader installed paths that remain rejected; it does not
promise that every Payload operation is supported within a financial transaction.
