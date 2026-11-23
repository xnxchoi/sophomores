---
name: sphmrs-personal-data-pages
description: Use when building, changing or reviewing any Sophomores page or route handler that shows personal data (receipts, orders, account, tickets, invitations, wallet, member status). Baseline web-security checklist the owner treats as standard, not research. Reviewers fail a packet missing any item.
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

Mechanism-owned paths (see AGENTS.md "Auth, payment and token mechanisms"): `src/lib/{member-auth,phone-verification,auth,commerce,tickets,invitation}`, `src/app/api/**`, `src/app/(auth)`, `src/app/(site)/{tickets/payment,shop/payment,shop/orders,shop/invitations,account/**}`. Pages outside these paths that read member or order state through the server helpers apply items 1–4 too.

## Review

Codex Review-A/B: FAIL a packet that touches these paths and lacks any item, or whose `Skills used:` line omits this skill and `ecc:security-review`.
