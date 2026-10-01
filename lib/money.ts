import { formatUnits, parseUnits } from "viem";
import { InputError } from "./input-error";

const DECIMALS = 6;
const MAX = parseUnits("10000000", DECIMALS);

export function parseUsdToUsdg(input: string): bigint {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) {
    throw new InputError("Enter an amount like 40 or 40.00. USDG has 6 decimals.");
  }
  const units = parseUnits(cleaned, DECIMALS);
  if (units <= 0n) {
    throw new InputError("Amount must be more than 0.");
  }
  if (units > MAX) {
    throw new InputError("Amount is too large.");
  }
  return units;
}

/** Headline amount. Keeps sub-cent digits so value is never rounded away. */
export function formatUsdgDollars(units: bigint): string {
  const exact = formatUsdgExact(units);
  const [whole, frac] = exact.split(".");
  if (frac.slice(2).replace(/0+$/, "") !== "") return exact;
  return `${whole}.${frac.slice(0, 2)}`;
}

/** Always 6 decimal places, never scientific notation. */
export function formatUsdgExact(units: bigint): string {
  const negative = units < 0n;
  const raw = formatUnits(negative ? -units : units, DECIMALS);
  const [whole, frac = ""] = raw.split(".");
  const text = `${whole}.${frac.padEnd(DECIMALS, "0")}`;
  if (text.includes("e") || text.includes("E")) {
    throw new Error("Refusing to format USDG in scientific notation.");
  }
  return negative ? `-${text}` : text;
}
