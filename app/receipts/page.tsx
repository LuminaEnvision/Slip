import { DueItem } from "@/components/due-item";
import { LockBook } from "@/components/lock-book";
import { requireBook } from "@/lib/book";
import { listRecentDues } from "@/lib/db";
import { formatUsdgDollars } from "@/lib/money";
import { receiptFlow } from "@/lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReceiptsPage() {
  await requireBook("/receipts");
  const dues = listRecentDues();
  let paidOut = 0n;
  let toPay = 0n;
  let received = 0n;
  let openBills = 0n;
  for (const due of dues) {
    const units = BigInt(due.amount);
    if (due.kind === "bill") {
      if (due.status === "paid") received += units;
      else openBills += units;
    } else if (due.status === "paid") paidOut += units;
    else toPay += units;
  }

  return (
    <section aria-label="Receipts">
      <div className="slip">
        <h2>Receipts</h2>
        <p className="sub">Payments you send, and bills you accept. This book is private.</p>
        <LockBook />
        <div className="kv">
          <span>Paid out</span>
          <span>{formatUsdgDollars(paidOut)} USDG</span>
        </div>
        <div className="kv">
          <span>Still to pay</span>
          <span>{formatUsdgDollars(toPay)} USDG</span>
        </div>
        <div className="kv">
          <span>Received</span>
          <span>{formatUsdgDollars(received)} USDG</span>
        </div>
        <div className="kv">
          <span>Open bills</span>
          <span>{formatUsdgDollars(openBills)} USDG</span>
        </div>
        <a className="btn" href="/api/receipts">
          Download CSV
        </a>
        <p className="sub">Opens in a spreadsheet. Amounts are USDG with 6 decimals.</p>
      </div>
      <div className="list">
        {dues.length === 0 ? <p className="sub">No receipts yet.</p> : null}
        {dues.map((due) => (
          <DueItem
            key={due.id}
            href={`/d/${due.id}`}
            memo={due.memo}
            name={due.payeeName}
            dollars={formatUsdgDollars(BigInt(due.amount))}
            paid={due.status === "paid"}
            hash={due.txHash}
            meta={`${due.payeeName} · ${due.status === "paid" ? receiptFlow(due.kind).toLowerCase() : due.kind === "bill" ? "bill" : "to pay"}`}
          />
        ))}
      </div>
    </section>
  );
}
