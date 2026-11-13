<!-- Generated: 2026-11-04 | Files scanned: 81 port files plus the app route listing; 332 app/components/lib TS files counted | Token estimate: ~240 -->

# Data

## Slot layer

Screens take the types in `../../src/lib`. Fixtures in `../../src/lib` satisfy the matching `*Source` types. `../../src/lib` converts either a source or, for posts, a stored record.

```
PostSource     -> fromPost | fromStoredPost -> PostBody
TrackSource    -> fromTrack -> Track
CreditSource   -> fromCredit -> CreditSlot
HighlightSource -> fromHighlight -> HighlightRange
NoticeSource   -> fromNotice -> Notice
ParallaxSource -> fromParallax -> { title, frames }
```

`CreditPerson` is an alias of `CreditSlot`. `profilePic` is `Pick<ImageProps, "src" | "alt" | "width" | "height">`.

Highlights and bookmarks on `/reading` stay in component state. They do not insert into `citations` or `bookmarks`.

## Migration

`../../src/payload/migrations` is generated and not applied. Up creates the ten content tables plus Payload lock columns. Down drops those tables. `push` stays false. Do not hand-write SQL.

```
tags, categories, media, posts, bookmarks, citations,
albums, tracks, playlists, notifications
```

## Playback helpers

`../../src/lib`: `SEEK_STEP_SECONDS = 10`, `clampSeek`, `playbackProgress`, `counterReadout`, `reelPack`.

`../../src/lib`: `spawnConfetti(width, height, count = 300)`, `stepConfetti`.
