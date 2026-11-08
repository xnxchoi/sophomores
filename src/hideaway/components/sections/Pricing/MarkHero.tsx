import { getTranslations } from "next-intl/server";
import type { ResolvedPlan } from "@/app/(frontend)/(site)/(pages)/plans/getPlansData";
import s from "./Pricing.module.scss";

type MarkHeroProps = {
  plans: ResolvedPlan[];
};

const PLAN_ORDER: ResolvedPlan["tier"][] = ["resident", "patron"];

export async function MarkHero({ plans }: MarkHeroProps) {
  const t = await getTranslations("Plans.hero");
  const visiblePlans = PLAN_ORDER.map((tier) =>
    plans.find((plan) => plan.tier === tier)
  ).filter((plan): plan is ResolvedPlan => Boolean(plan));

  return (
    <section aria-labelledby="plans-hero-title" className={s.markHero}>
      <div className={s.heroCopy}>
        <p className={s.eyebrow}>{t("eyebrow")}</p>
        <h1 id="plans-hero-title" className={s.heroTitle}>
          {t("title")}
        </h1>
        <p className={s.heroLead}>{t("lead")}</p>
        <div className={s.heroActions} aria-label={t("actionsLabel")}>
          <a href="#membership-options" className={s.heroPrimary}>
            {t("primaryCta")}
          </a>
          <a href="#faq" className={s.heroSecondary}>
            {t("secondaryCta")}
          </a>
        </div>
      </div>

      <aside className={s.heroPanel} aria-label={t("panelEyebrow")}>
        <div className={s.heroMark} aria-hidden>
          <svg
            className={s.markSvg}
            viewBox="0 0 1243.01 601.76"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              className={s.markWordmark}
              d="m929,311.76c-10.88-1.12-21.19,11.08-31,20l-114,242c-11.48,22.63.45,10.59-2,27.65h-222.35c13.63-14.62,22.23-27.5,34.42-51.52l34.28-67.54h-348.51l-34.28,67.54c-11.48,22.63-16.13,35.86-17.88,51.52l-227.69.35c13.45-14.27,26-24,26-24l127-254s-2.05,2.97-.65-12h250.48c-3.42,3.86-27.82,8-27.82,8l-16.67,5.29-18.07,38.23-29.33,57.79h348.51l29.33-57.79c12.19-24.02,17.19-37.95,17.88-51.52h222.35Z"
              fill="currentColor"
            />
            <path
              className={s.markStarburst}
              d="m1210.61,184.55c-67.81-8.17-103.89-15.7-125.49-36.44-21.47-20.61-29.57-55.36-38.64-120.77l-3.79-27.34-3.54,27.38c-8.47,65.51-16.25,100.35-37.53,121.19-21.41,20.97-57.41,28.9-125.15,37.81l-32.37,4.26,32.41,3.9c67.81,8.17,103.89,15.7,125.49,36.44,21.47,20.61,29.57,55.36,38.64,120.77l3.79,27.34,3.54-27.38c8.47-65.51,16.25-100.35,37.53-121.19,21.41-20.97,57.41-28.9,125.15-37.81l32.37-4.26-32.41-3.9Z"
            />
          </svg>
        </div>
        <div className={s.heroPanelHeader}>
          <p className={s.eyebrow}>{t("panelEyebrow")}</p>
          <h2>{t("panelTitle")}</h2>
        </div>
        {visiblePlans.length ? (
          <div className={s.heroPlanRows}>
            {visiblePlans.map((plan) => (
              <div key={plan.id} className={s.heroPlanRow}>
                <span>{plan.tier_label}</span>
                <strong>{plan.price.display}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className={s.heroPanelFallback}>{t("panelFallback")}</p>
        )}
      </aside>
    </section>
  );
}
