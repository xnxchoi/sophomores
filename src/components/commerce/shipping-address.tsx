"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
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

  return <fieldset disabled={disabled} className="space-y-4">
    <legend className="mb-4 text-lg font-medium">Delivery address</legend>
    <input type="hidden" name="country" value="KR" />
    <AddressField label="Recipient" id={id + "-recipient"}>
      <DeliveryInput id={id + "-recipient"} name="recipientName" autoComplete="shipping name" required maxLength={100}
        value={value.recipientName} onChange={(event) => onChange({ ...value, recipientName: event.target.value })}
        />
    </AddressField>
    <AddressField label="Delivery phone" id={id + "-phone"}>
      <DeliveryInput id={id + "-phone"} name="phone" type="tel" autoComplete="shipping tel" required maxLength={24}
        value={value.phone} onChange={(event) => onChange({ ...value, phone: event.target.value })}
        />
    </AddressField>
    <div className="grid grid-cols-[1fr_auto] items-end gap-3">
      <AddressField label="Postcode" id={id + "-postcode"}>
        <DeliveryInput id={id + "-postcode"} name="postalCode" inputMode="numeric" autoComplete="shipping postal-code"
          required pattern="[0-9]{5}" maxLength={5} value={value.postalCode}
          onChange={(event) => onChange({ ...value, postalCode: event.target.value })}
          />
      </AddressField>
      <button type="button" aria-expanded={searchOpen} aria-controls={id + "-search"}
        onClick={() => { setSearchError(false); searching.current = !searchOpen; setSearchOpen(!searchOpen); }}
        className="min-h-12 rounded-xl border border-white/20 px-4 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4">
        {searchOpen ? "Close search" : "Search address"}
      </button>
    </div>
    {searchOpen && <div id={id + "-search"} className="overflow-hidden rounded-xl border border-white/15 bg-white">
      <div ref={searchPanel} className="h-110 w-full" />
      <Script src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive" onReady={showSearch} onError={() => setSearchError(true)} />
    </div>}
    <p role="status" className="min-h-5 text-xs leading-5 text-neutral-400">
      {searchError ? "Address search is unavailable. Enter your address below." : null}
    </p>
    <AddressField label="Address" id={id + "-address"}>
      <DeliveryInput id={id + "-address"} name="addressLine1" autoComplete="shipping address-line1" required maxLength={300}
        value={value.addressLine1} onChange={(event) => onChange({ ...value, addressLine1: event.target.value })}
        />
    </AddressField>
    <AddressField label="Detailed address" id={id + "-detail"}>
      <DeliveryInput ref={detail} id={id + "-detail"} name="addressLine2" autoComplete="shipping address-line2" maxLength={200}
        value={value.addressLine2 ?? ""} onChange={(event) => onChange({ ...value, addressLine2: event.target.value })}
        />
    </AddressField>
    <AddressField label="Delivery instructions (optional)" id={id + "-instructions"}>
      <DeliveryInput id={id + "-instructions"} name="deliveryInstructions" maxLength={500} value={value.deliveryInstructions ?? ""}
        onChange={(event) => onChange({ ...value, deliveryInstructions: event.target.value })}
        />
    </AddressField>
  </fieldset>;
}

function DeliveryInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} className="min-h-12 rounded-xl border border-white/20 bg-white/5 px-4 text-base focus-visible:border-white focus-visible:ring-white/20" />;
}

function AddressField({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium text-neutral-300">{label}</label>{children}</div>;
}
