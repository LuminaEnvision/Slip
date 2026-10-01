import "server-only";
import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { deletePushEndpoint, listPushSubscriptions } from "./db";

type Keys = { publicKey: string; privateKey: string };

function readKeys(): Keys {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (publicKey && privateKey) return { publicKey, privateKey };

  const file = path.join(process.cwd(), "data", "vapid.json");
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8")) as Keys;

  const generated = webpush.generateVAPIDKeys();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(generated));
  return generated;
}

function vapidSubject() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    const url = new URL(site);
    if (url.protocol === "https:" && url.hostname !== "localhost") return site;
  } catch {
    /* use the mailto contact below */
  }
  return "mailto:slip@localhost";
}

let configured = false;

function configure(): Keys {
  const keys = readKeys();
  if (!configured) {
    webpush.setVapidDetails(vapidSubject(), keys.publicKey, keys.privateKey);
    configured = true;
  }
  return keys;
}

export function vapidPublicKey(): string {
  return configure().publicKey;
}

export async function notifyPayee(input: { payeeId: string; title: string; body: string; url: string }) {
  const subs = listPushSubscriptions(input.payeeId);
  if (subs.length === 0) return;
  configure();
  const payload = JSON.stringify({ title: input.title, body: input.body, url: input.url });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      } catch (error) {
        const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0;
        if (status === 404 || status === 410) deletePushEndpoint(sub.endpoint);
      }
    }),
  );
}
