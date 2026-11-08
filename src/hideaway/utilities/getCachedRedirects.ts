import {unstable_cache} from 'next/cache';
import {getRedirects} from './getRedirects';


/**
 * Returns a unstable_cache function mapped with the cache tag for 'redirects'.
 *
 * Cache all redirects together to avoid multiple fetches.
 */

export const getCachedRedirects = () => unstable_cache(async () => getRedirects(), ['redirects'], {
	tags: ['redirects'],
})
