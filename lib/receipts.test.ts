import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DueListItem } from "./db";
import { receiptFlow, receiptsCsv } from "./receipts";

const row: DueListItem = {
  id: "abc12345",
  amount: "40000000",
  memo: "Landing page, week 1",
  dueDate: null,
  status: "paid",
  payeeName: "Maya, design",
  payeeSlug: "maya",
  payeeAddress: "0x2222222222222222222222222222222222222222",
  kind: "bill",
  createdAt: Date.UTC(2026, 8, 29) / 1000,
  paidAt: Date.UTC(2026, 8, 30) / 1000,
  payer: "0x1111111111111111111111111111111111111111",
  txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

describe("receipt book", () => {
  it("treats a bill as money received and a payment as money paid out", () => {
    assert.equal(receiptFlow("bill"), "Received");
    assert.equal(receiptFlow("pay"), "Paid out");
  });

  it("writes a spreadsheet row with 6-decimal USDG and quoted commas", () => {
    const csv = receiptsCsv([row], "http://localhost:3000");
    assert.match(csv, /^﻿created,paid,type,flow/);
    assert.match(csv, /Bill,Received,paid,"Maya, design"/);
    assert.match(csv, /,40\.000000,USDG,/);
    assert.match(csv, /http:\/\/localhost:3000\/d\/abc12345/);
  });
});
