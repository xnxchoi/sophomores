---
name: sphmrs-personal-data-pages
description: Use when building, changing or reviewing any Sophomores page or route handler that shows personal data (receipts, orders, account, tickets, invitations, wallet, member status). Baseline web-security checklist the owner treats as standard, not research. Reviewers fail a change that exposes personal data or alters its lifecycle without these safeguards.
---

# Personal-data pages: the baseline

Owner, 23 Nov 2026, verbatim: "Isn't this like web security 101? Why are we like treating this like some pioneering shit?"

Context: the receipt page shipped with `no-store` but no persisted-`pageshow` check, and turns went to probing Chromium's back-button cache instead of applying the standard defence. Build these patterns in from the first edit. Load `ecc:security-review` alongside this skill; that skill covers auth, input and CSRF, but not the caching and back-button items below.

## Checklist (all required)

1. **No caching of private responses.** Send `Cache-Control: private, no-store` on the page and on every route handler or server action response that returns personal data.
2. **Back-forward cache.** Add a `pageshow` handler: when `event.persisted` is true, hide private content at once and re-check the session before showing it again (or reload).
3. **Sign-out and account switch** clear every client copy: query caches, form state, `sessionStorage`/`localStorage` entries and in-memory stores.
4. **No personal data in URLs.** Nothing personal in the path, query string or hash, including ids that reveal a person, emails, phone numbers and order details.
5. **CSRF and cookies.** Mutations are CSRF-protected; session cookies are `HttpOnly`, `Secure` and `SameSite` (Lax or Strict).
6. **Proof is deterministic.** Tests show that *our code reacts* correctly: the header is set, the handler hides and re-checks, sign-out clears. Do not make browser-behaviour experiments the gate (ADR-0015: tests never block progress).

## Where it applies

The trigger is what the change does, not where the file lives. It applies when a change **exposes personal data** (a page, route handler, server action, email or export that returns or renders it) or **alters its lifecycle** (how it is collected, stored, cached, shared, retained or deleted). Personal data here means anything that identifies a member or reveals their orders, tickets, invitations, wallet, contact details or membership status.

Most such changes sit in the mechanism-owned paths (AGENTS.md, "Auth, payment and token mechanisms"), but a change there that touches no personal data (a rate limit, a copy tweak, a refactor with the same output) does not trigger the checklist. A page elsewhere that reads member or order state through the server helpers does.

## Review

Codex Review-A/B: FAIL a change that exposes personal data or alters its lifecycle when it lacks a checklist item that applies to it (for example, a new private page without `Cache-Control: private, no-store`). Judge the safeguards in the code, not the paperwork: a missing or incomplete `Skills used:` line is a note, never a FAIL on its own.
