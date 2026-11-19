import type { TeamPerson } from "@/app/(site)/team/team-credits";

/**
 * Preview-only roster for the live check of /team's populated path. Synthetic names; no real
 * people. Never publish it or pass it from production code. To render it locally, temporarily
 * pass it as `people` from src/app/(site)/team/page.tsx in the preview checkout, then revert.
 *
 * Shape coverage: four role groups, enough names to overflow the stage so the roll loops, one
 * portrait (an existing site asset), bios, a site-path link, a web link and a malformed link
 * (which the viewer must leave out).
 */
const names = (prefix: string, role: string, count: number, start: number): TeamPerson[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `preview-${prefix}-${index + 1}`,
    name: `Preview Person ${String(start + index).padStart(2, "0")}`,
    role,
  }));

export const previewRoster: TeamPerson[] = [
  {
    id: "preview-founder-1",
    name: "Preview Person 01",
    role: "Fixture role A",
    bio: "Fixture biography for the preview only.\nA second line to check line breaks.",
    href: "/help",
    profilePic: { src: "/teaser/portrait.webp", alt: "Fixture portrait" },
  },
  { id: "preview-founder-2", name: "Preview Person 02", role: "Fixture role A", bio: "Short fixture biography.", href: "https://example.com/" },
  { id: "preview-founder-3", name: "Preview Person 03", role: "Fixture role A", href: "not a link" },
  ...names("b", "Fixture role B", 7, 4),
  ...names("c", "Fixture role C", 8, 11),
  ...names("d", "Fixture role D with a longer label", 6, 19),
];
