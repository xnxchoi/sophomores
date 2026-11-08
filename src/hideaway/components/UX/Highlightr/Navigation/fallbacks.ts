import { TagOverview } from "@types/collections/meta-collections";
import {DateTime} from "luxon";

export const fallback = ({ direction }: { direction: "prev" | "next" }) =>
  direction === "prev"
    ? {
        id: "1",
        category: {
          title: "Uncategorized",
          id: "",
          slug: "/archived/uncategorized"
        },
        publishedAt: DateTime.now()
          .set({ year: 2022, month: 1, day: 22 })
          .toISODate(),
        bookmarks: [],
        tags: [] as TagOverview[],
        bookmarksCount: 0,
        title: "All Essays & Articles",
        subtitle: "More of where this came from.",
        slug: "/essays",
        author: {
          name: "The Hideaway",
          id: "1-1",
          displayUsername: "The Hideaway",
          slug: "/"
        }
      }
    : {
        id: "1",
        category: {
          title: "Uncategorized",
          id: "",
          slug: "/archived/uncategorized"
        },
        publishedAt: DateTime.now()
          .set({ year: 2022, month: 1, day: 22 })
          .toISODate(),
        bookmarks: [],
        bookmarksCount: 0,
        tags: [] as TagOverview[],
        title: "Surfs",
        subtitle: "Explore tangential thoughts and discourse",
        slug: "/surf",
        author: {
          name: "The Hideaway",
          id: "1-1",
          displayUsername: "The Hideaway",
          slug: "/"
        }
      };
