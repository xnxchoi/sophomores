import { TickerCrownClient } from "./TickerCrown.client";
import type { FieldConfig } from "./_shared/field-config";
import { Suspense } from "react";

interface FooterTickerCrownProps {
  /** Override the default field configuration. */
  config?: Partial<FieldConfig>;
}

/**
 * Server-safe shell. The actual band is a client island — see
 * `FooterTickerCrown.client.tsx`. Future v2 may fetch Payload-driven config
 * here without touching call sites.
 */
export function TickerCrown({ config }: FooterTickerCrownProps = {}) {
  return (
    <Suspense fallback={null}>
      <TickerCrownClient config={config} />
    </Suspense>
  );
}
