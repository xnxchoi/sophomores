/**
 * Where "/" leads. The Warp home shows only inside the owner's window or after an entry link (src/payload/globals/
 * home-entry.ts); every other visitor goes to the default home. Owner, 24 Nov: "we should probably make the users go to
 * shop home by default", and "we need a home page… osklen's hero + something else", so this may become a new home page:
 * change it here, and nowhere else names it.
 */
export const defaultHomeHref = "/shop";

/** The first-party cookie that keeps the Warp home for a visit (signed; see home-entry.server.ts). */
export const warpEntryCookie = "sphmrs_warp";

/** The route that decides where a cookie-less "/" goes (next.config.ts rewrites "/" to it). */
export const homeEntryGatePath = "/home-entry";

/** Entry links: /w/<code>. Kept out of the request log (next.config.ts). */
export const entryLinkPrefix = "/w/";

/**
 * Marks the gate's own way back to "/" inside an open window, so that request skips the gate (next.config.ts) and is
 * never sent round again, even when the browser refuses the cookie. The page drops it from the address bar.
 */
export const homeEntryMarker = "entry";
