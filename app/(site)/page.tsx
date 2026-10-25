import { WarpStudy } from "@/components/Warp/warp-study";
export default function Home() {
  return (
    <>
      <noscript>
        {/* A no-JS-only fallback must load without the Next client runtime. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/static-fallback.css" />
      </noscript>
      <WarpStudy />
    </>
  );
}
