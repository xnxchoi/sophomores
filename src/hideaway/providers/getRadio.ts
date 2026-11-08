"use server";
import { readRadioTrack } from "@/hideaway/providers/readRadioTrack";
import type { RP_Track } from "@/hideaway/providers/HideawayFM/types";
import { cache } from "react";

export const getRadio = cache(
  async (
    tracks: {
      id: string;
      url: string;
      artist: string;
    }[]
  ): Promise<RP_Track[]> => {
    const racks = tracks.filter((r) => {
      const { id, url } = r;
      return !!url;
    });
    const res = racks
      .map(async (r) => {
        const { id, url: u } = r;
        const url = `public${u}`;
        // const strt = await fetch(url, {

        // 	headers: {
        // 		"Content-Type": "audio/ogg"
        // 	}
        // });
        // const webStream = strt.body;
        // // Parse the metadata from the web stream
        // if (!webStream) continue;
        // const metadata = await parseWebStream(webStream, "audio/ogg");
        const metadata = await readRadioTrack({ url });
        return {
          metadata,
          track: {
            ...r
          }
        };
      })
      .map(async (r) => {
        const {
          metadata,
          track: { id, url, artist: artiste }
        } = await r;
        console.log("metadata", metadata);
        const { title, artist, album } = metadata.common || {};
        const { duration } = metadata.format || {};
        console.log(
          ((!title && "no title") || "") +
            ((!artist && "\n no artist") || "") +
            ((!album && "\nno album") || "") +
            ((!id && "\nno id") || "") +
            ((!url && "\nno url") || "") +
            ((!duration && "\nno duration") || "")
        );
        if (!id || !title || !url) {
          return false;
        }
        return {
          id,
          title,
          album: album || "hideaway sessions",
          url,
          artist: artist || artiste,
          duration: duration || 12220
        } satisfies RP_Track;
      });
    const settled = await Promise.allSettled(res);
    return settled
      .filter(
        (v): v is PromiseFulfilledResult<false | RP_Track> =>
          v.status === "fulfilled"
      )
      .map((vs) => vs.value)
      .filter((track): track is RP_Track => typeof track !== "boolean");
  }
);
