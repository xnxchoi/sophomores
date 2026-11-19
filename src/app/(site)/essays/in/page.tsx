import ReadingListingPage from "./[pageNumber]/page";

export { generateMetadata } from "./[pageNumber]/page";

/** The listing's first page, as The Hideaway's essays/in/page.tsx. */
export default function ReadingListingFirstPage() {
  return <ReadingListingPage params={Promise.resolve({ pageNumber: "1" })} />;
}
