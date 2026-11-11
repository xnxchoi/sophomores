import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { isCmsStaff } from "@/lib/auth/access";
import { evaluateUserEligibility, getUserSetlistSlots, isAccountActivated } from "@/lib/music/eligibility";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";
import { isAuthorizedCurator } from "@/lib/music/curator";
import { SetlistView } from "@/components/music/SetlistView";
import type { Track } from "@/payload-types";
import type { MusicTrackView, SetlistData, UserSlotState } from "@/lib/music/types";

const FALLBACK_PLAYLIST_URL =
  "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E?a=join&it=m42wwXZcOkXroXsOzOB3&l=en";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug === "seoul-2026" ? "SEOUL 2026 Setlist" : "Collaborative Setlist";
  return {
    title: `${title} · Sophomores`,
    description: "Collaborative event setlist for Sophomores. Ticket holders nominate tracks.",
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

  try {
    const payload = await getPayload();

    // 1. Fetch Setlist by Slug
    const query = await payload.find({
      collection: "setlists",
      depth: 0,
      where: { slug: { equals: slug } },
      limit: 1
    });

    const setlistDoc = query.docs[0];

    if (setlistDoc && !setlistDoc.isPublic && !isCmsStaff(user)) {
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
        } catch (err) {
          console.warn("Could not fetch base tracks from Apple Music:", err);
        }
      }

      // 3. Fetch Attendee Contributed Tracks
      const tracksResult = await payload.find({
        collection: "tracks",
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
        const userSlots = await getUserSetlistSlots(payload, user.id, setlistDoc.id);

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
  } catch (err) {
    console.warn("Could not query Payload CMS for setlist, attempting Apple Music fallback:", err);
  }

  if (deniedPrivateSetlist) {
    notFound();
  }

  // Fallback: If not in DB yet and slug is seoul-2026, load directly from Apple Music!
  if (!setlistData && slug === "seoul-2026") {
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

      const defaultDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      setlistData = {
        id: "seoul-2026-virtual",
        title: applePlaylist.title || "SEOUL 2026",
        slug: "seoul-2026",
        description:
          applePlaylist.description ||
          "Curated by Sean S. Choi. 45 base tracks. Attendee nominations open now.",
        status: "active",
        deadline: defaultDeadline,
        isPastDeadline: false,
        provider: "apple_music",
        appleMusic: {
          playlistId: applePlaylist.id,
          playlistUrl: applePlaylist.url || FALLBACK_PLAYLIST_URL
        },
        totalTracks: fallbackTracks.length,
        tracks: fallbackTracks
      };

      if (user) {
        const isActivated = isAccountActivated(user);
        const hasTicket = Boolean(user.isPlaylistEligible);
        const isEligible = hasTicket && isActivated;
        const reason = !hasTicket
          ? "ineligible_product"
          : !isActivated
          ? "account_unactivated"
          : undefined;

        userSlotState = {
          eligible: isEligible,
          reason,
          campaignStatus: "active",
          deadline: defaultDeadline,
          deadlinePassed: false,
          slots: [
            { slotIndex: 1, track: null },
            { slotIndex: 2, track: null }
          ]
        };
      }
    } catch (appleErr) {
      console.error("Failed to load Apple Music playlist fallback:", appleErr);
    }
  }

  if (!setlistData) {
    notFound();
  }

  return (
    <SetlistView
      initialSetlist={setlistData}
      initialUserSlotState={userSlotState}
      isAuthenticated={!!user}
      isCurator={isCurator}
    />
  );
}
