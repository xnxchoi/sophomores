import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sophomores — local studies",
  robots: { index: false, follow: false }
};

const studies = [
  {
    route: "intro",
    title: "01 / The opening",
    detail: "Light, proposition, and the transition into the first chapter."
  },
  {
    route: "tickets",
    title: "02 / The night",
    detail: "Ticket quantity and transparent totals, not an agency estimate."
  },
  {
    route: "invitation",
    title: "03 / The invitation & film",
    detail:
      "One question at a time. A real reference player with perspective entrance and exit."
  }
];

export default function StudyIndex() {
  return (
    <main
      style={{
        minHeight: "100svh",
        padding: "clamp(24px, 6vw, 96px)",
        background: "#eeeae2",
        color: "#23231f"
      }}
    >
      <p style={{ fontSize: 14, letterSpacing: ".08em" }}>
        SOPHOMORES / LOCAL STUDIES
      </p>
      <h1
        style={{
          fontSize: "clamp(42px, 7vw, 100px)",
          lineHeight: 1.05,
          maxWidth: "12ch",
          margin: "64px 0 24px"
        }}
      >
        Three parts.
        <br />
        One story in progress.
      </h1>
      <p style={{ maxWidth: "56ch", lineHeight: 1.6 }}>
        Isolated experiments, not a replacement homepage. Copy and placement
        remain provisional. No registration or purchase is made here.
      </p>
      <nav
        aria-label="Interaction studies"
        style={{ marginTop: 56, maxWidth: 800 }}
      >
        {studies.map(({ route, title, detail }) => (
          <a
            key={route}
            href={`/studies/${route}`}
            style={{
              display: "block",
              padding: "24px 0",
              borderTop: "1px solid #a9a69e",
              color: "inherit",
              textDecoration: "none"
            }}
          >
            <h2 style={{ fontSize: 25, margin: "0 0 8px" }}>
              {title} <span aria-hidden="true">↗</span>
            </h2>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{detail}</p>
          </a>
        ))}
      </nav>
    </main>
  );
}
