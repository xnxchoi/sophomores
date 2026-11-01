/** A Payload user name is required. Email sign-in does not collect one, so derive it. */
export function accountDisplayName(
  email?: string | null,
  name?: string | null
): string {
  const current = typeof name === "string" ? name.trim() : "";
  if (current) return current.slice(0, 80);
  const local =
    (email ?? "")
      .split("@")[0]
      ?.replace(/[._+-]+/g, " ")
      .trim() ?? "";
  return (local || "Member").slice(0, 80);
}

/** Staff eligibility is limited to the exact official domain, never its subdomains. */
export function isStaffEmail(email?: string | null): boolean {
  return (
    typeof email === "string" && /^[^\s@]+@sophomores\.co$/i.test(email.trim())
  );
}

export function isVerifiedStaff(user: {
  email?: string | null;
  emailVerified?: boolean | null;
}): boolean {
  return user.emailVerified === true && isStaffEmail(user.email);
}
