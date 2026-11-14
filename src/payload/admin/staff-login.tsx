import { redirect } from "next/navigation";
import { MinimalTemplate } from "@payloadcms/next/templates";
import { safeAdminDestination } from "@/lib/auth/cms-login";
import { getAuthMailer } from "@/lib/auth/options";
import { StaffLoginForm } from "./staff-login-form";
import "@/styles/staff-login.css";

type StaffLoginProps = {
  initPageResult: {
    req: {
      user?: unknown;
      payload: { config: { routes?: { admin?: string } } };
    };
  };
  searchParams?: { redirect?: string | string[] };
};

export function StaffLogin({ initPageResult, searchParams }: StaffLoginProps) {
  const adminRoute =
    initPageResult.req.payload.config.routes?.admin || "/admin";
  const nextPath = safeAdminDestination(searchParams?.redirect, adminRoute);
  if (initPageResult.req.user) redirect(nextPath);
  return (
    <MinimalTemplate className="staff:box-border staff:flex staff:min-h-svh staff:items-start staff:justify-center staff:p-[24px] staff:pt-[clamp(48px,18vh,160px)] staff:*:m-0 staff:*:w-full staff:*:max-w-[400px] staff:*:p-0">
      <StaffLoginForm
        nextPath={nextPath}
        available={Boolean(getAuthMailer())}
      />
    </MinimalTemplate>
  );
}
