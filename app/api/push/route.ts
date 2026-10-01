import { NextResponse } from "next/server";
import {
  countPushEndpoint,
  deletePushSubscription,
  getPayeeBySlug,
  hasPushSubscription,
  upsertPushSubscription,
} from "@/lib/db";
import { jsonError } from "@/lib/http";
import { InputError } from "@/lib/input-error";
import { bookDenied } from "@/lib/book";
import { vapidPublicKey } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionBody = {
  slug?: unknown;
  subscription?: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
};

export async function GET(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const endpoint = url.searchParams.get("endpoint") ?? "";
  const payee = slug ? getPayeeBySlug(slug) : null;
  return NextResponse.json({
    publicKey: vapidPublicKey(),
    on: Boolean(payee && endpoint && hasPushSubscription(payee.id, endpoint)),
    any: Boolean(endpoint && countPushEndpoint(endpoint) > 0),
  });
}

export async function POST(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  try {
    const sub = await readSubscription(request);
    upsertPushSubscription(sub.payeeId, sub.keys);
    return NextResponse.json({ on: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await bookDenied();
  if (denied) return denied;
  try {
    const sub = await readSubscription(request);
    deletePushSubscription(sub.payeeId, sub.keys.endpoint);
    return NextResponse.json({ on: false });
  } catch (error) {
    return jsonError(error);
  }
}

async function readSubscription(request: Request) {
  const body = (await request.json()) as SubscriptionBody;
  const slug = typeof body.slug === "string" ? body.slug : "";
  const endpoint = typeof body.subscription?.endpoint === "string" ? body.subscription.endpoint : "";
  const p256dh = typeof body.subscription?.keys?.p256dh === "string" ? body.subscription.keys.p256dh : "";
  const auth = typeof body.subscription?.keys?.auth === "string" ? body.subscription.keys.auth : "";
  const payee = getPayeeBySlug(slug);
  if (!payee) throw new InputError("Payee not found.", 404);
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new InputError("That is not a push subscription.");
  }
  if (parsed.protocol !== "https:" || !p256dh || !auth) throw new InputError("That is not a push subscription.");
  return { payeeId: payee.id, keys: { endpoint, p256dh, auth } };
}
