import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readLocal = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const landingSource = readLocal("./index.tsx");
const mainLandingSource = readLocal("./MainLanding.tsx");
const immersiveSource = readLocal("./Immersive/index.tsx");
const friendsTorrentSource = readLocal("./Immersive/FriendsTorrent.tsx");
const friendsPhotosSource = readLocal("./friendsPhotos.ts");
const quickActionsSource = readLocal("./Immersive/QuickActions.tsx");
const scoreSource = readLocal("./Immersive/DayNNightScore.tsx");
const sunLoaderSource = readLocal("./Immersive/SunLoader.tsx");
const liminalRadioSource = readLocal("./Immersive/LiminalRadioController.tsx");
const cursorToneSource = readLocal("./Immersive/DayNNightCursorTone.tsx");
const timelineSource = readLocal("./Immersive/Timeline.tsx");
const cssSource = readLocal("./dn.css");
const friendsPhotosRouteSource = readFileSync(
  new URL(
    "../../../app/api/day-n-night/friends-photos/route.ts",
    import.meta.url
  ),
  "utf8"
);
const gateAllowlistSource = readFileSync(
  new URL("../../../lib/gate/allowlist.ts", import.meta.url),
  "utf8"
);
const enMessages = JSON.parse(
  readFileSync(new URL("../../../../messages/en.json", import.meta.url), "utf8")
);

describe("Day n Night main flow contract", () => {
  it("keeps the original immersive structure mounted", () => {
    expect(landingSource).toContain("DayCycleProvider");
    expect(landingSource).toContain("ImmersiveView");
    expect(landingSource).toContain("ViewportMask");
    expect(landingSource).toContain("ViewToggle");
    expect(landingSource).toContain("ExitAffordance");
    expect(landingSource).not.toContain("<DayNNightMainPage");
  });

  it("maps the five visual acts to the new content flow", () => {
    const labels = enMessages.Event.DayNNight.scrubber;

    expect(labels.opening).toBe("Intro");
    expect(labels.cookout).toBe("Details");
    expect(labels.dress).toBe("Our friends");
    expect(labels.night).toBe("Music by YM.FM");
    expect(labels.closing).toBe("RSVP");
  });

  it("keeps FriendsTorrent for friends and moves YM.FM to the music act", () => {
    expect(immersiveSource).toContain("FriendsTorrent");
    expect(timelineSource).toContain("YMFMCredit");
    expect(immersiveSource).toContain("ACT_INDEX_DRESS");
    expect(immersiveSource).not.toContain("ACT_INDEX_NIGHT");
    expect(immersiveSource).not.toContain(
      "const nightWindow = useActWindowActive"
    );
    expect(immersiveSource).not.toContain(
      "const ymfmVisible = nightWindow.active"
    );
    expect(timelineSource).toContain("embeddedInAct");
  });

  it("uses the new detailed offerings inside the restored timeline", () => {
    expect(timelineSource).toContain('useTranslations("Event.DayNNight.main")');
    expect(timelineSource).toContain('mainT("details.price")');
    expect(timelineSource).toContain('mainT("offerings.grill.body")');
    expect(timelineSource).toContain('mainT("offerings.ferments.body")');
    expect(timelineSource).toContain('mainT("offerings.cocktails.body")');
    expect(timelineSource).not.toContain("A generous rooftop spread");
  });

  it("keeps the loader backdrop from blocking ready-state actions", () => {
    expect(sunLoaderSource).toContain(
      "pointer-events-none absolute inset-0 bg-faded-black/99"
    );
  });

  it("expires the once-per-session loader marker after fifteen minutes", () => {
    expect(sunLoaderSource).toContain(
      "const LOADER_SEEN_TTL_MS = 15 * 60 * 1000"
    );
    expect(sunLoaderSource).toContain("Date.now() - seenAt");
    expect(sunLoaderSource).toContain(
      "sessionStorage.setItem(LOADER_SEEN_KEY, String(Date.now()))"
    );
    expect(sunLoaderSource).not.toContain(
      'sessionStorage.setItem(LOADER_SEEN_KEY, "1")'
    );
  });

  it("lets mobile acts use the full phone width instead of desktop grid columns", () => {
    expect(cssSource).toContain("@media (max-width: 1023px)");
    expect(cssSource).toContain("[data-dn-act] > div > *");
    expect(cssSource).toContain("grid-column: 1 / -1 !important");
    expect(cssSource).toContain("grid-row: auto !important");
  });

  it("explains the friends torrent and loads deploy-time folder additions", () => {
    expect(friendsTorrentSource).toContain("title?: ReactNode");
    expect(friendsTorrentSource).toContain("caption?: ReactNode");
    expect(immersiveSource).toContain("useRuntimeFriendsPhotos");
    expect(mainLandingSource).toContain("useRuntimeFriendsPhotos");
    expect(friendsPhotosSource).toContain("/api/day-n-night/friends-photos");
    expect(friendsPhotosRouteSource).toContain("readdir");
    expect(friendsPhotosRouteSource).toContain(
      "public/assets/day-n-night/past-events"
    );
    expect(gateAllowlistSource).toContain('"/api/day-n-night"');
  });

  it("puts layout controls in the top chrome and music in the bottom pill", () => {
    expect(immersiveSource).toContain("<ViewToggle");
    expect(quickActionsSource).toContain("MusicChip");
    expect(quickActionsSource).toContain("AudioBars");
    expect(enMessages.Event.DayNNight.audio.label).toBe("Music");
    expect(quickActionsSource).not.toContain('tAudio("track")');
    expect(quickActionsSource).not.toContain("data-dn-audio-track");
    expect(quickActionsSource).not.toContain('role="radiogroup"');
    expect(scoreSource).not.toContain("data-dn-audio-toggle");
    expect(cssSource).toContain("top: 13px");
    expect(cssSource).toContain("right: 20px");
  });

  it("primes the daytime media element during the loader click gesture", () => {
    expect(scoreSource).toContain("let primedDayTrack");
    expect(scoreSource).toContain("new Audio(DAY_SRC)");
    expect(scoreSource).toContain("takePrimedDayTrack()");
    expect(scoreSource).toContain(".then(() => day.audio.play())");
  });

  it("primes YM.FM audio from the same music gesture and uses MP3 first", () => {
    expect(sunLoaderSource).toContain("primeLiminalRadioAudio()");
    expect(liminalRadioSource).toContain("export function primeLiminalRadioAudio");
    expect(liminalRadioSource).toContain('"/track_media/Track_1.mp3"');
    expect(liminalRadioSource).toContain('"/track_media/Track_1.ogg"');
    expect(immersiveSource).toContain(
      "<LiminalRadioController enabled={audioEnabled} />"
    );
    expect(liminalRadioSource).toContain(
      "const canAutoPlay = enabled || manualPlayRef.current"
    );
  });

  it("keeps the cursor dark on bright Day n Night skies and light at night", () => {
    expect(immersiveSource).toContain("<DayNNightCursorTone />");
    expect(cursorToneSource).toContain("progress >= 0.58 && progress < 0.94");
    expect(cursorToneSource).toContain('return "dark"');
    expect(cursorToneSource).toContain('return "light"');
  });

  it("routes signed-in RSVP actions to the Day n Night ticket manager", () => {
    expect(landingSource).toContain("isSignedIn");
    expect(immersiveSource).toContain("isSignedIn={isSignedIn}");
    expect(quickActionsSource).toContain("isSignedIn || isPending || isRsvped");
    expect(quickActionsSource).toContain('"/day-n-night/my"');
  });
});
