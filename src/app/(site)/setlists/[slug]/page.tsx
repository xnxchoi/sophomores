import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "@/payload";
import { currentUser } from "@/lib/auth/server";
import { isCmsStaff } from "@/lib/auth/access";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";
import { isAuthorizedCurator } from "@/lib/music/curator";
import { SetlistView } from "@/components/music/SetlistView";
import { SetlistLoadStatus } from "@/components/music/SetlistUnavailable";
import type { Track } from "@/payload-types";
import type { MusicTrackView, SetlistData, UserSlotState } from "@/lib/music/types";

// A missing slug goes to the site's 404 at its own URL (next.config.ts rewrites `?not-found=1` there), so the
// address bar keeps the URL the visitor asked for. Next has already decoded the param, so it is encoded once.
// A slug of "." or ".." would still resolve as a dot segment when escaped; it goes to the 404 path itself.
function notFoundUrl(slug: string) {
  return /^\.\.?$/.test(slug) ? "/not-found" : `/setlists/${encodeURIComponent(slug)}?not-found=1`;
}

const FALLBACK_PLAYLIST_URL =
  "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug === "seoul-2026" ? "SEOUL 2026 Setlist" : "Collaborative Setlist";
  return {
    title: `${title} · Sophomores`,
    robots: { index: false, follow: false }
  };
}

export default async function SetlistPage({ params }: PageProps) {
  const { slug } = await params;
  const user = await currentUser();
  const isCurator = isAuthorizedCurator(user);

  let setlistData: SetlistData | null = null;
  let userSlotState: UserSlotState | null = null;
  let deniedPrivateSetlist = false;
  let canUsePublicArchive = false;
  let archiveOnly = false;
  let loadFailed = false;
  let playlistFailed = false;
  let playlistTrackCount = 0;

  try {
    const payload = await getPayload();
    const staffAuth = await payload.auth({ headers: await headers() });
    const isCmsStaffUser = isCmsStaff(staffAuth.user);
    // 1. Fetch Setlist by Slug
    const query = await payload.find({
      collection: "setlists",
      depth: 0,
      // Distinguish a private row from an absent row before considering the archive.
      overrideAccess: true,
      where: { slug: { equals: slug } },
      limit: 1
    });

    const setlistDoc = query.docs[0];
    canUsePublicArchive = !setlistDoc && slug === "seoul-2026";

    if (setlistDoc && setlistDoc.isPublic !== true && !isCmsStaffUser) {
      deniedPrivateSetlist = true;
    } else if (setlistDoc) {
      // 2. Fetch Base tracks from Apple Music
      let baseTracks: MusicTrackView[] = [];
      const playlistUrl = setlistDoc.appleMusic?.playlistUrl;
      if (playlistUrl) {
        try {
          const applePlaylist = await getAppleMusicPlaylist(playlistUrl);
          baseTracks = applePlaylist.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            albumTitle: t.album,
            coverUrl: t.coverUrl,
            previewUrl: t.previewUrl,
            duration: t.duration,
            isrc: t.isrc,
            externalUrl: t.url
          }));
        } catch {
          console.warn("[setlist] Playlist tracks unavailable");
          playlistFailed = true;
        }
      }

      // 3. Fetch Attendee Contributed Tracks
      const tracksResult = await payload.find({
        collection: "tracks",
        overrideAccess: false,
        user: user ?? undefined,
        where: { setlist: { equals: setlistDoc.id } },
        pagination: false,
        depth: 1
      });

      const attendeeTracks: MusicTrackView[] = tracksResult.docs.map((track) => {
        let submitterDisplayName: string | undefined = undefined;
        if (track.submittedBy && typeof track.submittedBy === "object") {
          const subUser = track.submittedBy as { name?: string; email?: string };
          submitterDisplayName = subUser.name || (subUser.email ? subUser.email.split("@")[0] : "Attendee");
        }

        return {
          id: track.id,
          title: track.title,
          artist: track.artist || "Unknown Artist",
          albumTitle: track.albumTitle || undefined,
          coverUrl: track.coverUrl || undefined,
          previewUrl: track.previewUrl || undefined,
          duration: track.duration || undefined,
          isrc: track.isrc || undefined,
          slotIndex: track.slotIndex || undefined,
          submittedByName: submitterDisplayName,
          note: track.note || undefined,
          externalUrl: track.appleMusic?.url || track.spotify?.url || undefined
        };
      });

      const allTracks = [...baseTracks, ...attendeeTracks];
      playlistTrackCount = baseTracks.length;
      const isPastDeadline = new Date() >= new Date(setlistDoc.deadline);

      setlistData = {
        id: setlistDoc.id,
        title: setlistDoc.title,
        slug: setlistDoc.slug,
        description: setlistDoc.description || undefined,
        status: setlistDoc.status,
        deadline: setlistDoc.deadline,
        isPastDeadline,
        provider: setlistDoc.provider,
        appleMusic: setlistDoc.appleMusic && {
          playlistId: setlistDoc.appleMusic.playlistId,
          playlistUrl: setlistDoc.appleMusic.playlistUrl,
          ...(isCurator ? {
            isConfigured: Boolean(
              setlistDoc.appleMusic.ownerUserToken || process.env.APPLE_MUSIC_USER_TOKEN
            )
          } : {})
        },
        spotify: setlistDoc.spotify,
        totalTracks: allTracks.length,
        tracks: allTracks
      };

      if (user) {
        const eligibility = await evaluateUserEligibility(payload, user, setlistDoc);
        const userSlots = await getUserSetlistSlots(payload, user.id, setlistDoc.id, user);

        const formatSlotTrack = (track: Track | null | undefined): MusicTrackView | null => {
          if (!track) return null;
          return {
            id: track.id,
            title: track.title,
            artist: track.artist || "Unknown Artist",
            albumTitle: track.albumTitle || undefined,
            coverUrl: track.coverUrl || undefined,
            previewUrl: track.previewUrl || undefined,
            duration: track.duration || undefined,
            isrc: track.isrc || undefined,
            slotIndex: track.slotIndex || undefined,
            submittedByName: "You",
            note: track.note || undefined,
            externalUrl: track.appleMusic?.url || track.spotify?.url || undefined
          };
        };

        userSlotState = {
          eligible: eligibility.isEligible,
          reason: eligibility.reason,
          campaignStatus: setlistDoc.status,
          deadline: setlistDoc.deadline,
          deadlinePassed: isPastDeadline,
          slots: [
            {
              slotIndex: 1,
              track: formatSlotTrack(userSlots.slot1),
              note: userSlots.slot1?.note || undefined
            },
            {
              slotIndex: 2,
              track: formatSlotTrack(userSlots.slot2),
              note: userSlots.slot2?.note || undefined
            }
          ]
        };
      }
    }
  } catch {
    console.warn("Could not load the setlist from Payload.");
    loadFailed = true;
  }

  // A setlist that is missing or private to this visitor goes to the site's 404 (next.config.ts rewrites):
  // throwing notFound here would paint Next's bare error shell before the 404 renders.
  if (deniedPrivateSetlist) {
    redirect(notFoundUrl(slug));
  }

  // Fall back only after a successful lookup confirmed absence, not after a visibility denial or failed read.
  if (!setlistData && canUsePublicArchive) {
    try {
      const applePlaylist = await getAppleMusicPlaylist(FALLBACK_PLAYLIST_URL);
      const fallbackTracks: MusicTrackView[] = applePlaylist.tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        albumTitle: t.album,
        coverUrl: t.coverUrl,
        previewUrl: t.previewUrl,
        duration: t.duration,
        isrc: t.isrc,
        externalUrl: t.url
      }));

      archiveOnly = true;
      playlistTrackCount = fallbackTracks.length;

      setlistData = {
        id: "seoul-2026-virtual",
        title: applePlaylist.title || "SEOUL 2026",
        slug: "seoul-2026",
        // Campaign status and deadline are not available from the public playlist.
        status: "finalized",
        deadline: "",
        isPastDeadline: true,
        provider: "apple_music",
        appleMusic: {
          playlistId: applePlaylist.id,
          playlistUrl: FALLBACK_PLAYLIST_URL
        },
        totalTracks: fallbackTracks.length,
        tracks: fallbackTracks
      };
    } catch {
      console.warn("Could not load the public setlist archive.");
      loadFailed = true;
    }
  }

  if (!setlistData) {
    if (loadFailed) return <SetlistLoadStatus failure="setlist" />;
    redirect(notFoundUrl(slug));
  }

  return (
    <SetlistLoadStatus failure={playlistFailed ? "playlist" : null}>
      <SetlistView
        key={setlistData.id}
        initialSetlist={setlistData}
        initialUserSlotState={userSlotState}
        isAuthenticated={!!user}
        isCurator={isCurator}
        archiveOnly={archiveOnly}
        playlistUnavailable={playlistFailed}
        playlistTrackCount={playlistTrackCount}
      />
    </SetlistLoadStatus>
  );
}
