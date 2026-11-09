import { RenderImageFields } from "@/types/collections/image-collections";

/**
 * Generates src, srcset, and sizes attributes for an image
 * based on PayloadCMS generated sizes.
 * * @param media The media object from Payload
 * @param media
 * @param sizeSlot The "context" where this image is used (e.g., "card", "hero")
 */
export function getPayloadImageProps(
  media: RenderImageFields,
  sizeSlot: "card" | "hero" | "content" | "thumb" = "content"
) {
  // 1. Define UI scenarios (The "Sizes" attribute)
  // This tells the browser: "If the viewport is X wide, this image slot takes up Y width"
  const slotSizes = {
    thumb: "(max-width: 768px) 100px, 320px",
    card: "(max-width: 768px) 100vw, 33vw", // Full width mobile, 1/3 desktop
    content: "(max-width: 768px) 100vw, 800px", // Full mobile, fixed max desktop
    hero: "100vw" // Always full width
  };
  //
  // // 2. Build the SrcSet from available Payload sizes
  // // We filter out sizes that are undefined or missing URLs
  // const availableSizes = Object.values(media.sizes || {})
  //     .filter(size => size && size.url && size.width)
  //     .map(size => `${size.url} ${size.width}w`);
  //
  // // Add the original image as the largest option
  // availableSizes.push(`${media.src} ${media.width}w`);

  return {
    src: media.src, // Fallback
    // srcSet: availableSizes.join(', '),
    sizes: slotSizes[sizeSlot] || "100vw",
    alt: media.alt || "Article Image",
    width: media.width,
    height: media.height
  };
}
