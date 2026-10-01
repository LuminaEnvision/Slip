"use client";

import { useEffect, useRef, useState } from "react";
import { NotifyButton } from "./notify-button";
import { postJson } from "@/lib/post-json";

export function WriteForm({ kind = "pay" }: { kind?: "pay" | "bill" }) {
  const bill = kind === "bill";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const stubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (link) stubRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [link]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const amount = String(form.get("amount") ?? "").trim();
    const memo = String(form.get("memo") ?? "").trim();
    const dueDate = String(form.get("date") ?? "");

    if (!name) {
      setError(bill ? "Add your name, so they know who to pay." : "Add who gets paid, so the payer knows.");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError("Wallet address needs 0x and 42 characters in total.");
      return;
    }
    if (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
      setError("Enter an amount above 0.");
      return;
    }

    setPending(true);
    setError("");
    try {
      const data = await postJson<{ url: string; slug: string }>("/api/slips", {
        name,
        address,
        amount,
        memo,
        dueDate,
        kind,
      });
      setSlug(data.slug);
      setLink(`${window.location.origin}${data.url}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make that slip.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-label={bill ? "Bill for a service" : "Pay someone"}>
      <form className="slip" onSubmit={onSubmit}>
        <h2>{bill ? "Accept payment" : "Pay"}</h2>
        <p className="sub">
          {bill
            ? "Bill for a service. Send the link. They pay you in USDG."
            : "Pay someone in USDG. A salary, a week, or a bill you owe."}
        </p>
        <label className="f" htmlFor="name">
          {bill ? "Your name" : "Pay to"}
        </label>
        <input id="name" name="name" placeholder="Maya, design" autoComplete="off" />
        <label className="f" htmlFor="addr">
          Wallet address
        </label>
        <input id="addr" name="address" placeholder="0x..." autoComplete="off" spellCheck={false} />
        <label className="f" htmlFor="amount">
          Amount
        </label>
        <div className="big">
          <input id="amount" name="amount" inputMode="decimal" placeholder="40.00" autoComplete="off" />
          <b>USDG</b>
        </div>
        <div className="two">
          <div>
            <label className="f" htmlFor="memo">
              {bill ? "Service" : "For"}
            </label>
            <input id="memo" name="memo" placeholder={bill ? "Landing page" : "Week of 29 Sep"} />
          </div>
          <div>
            <label className="f" htmlFor="date">
              Pay by
            </label>
            <input id="date" name="date" type="date" />
          </div>
        </div>
        <div className="err" role="alert">
          {error}
        </div>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Making..." : bill ? "Make bill" : "Make slip"}
        </button>
      </form>
      <div className="stub" hidden={!link} ref={stubRef}>
        <span className="state">Ready to send</span>
        <div className="link">{link}</div>
        <div className="row">
          <button className="btn ghost" type="button" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
          {link ? (
            <a className="btn" href={link}>
              Open slip
            </a>
          ) : null}
        </div>
        {slug ? <NotifyButton slug={slug} /> : null}
      </div>
    </section>
  );
}
