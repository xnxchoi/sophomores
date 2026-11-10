import SetlistPage, { generateMetadata as generateSetlistMetadata } from "../setlists/[slug]/page";

export async function generateMetadata() {
  return generateSetlistMetadata({
    params: Promise.resolve({ slug: "seoul-2026" })
  });
}

export default function MusicPage() {
  return (
    <SetlistPage
      params={Promise.resolve({ slug: "seoul-2026" })}
    />
  );
}
