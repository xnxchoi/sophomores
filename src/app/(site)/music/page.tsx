import { getPayload } from "payload";
import config from "@payload-config";
import { loadSiteEditorial } from "@/payload/globals/site-editorial";
import SetlistPage, { generateMetadata as generateSetlistMetadata } from "../setlists/[slug]/page";

/**
 * The setlist staff chose in Site details (site-editorial.featuredSetlist). Until one is chosen, the launch
 * setlist this page always showed: the plan's one declared fallback, gone once the field is set.
 */
async function featuredSlug() {
  try {
    const { featuredSetlistSlug } = await loadSiteEditorial(await getPayload({ config }), "en");
    if (featuredSetlistSlug) return featuredSetlistSlug;
  } catch {
    console.error("Site details are unavailable; /music shows the launch setlist.");
  }
  return "seoul-2026";
}

export async function generateMetadata() {
  return generateSetlistMetadata({ params: Promise.resolve({ slug: await featuredSlug() }) });
}

export default async function MusicPage() {
  return <SetlistPage params={Promise.resolve({ slug: await featuredSlug() })} />;
}
