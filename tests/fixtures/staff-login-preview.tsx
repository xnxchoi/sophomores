import { createRoot } from "react-dom/client";
import { StaffLoginForm } from "@/lib/payload/admin/staff-login-form";

// This page has no backend: its own loopback server owns every auth response.
const parameters = new URLSearchParams(window.location.search);
const root = document.getElementById("root");
if (!root) throw new Error("The staff visual fixture requires its root element.");

createRoot(root).render(
  <section className="template-minimal template-minimal--width-normal staff:box-border staff:flex staff:min-h-svh staff:items-start staff:justify-center staff:p-[24px] staff:pt-[clamp(48px,18vh,160px)] staff:*:m-0 staff:*:w-full staff:*:max-w-[400px] staff:*:p-0">
    <div className="template-minimal__wrap">
      <StaffLoginForm nextPath="/fixture-complete" available={parameters.get("available") !== "false"} />
    </div>
  </section>
);
