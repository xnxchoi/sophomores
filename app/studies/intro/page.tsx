import type { Metadata } from "next";
import { IntroStudy } from "../../../components/intro-study/intro-study";
import "../../../components/intro-study/intro.css";

export const metadata: Metadata = {
  title: "Sophomores — intro / first-section study",
  robots: { index: false, follow: false }
};

export default function IntroStudyPage() {
  return <IntroStudy />;
}
