import type { Metadata } from "next";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";

export const metadata: Metadata = {
  title: "404...",
  description: "NOT AN EXIT"
};

export default function NotFound() {
  return <NotFoundPage />;
}
