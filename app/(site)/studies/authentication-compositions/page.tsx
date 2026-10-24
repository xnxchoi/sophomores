import { AuthenticationCompositionStudies } from "@/components/authentication-studies/composition-studies";

export const metadata = {
  title: "Account entry — live composition studies",
  robots: { index: false, follow: false }
};

export default function AuthenticationCompositionsPage() {
  return <AuthenticationCompositionStudies />;
}
