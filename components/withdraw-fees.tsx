"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { explorerAddress, explorerTx, robinhood, USDG_ADDRESS, usdgAbi } from "@/lib/chain";
import { formatFeePercent, slipPayAddress } from "@/lib/fee";
import { shortAddress } from "@/lib/format";
import { formatUsdgDollars } from "@/lib/money";
import { slipPayAbi } from "@/lib/slip-pay";
import { ConnectWallet, isMissingWalletError } from "./connect-wallet";
import { wagmiConfig, WalletProvider } from "./wallet-provider";

export default function WithdrawFees() {
  return (
    <WalletProvider>
      <WithdrawInner />
    </WalletProvider>
  );
}

function WithdrawInner() {
  const contract = slipPayAddress();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "wallet" | "done">("idle");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const { data: owner } = useReadContract({
    address: contract ?? undefined,
    abi: slipPayAbi,
    functionName: "owner",
    chainId: robinhood.id,
    query: { enabled: Boolean(contract) },
  });
  const { data: feeBps } = useReadContract({
    address: contract ?? undefined,
    abi: slipPayAbi,
    functionName: "feeBps",
    chainId: robinhood.id,
    query: { enabled: Boolean(contract) },
  });
  const { data: balance, refetch } = useReadContract({
    address: USDG_ADDRESS,
    abi: usdgAbi,
    functionName: "balanceOf",
    args: contract ? [contract] : undefined,
    chainId: robinhood.id,
    query: { enabled: Boolean(contract) },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!contract) {
    return (
      <article className="slip legal">
        <h2>Fees</h2>
        <p>Payments go straight to the payee until the pay contract is set. No fee is taken.</p>
        <p className="sub">
          Deploy the Slip pay contract with your withdraw address as the owner, then set NEXT_PUBLIC_SLIP_PAY to that
          contract. This page withdraws the USDG it has collected.
        </p>
      </article>
    );
  }

  const isOwner = Boolean(address && owner && address.toLowerCase() === owner.toLowerCase());
  const onRobinhood = chainId === robinhood.id;
  const busy = phase === "wallet";
  const empty = balance === 0n;
  const message = error || (connectError && !isMissingWalletError(connectError) ? friendly(connectError) : null);

  async function withdraw() {
    if (!contract || !address || balance === undefined || balance === 0n) return;
    setError(null);
    setPhase("wallet");
    let submitted = false;
    try {
      if (chainId !== robinhood.id) await switchChainAsync({ chainId: robinhood.id });
      const tx = await writeContractAsync({
        address: contract,
        abi: slipPayAbi,
        functionName: "withdraw",
        args: [address, balance],
        chainId: robinhood.id,
      });
      submitted = true;
      setHash(tx);
      const client = getPublicClient(wagmiConfig, { chainId: robinhood.id });
      if (!client) throw new Error("Robinhood Chain is not configured.");
      await client.waitForTransactionReceipt({ hash: tx, timeout: 90_000 });
      setPhase("done");
      await refetch();
    } catch (err) {
      setError(friendly(err));
      setPhase(submitted ? "done" : "idle");
    }
  }

  return (
    <article className="slip legal">
      <h2>Fees</h2>
      <p className="sub">
        {feeBps !== undefined ? `${formatFeePercent(feeBps)} of each payment, on top of the due. ` : ""}
        The payee still gets the full amount. This balance is the fee.
      </p>
      <div className="kv">
        <span>Contract</span>
        <span>
          <a href={explorerAddress(contract)} target="_blank" rel="noreferrer">
            {shortAddress(contract)}
          </a>
        </span>
      </div>
      <div className="kv">
        <span>Collected</span>
        <span>{balance === undefined ? "…" : `${formatUsdgDollars(balance)} USDG`}</span>
      </div>
      {owner ? (
        <div className="kv">
          <span>Owner</span>
          <span>{shortAddress(owner)}</span>
        </div>
      ) : null}
      {message ? (
        <div className="err" role="alert">
          {message}
        </div>
      ) : null}
      {hash ? (
        <p className="hash">
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer">
            {hash}
          </a>
        </p>
      ) : null}
      {!mounted ? (
        <button className="btn" type="button" disabled>
          Connect wallet
        </button>
      ) : null}
      {mounted && !isConnected ? <ConnectWallet /> : null}
      {mounted && isConnected ? (
        <>
          <div className="kv">
            <span>Wallet</span>
            <span>
              {shortAddress(address ?? "")}{" "}
              <button className="textbtn" type="button" onClick={() => disconnect()}>
                Disconnect
              </button>
            </span>
          </div>
          {!isOwner ? <p className="sub">This wallet cannot withdraw.</p> : null}
          {isOwner && !onRobinhood ? (
            <button className="btn" type="button" disabled={busy} onClick={() => switchChainAsync({ chainId: robinhood.id })}>
              Switch to Robinhood Chain
            </button>
          ) : null}
          {isOwner && onRobinhood ? (
            <button className="btn" type="button" disabled={busy || empty || balance === undefined} onClick={withdraw}>
              {phase === "wallet" ? "Approve in wallet..." : empty ? "No fees yet" : `Withdraw ${formatUsdgDollars(balance ?? 0n)} USDG`}
            </button>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function friendly(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: string }).name) : "";
  const message = error instanceof Error ? error.message : "";
  if (/UserRejected/i.test(name) || /user rejected|user denied/i.test(message)) return "Cancelled in the wallet.";
  if (/insufficient funds/i.test(message)) return "Not enough ETH for gas.";
  if (message && message.length < 180 && !message.includes("Request Arguments")) return message;
  return "The wallet could not withdraw.";
}
