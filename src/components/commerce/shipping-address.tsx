"use client";
import { useTranslations } from "next-intl";


import Script from "next/script";
import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { DrawnField } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ShippingAddress } from "@/lib/commerce/contracts";

type PostcodeResult = { zonecode: string; roadAddress?: string; jibunAddress?: string; address?: string };
type PostcodeService = { Postcode: new (options: {
  oncomplete: (result: PostcodeResult) => void;
  width: string; height: number;
}) => { embed: (element: HTMLElement) => void } };

/** The vendor owns search and branding; manual entry never depends on its script. */
export function ShippingAddressForm({ value, onChange, disabled = false }: {
  value: ShippingAddress; onChange: (value: ShippingAddress) => void; disabled?: boolean;
}) {
  const t = useTranslations('Customer.components_commerce_shipping_address');
  const id = useId();
  const searchPanel = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const detail = useRef<HTMLInputElement>(null);
  const current = useRef({ value, onChange, disabled });
  const searching = useRef(false);
  useEffect(() => { current.current = { value, onChange, disabled }; }, [value, onChange, disabled]);
  useEffect(() => () => { searching.current = false; }, []);

  function showSearch() {
    const services = window as Window & { kakao?: PostcodeService; daum?: PostcodeService };
    const service = services.kakao?.Postcode ? services.kakao : services.daum;
    if (!service?.Postcode || !searchPanel.current) { setSearchError(true); return; }
    try {
      new service.Postcode({ width: "100%", height: 440, oncomplete: (result) => {
        if (!searching.current || current.current.disabled) return;
        const address = result.roadAddress || result.jibunAddress || result.address;
        if (!/^\d{5}$/.test(result.zonecode) || !address || address.length > 300) {
          setSearchError(true); return;
        }
        current.current.onChange({ ...current.current.value, postalCode: result.zonecode, addressLine1: address });
        searching.current = false;
        setSearchOpen(false); setSearchError(false); detail.current?.focus();
      } }).embed(searchPanel.current);
    } catch { setSearchError(true); }
  }

  return <fieldset disabled={disabled} className="grid min-w-0 gap-x-6 gap-y-5 md:grid-cols-2">
    <legend className="mb-4 text-xs uppercase tracking-[0.04em]">{t('deliveryAddress')}</legend>
    <input type="hidden" name="country" value="KR" />
    <DeliveryField label={t('recipient')} id={id + "-recipient"} name="recipientName" autoComplete="shipping name" required maxLength={100}
        value={value.recipientName} onChange={(event) => onChange({ ...value, recipientName: event.target.value })} />
    {/* Korea only: the server's rule takes domestic numbers (010-…) as well as +82, so a plain tel field is enough. */}
    <DeliveryField label={t('deliveryPhone')} id={id + "-phone"} name="phone" type="tel" inputMode="tel" autoComplete="shipping tel" required maxLength={20}
        value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })} />
    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto] md:col-span-2 md:max-w-xl [&>button]:justify-self-start">
      <DeliveryField label={t('postcode')} id={id + "-postcode"} name="postalCode" inputMode="numeric" autoComplete="shipping postal-code"
          required pattern="[0-9]{5}" maxLength={5} value={value.postalCode}
          onChange={(event) => onChange({ ...value, postalCode: event.target.value })} />
      {/* An in-place action (spec §4): tracked caps with a dotted underline. */}
      <button type="button" aria-expanded={searchOpen} aria-controls={id + "-search"}
        onClick={() => { setSearchError(false); searching.current = !searchOpen; setSearchOpen(!searchOpen); }}
        className="inline-flex min-h-11 items-center text-xs uppercase tracking-[0.04em] underline decoration-dotted underline-offset-4 outline-offset-4 hover:decoration-solid focus-visible:outline-2 disabled:opacity-40">
        {searchOpen ? t('closeSearch') : t('searchAddress')}
      </button>
    </div>
    {searchOpen && <div id={id + "-search"} className="overflow-hidden rounded-xl border border-border bg-white md:col-span-2">
      <div ref={searchPanel} className="h-110 w-full" />
      <Script src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive" onReady={showSearch} onError={() => setSearchError(true)} />
    </div>}
    <p role="status" className="min-h-5 text-xs leading-5 text-muted-foreground md:col-span-2">
      {searchError ? t('addressSearchIsUnavailableEnterYourAddressBelow') : null}
    </p>
    <DeliveryField wide label={t('address')} id={id + "-address"} name="addressLine1" autoComplete="shipping address-line1" required maxLength={300}
        value={value.addressLine1} onChange={(event) => onChange({ ...value, addressLine1: event.target.value })} />
    <DeliveryField label={t('detailedAddress')} ref={detail} id={id + "-detail"} name="addressLine2" autoComplete="shipping address-line2" maxLength={200}
        value={value.addressLine2 ?? ""} onChange={(event) => onChange({ ...value, addressLine2: event.target.value })} />
    <DeliveryField label={t('deliveryInstructionsOptional')} id={id + "-instructions"} name="deliveryInstructions" maxLength={500} value={value.deliveryInstructions ?? ""}
        onChange={(event) => onChange({ ...value, deliveryInstructions: event.target.value })} />
  </fieldset>;
}

/** The underlined field, the same as the email step (owner: "1. Checkout - underlined"): label above, one height in every state. */
function DeliveryField({ wide = false, ...props }: Omit<ComponentProps<typeof DrawnField>, "steady"> & { wide?: boolean }) {
  return <div className={cn("min-w-0", wide && "md:col-span-2")}><DrawnField steady {...props} /></div>;
}
