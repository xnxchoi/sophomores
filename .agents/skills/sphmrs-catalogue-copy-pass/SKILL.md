---
name: sphmrs-catalogue-copy-pass
description: "Use when translating or polishing Sophomores copy in messages/en.json or messages/ko.json — the project's terms, ownership routing, tests and tooling on top of the general multi-model-catalogue-copy-pass method"
metadata:
  origin: auto-extracted
---

# Sophomores catalogue copy pass

**Extracted:** 2026-11-17, from the owner-requested Korean pass (main `ae81be4b`, `codex/auth-payment-nfc` `ec88a2e9`).
**Extends:** the global `multi-model-catalogue-copy-pass` skill. Follow its method; this file adds only what is specific to this repo.

## Before you start
- Read `AGENTS.md` (the canonical UI copy and Korean authoring policy, one writer per checkout, the resource guard) and load `ux-writing`, including its Korean branch.
- Have reviewers read `docs/design/identity.md`, `docs/design/brand-voice.md` and `docs/reference/korean-copy-passes/` (`learning-instincts.md` and the pass records). The pass records hold owner-calibrated Korean.
- Translating or rewriting existing Korean needs an explicit owner request. The structure of `messages/ko.json` must mirror `en.json` exactly: same key paths and order, with `""` for untranslated keys (they fall back to English).

## Terms (used across the 17 Nov pass)
| English | Korean |
|---|---|
| ticket | 입장권 (counter 장) |
| event | 행사 |
| check-in, the action | 입장 확인 |
| checked in / not checked in, the state | 입장 완료 / 입장 전 |
| Reading | 읽을거리 |
| privacy policy | 개인정보 처리방침 (statutory spacing) |
| back-to-shop link | 상품 안내로 돌아가기 (pass 3 C30 / pass 4 D41) |
| ending a payment attempt | 종료 (never 취소 or 환불) |
| Kakao button | Login with Kakao / 카카오 로그인 (owner, 16 Nov) |

- **Registers:** customer copy uses polite 해요체. Staff and developer copy is concise and neutral (합니다 / 하세요).
- **Untranslated names:** Sophomores, Signet, The Hideaway, LOSTINSEOUL, Unlock, PortOne, Safe, Polygon, Base, KakaoPay, NaverPay, and the teaser chapter titles.

## Routing
- **Mechanism-owned copy:** copy read by code under the `codex/auth-payment-nfc` owned paths goes on a worker branch cut from that branch. Merges into that branch go through its owner session. This covers:
  - the AuthPhase, AuthCards, MemberAuth, PreviewAuth, Verification and VerificationTrial namespaces;
  - `Customer.components_{commerce,tickets}_*`;
  - the shop payment, orders and invitation pages.
- **Everything else** goes to `main` through the custodian.
- **Staff copy:** `Staff.schema.*` labels are read as English constants by Payload, so their Korean has no runtime effect.

## Tests that pin catalogue state
- `tests/i18n/catalog-contract.test.ts`:
  - the mirror rule, plus `ownerRequestedKorean` for word-for-word owner values;
  - the 175-string byte-identical baseline (update the baseline when the owner approves a fix);
  - the plural test.
- `tests/i18n/next-intl.test.ts` and `tests/i18n/copy-loop-public.test.ts`.
- Owned tests: `tests/authentication/*` and `tests/phone-verification/phone-verification-i18n.test.tsx` (its placeholder regex must ignore plural option text).

## Tooling
- **Reviewers:** `~/.claude/bin/codeagent-wrapper --lite --backend codex|antigravity` with a `ROLE_FILE` and the brief. Keep the inputs inside the worktree.
- **Tests:** guarded, using the runner's own setup: `python3 scripts/resource-guard.py … -- node tests/run-unit.mjs --functional`. For a subset, also pass `--import tsx --import ./tests/support/css-modules.mjs --test-concurrency=1` with `TSX_TSCONFIG_PATH`.
- **One guarded job per checkout:** stop the preview first. A "system headroom exhausted" stop with a small job peak means other apps took the memory. Diagnose it, then rerun narrower.
- **Fresh worktrees have no `node_modules`:** symlink the main checkout's `node_modules`. It lacks the mechanism branch's newer dependencies (viem and others), so those suites fail there at baseline.
- **Last pass's evidence:** `~/orca/workspaces/sphmrs/_archive/copy-pass-20261117/`, holding the briefs, batches, outputs, the adjudication scripts and `apply.py`. The open owner items are in `docs/qa/handoff-20261117/copy-owner-items.md`.
