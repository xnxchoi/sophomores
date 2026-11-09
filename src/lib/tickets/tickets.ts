export const TicketClamp = { minimum: 1, maximum: 6 } as const;

function validateQuantity(quantity: number): void {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity < TicketClamp.minimum ||
    quantity > TicketClamp.maximum
  ) {
    throw new RangeError("Quantity must be an integer within the study range.");
  }
}

/** Null is an unannounced price, never a zero-price offer. Amounts use integer minor units. */
export function computeTicketTotal(
  unitAmountMinor: number | null,
  quantity: number
): number | null {
  validateQuantity(quantity);
  if (unitAmountMinor === null) return null;
  if (!Number.isSafeInteger(unitAmountMinor) || unitAmountMinor < 0) {
    throw new RangeError("Ticket amount must be a non-negative safe integer.");
  }
  const total = unitAmountMinor * quantity;
  if (!Number.isSafeInteger(total))
    throw new RangeError("Ticket total exceeds safe integer precision.");
  return total;
}

export function changeTicketQuantity(
  quantity: number,
  direction: -1 | 1
): number {
  validateQuantity(quantity);
  if (direction !== -1 && direction !== 1)
    throw new RangeError("Quantity changes must be one ticket at a time.");
  return Math.max(
    TicketClamp.minimum,
    Math.min(TicketClamp.maximum, quantity + direction)
  );
}

export function ticketQuantityLabel(quantity: number): string {
  validateQuantity(quantity);
  return `${quantity} ${quantity === 1 ? "ticket" : "tickets"}`;
}
