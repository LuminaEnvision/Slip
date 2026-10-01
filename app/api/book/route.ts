import { NextResponse } from "next/server";
import { BOOK_COOKIE, bookCookieOptions, bookKeyMatches, bookToken, safeNext } from "@/lib/book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const key = String(form.get("key") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));
  const back = new URL("/unlock", request.url);
  back.searchParams.set("next", next);
  if (!bookKeyMatches(key)) {
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }
  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(BOOK_COOKIE, bookToken(), bookCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(BOOK_COOKIE, "", { ...bookCookieOptions(), maxAge: 0 });
  return response;
}
