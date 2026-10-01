"use client";

import { useEffect, useState } from "react";

type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };

export function NotifyButton({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<"loading" | "off" | "on" | "denied" | "unsupported" | "failed">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function look() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (!cancelled) setPhase("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setPhase("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!existing) {
        if (!cancelled) setPhase("off");
        return;
      }
      const status = await fetch(`/api/push?slug=${encodeURIComponent(slug)}&endpoint=${encodeURIComponent(existing.endpoint)}`);
      const data = (await status.json()) as { on?: boolean };
      if (!cancelled) setPhase(data.on ? "on" : "off");
    }
    look().catch(() => {
      if (!cancelled) setPhase("off");
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function turnOn() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPhase(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await fetch(`/api/push?slug=${encodeURIComponent(slug)}`);
      const keyData = (await keyResponse.json()) as { publicKey: string };
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
      const json = subscription.toJSON() as PushSub;
      await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, subscription: json }),
      });
      setPhase("on");
    } catch {
      setPhase("failed");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, subscription: existing.toJSON() }),
        });
        const left = await fetch(`/api/push?endpoint=${encodeURIComponent(existing.endpoint)}`);
        const data = (await left.json()) as { any?: boolean };
        if (!data.any) await existing.unsubscribe();
      }
      setPhase("off");
    } catch {
      setPhase("on");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "unsupported" || phase === "failed") {
    return <p className="sub">This browser could not turn on notifications.</p>;
  }
  if (phase === "denied") return <p className="sub">Notifications are blocked for this site.</p>;
  if (phase === "loading") return null;
  if (phase === "on") {
    return (
      <button className="btn ghost" type="button" disabled={busy} onClick={turnOff}>
        {busy ? "Saving…" : "Notifications on"}
      </button>
    );
  }
  return (
    <button className="btn ghost" type="button" disabled={busy} onClick={turnOn}>
      {busy ? "Saving…" : "Notify me when this is paid"}
    </button>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
