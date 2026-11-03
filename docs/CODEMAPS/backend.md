<!-- Generated: 2026-11-04 | Files scanned: 81 port files plus the app route listing; 332 app/components/lib TS files counted | Token estimate: ~220 -->

# Backend

## Payload

`payload.config.ts` collections:

```
Admins, Users, Orders, HomePage, AccountRecoveryRequests
+ contentCollections
```

`lib/payload/collections/content.ts` slugs, admin group `Reading`:

```
tags, categories, media, posts, bookmarks, citations, albums, tracks, playlists, notifications
```

Staff write access uses `isCmsStaff`. Public read of posts is limited to `status = published`. Tags, heroes, and authors are plain values. No locker, commerce fields, or polymorphic uploads on these ten.

Payload REST for every collection is the existing catch-all:

```
/api/[...slug]  app/(payload)/api/[...slug]/route.ts
```

The reading page does not call it. `fromStoredPost` in `lib/content/map.ts` is the document-to-slot mapper when a caller has a stored post.

## Other routes

```
POST/GET app/api/auth/[...all]                         Better Auth
GET      app/api/globals/home-page
POST     app/api/member/identify
POST     app/api/member/recovery
POST     app/api/member/recovery/[id]/review
GET      app/api/member/status
POST     app/api/phone-verification/bind
POST     app/api/phone-verification/challenges
GET      app/api/phone-verification/challenges/[id]
POST     app/api/phone-verification/webhook
GET      app/(auth)/api/session
POST     app/(auth)/api/session/verify
POST     app/(auth)/api/session/logout
```

Ported auth screens do not call these routes. `isSixDigitCode` only checks shape, then the screen calls `onSubmit`.
