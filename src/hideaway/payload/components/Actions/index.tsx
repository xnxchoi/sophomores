"use client";

import { useVaultSidebar } from "@/payload/providers/Admins";
import { House } from "lucide-react";
import { AdminDarkmode } from "../Darkmode";
import Link from "next/link";

export default function GoToHome() {
  const sidebarEnabled = useVaultSidebar((r) => r.enabled);
  return (
    <div className={"flex items-center gap-5"}>
      <GoHome />
      <AdminDarkmode />
    </div>
  );
}
const GoHome = () => {
  return (
    <Link
      className={
        "relative flex aspect-square w-[24px] items-center justify-center"
      }
      href="/home"
      target="_blank"
    >
      <House data-themed={"fill"} className={"w-[15px]"} />
    </Link>
  );
};
const Sidebar = () => {};
