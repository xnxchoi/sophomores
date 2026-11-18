import messages from "../../../messages/en.json";
import type { Metadata } from "next";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";
import { holdThemeBoot } from "@/lib/content/theme";

export const metadata: Metadata = {
  title: "404",
  description: messages.System.notFoundDescription
};

// The 404 holds dark from its first frame (owner, 2026-11-16). The boot script can't know a missing
// path, so this script applies the hold before the page paints on a full load; MissingLayout keeps it
// on client navigation and releases it on leaving.
export default function NotFound() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: holdThemeBoot("dark") }} />
      <NotFoundPage />
    </>
  );
}
