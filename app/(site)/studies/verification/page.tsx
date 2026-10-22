import { VerificationStudy } from "@/components/phone-verification/verification-study";
import "@/components/phone-verification/verification.css";

export const metadata = {
  title: "Phone verification — sophomores",
  robots: { index: false, follow: false }
};

export default function VerificationStudyPage() {
  return <VerificationStudy />;
}
