# Handoff to Codex, 2026-11-17

From the Claude custodian session (Orca terminal `term_6ee8650f`, peer name `sphmrs-3b`). The owner asked Codex to take over. Read `AGENTS.md` first: every rule there still applies.

## 1. Ownership: needs the owner's word

- `AGENTS.md` names `term_6ee8650f` as the only session that commits, merges and pushes `main` in `~/Projects/sphmrs`, and the only writer of the live plan. That line has to change to name the Codex session before Codex writes `main`. The owner should confirm the new owner and its durable mailbox (`run:<id>` or `dispatch:<id>`).
- **Live plan:** <https://claude.ai/artifact/Bt65UugGE56CBfTSRnXKkf>. It's a Claude Docs document with three tabs (Plan, Rules, History), and Codex cannot edit it. The repo copy `docs/qa/auth-payment-nfc/consolidation.md` (kept in step on `codex/auth-payment-nfc` and `main`) is the fallback. The owner decides whether the repo copy becomes the only plan or a Claude session keeps the live doc.
- **`codex/auth-payment-nfc`:** owned by the auth custodian session `sphmrs-3a`, worktree `~/.codex/worktrees/main-history-integration/sphmrs`. Don't work in that worktree. Mechanism work goes on a worker branch cut from it, in your own worktree.

## 2. State at handoff

| Where | State |
|---|---|
| `main` | `ae81be4b`, pushed, in sync with origin. Dirty in the owner folder, not from this session, and left alone: modified `.gitignore`, untracked `docs/qa/resume-20261112/final-delivery/*`. |
| `codex/auth-payment-nfc` | `ec88a2e9` on origin (the Korean copy slice, merged by `sphmrs-3a`). |
| `codex/nav-restore` | Worktree `~/orca/workspaces/sphmrs/nav-restore`. 5 commits ahead of `main`, not merged; see §3. |
| Local branch `codex/copy-pass-auth-20261117` | Merged into `origin/codex/auth-payment-nfc`. Its worktree is removed; the branch is still there because a hook blocked `git branch -D`. Safe to delete. |
| Port 3000 | Held by the `hamlet` session's preview at handoff. Check `lsof -iTCP:3000 -sTCP:LISTEN` and ask its owner; never stop it yourself. |

## 3. Warp intro on `codex/nav-restore`: in progress

The owner wants the pre-Warp intro to feel like Analogue's (analogueagency.com): the passage rolls with the page 1:1, like film credits, and the split headline never looks as if it might collide with it. Analogue's Framer source is in the owner's `.tmp/analog` folder: the main bundle, TextWave, Warp, jump-to, menu and cursor.

Commits ahead of `main`, oldest first:

1. `172f4a22`: continuous easing between beats, with no dead stretches and no 1% cuts.
2. `75f855d9`: the passage rolls like credits.
3. `77c3be97`: Analogue's mechanics.
   - The passage moves 1:1 with scroll: `passageTravel` is linear and its distance equals its scroll window.
   - Words appear one by one (opacity 0.001 → 1, scale 0.9 → 1, 0.5s, ease `[0.44,0,0,1]`, 35ms stagger) when progress passes `passageLine1` / `passageLine2` starts. They reset below `passageTravel.start`.
   - The headline shrinks to 0.5 by 18% and splits linearly to 54%, both through a spring (damping 60, stiffness 500, mass 1).
   - The passage is 40vw wide on desktop. On phones the headline fades as the passage arrives.
4. `43739803`: two-stage split, so no collision. The words spread 15vw with the shrink, then 7vw more linearly. At 878px wide the passage clears each word by 54–57px while it crosses the row; it used to overlap by up to 7px.
5. `08ab5c4d`: formatting only.

Key files:
- `src/components/Warp/_shared/sequence-editor.ts`: default clip timings.
- `src/components/Warp/sequence.ts`: the mappers.
- `src/components/Warp/index.tsx`: springs, spread and passage words.
- Tests: `tests/warp/*`, 151 passing at `43739803`.

Open, in the owner's order:

1. **The owner reacts to the pre-Warp intro.** Nothing since `77c3be97` has been seen by the owner. Most of the outward move now happens by 18%, then a slow drift, which is Analogue's profile. Earlier the owner said the split felt too fast and too brief, so ask.
2. **Not verified live:** phone width (Orca's built-in browser wouldn't resize) and wide desktop (on paper, ~65px clearance at 1440px).
3. **Next:** post-Warp step pacing (deferred until the owner reacts). Holds are far longer than transitions (about 320–360svh against 20svh) and drag. The step geometry is fed to `src/components/teaser/experience.tsx` (`geometry.heightVh`).
4. **The owner will tweak the chapter-nav / menu-frame overlap themselves.** Don't touch it.

Geometry check: `~/orca/workspaces/sphmrs/_archive/copy-pass-20261117/warp-geometry-check.js`.
- It steps the runway 0–44% overall and prints each word's edge, the passage span and opacity.
- It flags `collisionAt` when the passage overlaps the headline row without fitting the gap.
- Run it with `orca eval --page <id> --expression "$(cat warp-geometry-check.js)"` on a page at `/`.

Preview: from the worktree, `PATH=$PWD/node_modules/.bin:$PATH pnpm dev` (guarded, port 3000, preview auth). A plain `next dev` returns 503 for preview auth. The guard has stopped previews when system headroom fell below 10 GiB because of other apps; the receipt's `reason` says which. Relaunch only after diagnosing.

## 4. Korean copy pass: done, owner items open

The owner asked for this on 16 Nov ("translate everything"; "apply clear fixes"; tone and meaning changes go to the owner).

**Landed:**

| Where | Commit | Filled | Restored to the English meaning |
|---|---|---|---|
| `main` | `ae81be4b` | 641 | 2 |
| `codex/auth-payment-nfc` | `ec88a2e9` (auth, verification, commerce and ticket copy, whose consuming code that branch owns) | 401 | 8 |

**Method:**
- Codex drafted the customer and shared copy; Gemini drafted the staff, developer and sign-in copy. Each cross-reviewed the other, and Claude adjudicated.
- Korean always follows the *current* English.
- Terms used throughout:

  | English | Korean |
  |---|---|
  | ticket | 입장권 (counter 장) |
  | event | 행사 |
  | check-in, the action | 입장 확인 |
  | checked in / not checked in, the state | 입장 완료 / 입장 전 |
  | Reading | 읽을거리 |
  | privacy policy | 개인정보 처리방침 |
  | back-to-shop link | 상품 안내로 돌아가기 |
  | ending a payment attempt | 종료 (never 취소 or 환불) |

**Open:**
- **[`copy-owner-items.md`](copy-owner-items.md)** lists 25 English rewrites the reviewers proposed but nobody applied, mostly payment, invitation and attempt wording. It also lists 45 questions they raised.
- **Behaviour bugs found by reading the source:**
  - the account panel rows (Profile, Settings, Tickets, Your posts) link to `/read`;
  - header "Sign out" only closes the panel;
  - "Check In" goes to `/account`;
  - "MMS verified" shows whenever a phone number exists.
- Checkout and invitation copy still describes coins, optional registration and email-code sign-up for new visitors, which contradicts owner decisions. It was translated faithfully, not rewritten.
- **Held with empty Korean** (English fallback) because their meaning is undecided: order admissions and staff-schema "claimed" and "available".
- **Follow-up:** `codex/wallet-activation-20261116` will merge into `codex/auth-payment-nfc` with new welcome and account-tray keys whose Korean is "". They need a Korean fill (`sphmrs-3a`'s heads-up).
- **When `main` next merges into `codex/auth-payment-nfc`:** `tests/i18n/catalog-contract.test.ts` will conflict on the mirror rule. Keep the mechanism branch's version; it keeps the exact `ownerRequestedKorean` check.

**Evidence:**
- Location: `~/orca/workspaces/sphmrs/_archive/copy-pass-20261117/`.
- `inputs/`: the brief, the cross-review brief and the batch files.
- `outputs/`: every reviewer output, the adjudication scripts and `decisions*.jsonl`.

**Reviewer harness:**
- Wrapper: `~/.claude/bin/codeagent-wrapper --lite --backend codex|antigravity`.
- Gemini (the `antigravity` backend) can't read files outside its working tree, so copy inputs inside first.

## 5. Other work handed to Codex

- **`/welcome` card design:** a separate handoff from `sphmrs-3a`, at `docs/qa/welcome-card-handoff-20261117/handoff.md` on `codex/auth-payment-nfc` (`b6625795`). It's mechanism-branch work, so use a worker branch cut from that branch.

## 6. Other open offers

- Deleting the 14 unused stock shadcn components. The owner hasn't answered. If yes: a new branch, tests before and after.
