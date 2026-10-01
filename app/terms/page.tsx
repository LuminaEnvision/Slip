import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "How Slip’s private receipt book and a single pay link work, and what Slip does not do.",
};

export default function TermsPage() {
  return (
    <article className="slip legal">
      <h2>Terms</h2>
      <p className="sub">1 October 2026</p>
      <p>
        Slip is a private receipt book for USDG on Robinhood Chain, and a single link you can send so someone can pay
        one slip. These terms describe that. They are not legal, tax, or financial advice.
      </p>

      <h3>The payment and the fee</h3>
      <p>
        The payee receives the full amount on the slip. When this site uses the Slip pay contract, the payer also sends
        a fee: 0.5% unless the owner of that contract sets it lower, and never more than 1%. The fee stays in the
        contract. The owner can withdraw it. The payee’s USDG is not held by Slip. Slip is not a bank, an exchange, or
        an escrow.
      </p>
      <p>
        Paying through the contract takes two wallet steps: approve USDG, then pay. The contract forwards the due to the
        address on the slip and keeps the fee. If the pay contract is not set, the wallet sends the due straight to
        that address and no fee is taken.
      </p>
      <p>
        Slip does not check that the work was done, that the invoice is real, or that the address belongs to the person
        named on the slip. You are responsible for the address you enter and the link you open.
      </p>

      <h3>On-chain and final</h3>
      <p>
        A payment is a USDG token transfer on Robinhood Chain (chain 4663). USDG has 6 decimals. Gas is ETH, paid to
        the network, not to Slip. Chain transfers cannot be reversed by Slip.
      </p>
      <p>
        Slip marks a due paid only after it sees the payee receive the exact amount. When the pay contract is in use,
        that transaction also has to call the contract and leave the fee there. A different amount, a transfer to a
        different address, or a transfer that skips the contract leaves the due unpaid even if tokens moved. If the
        receipt fails to save after the transfer succeeds, the payment on chain still stands. The hash stays on the
        page.
      </p>

      <h3>The book and the link</h3>
      <p>
        The receipt book is private. That means the full list, the totals, the spreadsheet, a person’s history, and
        the pages for writing a new slip. Opening them needs the book key set by the person running this site. The key
        is not an account and it is not a wallet password.
      </p>
      <p>
        A slip link shows only that payment: the amount, the memo, the name, and the address, and the hash after it is
        paid. Anyone you send the link to can open that one slip and pay it. The link does not open the rest of the
        book. Do not put a secret in a name or memo. The transfer itself is public on Robinhood Chain.
      </p>

      <h3>Using Slip</h3>
      <ul>
        <li>You need a wallet that can hold USDG and ETH on Robinhood Chain.</li>
        <li>You will not use Slip for fraud, sanctions evasion, or any unlawful payment.</li>
        <li>You will not send a link that misnames the payee or the amount.</li>
      </ul>

      <h3>No warranty</h3>
      <p>
        Slip is provided as it runs. Links, the site, and the receipt can fail, be delayed, or be wrong if the chain
        or the wallet fails. Slip is not a party to the deal between the person who wrote the slip and the person who
        paid it. Disputes about the work or the invoice stay between those two people.
      </p>

      <h3>Changes</h3>
      <p>These terms can be updated on this page. The date at the top is the latest version. Using Slip after that means you accept the update.</p>
    </article>
  );
}
