import {unstable_cache} from 'next/cache';
import {Collection, getDocument} from './getDocument';


/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */

export const getCachedDocument = (collection: Collection, slug: string) => unstable_cache(
	async () => getDocument(collection, slug), [collection, slug], {
		tags: [`${collection}_${slug}`],
	})
