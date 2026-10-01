import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeAbiParameters, encodeEventTopics, type Address, type Hex } from "viem";
import { USDG_ADDRESS, usdgAbi } from "./chain";
import { matchContractPayment, matchExactTransfer } from "./match-transfer";
import { slipPayAbi } from "./slip-pay";

const payer = "0x1111111111111111111111111111111111111111" as Address;
const payee = "0x2222222222222222222222222222222222222222" as Address;
const other = "0x3333333333333333333333333333333333333333" as Address;
const contract = "0x4444444444444444444444444444444444444444" as Address;
const amount = 40_000_000n;
const fee = 200_000n;

function paidLog(feeAmount: bigint) {
  const topics = encodeEventTopics({
    abi: slipPayAbi,
    eventName: "Paid",
    args: { payer, payee },
  });
  const data = encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [amount, feeAmount]);
  return { address: contract, topics, data };
}

function transferLog(to: Address, value: bigint, token: Address = USDG_ADDRESS) {
  const topics = encodeEventTopics({
    abi: usdgAbi,
    eventName: "Transfer",
    args: { from: payer, to },
  });
  const data = encodeAbiParameters([{ type: "uint256" }], [value]);
  return { address: token, topics, data };
}

describe("exact USDG transfer match", () => {
  it("accepts an exact transfer to the payee", () => {
    const from = matchExactTransfer([transferLog(payee, amount)], payee, amount);
    assert.equal(from, payer);
  });

  it("rejects a different amount", () => {
    assert.equal(matchExactTransfer([transferLog(payee, 40n * 10n ** 18n)], payee, amount), null);
    assert.equal(matchExactTransfer([transferLog(payee, 39_000_000n)], payee, amount), null);
  });

  it("rejects a transfer to someone else or another token", () => {
    assert.equal(matchExactTransfer([transferLog(other, amount)], payee, amount), null);
    assert.equal(
      matchExactTransfer([transferLog(payee, amount, other)], payee, amount),
      null,
    );
  });

  it("finds the matching log among others", () => {
    const logs = [transferLog(other, amount), transferLog(payee, amount)];
    assert.equal(matchExactTransfer(logs, payee, amount), payer);
  });

  it("accepts a contract payment that keeps the fee and pays the due", () => {
    const matched = matchContractPayment({
      logs: [paidLog(fee), transferLog(payee, amount), transferLog(contract, fee)],
      txTo: contract,
      contract,
      payee,
      amount,
    });
    assert.deepEqual(matched, { payer, fee });
  });

  it("rejects a direct transfer once the fee contract is the path", () => {
    assert.equal(
      matchContractPayment({
        logs: [transferLog(payee, amount)],
        txTo: USDG_ADDRESS,
        contract,
        payee,
        amount,
      }),
      null,
    );
  });

  it("rejects a fee above 1% and any extra amount taken from the payer", () => {
    assert.equal(
      matchContractPayment({
        logs: [paidLog(400_001n), transferLog(payee, amount), transferLog(contract, 400_001n)],
        txTo: contract,
        contract,
        payee,
        amount,
      }),
      null,
    );
    assert.equal(
      matchContractPayment({
        logs: [paidLog(fee), transferLog(payee, amount), transferLog(contract, fee), transferLog(other, 1n)],
        txTo: contract,
        contract,
        payee,
        amount,
      }),
      null,
    );
  });

  it("ignores logs that are not Transfer events", () => {
    assert.equal(
      matchExactTransfer(
        [{ address: USDG_ADDRESS, topics: ["0x" + "ab".repeat(32)] as Hex[], data: "0x" }],
        payee,
        amount,
      ),
      null,
    );
  });
});
