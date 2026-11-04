import type {Metadata} from "next"

import {getServerSideURL} from "./getURL"

const defaultOpenGraph: Metadata["openGraph"] = {
  type: "website",
  description: "a Restored Project™",
  images: [
    {
      url: `${getServerSideURL()}/website-template-OG.webp`
    }
  ],
  siteName: "The Hideaway",
  title: "The Hideaway"
};

export const mergeOpenGraph = (og?: Metadata["openGraph"]): Metadata["openGraph"] => {
	return {
		...defaultOpenGraph,
		...og,
		images: og?.images ? og.images : defaultOpenGraph.images,
	}
}
