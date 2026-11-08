# Repository curation and selective integration

Last updated: 2026-10-22.

## Classification rule

**Relevant** means production source or something expected to help future development, including human-readable reference material. **Irrelevant** means regenerable session output with no continuing development role. Classification is not blanket deletion permission: private state and rollback records require separate handling.

| Bucket | Paths / material | Handling |
| --- | --- | --- |
| Relevant — production | `../src/app`, feature components, `../src/hooks`, `../src/lib`, runtime assets in `public/`, shared styles/configuration | Integrate with dependency closure and regression checks. |
| Relevant — reusable development | `../src/components`, `/studies/flame-envelope`, accepted `/studies/flame-reference` material reference, `scripts/export-flame-envelope.ts`, mask asset generation, durable tests | Preserve in Git even when not part of the public product. |
| Relevant — design source | `design/flame-envelope/`, `design/references/` | Editable artwork, original recordings, and external reference captures; not deployable/licensed product assets by default. |
| Relevant — human reference | `docs/reference/`, `docs/qa/`, module READMEs and operational runbooks | Preserve dated decisions, useful QA procedures, and limitations. Historical counts/line numbers are not current acceptance. |
| Relevant — operations source | `deployment/` Dockerfiles, local configuration, `ops/`, runbooks; `scripts/deployment/` | Keep operational inputs; the directory name alone does not make a file disposable. |
| Irrelevant — generated outputs | `artifacts/` screenshots, local preview captures, fetched benchmark bundles, temporary fixtures, release archives, `.next*`, coverage/test reports | Exclude from the integration after extracting durable notes/source. Regenerate when needed. |
| Irrelevant to merge, protected locally | `.deployment/runs/`, `.deployment/operations/` | Preserve rollback/recovery state; never recursively delete `.deployment/` merely to clean Git. |
| Private local state | `.env.local`, `.env.template`, credentials, local service/session records | Keep ignored and out of commits; do not inspect or publish secret contents. Use placeholder-only examples when needed. |

## Study-only experiments

Rejected `../src/app` and `../src/app` experiments remain on `studies`, not selected for `main`. This does not remove the accepted material reference or the approved mask editor. Moving a prototype into a feature folder does not imply its design is approved for production. Entry-animation, invitation and ticket prototypes remain gated by their documented product/design decisions.

The accepted footer and editor share `flame-backdrop/field/`. Production rendering must not import an experiment route. Feature organization separates reusable rendering, developer tooling, feature UI, domain logic, and route entry points rather than naming components after agent sessions.

## Durable material extracted from artifacts

- Reference integration specification → `docs/reference/integration-specification.md`.
- Local/Blink source observations → `docs/reference/benchmark-2026-10-03/`.
- Motion migration, repair history, phone-verification QA → `docs/qa/`.
- Phone-verification browser checks → `tests/browser/phone-verification.mjs` (relocation only; no logic changes).
- Original Analogue recordings, Blink reference stills and external captures numbered 01–18 → `design/references/`.
- Local generated reference-integration captures numbered 20–38 are not source artwork and need not be retained.

Historical source inventories cite captured source line numbers. Downloaded third-party bundles are not retained as product dependencies; reconstruct the dated capture before treating those references as reproducible evidence. New screenshots/build reports belong in ignored output directories, not beside durable docs.

## Integration checkpoint — 2026-10-22

- Source: `studies` commit `28750f1`; earlier editor-preservation checkpoint: `030dbff`.
- The selective tree on `main` excludes exactly nine source/test files: everything under `../src/app` and `../src/app`, plus `tests/aurora-silk-study.test.ts` and `tests/flame-mask.test.tsx`. Those experiments remain preserved on `studies`.
- Removed 1,304 generated artifact/visual-output files (338.3 MiB). Retained `.deployment/runs/`, `.deployment/operations/`, and operational `deployment/` source.
- Native Illustrator artwork is preserved. Further Illustrator work stopped at the user's request.
- This records the selected tree before the integration commit; it is not deployment or visual-acceptance evidence.

## Selective integration procedure

1. Record the `studies` checkpoint before cleanup and preserve unrelated user changes.
2. Review an explicit source-path allowlist and its imports/assets/configuration, not a broad `git add .`.
3. Commit coherent changes on `studies`, keeping rejected experiment-only changes separable.
4. Apply only the approved production and durable-development changes to `main`; check removed experiment links/imports as well as copied files.
5. Run focused tests, TypeScript/build checks, and browser checks separately. Unit success is not visual, physical-device, provider, or deployment proof.
6. Leave `main` checked out only after integration succeeds. No deployment is implied by merging.

## Security caveat

Security review recorded `GHSA-vfj7-8cjw-p6xm` through transitive `braces@3.0.3`, with no published patch at review time. Identified chains are build/developer CLI tooling (`shadcn`, `ts-morph`, `next-sitemap`, ESLint); no attacker-controlled application glob usage was found in that review. This is **not a clean dependency audit**. Recheck advisory status and dependency paths before a release; do not silently waive the finding.
