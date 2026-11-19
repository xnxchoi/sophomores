import { getTranslations } from "next-intl/server";
import type { SellerInformation } from "@/lib/commerce/disclosures";
import type { BusinessFacts } from "@/payload/globals/business-info";

export type HelpContactChannel = Readonly<{ name: string; phone?: string; email?: string }> | null;

const filled = (value?: string | null) => (value?.trim() ? value.trim() : undefined);

/**
 * Published contact only. The owner's complete business facts win as one unit (they carry the
 * customer-service phone and email); otherwise the published seller; otherwise nothing, and the
 * section says so. Sources are never mixed, and nothing is shown that was not published.
 */
export function selectHelpContact(facts: BusinessFacts | null, seller?: SellerInformation | null): HelpContactChannel {
  const chosen = facts
    ? { name: facts.tradeName, phone: filled(facts.customerServicePhone), email: filled(facts.customerServiceEmail) }
    : seller ? { name: seller.name, phone: filled(seller.phone), email: undefined } : null;
  return chosen && (chosen.phone || chosen.email) ? chosen : null;
}

/**
 * A dial target only for a number that reads as a Korean phone number after separators are stripped:
 * mobile 01[016789] plus 7-8 digits; Seoul 02 or regional 0[3-6][1-5] plus 7-8 digits; 070/080 plus
 * 7-8 digits (the prefixes the published-seller schema also accepts); national service numbers
 * 15xx/16xx/18xx plus 4 digits; or the same numbers written in +82 form. Anything else stays plain text.
 */
export function dialTarget(phone: string) {
  const compact = phone.replace(/[\s().-]/g, "");
  if (/^1[568]\d{6}$/.test(compact)) return `tel:${compact}`;
  const national = compact.startsWith("+82") ? "0" + compact.slice(3).replace(/^0/, "") : compact;
  const valid = /^01[016789]\d{7,8}$/.test(national) || /^02\d{7,8}$/.test(national)
    || /^0[3-6][1-5]\d{7,8}$/.test(national) || /^0[78]0\d{7,8}$/.test(national);
  return valid ? `tel:+82${national.slice(1)}` : null;
}

export async function HelpContact({ contact, seller }: {
  contact?: HelpContactChannel;
  /** Earlier callers pass the published seller directly; it is read the same way as `contact`. */
  seller?: SellerInformation | null;
}) {
  const t = await getTranslations("Customer.app_site_help_page");
  const channel = contact !== undefined ? contact : selectHelpContact(null, seller);
  const dial = channel?.phone ? dialTarget(channel.phone) : null;
  return <section className="mt-14 scroll-mt-28 border-t border-border pt-10" id="help-contact-section" aria-labelledby="help-contact">
    <h2 id="help-contact" className="scroll-mt-28 font-heading text-2xl tracking-tight sm:text-3xl">{t("contact.title")}</h2>
    {channel ? <>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("contact.description")}</p>
      <p className="mt-8 text-sm">{channel.name}</p>
      <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {channel.phone && <div>
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">{t("contact.phone")}</dt>
          <dd className="mt-1">
            {/* A published value that is not a dialable number is shown as written, without a dead call link. */}
            {dial
              ? <a href={dial} className="inline-flex min-h-12 items-center text-lg underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{channel.phone}</a>
              : <span className="inline-flex min-h-12 items-center text-lg">{channel.phone}</span>}
          </dd>
        </div>}
        {channel.email && <div className="min-w-0">
          <dt className="text-xs tracking-widest text-muted-foreground uppercase">{t("contact.email")}</dt>
          <dd className="mt-1">
            <a href={`mailto:${channel.email}`} className="inline-flex min-h-12 max-w-full items-center text-lg break-all underline decoration-current/40 underline-offset-4 outline-offset-4 hover:decoration-current focus-visible:outline-2">{channel.email}</a>
          </dd>
        </div>}
      </dl>
    </> : <p className="mt-4 border-l-2 border-border pl-5 text-base leading-relaxed text-muted-foreground">{t("contact.unavailable")}</p>}
  </section>;
}
