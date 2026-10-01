import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getAddress, isAddress, type Address } from "viem";
import { InputError } from "./input-error";
import { slugBaseFromName } from "./slug";

export type Payee = {
  id: string;
  slug: string;
  name: string;
  address: Address;
  note: string | null;
  createdAt: number;
};

export type DueRecord = {
  id: string;
  payeeId: string;
  amount: string;
  memo: string;
  dueDate: string | null;
  status: "unpaid" | "paid";
  kind: "pay" | "bill";
  createdAt: number;
};

export type SlipRecord = {
  id: string;
  dueId: string;
  payeeId: string;
  txHash: `0x${string}`;
  payer: Address | null;
  amount: string;
  memo: string;
  paidAt: number;
};

export type DueWithPayee = DueRecord & { payee: Payee };

type PayeeRow = {
  id: string;
  slug: string;
  name: string;
  address: string;
  note: string | null;
  created_at: number;
};

type DueRow = {
  id: string;
  payee_id: string;
  amount: string;
  memo: string;
  due_date: string | null;
  status: "unpaid" | "paid";
  kind: "pay" | "bill";
  created_at: number;
};

type SlipRow = {
  id: string;
  due_id: string;
  payee_id: string;
  tx_hash: string;
  payer: string | null;
  amount: string;
  memo: string;
  paid_at: number;
};

const globalForDb = globalThis as unknown as { slipDb?: Database.Database; slipSchema?: number };
const SCHEMA = 2;

function openDb(): Database.Database {
  if (!globalForDb.slipDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, "slip.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    globalForDb.slipDb = db;
  }
  const db = globalForDb.slipDb;
  if (globalForDb.slipSchema === SCHEMA) return db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS payees (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dues (
      id TEXT PRIMARY KEY,
      payee_id TEXT NOT NULL REFERENCES payees(id),
      amount TEXT NOT NULL,
      memo TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL CHECK (status IN ('unpaid', 'paid')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slips (
      id TEXT PRIMARY KEY,
      due_id TEXT NOT NULL UNIQUE REFERENCES dues(id),
      payee_id TEXT NOT NULL REFERENCES payees(id),
      tx_hash TEXT NOT NULL UNIQUE,
      payer TEXT,
      amount TEXT NOT NULL,
      memo TEXT NOT NULL,
      paid_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_dues_payee ON dues(payee_id);
    CREATE INDEX IF NOT EXISTS idx_slips_payee ON slips(payee_id);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      payee_id TEXT NOT NULL REFERENCES payees(id),
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (payee_id, endpoint)
    );
  `);
  const columns = db.prepare("PRAGMA table_info(dues)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "kind")) {
    db.exec("ALTER TABLE dues ADD COLUMN kind TEXT NOT NULL DEFAULT 'pay'");
  }
  globalForDb.slipSchema = SCHEMA;
  return db;
}

function newId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function mapPayee(row: PayeeRow): Payee {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: getAddress(row.address),
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapDue(row: DueRow): DueRecord {
  return {
    id: row.id,
    payeeId: row.payee_id,
    amount: row.amount,
    memo: row.memo,
    dueDate: row.due_date,
    status: row.status,
    kind: row.kind === "bill" ? "bill" : "pay",
    createdAt: row.created_at,
  };
}

function mapSlip(row: SlipRow): SlipRecord {
  return {
    id: row.id,
    dueId: row.due_id,
    payeeId: row.payee_id,
    txHash: row.tx_hash as `0x${string}`,
    payer: row.payer ? getAddress(row.payer) : null,
    amount: row.amount,
    memo: row.memo,
    paidAt: row.paid_at,
  };
}

function cleanLine(value: unknown, label: string, max: number): string {
  if (typeof value !== "string") throw new InputError(`Enter a ${label}.`);
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) throw new InputError(`Enter a ${label}.`);
  if (text.length > max) throw new InputError(`${label} must be ${max} characters or fewer.`);
  return text;
}

function parseDay(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InputError("Use a due date like 2026-09-29.");
  }
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== (m ?? 1) - 1 || dt.getUTCDate() !== d) {
    throw new InputError("That due date is not a real day.");
  }
  return value;
}

function parseAddress(value: unknown): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new InputError("Enter a valid 0x address.");
  }
  return getAddress(value);
}

export function listPayees(limit = 50): Payee[] {
  const rows = openDb()
    .prepare("SELECT * FROM payees ORDER BY created_at DESC LIMIT ?")
    .all(limit) as PayeeRow[];
  return rows.map(mapPayee);
}

export function getPayeeBySlug(slug: string): Payee | null {
  const row = openDb().prepare("SELECT * FROM payees WHERE slug = ?").get(slug) as PayeeRow | undefined;
  return row ? mapPayee(row) : null;
}

export function getPayeeByAddress(address: string): Payee | null {
  if (!isAddress(address)) return null;
  const row = openDb()
    .prepare("SELECT * FROM payees WHERE address = ? COLLATE NOCASE")
    .get(getAddress(address)) as PayeeRow | undefined;
  return row ? mapPayee(row) : null;
}

export type DueListItem = {
  id: string;
  amount: string;
  memo: string;
  dueDate: string | null;
  status: "unpaid" | "paid";
  payeeName: string;
  payeeSlug: string;
  payeeAddress: string;
  kind: "pay" | "bill";
  createdAt: number;
  paidAt: number | null;
  payer: string | null;
  txHash: `0x${string}` | null;
};

export function listRecentDues(limit = 50): DueListItem[] {
  const rows = openDb()
    .prepare(
      `SELECT d.id, d.amount, d.memo, d.due_date, d.status, d.kind, d.created_at,
              p.name AS payee_name, p.slug AS payee_slug, p.address AS payee_address,
              s.tx_hash, s.payer, s.paid_at
       FROM dues d
       JOIN payees p ON p.id = d.payee_id
       LEFT JOIN slips s ON s.due_id = d.id
       ORDER BY COALESCE(s.paid_at, d.created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as {
    id: string;
    amount: string;
    memo: string;
    due_date: string | null;
    status: "unpaid" | "paid";
    kind: string;
    created_at: number;
    payee_name: string;
    payee_slug: string;
    payee_address: string;
    tx_hash: string | null;
    payer: string | null;
    paid_at: number | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    memo: row.memo,
    dueDate: row.due_date,
    status: row.status,
    kind: row.kind === "bill" ? "bill" : "pay",
    createdAt: row.created_at,
    payeeName: row.payee_name,
    payeeSlug: row.payee_slug,
    payeeAddress: row.payee_address,
    payer: row.payer,
    paidAt: row.paid_at,
    txHash: row.tx_hash as `0x${string}` | null,
  }));
}

export function createPayee(input: { name?: unknown; address?: unknown; note?: unknown }): Payee {
  const name = cleanLine(input.name, "name", 80);
  const address = parseAddress(input.address);
  const note =
    input.note == null || input.note === ""
      ? null
      : cleanLine(input.note, "note", 160);

  const db = openDb();
  const base = slugBaseFromName(name);
  const insert = db.prepare(
    "INSERT INTO payees (id, slug, name, address, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );

  for (let n = 0; n < 50; n++) {
    const slug = n === 0 ? base : `${base}-${n + 1}`;
    try {
      const payee: Payee = {
        id: newId(),
        slug,
        name,
        address,
        note,
        createdAt: Math.floor(Date.now() / 1000),
      };
      insert.run(payee.id, payee.slug, payee.name, payee.address, payee.note, payee.createdAt);
      return payee;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("UNIQUE") && message.includes("slug")) continue;
      throw error;
    }
  }

  throw new InputError("Could not make a unique link for that name.");
}

export function listDuesForPayee(payeeId: string): DueRecord[] {
  const rows = openDb()
    .prepare("SELECT * FROM dues WHERE payee_id = ? ORDER BY created_at DESC")
    .all(payeeId) as DueRow[];
  return rows.map(mapDue);
}

export function listSlipsForPayee(payeeId: string): SlipRecord[] {
  const rows = openDb()
    .prepare("SELECT * FROM slips WHERE payee_id = ? ORDER BY paid_at DESC")
    .all(payeeId) as SlipRow[];
  return rows.map(mapSlip);
}

export function getDue(id: string): DueWithPayee | null {
  const row = openDb()
    .prepare(
      `SELECT
         d.id, d.payee_id, d.amount, d.memo, d.due_date, d.status, d.kind, d.created_at,
         p.id AS p_id, p.slug AS p_slug, p.name AS p_name, p.address AS p_address,
         p.note AS p_note, p.created_at AS p_created_at
       FROM dues d
       JOIN payees p ON p.id = d.payee_id
       WHERE d.id = ?`,
    )
    .get(id) as
    | (DueRow & {
        p_id: string;
        p_slug: string;
        p_name: string;
        p_address: string;
        p_note: string | null;
        p_created_at: number;
      })
    | undefined;

  if (!row) return null;
  return {
    ...mapDue(row),
    payee: mapPayee({
      id: row.p_id,
      slug: row.p_slug,
      name: row.p_name,
      address: row.p_address,
      note: row.p_note,
      created_at: row.p_created_at,
    }),
  };
}

export function getSlipByDue(dueId: string): SlipRecord | null {
  const row = openDb().prepare("SELECT * FROM slips WHERE due_id = ?").get(dueId) as SlipRow | undefined;
  return row ? mapSlip(row) : null;
}

export function getSlipByHash(txHash: string): SlipRecord | null {
  const row = openDb()
    .prepare("SELECT * FROM slips WHERE tx_hash = ?")
    .get(txHash.toLowerCase()) as SlipRow | undefined;
  return row ? mapSlip(row) : null;
}

export function createDue(input: {
  slug: unknown;
  amount: string;
  memo: unknown;
  dueDate: unknown;
  kind?: unknown;
}): DueWithPayee {
  if (typeof input.slug !== "string" || !input.slug) {
    throw new InputError("Choose a payee.");
  }
  const payee = getPayeeBySlug(input.slug);
  if (!payee) throw new InputError("That payee does not exist.");
  const memo = cleanLine(input.memo, "memo", 200);
  const dueDate = parseDay(input.dueDate);
  const db = openDb();
  const due: DueRecord = {
    id: newId(),
    payeeId: payee.id,
    amount: input.amount,
    memo,
    dueDate,
    status: "unpaid",
    kind: input.kind === "bill" ? "bill" : "pay",
    createdAt: Math.floor(Date.now() / 1000),
  };
  db.prepare(
    "INSERT INTO dues (id, payee_id, amount, memo, due_date, status, kind, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(due.id, due.payeeId, due.amount, due.memo, due.dueDate, due.status, due.kind, due.createdAt);
  return { ...due, payee };
}

export function insertSlip(input: {
  dueId: string;
  payeeId: string;
  txHash: `0x${string}`;
  payer: Address | null;
  amount: string;
  memo: string;
  paidAt: number;
}): { slip: SlipRecord; created: boolean } {
  const db = openDb();
  const txHash = input.txHash.toLowerCase() as `0x${string}`;

  const commit = db.transaction(() => {
    const current = db.prepare("SELECT status FROM dues WHERE id = ?").get(input.dueId) as
      | { status: "unpaid" | "paid" }
      | undefined;
    if (!current) throw new InputError("Due not found.", 404);

    const existing = db.prepare("SELECT * FROM slips WHERE due_id = ?").get(input.dueId) as SlipRow | undefined;
    if (existing) {
      if (existing.tx_hash === txHash) return { slip: mapSlip(existing), created: false };
      throw new InputError("This due is already paid.");
    }

    const hashOwner = db.prepare("SELECT id FROM slips WHERE tx_hash = ?").get(txHash) as { id: string } | undefined;
    if (hashOwner) throw new InputError("This transaction is already a slip.");

    const slip: SlipRecord = {
      id: newId(),
      dueId: input.dueId,
      payeeId: input.payeeId,
      txHash,
      payer: input.payer,
      amount: input.amount,
      memo: input.memo,
      paidAt: input.paidAt,
    };
    db.prepare(
      "INSERT INTO slips (id, due_id, payee_id, tx_hash, payer, amount, memo, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(slip.id, slip.dueId, slip.payeeId, slip.txHash, slip.payer, slip.amount, slip.memo, slip.paidAt);
    db.prepare("UPDATE dues SET status = 'paid' WHERE id = ?").run(slip.dueId);
    return { slip, created: true };
  });

  return commit();
}

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export function upsertPushSubscription(payeeId: string, sub: PushSubscriptionRow) {
  const db = openDb();
  const existing = db
    .prepare("SELECT id FROM push_subscriptions WHERE payee_id = ? AND endpoint = ?")
    .get(payeeId, sub.endpoint) as { id: string } | undefined;
  if (existing) {
    db.prepare("UPDATE push_subscriptions SET p256dh = ?, auth = ? WHERE id = ?").run(sub.p256dh, sub.auth, existing.id);
    return;
  }
  db.prepare(
    "INSERT INTO push_subscriptions (id, payee_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(newId(), payeeId, sub.endpoint, sub.p256dh, sub.auth, Math.floor(Date.now() / 1000));
}

export function hasPushSubscription(payeeId: string, endpoint: string): boolean {
  const row = openDb()
    .prepare("SELECT id FROM push_subscriptions WHERE payee_id = ? AND endpoint = ?")
    .get(payeeId, endpoint);
  return Boolean(row);
}

export function listPushSubscriptions(payeeId: string): PushSubscriptionRow[] {
  return openDb()
    .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE payee_id = ?")
    .all(payeeId) as PushSubscriptionRow[];
}

export function deletePushSubscription(payeeId: string, endpoint: string) {
  openDb().prepare("DELETE FROM push_subscriptions WHERE payee_id = ? AND endpoint = ?").run(payeeId, endpoint);
}

export function deletePushEndpoint(endpoint: string) {
  openDb().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

export function countPushEndpoint(endpoint: string): number {
  const row = openDb().prepare("SELECT COUNT(*) AS n FROM push_subscriptions WHERE endpoint = ?").get(endpoint) as {
    n: number;
  };
  return row.n;
}
