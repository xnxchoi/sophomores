import type { Metadata } from "next";
import { TicketStudy } from "@/components/tickets/ticket-study";
import "@/components/invitation/study.css";
import "@/components/tickets/tickets.css";

export const metadata: Metadata = {
  title: "sophomores — ticket interaction study",
  robots: { index: false, follow: false }
};

export default function TicketsStudyPage() {
  return <TicketStudy />;
}
