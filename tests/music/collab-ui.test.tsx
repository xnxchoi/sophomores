import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SetlistHeader } from "@/components/music/SetlistHeader";
import { SlotManager } from "@/components/music/SlotManager";
import { SetlistTracklist } from "@/components/music/SetlistTracklist";
import { CuratorControlBar } from "@/components/music/CuratorControlBar";
import type { AudioPreviewState } from "@/components/music/use-audio-preview";
import type { SetlistData, UserSlotState } from "@/lib/music/types";
import { EnglishMessages } from "../fixtures/english-messages";
// SlotManager's links go through the transition router, which needs a mounted app router.
import { MemberAuthProviders } from "../member-auth/fixtures/providers";

const mockAudioPreview: AudioPreviewState = {
  activeId: null,
  status: "idle",
  isPlaying: false,
  toggle: () => {},
  pause: () => {}
};

const mockSetlist: SetlistData = {
  id: "test-setlist",
  title: "SEOUL 2026",
  slug: "seoul-2026",
  description: "Sophomores collaborative room setlist.",
  status: "active",
  deadline: new Date(Date.now() + 86400000).toISOString(),
  isPastDeadline: false,
  provider: "apple_music",
  appleMusic: {
    playlistId: "pl.u-test",
    playlistUrl: "https://music.apple.com/kr/playlist/test/pl.u-test"
  },
  totalTracks: 2,
  tracks: [
    {
      id: "track-1",
      title: "Rumble",
      artist: "Skrillex, Fred again.. & Flowdan",
      albumTitle: "Quest For Fire",
      duration: 146000,
      previewUrl: "https://audio-ssl.itunes.apple.com/rumble.m4a"
    },
    {
      id: "track-2",
      title: "Baby again..",
      artist: "Fred again.., Skrillex & Four Tet",
      albumTitle: "Baby again.. - Single",
      duration: 320000,
      submittedByName: "Alex",
      note: "Peak 2am transition",
      previewUrl: "https://audio-ssl.itunes.apple.com/babyagain.m4a"
    }
  ]
};

test("SetlistHeader renders BrandMark, title, metadata and Apple Music link", () => {
  const html = renderToStaticMarkup(
    <EnglishMessages>
      <SetlistHeader setlist={mockSetlist} contributedCount={1} />
    </EnglishMessages>
  );

  assert.match(html, /Sophomores/);
  assert.match(html, /SEOUL 2026/);
  assert.match(html, /Open in Apple Music/);
  assert.match(html, /https:\/\/music\.apple\.com\/kr\/playlist\/test\/pl\.u-test/);
  assert.match(html, /Total tracks:/);
  assert.match(html, /Attendee additions:/);
});

test("SlotManager displays sign-in prompt for unauthenticated users", () => {
  const html = renderToStaticMarkup(
    <MemberAuthProviders>
      <SlotManager
        userSlotState={null}
        isAuthenticated={false}
        onOpenSearch={() => {}}
        onRemoveSlot={async () => {}}
        onUpdateNote={async () => {}}
        audioPreview={mockAudioPreview}
        isPastDeadline={false}
      />
    </MemberAuthProviders>
  );

  assert.match(html, /Attendee nominations/);
  assert.match(html, /Sign in to nominate/);
  // Sign in opens the in-place sheet; its href is the sign-in page for no-JS and modifier-click (owner, 24 Nov).
  assert.match(html, /href="\/sign-in\?next=\/shop"/);
});

test("SlotManager displays verification required prompt for ineligible users", () => {
  const ineligibleState: UserSlotState = {
    eligible: false,
    reason: "Setlist access is reserved for verified attendees.",
    campaignStatus: "active",
    deadline: mockSetlist.deadline,
    deadlinePassed: false,
    slots: []
  };

  const html = renderToStaticMarkup(
    <MemberAuthProviders>
      <SlotManager
        userSlotState={ineligibleState}
        isAuthenticated={true}
        onOpenSearch={() => {}}
        onRemoveSlot={async () => {}}
        onUpdateNote={async () => {}}
        audioPreview={mockAudioPreview}
        isPastDeadline={false}
      />
    </MemberAuthProviders>
  );

  assert.match(html, /Verification required/);
  assert.match(html, /Get ticket/);
});

test("SlotManager displays activation required prompt for unactivated users with tickets", () => {
  const unactivatedState: UserSlotState = {
    eligible: false,
    reason: "account_unactivated",
    campaignStatus: "active",
    deadline: mockSetlist.deadline,
    deadlinePassed: false,
    slots: []
  };

  const html = renderToStaticMarkup(
    <MemberAuthProviders>
      <SlotManager
        userSlotState={unactivatedState}
        isAuthenticated={true}
        onOpenSearch={() => {}}
        onRemoveSlot={async () => {}}
        onUpdateNote={async () => {}}
        audioPreview={mockAudioPreview}
        isPastDeadline={false}
      />
    </MemberAuthProviders>
  );

  assert.match(html, /Activation required/);
  assert.match(html, /Activate account/);
  assert.match(html, /href="\/account"/);
});

test("SlotManager renders 2 nomination slots for eligible users", () => {
  const eligibleState: UserSlotState = {
    eligible: true,
    campaignStatus: "active",
    deadline: mockSetlist.deadline,
    deadlinePassed: false,
    slots: [
      {
        position: 1,
        entryId: "track-user-1",
        track: {
          id: "track-user-1",
          title: "Stayinit",
          artist: "Fred again.. & Lil Yachty",
          albumTitle: "Stayinit - Single",
          duration: 210000,
          previewUrl: "https://audio-ssl.itunes.apple.com/stayinit.m4a"
        },
        note: "Closing track"
      },
      {
        position: 2,
        entryId: null,
        track: null
      }
    ]
  };

  const html = renderToStaticMarkup(
    <MemberAuthProviders>
      <SlotManager
        userSlotState={eligibleState}
        isAuthenticated={true}
        onOpenSearch={() => {}}
        onRemoveSlot={async () => {}}
        onUpdateNote={async () => {}}
        audioPreview={mockAudioPreview}
        isPastDeadline={false}
      />
    </MemberAuthProviders>
  );

  assert.match(html, /Your nomination slots/);
  assert.match(html, /Stayinit/);
  assert.match(html, /Fred again\.\. &amp; Lil Yachty/);
  assert.match(html, /Entry 02/);
  assert.match(html, /Search catalog/);
});

test("SetlistTracklist renders tracks, badges, durations and curator attribution", () => {
  const html = renderToStaticMarkup(
    <EnglishMessages>
      <SetlistTracklist
        tracks={mockSetlist.tracks}
        audioPreview={mockAudioPreview}
        curatorName="Sean S. Choi"
      />
    </EnglishMessages>
  );

  assert.match(html, /Full setlist/);
  assert.match(html, /Rumble/);
  assert.match(html, /Skrillex, Fred again\.\. &amp; Flowdan/);
  assert.match(html, /Baby again\.\./);
  assert.match(html, /Added by Alex/);
  assert.match(html, /Curated/);
});

test("CuratorControlBar renders connection prompt when unconfigured", () => {
  const html = renderToStaticMarkup(
    <CuratorControlBar slug="seoul-2026" initialIsConfigured={false} />
  );

  assert.match(html, /Curator controls/);
  assert.match(html, /Action required/);
  assert.match(html, /Connect Apple ID/);
});

test("CuratorControlBar renders sync action and reconnect when configured", () => {
  const html = renderToStaticMarkup(
    <CuratorControlBar slug="seoul-2026" initialIsConfigured={true} pendingSyncCount={3} />
  );

  assert.match(html, /Curator controls/);
  assert.match(html, /Sync active/);
  assert.match(html, /Sync to Apple Music/);
  assert.match(html, /Reconnect/);
  assert.match(html, /3/);
});
