/**
 * The no-WebGL image set for each book: stripe.press's fallback manifest (module 24750, chunk 2k0q1kp4qmm_6) in our
 * shape. Their page swaps its 3D scene for these pre-rendered images when the browser has no WebGL2 (module 16909
 * `t`): a hero for each featured book, a spine and a cover for the shelf, and a 36-frame turn from hero to spine.
 * Ours are rendered from the owner's book model (scripts/stripe-press-vendor/render-fallback.cjs writes
 * fallback-manifest.json); none of theirs ship. Until a product has its own renders, it shows the placeholder set.
 *
 * A pure module shared by the no-WebGL components (no-webgl-book-layer.tsx, no-webgl-spine-row.tsx, no-webgl-cart-stack.tsx), so it sits
 * in this feature-private _shared/ folder rather than in either component.
 */
import manifest from "./fallback-manifest.json";

export type FallbackImage = { src: string; width: number; height: number };
/** The turn from the hero pose to the spine: frames in order, their size, and where the hero book sits in a frame. */
export type FallbackTurn = { frames: string[]; width: number; height: number; heroBox: { x: number; y: number; width: number; height: number } };
/** `cart`: the book lying flat, one per copy in the no-WebGL cart stack (rendered later than the rest, so a set may lack it). */
export type FallbackImages = { spine: FallbackImage; cover: FallbackImage; hero: FallbackImage; turn: FallbackTurn; cart?: FallbackImage };

type Manifest = { placeholder: FallbackImages | null; books: Record<string, FallbackImages> };

/** A book's images by its product id, or the placeholder set; null when nothing has been rendered yet. */
export function fallbackImagesFor(id: string): FallbackImages | null {
  const data = manifest as Manifest;
  return data.books[id] ?? data.placeholder;
}
