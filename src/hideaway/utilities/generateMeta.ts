import type {Metadata} from "next";

import type {Page, Post, User} from "@/payload-types";
import {getServerSideURL} from "./getURL";
import {mergeOpenGraph} from "./mergeOpenGraph";

export const generateMeta = async (args: {
	doc: Partial<Page> | Partial<Post> | Partial<User>;
}): Promise<Metadata> => {
	const {doc} = args || {};

	const ogImage =
		typeof doc?.meta?.image === "object" &&
		doc.meta.image !== null &&
		"url" in doc.meta.image &&
		`${getServerSideURL()}`;

	const title = `${
		("title" in doc && doc.title) ||
		("name" in doc && doc.name) ||
		doc?.meta?.title
	} @ THE HIDEAWAY`;

	return {
		description: "THE HIDEAWAY",
		openGraph: mergeOpenGraph({
			description: "THE HIDEAWAY",
			images: ogImage
				? [
					{
						url: ogImage,
					},
				]
				: undefined,
			title,
			url: Array.isArray(doc?.slug) ? doc?.slug.join("/") : "/",
		}),
		title,
	};
};
