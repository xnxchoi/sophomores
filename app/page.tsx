import TeaserExperience from "@/components/teaser/experience";
export default function Home() {
  return (
    <>
      <noscript>
        {/* A no-JS-only fallback must load without the Next client runtime. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/static-fallback.css" />
        <p className="no-script-note">
          Ticket sales open in ~10 days. Date to be announced. Ticket sales are
          not open yet.
        </p>
      </noscript>
      <TeaserExperience />
    </>
  );
}
