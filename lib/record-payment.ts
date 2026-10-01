import "server-only";
import { isHash } from "viem";
import { InputError } from "./input-error";
import { getDue, getSlipByDue, getSlipByHash, insertSlip, type SlipRecord } from "./db";
import { slipPayAddress } from "./fee";
import { matchContractPayment, matchExactTransfer } from "./match-transfer";
import { formatUsdgDollars } from "./money";
import { notifyPayee } from "./push";
import { rpc } from "./rpc";

export async function recordPayment(dueId: string, txHash: string): Promise<SlipRecord> {
  if (!isHash(txHash)) throw new InputError("That is not a transaction hash.");
  const due = getDue(dueId);
  if (!due) throw new InputError("Due not found.", 404);

  const existing = getSlipByDue(due.id);
  if (existing) {
    if (existing.txHash === txHash.toLowerCase()) return existing;
    throw new InputError("This due is already paid.");
  }

  const reused = getSlipByHash(txHash);
  if (reused) throw new InputError("This transaction is already a slip.");

  let receipt;
  try {
    receipt = await rpc.getTransactionReceipt({ hash: txHash });
  } catch {
    throw new InputError("Transaction not found on Robinhood Chain yet. The hash is still valid — try saving again.");
  }

  if (receipt.status !== "success") {
    throw new InputError("That transaction failed, so this due stays unpaid.");
  }

  const contract = slipPayAddress();
  const payer = contract
    ? (matchContractPayment({
        logs: receipt.logs,
        txTo: receipt.to,
        contract,
        payee: due.payee.address,
        amount: BigInt(due.amount),
      })?.payer ?? null)
    : matchExactTransfer(receipt.logs, due.payee.address, BigInt(due.amount));
  if (!payer) {
    throw new InputError(
      contract
        ? "This transaction did not pay the due and the fee through the Slip contract, so the due stays unpaid."
        : "This transaction is not an exact USDG transfer to the payee, so the due stays unpaid.",
    );
  }

  let paidAt = Math.floor(Date.now() / 1000);
  try {
    const block = await rpc.getBlock({ blockNumber: receipt.blockNumber });
    paidAt = Number(block.timestamp);
  } catch {
    paidAt = Math.floor(Date.now() / 1000);
  }

  const { slip, created } = insertSlip({
    dueId: due.id,
    payeeId: due.payee.id,
    txHash,
    payer,
    amount: due.amount,
    memo: due.memo,
    paidAt,
  });
  if (created) {
    await notifyPayee({
      payeeId: due.payee.id,
      title: `${due.payee.name} was paid`,
      body: `${formatUsdgDollars(BigInt(due.amount))} USDG · ${due.memo}`,
      url: `/d/${due.id}`,
    });
  }
  return slip;
}
