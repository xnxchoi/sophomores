import s from "./Pricing.module.scss";

const TEASERS: { redacted: string; meta: string }[] = [
  { redacted: "▮▮▮▮▮ ▮▮ ▮▮▮▮▮", meta: "perfume — 2026.0?" },
  { redacted: "▮▮▮▮▮▮ ▮▮▮▮", meta: "apparel drop — soon" },
  { redacted: "▮▮▮▮ ▮▮ ▮▮▮▮▮▮▮", meta: "private dinner — 2026" }
];

export function DropTeaser() {
  return (
    <section
      aria-labelledby="drop-teaser"
      style={{
        padding: "60px 24px",
        maxWidth: "1180px",
        margin: "0 auto"
      }}
    >
      <header style={{ marginBottom: 24, maxWidth: "44ch" }}>
        <p className={s.eyebrow} style={{ marginBottom: 8 }}>
          Drops
        </p>
        <h2
          id="drop-teaser"
          style={{
            fontSize: "clamp(28px, 3vw, 36px)",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            margin: "0 0 12px"
          }}
        >
          What's coming
        </h2>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--pricing-fg-mute)"
          }}
        >
          Releases, parties, prints. Patrons see them first. Nobody gets a
          calendar.
        </p>
      </header>
      <div className={s.dropTeaser}>
        {TEASERS.map((t, i) => (
          <div key={i} className={s.dropTile}>
            <div className={s.dropRedacted}>{t.redacted}</div>
            <div className={s.dropMeta}>{t.meta}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
