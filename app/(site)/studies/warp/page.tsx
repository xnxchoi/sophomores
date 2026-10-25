import type { Metadata } from "next";
import { Warp } from "@/components/Warp";

export const metadata: Metadata = {
  title: "Sophomores — entry motion study",
  robots: { index: false, follow: false }
};

export default function WarpStudyPage() {
  return <Warp />;
}
