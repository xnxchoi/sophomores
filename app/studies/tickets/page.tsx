import type { Metadata } from "next";
import { TicketStudy } from "../../../components/ticket-study/ticket-study";
import "../../../components/invitation-study/study.css";
import "../../../components/ticket-study/tickets.css";

export const metadata: Metadata = {
  title: "sophomores — ticket interaction study",
  robots: { index: false, follow: false }
};

export default function TicketsStudyPage() {
  return <TicketStudy />;
}
