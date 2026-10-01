import { decodeEventLog, getAddress, type Address, type Hex } from "viem";
import { USDG_ADDRESS, usdgAbi } from "./chain";
import { FEE_DENOMINATOR, MAX_FEE_BPS } from "./fee";
import { slipPayAbi } from "./slip-pay";

export type TxLog = {
  address: string;
  topics: readonly Hex[];
  data: Hex;
};

type Transfer = { from: Address; to: Address; value: bigint };

function decodeTransfers(logs: readonly TxLog[]): Transfer[] {
  const token = USDG_ADDRESS.toLowerCase();
  const transfers: Transfer[] = [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== token) continue;
    if (log.topics.length < 3) continue;
    try {
      const decoded = decodeEventLog({
        abi: usdgAbi,
        eventName: "Transfer",
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      transfers.push({
        from: getAddress(decoded.args.from),
        to: getAddress(decoded.args.to),
        value: decoded.args.value,
      });
    } catch {
      continue;
    }
  }
  return transfers;
}

/** Payer address when a log is an exact USDG transfer to the payee. */
export function matchExactTransfer(logs: readonly TxLog[], payee: Address, amount: bigint): Address | null {
  const to = payee.toLowerCase();
  for (const transfer of decodeTransfers(logs)) {
    if (transfer.to.toLowerCase() !== to) continue;
    if (transfer.value !== amount) continue;
    return transfer.from;
  }
  return null;
}

/**
 * Payer and fee when the transaction called SlipPay, the payee got the due,
 * and the payer spent only that due plus the fee kept by the contract.
 */
export function matchContractPayment(input: {
  logs: readonly TxLog[];
  txTo: string | null | undefined;
  contract: Address;
  payee: Address;
  amount: bigint;
}): { payer: Address; fee: bigint } | null {
  if (!input.txTo || input.txTo.toLowerCase() !== input.contract.toLowerCase()) return null;

  const contract = input.contract.toLowerCase();
  const paid: { payer: Address; payee: Address; amount: bigint; fee: bigint }[] = [];
  for (const log of input.logs) {
    if (log.address.toLowerCase() !== contract) continue;
    try {
      const decoded = decodeEventLog({
        abi: slipPayAbi,
        eventName: "Paid",
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      paid.push({
        payer: getAddress(decoded.args.payer),
        payee: getAddress(decoded.args.payee),
        amount: decoded.args.amount,
        fee: decoded.args.fee,
      });
    } catch {
      continue;
    }
  }
  if (paid.length !== 1) return null;

  const event = paid[0];
  if (event.payee.toLowerCase() !== input.payee.toLowerCase()) return null;
  if (event.amount !== input.amount) return null;
  const maxFee = (input.amount * BigInt(MAX_FEE_BPS)) / FEE_DENOMINATOR;
  if (event.fee > maxFee) return null;

  const payer = event.payer.toLowerCase();
  const payee = input.payee.toLowerCase();
  const spent = decodeTransfers(input.logs).filter((transfer) => transfer.from.toLowerCase() === payer);
  const toPayee = spent.filter((transfer) => transfer.to.toLowerCase() === payee && transfer.value === input.amount);
  if (toPayee.length !== 1) return null;

  const toContract = spent.filter((transfer) => transfer.to.toLowerCase() === contract && transfer.value === event.fee);
  if (event.fee === 0n) {
    if (toContract.length !== 0) return null;
  } else if (toContract.length !== 1) {
    return null;
  }

  const total = spent.reduce((sum, transfer) => sum + transfer.value, 0n);
  if (total !== input.amount + event.fee) return null;
  return { payer: event.payer, fee: event.fee };
}
