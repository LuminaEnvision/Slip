"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { useAccount, useChainId, useConnect, useDisconnect, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { explorerTx, robinhood, USDG_ADDRESS, usdgAbi } from "@/lib/chain";
import { feeOn, formatFeePercent, MAX_FEE_BPS, slipPayAddress } from "@/lib/fee";
import { shortAddress } from "@/lib/format";
import { formatUsdgDollars } from "@/lib/money";
import { postJson } from "@/lib/post-json";
import { slipPayAbi } from "@/lib/slip-pay";
import { ConnectWallet, isMissingWalletError } from "./connect-wallet";
import { SlipFrame } from "./slip-frame";
import { wagmiConfig, WalletProvider } from "./wallet-provider";

type Props = {
  dueId: string;
  payeeAddress: Address;
  payeeName: string;
  payeeSlug: string;
  memo: string;
  state: string;
  amount: string;
  dollars: string;
  exact: string;
  linkPayee?: boolean;
};

export default function LiveDue(props: Props) {
  return (
    <WalletProvider>
      <LiveDueInner {...props} />
    </WalletProvider>
  );
}

function LiveDueInner({ dueId, payeeAddress, payeeName, payeeSlug, memo, state, amount, dollars, exact, linkPayee }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "switching" | "wallet" | "confirming" | "saving" | "saved" | "save-failed">("idle");
  const [walletStep, setWalletStep] = useState<"approve" | "pay" | null>(null);
  const [chainHash, setChainHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const paying = useRef(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const onRobinhood = chainId === robinhood.id;
  const units = BigInt(amount);
  const contract = slipPayAddress();
  const { data: balance } = useReadContract({
    address: USDG_ADDRESS,
    abi: usdgAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: robinhood.id,
    query: { enabled: Boolean(address) },
  });
  const { data: feeBpsRaw } = useReadContract({
    address: contract ?? undefined,
    abi: slipPayAbi,
    functionName: "feeBps",
    chainId: robinhood.id,
    query: { enabled: Boolean(contract) },
  });
  const { data: allowance } = useReadContract({
    address: USDG_ADDRESS,
    abi: usdgAbi,
    functionName: "allowance",
    args: address && contract ? [address, contract] : undefined,
    chainId: robinhood.id,
    query: { enabled: Boolean(address && contract) },
  });
  const bps = feeBpsRaw === undefined ? null : BigInt(feeBpsRaw);
  const feeTooHigh = bps !== null && bps > BigInt(MAX_FEE_BPS);
  const fee = !contract ? 0n : bps === null || feeTooHigh ? null : feeOn(units, bps);
  const total = fee === null ? null : units + fee;
  const feeDollars = fee !== null && fee > 0n ? formatUsdgDollars(fee) : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const short = total !== null && balance !== undefined && balance < total;
  const busy = phase === "switching" || phase === "wallet" || phase === "confirming" || phase === "saving";
  const needsApprove = Boolean(contract && fee !== null && allowance !== undefined && allowance < units + (fee ?? 0n));

  async function save(hash: `0x${string}`) {
    setPhase("saving");
    setSaveError(null);
    setError(null);
    try {
      await postJson(`/api/dues/${dueId}/slip`, { txHash: hash });
      setPhase("saved");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "USDG sent. This slip has not been saved yet.");
      setPhase("save-failed");
    }
  }

  async function pay() {
    if (paying.current) return;
    paying.current = true;
    setError(null);
    setSaveError(null);
    let submitted: `0x${string}` | null = null;
    try {
      if (contract && (fee === null || feeTooHigh)) throw new Error("The fee on this contract cannot be used.");
      if (chainId !== robinhood.id) {
        setPhase("switching");
        await switchChainAsync({ chainId: robinhood.id });
      }
      const client = getPublicClient(wagmiConfig, { chainId: robinhood.id });
      if (!client) throw new Error("Robinhood Chain is not configured.");
      setPhase("wallet");
      let hash: `0x${string}`;
      if (contract && fee !== null) {
        const needed = units + fee;
        if ((allowance ?? 0n) < needed) {
          setWalletStep("approve");
          const approveHash = await writeContractAsync({
            address: USDG_ADDRESS,
            abi: usdgAbi,
            functionName: "approve",
            args: [contract, needed],
            chainId: robinhood.id,
          });
          await client.waitForTransactionReceipt({ hash: approveHash, timeout: 90_000 });
        }
        setWalletStep("pay");
        hash = await writeContractAsync({
          address: contract,
          abi: slipPayAbi,
          functionName: "pay",
          args: [payeeAddress, units],
          chainId: robinhood.id,
        });
      } else {
        hash = await writeContractAsync({
          address: USDG_ADDRESS,
          abi: usdgAbi,
          functionName: "transfer",
          args: [payeeAddress, units],
          chainId: robinhood.id,
        });
      }
      submitted = hash;
      setChainHash(hash);
      setWalletStep(null);
      setPhase("confirming");
      await client.waitForTransactionReceipt({ hash, timeout: 90_000 });
      await save(hash);
    } catch (err) {
      if (submitted) {
        setSaveError(friendly(err));
        setPhase("save-failed");
        return;
      }
      setWalletStep(null);
      setError(friendly(err));
      setPhase("idle");
      paying.current = false;
    }
  }

  async function switchNetwork() {
    setError(null);
    setPhase("switching");
    try {
      await switchChainAsync({ chainId: robinhood.id });
      setPhase("idle");
    } catch (err) {
      setError(friendly(err));
      setPhase("idle");
    }
  }

  const shortMessage =
    short && !chainHash
      ? feeDollars
        ? `Not enough USDG. This slip is ${dollars} plus a ${feeDollars} fee.`
        : `Not enough USDG. This slip is ${dollars}.`
      : null;
  const message =
    error ||
    (connectError && !isMissingWalletError(connectError) ? friendly(connectError) : null) ||
    (feeTooHigh ? "This contract's fee is above 1%, so Slip will not use it." : null) ||
    shortMessage;
  const payLabel =
    phase === "wallet" && walletStep === "approve"
      ? "Approve USDG..."
      : phase === "wallet"
        ? "Approve in wallet..."
        : contract && (fee === null || allowance === undefined)
          ? "Loading..."
          : feeDollars && total !== null
            ? `Pay ${formatUsdgDollars(total)} USDG`
            : `Pay ${dollars} USDG`;

  return (
    <SlipFrame
      paid={phase === "saved"}
      stampHit={phase === "saved"}
      state={phase === "saved" ? "Settled" : state}
      dollars={dollars}
      exact={exact}
      payeeName={payeeName}
      payeeSlug={payeeSlug}
      payeeAddress={payeeAddress}
      memo={memo}
      linkPayee={linkPayee}
      stub={
        chainHash ? (
          <div className="stub">
            <span className="state">{phase === "saved" ? "Receipt" : "Transaction"}</span>
            <p className="hash">{chainHash}</p>
            {saveError ? <p className="err">{saveError}</p> : null}
            {phase === "confirming" ? <p className="sub">Waiting for the transfer…</p> : null}
            {phase === "saving" ? <p className="sub">Saving the slip…</p> : null}
            <div className="row">
              {phase === "save-failed" ? (
                <button className="btn" type="button" onClick={() => save(chainHash)}>
                  Save slip
                </button>
              ) : null}
              <a className="btn" href={explorerTx(chainHash)} target="_blank" rel="noreferrer">
                See on chain
              </a>
            </div>
          </div>
        ) : null
      }
    >
      {feeDollars && total !== null ? (
        <>
          <div className="kv">
            <span>You pay</span>
            <span>{formatUsdgDollars(total)} USDG</span>
          </div>
          <div className="kv">
            <span>Fee</span>
            <span>
              {feeDollars} USDG{bps !== null ? ` (${formatFeePercent(bps)})` : ""}
            </span>
          </div>
        </>
      ) : null}
      {message ? (
        <div className="err" role="alert">
          {message}
        </div>
      ) : null}
      {!mounted ? (
        <button className="btn" type="button" disabled>
          Connect wallet
        </button>
      ) : null}
      {mounted && !isConnected ? <ConnectWallet /> : null}
      {mounted && isConnected && !chainHash ? (
        <>
          <div className="kv">
            <span>From</span>
            <span>
              {shortAddress(address ?? "")}{" "}
              <button className="textbtn" type="button" onClick={() => disconnect()}>
                Disconnect
              </button>
            </span>
          </div>
          {balance !== undefined ? (
            <p className="sub">
              Balance {formatUsdgDollars(balance)} USDG.
              {feeDollars ? ` This payment is ${dollars} plus ${feeDollars}.` : ""} Gas is ETH.
            </p>
          ) : (
            <p className="sub">Gas is ETH.</p>
          )}
          {!onRobinhood ? (
            <button className="btn" type="button" onClick={switchNetwork} disabled={busy}>
              {phase === "switching" ? "Switching…" : "Switch to Robinhood Chain"}
            </button>
          ) : (
            <>
              <button
                className="btn"
                type="button"
                onClick={pay}
                disabled={busy || short || (Boolean(contract) && (fee === null || feeTooHigh || allowance === undefined))}
              >
                {payLabel}
              </button>
              {needsApprove ? <p className="sub">Your wallet will ask twice: approve USDG, then pay.</p> : null}
              {feeDollars ? <p className="sub">Payee gets {dollars}. The fee stays in the contract.</p> : null}
            </>
          )}
        </>
      ) : null}
    </SlipFrame>
  );
}

function friendly(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name: string }).name) : "";
  const message = error instanceof Error ? error.message : "";
  if (/UserRejected/i.test(name) || /user rejected|user denied/i.test(message)) return "Cancelled in the wallet.";
  if (/insufficient funds/i.test(message)) return "Not enough ETH for gas.";
  if (/Timeout/i.test(name) || /timed out/i.test(message)) {
    return "Still waiting on Robinhood Chain. The hash is below — save the slip once it confirms.";
  }
  if (message && message.length < 180 && !message.includes("Request Arguments")) return message;
  return "The wallet could not send this payment.";
}
