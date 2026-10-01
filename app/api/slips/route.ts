import { NextResponse } from "next/server";
import { bookDenied } from "@/lib/book";
import { createDue, createPayee, getPayeeByAddress } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { parseUsdToUsdg } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      name?: unknown;
      address?: unknown;
      amount?: unknown;
      memo?: unknown;
      dueDate?: unknown;
      kind?: unknown;
    };
    if (typeof body.amount !== "string") {
      return NextResponse.json({ error: "Enter an amount above 0." }, { status: 400 });
    }
    const amount = parseUsdToUsdg(body.amount).toString();
    const kind = body.kind === "bill" ? "bill" : "pay";
    const memo = typeof body.memo === "string" && body.memo.trim() ? body.memo : kind === "bill" ? "Service" : "Payment";
    let payee = typeof body.address === "string" ? getPayeeByAddress(body.address) : null;
    if (!payee) payee = createPayee({ name: body.name, address: body.address, note: null });
    const due = createDue({ slug: payee.slug, amount, memo, dueDate: body.dueDate, kind });
    return NextResponse.json({ id: due.id, url: `/d/${due.id}`, slug: payee.slug }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
