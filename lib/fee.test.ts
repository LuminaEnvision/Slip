import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { feeOn, formatFeePercent, MAX_FEE_BPS } from "./fee";

describe("fee", () => {
  it("charges 0.50% in 6-decimal units", () => {
    assert.equal(feeOn(40_000_000n, 50n), 200_000n);
    assert.equal(feeOn(200_000_000n, 50n), 1_000_000n);
  });

  it("matches the 1% contract cap", () => {
    assert.equal(feeOn(40_000_000n, BigInt(MAX_FEE_BPS)), 400_000n);
    assert.equal(formatFeePercent(50), "0.50%");
    assert.equal(formatFeePercent(100), "1.00%");
  });

  it("rounds a dust fee down to zero", () => {
    assert.equal(feeOn(1n, 50n), 0n);
  });
});
