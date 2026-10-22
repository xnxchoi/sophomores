import type { Metadata } from "next";
import { IntroStudy } from "@/components/entry-animation/intro-study";
import "@/components/entry-animation/intro.css";

export const metadata: Metadata = {
  title: "Sophomores — intro / first-section study",
  robots: { index: false, follow: false }
};

export default function IntroStudyPage() {
  return <IntroStudy />;
}
