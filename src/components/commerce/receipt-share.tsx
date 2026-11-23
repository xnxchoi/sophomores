"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/core/ArcFocus/ArcFocus";

export function ReceiptShare({ orderID, label }: { orderID: string; label: string }) {
  const [link, setLink] = useState("");
  useEffect(() => {
    setLink(new URL("/me/orders/" + encodeURIComponent(orderID), window.location.origin).href);
  }, [orderID]);
  // Share an authenticated URL, not address or payment information.
  return <CopyButton value={link} label={label} disabled={!link} variant="plain" className="min-h-12" />;
}
