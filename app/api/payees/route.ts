import { NextResponse } from "next/server";
import { bookDenied } from "@/lib/book";
import { createPayee, listPayees } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await bookDenied();
  if (denied) return denied;
  return NextResponse.json({ payees: listPayees() });
}

export async function POST(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { name?: unknown; address?: unknown; note?: unknown };
    const payee = createPayee(body);
    return NextResponse.json({ slug: payee.slug, url: `/p/${payee.slug}` }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
