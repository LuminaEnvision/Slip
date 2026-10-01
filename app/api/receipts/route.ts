import { NextResponse } from "next/server";
import { bookDenied } from "@/lib/book";
import { listRecentDues } from "@/lib/db";
import { receiptsCsv } from "@/lib/receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  const origin = new URL(request.url).origin;
  const csv = receiptsCsv(listRecentDues(10_000), origin);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="slip-receipts.csv"',
    },
  });
}
