"use client";

import { useEffect, useState } from "react";
import type { FriendsTorrentPhoto } from "./Immersive/FriendsTorrent";

const PAST_EVENT_FILENAMES = [
  "KakaoTalk_Image_2026-05-21-03-03-19_001.jpeg",
  "KakaoTalk_Image_2026-05-21-03-03-19_002.jpeg",
  "KakaoTalk_Image_2026-05-21-03-03-19_003.jpeg",
  "KakaoTalk_Image_2026-05-21-03-03-20_004.jpeg",
  "partypic - 1.png",
  "partypic - 2.png",
  "partypic - 3.png",
  "partypic - 4.png",
  "partypic - 6.png",
  "partypic - 7.png",
  "partypic - 8.png",
  "partypic - 9.png",
  "partypic - 10.png",
  "partypic - 11.png",
  "partypic - 12.png",
  "partypic - 13.png",
  "partypica - 2.png",
  "partypica - 3.png",
  "partypica - 4.png",
  "partypica - 5.png"
] as const;

export const FALLBACK_FRIENDS_PHOTOS: FriendsTorrentPhoto[] =
  PAST_EVENT_FILENAMES.map((filename) => ({
    src: encodeURI(`/assets/day-n-night/past-events/${filename}`),
    alt: "Past Hideaway gathering"
  }));

export function useRuntimeFriendsPhotos(
  fallback: FriendsTorrentPhoto[] = FALLBACK_FRIENDS_PHOTOS
) {
  const [photos, setPhotos] = useState(fallback);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/day-n-night/friends-photos", {
      cache: "no-store"
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { photos?: FriendsTorrentPhoto[] } | null) => {
        if (cancelled || !payload?.photos?.length) return;
        setPhotos(payload.photos);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return photos;
}
