import type { Metadata } from "next";
import { WarpStudy } from "./warp-study";

export const metadata: Metadata = {
  title: "Sophomores — entry motion study",
  robots: { index: false, follow: false }
};

export default function WarpStudyPage() {
  return <WarpStudy />;
}
