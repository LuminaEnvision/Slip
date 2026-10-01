"use client";

import { useEffect, useState } from "react";
import { useConnect, type Connector } from "wagmi";
import { robinhood } from "@/lib/chain";

type Presence = "checking" | "ready" | "missing";

export function ConnectWallet() {
  const { connect, connectors, isPending } = useConnect();
  const [presence, setPresence] = useState<Presence>("checking");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mark = () => {
      if (!cancelled && hasEthereum()) setPresence("ready");
    };
    mark();
    window.addEventListener("ethereum#initialized", mark);
    window.addEventListener("eip6963:announceProvider", mark);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const timer = window.setTimeout(() => {
      if (!cancelled) setPresence(hasEthereum() ? "ready" : "missing");
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("ethereum#initialized", mark);
      window.removeEventListener("eip6963:announceProvider", mark);
    };
  }, []);

  const walletConnectors = connectors.filter((connector) => connector.type !== "injected");

  async function onConnect(connector: Connector) {
    if (connector.type === "injected") {
      const provider = await waitForEthereum(1500);
      if (!provider) {
        setPresence("missing");
        return;
      }
      setPresence("ready");
    }
    connect({ connector, chainId: robinhood.id });
  }

  if (presence === "checking") {
    return (
      <button className="btn" type="button" disabled>
        Connect wallet
      </button>
    );
  }

  if (presence === "missing") {
    return (
      <>
        <p className="sub">This browser has no wallet. In the Robinhood app, tap the globe and paste this link.</p>
        <button className="btn" type="button" onClick={() => copyPage(setCopied)}>
          {copied ? "Copied" : "Copy link"}
        </button>
        {walletConnectors.map((connector) => (
          <button
            key={connector.uid}
            className="btn ghost"
            type="button"
            disabled={isPending}
            onClick={() => onConnect(connector)}
          >
            {isPending ? "Connecting…" : connectorLabel(connector.name)}
          </button>
        ))}
      </>
    );
  }

  return (
    <>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          className="btn"
          type="button"
          disabled={isPending}
          onClick={() => onConnect(connector)}
        >
          {isPending ? "Connecting…" : connectorLabel(connector.name)}
        </button>
      ))}
    </>
  );
}

export function isMissingWalletError(error: unknown): boolean {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: string }).name) : "";
  if (/WagmiProviderNotFound/i.test(name)) return false;
  const message = error instanceof Error ? error.message : "";
  return /ProviderNotFound/i.test(name) || /provider not found/i.test(message);
}

function hasEthereum() {
  return typeof window !== "undefined" && Boolean((window as Window & { ethereum?: unknown }).ethereum);
}

function waitForEthereum(timeoutMs: number) {
  if (hasEthereum()) return Promise.resolve((window as Window & { ethereum?: unknown }).ethereum);
  return new Promise((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener("ethereum#initialized", finish);
      window.removeEventListener("eip6963:announceProvider", finish);
      resolve(hasEthereum() ? (window as Window & { ethereum?: unknown }).ethereum : null);
    };
    window.addEventListener("ethereum#initialized", finish);
    window.addEventListener("eip6963:announceProvider", finish);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const timer = window.setTimeout(finish, timeoutMs);
  });
}

async function copyPage(setCopied: (copied: boolean) => void) {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement("textarea");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  setCopied(true);
}

function connectorLabel(name: string) {
  if (name === "Injected" || name === "Browser Wallet") return "Connect wallet";
  if (name === "WalletConnect") return "WalletConnect";
  return `Connect ${name}`;
}
