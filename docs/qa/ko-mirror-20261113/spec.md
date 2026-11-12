# SPH-I18N-KOMIRROR-20261113-01 — Korean catalogue mirrors English, with English fallback

Slug `ko-mirror-20261113`, branch `codex/ko-mirror-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these changes:

- Your identity base is **the main commit that adds this file**.
- This assignment explicitly owns `messages/ko.json`. That overrides the shared rules'
  `ko.json` prohibition for this assignment only.
- Persist your handback as `docs/qa/ko-mirror-20261113/handback.md`.
- Another Markdown-only Codex worker is running, so check headroom before every Node
  workload.

**Owner decisions, 2026-11-13:**
- `messages/ko.json` must mirror `messages/en.json` exactly: the same literal JSON
  structure, the same key paths and order, and every value a string, which may be empty.
- The owner activated the reserved **empty-Korean-output fallback breakpoint**: an empty
  Korean string shows the English text. Nothing is translated or invented.

Read `docs/reference/i18n-consolidation-plan.md` ("Explicit owner breakpoint"),
`src/i18n/messages.ts`, `src/i18n/request.ts` and `tests/i18n/`.

**Owned paths:**
- `messages/ko.json`
- `src/i18n/messages.ts`
- `tests/i18n/catalog-contract.test.ts` and `tests/i18n/next-intl.test.ts`
- the "Canonical UI copy and Korean authoring policy" section of `AGENTS.md`
- the breakpoint section of `docs/reference/i18n-consolidation-plan.md`
- `docs/qa/ko-mirror-20261113/`

`messages/en.json` must stay byte-identical.

## Change

1. **Mirror.** Regenerate `ko.json` from `en.json`'s structure, using the Python
   standard library or an equivalent one-off script recorded in the handback rather
   than committed as a tool.
   - Keep the same key order and the same formatting: 2-space indent, UTF-8 without
     `\u` escapes, and a trailing newline.
   - Each of the 175 existing Korean values stays byte-identical, including values that
     are currently English text.
   - Every key that is new to Korean gets `""`.
2. **Fallback.** Build `messagesByLocale.ko` so that an empty Korean string yields the
   English value. Use the installed library first, for example lodash-es `mergeWith`
   with a customizer that keeps the English value when the source is `""`, and record
   the alternatives you checked. Do not add a translation wrapper or a second API.
   - The fallback must apply to every consumer: client hooks, server
     `getMessages`/`getTranslations`, ICU messages and rich messages.
   - Missing-key diagnostics and protocol codes must not change.
3. **Rules.** Rewrite the AGENTS.md section to say:
   - `ko.json` mirrors `en.json` (same keys and order, string values, `""` when
     untranslated);
   - any change that adds, renames or removes an English key makes the same structural
     change to `ko.json` in the same commit, with `""` for new keys;
   - existing Korean text is never overwritten, auto-filled or translated without an
     owner translation request;
   - an empty Korean string displays English.

   Update the plan's breakpoint section to record the 2026-11-13 activation.

## Acceptance

1. **Shape.** A test fails if `ko.json` and `en.json` differ in key paths, key order
   or value type, or if any value is not a string. A second test proves the 175
   pre-existing Korean values are unchanged; take the baseline from main's current
   `ko.json`, whose SHA-256 is `44d2db28…a2e8`. `en.json` is byte-identical.
2. **Fallback.** Tests prove that:
   - an empty Korean value renders the English text, for a plain message, an ICU
     message with arguments and a rich message;
   - a non-empty Korean value still wins;
   - a key absent from both locales still produces next-intl's missing-key behaviour.

   Full typecheck exits 0, using the shared rules' limits or, at most twice,
   `--max-gib 3.5 --node-old-space-mib 2048 --timeout 600`. The default suite shows
   only the 2 known deferred-styling failures.
3. **Live render.** Render one real surface in the `ko` locale through an existing
   loopback preview or a guarded dev server with no DB and no provider. Capture a
   screenshot showing at least one Korean string and one English-fallback string with
   no blank text, and store it under `docs/qa/ko-mirror-20261113/`.

Commit as new commits only. Send one `worker_done`.
