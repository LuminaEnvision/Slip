import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LiveDue from "@/components/live-due";
import { SlipFrame } from "@/components/slip-frame";
import { bookUnlocked } from "@/lib/book";
import { explorerTx } from "@/lib/chain";
import { getDue, getSlipByDue } from "@/lib/db";
import { formatDay, shortAddress, todayUtc } from "@/lib/format";
import { formatUsdgDollars, formatUsdgExact } from "@/lib/money";
import { publicStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const due = getDue(id);
  if (!due) return { title: "Due" };
  const dollars = formatUsdgDollars(BigInt(due.amount));
  return {
    title: `${dollars} USDG`,
    description: `${due.memo} · Pay ${due.payee.name} on Robinhood Chain.`,
  };
}

export default async function DuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const due = getDue(id);
  if (!due) notFound();

  const status = publicStatus(due.status, due.dueDate, todayUtc());
  const dollars = formatUsdgDollars(BigInt(due.amount));
  const exact = formatUsdgExact(BigInt(due.amount));
  const slip = status === "paid" ? getSlipByDue(due.id) : null;
  const linkPayee = await bookUnlocked();
  const state =
    status === "paid" ? "Settled" : due.kind === "bill" ? (due.dueDate ? `Bill by ${formatDay(due.dueDate)}` : "Bill") : due.dueDate ? `Pay by ${formatDay(due.dueDate)}` : "Pay";

  if (!slip) {
    return (
      <section aria-label="Pay a slip">
        {status === "expired" ? <p className="sub">This date has passed. You can still pay it.</p> : null}
        <LiveDue
          dueId={due.id}
          payeeAddress={due.payee.address}
          payeeName={due.payee.name}
          payeeSlug={due.payee.slug}
          memo={due.memo}
          state={state}
          amount={due.amount}
          dollars={dollars}
          exact={exact}
          linkPayee={linkPayee}
        />
      </section>
    );
  }

  return (
    <section aria-label="Pay a slip">
      <SlipFrame
        paid
        stampHit
        state={state}
        dollars={dollars}
        exact={exact}
        payeeName={due.payee.name}
        payeeSlug={due.payee.slug}
        payeeAddress={due.payee.address}
        memo={due.memo}
        linkPayee={linkPayee}
        stub={
          <div className="stub">
            <span className="state">Receipt</span>
            <p className="hash">{slip.txHash}</p>
            {slip.payer ? <p className="sub">Payer {shortAddress(slip.payer)}</p> : null}
            <div className="row">
              <a className="btn ghost" href={due.kind === "bill" ? "/accept" : "/"}>
                {due.kind === "bill" ? "New bill" : "New payment"}
              </a>
              <a className="btn" href={explorerTx(slip.txHash)} target="_blank" rel="noreferrer">
                See on chain
              </a>
            </div>
          </div>
        }
      />
    </section>
  );
}
