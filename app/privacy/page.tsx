import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Slip stores, who can open the book, and what a shared slip shows.",
};

export default function PrivacyPage() {
  return (
    <article className="slip legal">
      <h2>Privacy</h2>
      <p className="sub">1 October 2026</p>
      <p>
        The receipt book is private. A slip link is something you choose to send. This page says what the site stores,
        who can see it, and what it never asks for.
      </p>

      <h3>What the site stores</h3>
      <p>When you write a slip, the site saves:</p>
      <ul>
        <li>Payee name and wallet address</li>
        <li>Amount, memo, and pay-by date if you add one</li>
        <li>Whether the due is unpaid or paid</li>
      </ul>
      <p>
        Those records live in the database on the machine running this site. There is no account. The book key is kept
        on that machine too. After you enter it, this browser stores a cookie so you stay unlocked. The cookie is not
        the key. A slip link is how someone else opens that one payment.
      </p>
      <p>When a payment is recorded, the site also saves the transaction hash, the time, and the payer address from the USDG transfer log, if the chain shows one.</p>
      <p>
        If you turn on notifications for a payee, Slip stores this browser’s push address with that payee. When one of
        their dues is paid, the site sends a notification to the browsers that asked for it. Turning notifications off
        deletes that push address.
      </p>

      <h3>What Slip does not collect</h3>
      <p>
        There is no account. Slip does not ask for an email, a seed phrase, or a private key. The book key only opens
        the list on this site. This app does not run an analytics tracker.
      </p>

      <h3>Your wallet</h3>
      <p>
        Connecting a wallet happens in the wallet, in your browser. When the pay contract is in use, Slip asks the
        wallet to approve USDG and then to pay. The contract sends the due to the payee and keeps a fee of at most 1%.
        That fee balance is public on the contract, and the owner can withdraw it. When the contract is not in use, the
        wallet sends USDG straight to the payee. The connected address is shown so you can see who is paying. It is
        saved only when a slip is written from the on-chain transfer, as the payer on that receipt.
      </p>

      <h3>Who can see it</h3>
      <p>
        The book, the spreadsheet, a person’s history, and the pages for writing a new slip are visible only after the
        book key. A slip link shows that one payment to anyone who has it: the amount, memo, name, and address, and
        the hash and payer after it is paid. Notifications are only for browsers that unlocked the book and turned
        them on.
      </p>
      <p>
        The transfer itself is public on Robinhood Chain. Opening the explorer sends you to Blockscout, which has its
        own records of the transaction.
      </p>

      <h3>Other services</h3>
      <ul>
        <li>The site reads and checks transactions through a Robinhood Chain node.</li>
        <li>Your wallet provider sees the transaction you approve.</li>
        <li>If this deployment offers WalletConnect, that service sees the connection session. A browser wallet does not use it.</li>
      </ul>

      <h3>How long it stays</h3>
      <p>
        The site keeps a slip so the link and the receipt keep working, until the person running this site deletes it.
        Deleting the site’s copy does not remove the transfer from Robinhood Chain.
      </p>

      <h3>Children</h3>
      <p>Slip is not meant for children, and it does not knowingly collect information from them.</p>
    </article>
  );
}
