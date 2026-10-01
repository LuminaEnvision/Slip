# Slip

Slip is a private receipt book for USDG on Robinhood Chain.

You pay someone — a salary, a week, a bill you owe — or you send one link to get paid for a service. The book, the totals, and the spreadsheet stay behind a key. The link you send shows only that payment. A paid slip keeps the transaction hash. There is no account. USDG uses 6 decimals, so $40.00 is 40.000000 USDG. Gas is ETH.

A slip is one line. You write it, someone pays that exact amount, and the line becomes a receipt. An unpaid line stays unpaid until that payment lands. The transfer is public on Robinhood Chain. The book is not.

## Pay

Open **Pay** and enter the book key. Write who gets paid, their 0x address, the amount, and what it is for. A pay-by date is optional. **Make slip** gives you a link. Pay it from a wallet, or send the link to the person who should pay.

The link opens that one payment. It does not open the rest of the book.

## Accept payment

Open **Accept payment** to bill for a service. Write your name, your wallet, the service, and the amount. **Make bill** gives you a link to send. The same address keeps the same page, so the next bill is another line for the same person.

**Notify me when this is paid** asks this browser for permission. A paid bill can notify this device even if the app is closed.

## Receipts

**Receipts** is the book. It adds up what you paid out, what you still owe, what you received, and which bills are still open. **Download CSV** saves every line for a spreadsheet or another budget app. Amounts in the file are USDG with 6 decimals. **Lock book** closes the book in this browser.

## Paying a slip

Connect a wallet and switch to Robinhood Chain. **Pay** sends the exact USDG amount on the slip to the address on it.

When the pay contract is in use, the payer also sends a fee on top: 0.5%, and never more than 1%. The person on the slip still receives the full amount. The fee stays in the contract until the owner withdraws it from **Fees**. Paying takes two wallet steps: approve USDG, then pay. If the pay contract is not set, the wallet sends the due straight to that address and no fee is taken.

Slip checks the transfer before it marks the line paid. A different amount, a different address, or a transfer that skips the contract leaves the line unpaid. If the receipt cannot be saved after the transfer succeeds, the hash stays on the page.

Terms are at `/terms`. Privacy is at `/privacy`. Fees are at `/withdraw`.
