// Cauterization: Hideaway's Media/types also imports image collection slugs from
// @/types/collections/image-collections. Pass 1 only needs the viewport keys.
import { cssVariables } from "@/cssVariables";

export type ViewportSizes = keyof (typeof cssVariables)["breakpoints"];
