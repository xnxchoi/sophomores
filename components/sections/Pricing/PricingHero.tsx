import s from "./Pricing.module.scss";

export type PricingHeroProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function PricingHero({ eyebrow, title, subtitle }: PricingHeroProps) {
  return (
    <header className={s.fadeIn}>
      <div
        style={{
          textAlign: "center",
          padding: "120px 24px 56px",
          maxWidth: "780px",
          margin: "0 auto"
        }}
      >
        <p className={s.eyebrow} style={{ marginBottom: 18 }}>
          {eyebrow}
        </p>
        <h1
          className={s.gradientTitle}
          style={{
            fontSize: "clamp(48px, 7vw, 88px)",
            fontWeight: 300,
            lineHeight: 1,
            margin: "0 0 22px"
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.55,
            color: "var(--pricing-fg-mute)",
            maxWidth: "52ch",
            margin: "0 auto"
          }}
        >
          {subtitle}
        </p>
      </div>
    </header>
  );
}
