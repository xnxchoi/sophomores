"use client";

import { QRCodeSVG } from "qrcode.react";

interface TicketQRProps {
  value: string;
  size?: number;
  label?: string;
}

export function TicketQR({ value, size = 240, label }: TicketQRProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-sm border border-border/30 bg-white p-4">
        <QRCodeSVG value={value} size={size} level="M" includeMargin={false} />
      </div>
      {label ? (
        <p className="font-sans text-[10px] tracking-widest text-muted-foreground/60 uppercase">
          {label}
        </p>
      ) : null}
    </div>
  );
}
