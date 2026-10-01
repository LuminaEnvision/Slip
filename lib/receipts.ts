import type { DueListItem } from "./db";
import { formatUsdgExact } from "./money";

export function receiptType(kind: DueListItem["kind"]): "Payment" | "Bill" {
  return kind === "bill" ? "Bill" : "Payment";
}

export function receiptFlow(kind: DueListItem["kind"]): "Paid out" | "Received" {
  return kind === "bill" ? "Received" : "Paid out";
}

export function receiptsCsv(rows: readonly DueListItem[], origin: string): string {
  const header = [
    "created",
    "paid",
    "type",
    "flow",
    "status",
    "who",
    "wallet",
    "description",
    "amount",
    "currency",
    "payer",
    "tx_hash",
    "slip",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        day(row.createdAt),
        row.paidAt ? day(row.paidAt) : "",
        receiptType(row.kind),
        receiptFlow(row.kind),
        row.status,
        row.payeeName,
        row.payeeAddress,
        row.memo,
        formatUsdgExact(BigInt(row.amount)),
        "USDG",
        row.payer ?? "",
        row.txHash ?? "",
        `${origin}/d/${row.id}`,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function day(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
