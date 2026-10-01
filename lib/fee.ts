import { getAddress, isAddress, type Address } from "viem";

/** 0.50% of the due, charged on top. The contract cannot go above MAX_FEE_BPS. */
export const DEFAULT_FEE_BPS = 50;
export const MAX_FEE_BPS = 100;
export const FEE_DENOMINATOR = 10_000n;

/** Integer fee in USDG base units. Matches SlipPay.feeOn. */
export function feeOn(amount: bigint, bps: bigint): bigint {
  return (amount * bps) / FEE_DENOMINATOR;
}

export function formatFeePercent(bps: bigint | number): string {
  const hundredths = Number(bps);
  const whole = Math.trunc(hundredths / 100);
  const frac = Math.abs(hundredths % 100);
  return `${whole}.${frac.toString().padStart(2, "0")}%`;
}

/** Contract that collects the fee. Empty until it is deployed. */
export function slipPayAddress(): Address | null {
  const raw = process.env.NEXT_PUBLIC_SLIP_PAY?.trim() ?? "";
  if (!raw || !isAddress(raw, { strict: false })) return null;
  return getAddress(raw);
}
