import messages from "../../../messages/en.json";
import type { Metadata } from "next";
import { NotFoundPage } from "@/components/layouts/Missing/not-found-screen";

export const metadata: Metadata = {
  title: "404",
  description: messages.System.notFoundDescription
};

export default function NotFound() {
  return <NotFoundPage />;
}
