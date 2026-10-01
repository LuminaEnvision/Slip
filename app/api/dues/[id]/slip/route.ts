import { NextResponse } from "next/server";
import { explorerTx } from "@/lib/chain";
import { jsonError } from "@/lib/http";
import { recordPayment } from "@/lib/record-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let txHash = "";
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { txHash?: unknown };
    txHash = typeof body.txHash === "string" ? body.txHash : "";
    const slip = await recordPayment(id, txHash);
    return NextResponse.json({
      slip: {
        id: slip.id,
        txHash: slip.txHash,
        payer: slip.payer,
        amount: slip.amount,
        memo: slip.memo,
        paidAt: slip.paidAt,
        explorerUrl: explorerTx(slip.txHash),
      },
    });
  } catch (error) {
    const response = jsonError(error);
    if (!txHash) return response;
    const payload = (await response.json()) as { error?: string };
    return NextResponse.json({ ...payload, txHash }, { status: response.status });
  }
}
