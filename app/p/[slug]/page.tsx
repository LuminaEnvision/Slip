import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DueItem } from "@/components/due-item";
import { NotifyButton } from "@/components/notify-button";
import { bookUnlocked, requireBook } from "@/lib/book";
import { getPayeeBySlug, listDuesForPayee, listSlipsForPayee } from "@/lib/db";
import { formatUsdgDollars } from "@/lib/money";
import { receiptFlow } from "@/lib/receipts";
import { todayUtc } from "@/lib/format";
import { publicStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!(await bookUnlocked())) return { title: "Private book" };
  const payee = getPayeeBySlug(slug);
  if (!payee) return { title: "Payee" };
  return { title: payee.name, description: `Pay ${payee.name} in USDG on Robinhood Chain.` };
}

export default async function PayeePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireBook(`/p/${slug}`);
  const payee = getPayeeBySlug(slug);
  if (!payee) notFound();

  const today = todayUtc();
  const dues = listDuesForPayee(payee.id);
  const slips = new Map(listSlipsForPayee(payee.id).map((slip) => [slip.dueId, slip.txHash]));

  return (
    <section aria-label="Your slips">
      <div className="slip">
        <h2>{payee.name}</h2>
        <p className="sub">Robinhood Chain</p>
        <p className="addr">{payee.address}</p>
        {payee.note ? <p className="sub">{payee.note}</p> : null}
        <NotifyButton slug={payee.slug} />
        <a className="btn" href="/">
          Write a slip
        </a>
      </div>
      <div className="list">
        {dues.length === 0 ? <p className="sub">No slips yet.</p> : null}
        {dues.map((due) => {
          const status = publicStatus(due.status, due.dueDate, today);
          return (
            <DueItem
              key={due.id}
              href={`/d/${due.id}`}
              memo={due.memo}
              name={payee.name}
              dollars={formatUsdgDollars(BigInt(due.amount))}
              paid={status === "paid"}
              hash={slips.get(due.id)}
              meta={`${payee.name} · ${status === "paid" ? receiptFlow(due.kind).toLowerCase() : due.kind === "bill" ? "bill" : "to pay"}`}
            />
          );
        })}
      </div>
    </section>
  );
}
