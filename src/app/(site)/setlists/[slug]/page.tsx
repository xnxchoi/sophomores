import { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getPayload } from "@/payload";
import { isReviewEditorProfile, staffAuthOrigin } from "@/lib/auth/review-editor-policy";
import { currentUser } from "@/lib/auth/server";
import { isCmsStaff } from "@/lib/auth/access";
import { entryCap, evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import { inRunningOrder, runningOrder } from "@/lib/music/running-order";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";
import { isAuthorizedCurator } from "@/lib/music/curator";
import { SetlistView } from "@/components/music/SetlistView";
import { SetlistLoadStatus } from "@/components/music/SetlistUnavailable";
import type { Track } from "@/payload-types";
import type { MusicTrackView, SetlistData, UserSlotState } from "@/lib/music/types";


const FALLBACK_PLAYLIST_URL =
  "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E";

// Curator-only trusted read of the server-owned token's presence; access reads never return it.
async function hasOwnerToken(payload: Awaited<ReturnType<typeof getPayload>>, id: string): Promise<boolean> {
  const doc = await payload.findByID({
    collection: "setlists",
    id,
    depth: 0,
    overrideAccess: true,
    select: { appleMusic: { ownerUserToken: true } }
  });
  return Boolean(doc?.appleMusic?.ownerUserToken);
}

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
  const review = isReviewEditorProfile(staffAuthOrigin());
  let isCurator = false;

  let setlistData: SetlistData | null = null;
  let userSlotState: UserSlotState | null = null;
  let deniedPrivateSetlist = false;
  let canUsePublicArchive = false;
  let archiveOnly = review;
  let loadFailed = false;
  let playlistFailed = false;
  let playlistTrackCount = 0;

  try {
    const payload = await getPayload();
    const staffAuth = await payload.auth({ headers: await headers() });
    const isCmsStaffUser = isCmsStaff(staffAuth.user);
    // Curator authority comes from the Payload-verified principal, not the session user.
    isCurator = isAuthorizedCurator(staffAuth.user);
    // 1. Fetch Setlist by Slug through Setlists read access (private rows only for CMS staff).
    const query = await payload.find({
      collection: "setlists",
      depth: 0,
      overrideAccess: false,
      user: staffAuth.user ?? undefined,
      where: { slug: { equals: slug } },
      limit: 1
    });

    const setlistDoc = query.docs[0];
    if (!setlistDoc && slug === "seoul-2026") {
      // Existence-only trusted count: a private seoul-2026 row must 404, not fall back to the archive.
      const hidden = await payload.count({ collection: "setlists", overrideAccess: true, where: { slug: { equals: slug } } });
      deniedPrivateSetlist = hidden.totalDocs > 0;
      canUsePublicArchive = hidden.totalDocs === 0;
    }

    if (setlistDoc && setlistDoc.isPublic !== true && !isCmsStaffUser) {
      deniedPrivateSetlist = true;
    } else if (setlistDoc) {
      // 2. Fetch Base tracks from Apple Music
      let baseTracks: MusicTrackView[] = [];
      const playlistUrl = setlistDoc.appleMusic?.playlistUrl;
      if (playlistUrl && (!review || setlistDoc.isPublic === true)) {
        try {
          const applePlaylist = review
            ? await getAppleMusicPlaylist(playlistUrl, undefined, { catalogOnly: true })
            : await getAppleMusicPlaylist(playlistUrl);
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

      // Staff running order; the numbers shown are positions in this list.
      const ordered = inRunningOrder(tracksResult.docs, await runningOrder(payload, String(setlistDoc.id)));
      const attendeeTracks: MusicTrackView[] = ordered.map((track) => {
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
              process.env.APPLE_MUSIC_USER_TOKEN || await hasOwnerToken(payload, setlistDoc.id)
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
          // One card per allowed entry: the member's entries in running order, then open cards.
          slots: Array.from({ length: entryCap(setlistDoc) }, (_, index) => {
            const entry = userSlots.entries[index];
            return {
              position: index + 1,
              entryId: entry ? String(entry.id) : null,
              track: formatSlotTrack(entry),
              note: entry?.note || undefined
            };
          })
        };
      }
    }
  } catch {
    console.warn("Could not load the setlist from Payload.");
    loadFailed = true;
  }

  // A setlist that is missing or private to this visitor renders the site's 404 (Next 16 docs: notFound).
  if (deniedPrivateSetlist) notFound();

  // Fall back only after a successful lookup confirmed absence, not after a visibility denial or failed read.
  if (!setlistData && canUsePublicArchive && !loadFailed) {
    try {
      const applePlaylist = review
        ? await getAppleMusicPlaylist(FALLBACK_PLAYLIST_URL, undefined, { catalogOnly: true })
        : await getAppleMusicPlaylist(FALLBACK_PLAYLIST_URL);
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
      if (review) {
        playlistFailed = true;
        setlistData = {
          id: "seoul-2026-virtual", title: "SEOUL 2026", slug: "seoul-2026",
          status: "finalized", deadline: "", isPastDeadline: true, provider: "apple_music",
          appleMusic: { playlistUrl: FALLBACK_PLAYLIST_URL }, totalTracks: 0, tracks: []
        };
      } else {
        loadFailed = true;
      }
    }
  }

  if (!setlistData) {
    if (loadFailed) return <SetlistLoadStatus failure="setlist" />;
    notFound();
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
