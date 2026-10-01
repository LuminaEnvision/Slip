import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const BOOK_COOKIE = "slip_book";

function secret(): string {
  const fromEnv = process.env.SLIP_BOOK_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const file = path.join(process.cwd(), "data", "book-secret");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const generated = crypto.randomBytes(18).toString("base64url");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(file, `${generated}\n`, { flag: "wx", mode: 0o600 });
    return generated;
  } catch {
    return fs.readFileSync(file, "utf8").trim();
  }
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest();
}

export function bookKeyMatches(input: string): boolean {
  return crypto.timingSafeEqual(digest(input), digest(secret()));
}

export function bookToken(): string {
  return crypto.createHmac("sha256", secret()).update("slip-book-v1").digest("base64url");
}

/** Shown only on this computer, and only when the key was generated here. */
export function localBookHint(host: string): string | null {
  if (process.env.SLIP_BOOK_SECRET?.trim()) return null;
  const raw = host.toLowerCase();
  if (!raw.startsWith("localhost") && !raw.startsWith("127.0.0.1") && !raw.includes("::1")) return null;
  return secret();
}

export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.startsWith("/unlock")) {
    return "/receipts";
  }
  return value;
}

export async function bookUnlocked(): Promise<boolean> {
  const jar = await cookies();
  const got = jar.get(BOOK_COOKIE)?.value;
  if (!got) return false;
  const expected = bookToken();
  const left = Buffer.from(got);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function requireBook(nextPath: string) {
  if (!(await bookUnlocked())) {
    redirect(`/unlock?next=${encodeURIComponent(safeNext(nextPath))}`);
  }
}

export async function bookDenied() {
  if (await bookUnlocked()) return null;
  return NextResponse.json({ error: "This book is private." }, { status: 401 });
}

export function bookCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  };
}
