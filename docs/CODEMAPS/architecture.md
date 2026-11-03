<!-- Generated: 2026-11-04 | Files scanned: 81 port files plus the app route listing; 332 app/components/lib TS files counted | Token estimate: ~220 -->

# Architecture

Next.js 16 App Router. Payload 3.92.1. PostgreSQL database `sopho` on port 4141. Public site, staff login, and Payload admin are separate roots.

```
app/(site)/layout.tsx
  NextIntlClientProvider
    SiteFrame
      children          pages, including /reading
      SharedCanvas      one R3F canvas, drei View.Port
app/(auth)/login        staff login, no SiteFrame, no client JS
app/(payload)/admin     Payload admin at its own root
```

`/reading` is a fixture page. It does not query the content collections.

```
ReadingPage
  fixtures -> fromPost | fromTrack | fromNotice | fromCredit | fromParallax | fromHighlight
  ReadingStage
    SiteHeader, ArticleHero, Reader, PostArchive, PageLinks
    BookmarkButton, TrackPlayer, NoticeList
    SignInCard, SignUpCard, ForgotPasswordCard, TwoFactorCard, PasskeyButton
    MemberBadge View, CreditsRail, ParallaxGrid, Starliner, TickerCrown
```

Canvas claims: `useCanvasClaim` increments a Zustand count. `useResolvedFrameloop` is `"always"` while `activeClaims > 0`, otherwise `"demand"`. Private canvases stay outside this store: flame field, warp, teaser orb, invitation study.

Layers in `components/gl/layers.ts`: canvas 1, header 2, portrait focus 3. Dialogs sit at 50.
