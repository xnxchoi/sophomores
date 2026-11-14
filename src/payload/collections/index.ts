import type { CollectionConfig } from "payload";
import { Albums } from "./albums";
import { Bookmarks } from "./bookmarks";
import { Categories } from "./categories";
import { Citations } from "./citations";
import { ContentMedia } from "./media";
import { Notifications } from "./notifications";
import { Playlists } from "./playlists";
import { Posts } from "./posts";
import { Setlists } from "./setlists";
import { Tags } from "./tags";
import { Tracks } from "./tracks";

export const contentCollections: CollectionConfig[] = [
  Tags,
  Categories,
  ContentMedia,
  Posts,
  Bookmarks,
  Citations,
  Albums,
  Tracks,
  Playlists,
  Setlists,
  Notifications
];
