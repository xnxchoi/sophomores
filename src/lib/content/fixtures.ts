import type {
  AlbumSource,
  CreditSource,
  HighlightSource,
  NotificationSource,
  ParallaxSource,
  PlaylistSource,
  PostSource,
  TrackSource
} from "./slots";

export const postFixtures: PostSource[] = [
  {
    id: "post-fixture-1",
    title: "A room with the lights low",
    slug: "lights-low",
    dek: "A short piece used to prove the reading card before a collection exists.",
    body: "The page can render this sentence with no database behind it.",
    publishedAt: "2026-11-03",
    heroUrl: "",
    authorName: "Fixture Author",
    authorImageUrl: "",
    tags: [{ label: "Notes", slug: "notes" }]
  },
  {
    id: "post-fixture-2",
    title: "Second desk",
    slug: "second-desk",
    dek: "A secondary card.",
    body: "Secondary body.",
    publishedAt: "2026-11-02",
    heroUrl: "",
    authorName: "Fixture Author",
    authorImageUrl: "",
    tags: [{ label: "Notes", slug: "notes" }]
  },
  {
    id: "post-fixture-3",
    title: "Third desk",
    slug: "third-desk",
    dek: "Another secondary card.",
    body: "Third body.",
    publishedAt: "2026-11-01",
    heroUrl: "",
    authorName: "Fixture Author",
    authorImageUrl: "",
    tags: [{ label: "Notes", slug: "notes" }]
  },
  {
    id: "post-fixture-4",
    title: "Rail one",
    slug: "rail-one",
    dek: "A rail item.",
    body: "Rail body.",
    publishedAt: "2026-10-31",
    heroUrl: "",
    authorName: "Fixture Author",
    authorImageUrl: "",
    tags: [{ label: "Notes", slug: "notes" }]
  },
  {
    id: "post-fixture-5",
    title: "Rail two",
    slug: "rail-two",
    dek: "A second rail item.",
    body: "Rail two body.",
    publishedAt: "2026-10-30",
    heroUrl: "",
    authorName: "Fixture Author",
    authorImageUrl: "",
    tags: [{ label: "Notes", slug: "notes" }]
  },
  {
    id: "post-fixture-6",
    title: "Rail three",
    slug: "rail-three",
    dek: "A third rail item.",
    body: "Rail three body.",
    publishedAt: "2026-10-29",
    heroUrl: "",
    authorName: "Fixture Author",
    authorImageUrl: "",
    tags: [{ label: "Notes", slug: "notes" }]
  }
];

export const trackFixtures: TrackSource[] = [
  {
    id: "track-fixture-1",
    title: "Night desk",
    artist: "Fixture Ensemble",
    slug: "night-desk",
    coverUrl: "",
    audioUrl: "/audio/night-desk.mp3",
    duration: 186
  }
];

export const albumFixtures: AlbumSource[] = [
  {
    id: "album-fixture-1",
    title: "Desk hours",
    artist: "Fixture Ensemble",
    slug: "desk-hours",
    coverUrl: "",
    trackIds: ["track-fixture-1"]
  }
];

export const playlistFixtures: PlaylistSource[] = [
  {
    id: "playlist-fixture-1",
    title: "After close",
    slug: "after-close",
    coverUrl: "",
    trackIds: ["track-fixture-1"]
  }
];

export const highlightFixtures: HighlightSource[] = [
  {
    id: "highlight-fixture-1",
    postId: "post-fixture-1",
    quote: "The page can render this sentence with no database behind it.",
    start: 0,
    end: 62,
    note: "",
    authorLabel: "Fixture Author"
  }
];

export const notificationFixtures: NotificationSource[] = [
  {
    id: "notification-fixture-1",
    title: "A note is waiting",
    body: "This row is a fixture, not a stored notification.",
    href: "/essays/lights-low",
    imageUrl: "",
    read: false,
    createdAt: "2026-11-03T00:00:00.000Z"
  }
];

export const creditFixtures: CreditSource[] = [
  {
    id: "credit-fixture-1",
    name: "Fixture Author",
    role: "Editor",
    bio: "Stands in until a member record is connected.",
    href: "https://sophomores.co",
    patronage: true,
    profilePic: {
      src: "/assets/credits/fixture-author.svg",
      alt: "Fixture Author",
      width: 800,
      height: 1000
    }
  }
];

export const parallaxFixtures: ParallaxSource[] = [
  {
    title: "Still frames",
    images: [
      {
        url: "",
        alt: "Empty frame",
        width: 1200,
        height: 800
      }
    ]
  }
];
