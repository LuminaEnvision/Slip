import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatUsdgDollars, formatUsdgExact, parseUsdToUsdg } from "./money";

describe("USDG amounts use 6 decimals", () => {
  it("stores $40 as 40_000_000 base units", () => {
    assert.equal(parseUsdToUsdg("40"), 40_000_000n);
    assert.equal(parseUsdToUsdg("40.00"), 40_000_000n);
    assert.equal(parseUsdToUsdg("$40.00"), 40_000_000n);
    assert.equal(parseUsdToUsdg("40"), 40n * 1_000_000n);
    assert.notEqual(parseUsdToUsdg("40"), 40n * 10n ** 18n);
  });

  it("stores $200 as 200_000_000 base units", () => {
    assert.equal(parseUsdToUsdg("200"), 200_000_000n);
    assert.equal(formatUsdgDollars(200_000_000n), "200.00");
  });

  it("shows $40.00 and the exact 6-decimal figure", () => {
    const units = parseUsdToUsdg("40");
    assert.equal(formatUsdgDollars(units), "40.00");
    assert.equal(formatUsdgExact(units), "40.000000");
    assert.equal(formatUsdgDollars(units).includes("e"), false);
    assert.equal(formatUsdgExact(units).includes("e"), false);
  });

  it("keeps sub-cent precision instead of rounding", () => {
    assert.equal(parseUsdToUsdg("40.123456"), 40_123_456n);
    assert.equal(formatUsdgExact(40_123_456n), "40.123456");
    assert.equal(formatUsdgDollars(40_123_456n), "40.123456");
    assert.equal(formatUsdgDollars(40_500_000n), "40.50");
  });

  it("rejects zero, scientific notation, and more than 6 decimals", () => {
    assert.throws(() => parseUsdToUsdg("0"), /more than 0/);
    assert.throws(() => parseUsdToUsdg("1e6"), /6 decimals/);
    assert.throws(() => parseUsdToUsdg("40.1234567"), /6 decimals/);
    assert.throws(() => parseUsdToUsdg(""), /6 decimals/);
  });
});
