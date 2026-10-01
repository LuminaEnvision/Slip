import { NextResponse } from "next/server";
import { bookDenied } from "@/lib/book";
import { createDue } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { parseUsdToUsdg } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  try {
    const body = (await request.json()) as {
      slug?: unknown;
      amount?: unknown;
      memo?: unknown;
      dueDate?: unknown;
    };
    if (typeof body.amount !== "string") {
      return NextResponse.json({ error: "Enter an amount like 40 or 40.00." }, { status: 400 });
    }
    const due = createDue({
      slug: body.slug,
      amount: parseUsdToUsdg(body.amount).toString(),
      memo: body.memo,
      dueDate: body.dueDate,
    });
    return NextResponse.json({ id: due.id, url: `/d/${due.id}` }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
