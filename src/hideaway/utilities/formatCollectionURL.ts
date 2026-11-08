import {FrontEndCollections} from "@/hideaway/stores/Routing/RP_Voyageur";
import {getServerSideURL} from "@/hideaway/utilities/getURL";

export const formatCollectionURL = ({
	                                    relationTo, slug
                                    }: {
	relationTo: FrontEndCollections;
	slug: string;
}) => {
	const url = getServerSideURL();
	switch (relationTo) {
		case "posts":
			return `${url}/essays/${slug}`;
		case "pages":
			return `${url}/${slug}`;
		case "surf":
			return `${url}/surf/${slug}`;
		case "profile":
			return `${url}/users/${slug}`;
		case "albums":
			return `${url}/rp.fm/albums/${slug}`;
		case "playlists":
			return `${url}/rp.fm/playlists/${slug}`;
		case "categories":
			return `${url}/archived/${slug}`;
		// case "tracks":
		// 	return `${url}/rp.fm/albums/${(doc as Track)?.albumSlug}?track=${slug}`;

		case "tags":
			return `${url}/tagged/${slug}`;
		default:
			return `${url}/${relationTo}/${slug}`;
	}
}