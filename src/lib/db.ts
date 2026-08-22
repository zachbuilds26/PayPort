import { Pool } from "pg";

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
}

let _pool: ReturnType<typeof getPool> | null = null;

function getSharedPool() {
  if (!_pool) {
    _pool = getPool();
  }
  return _pool;
}

async function query(text: string, params?: unknown[]) {
  const pool = getSharedPool();
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id            SERIAL PRIMARY KEY,
      slug          TEXT NOT NULL,
      amount_usdc   NUMERIC NOT NULL,
      payer         TEXT NOT NULL,
      merchant      TEXT NOT NULL,
      tx_hash       TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function insertPayment(row: {
  slug: string;
  amount_usdc: number;
  payer: string;
  merchant: string;
  tx_hash?: string;
  status?: string;
}) {
  await ensureTable();
  const result = await query(
    `INSERT INTO payments (slug, amount_usdc, payer, merchant, tx_hash, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [row.slug, row.amount_usdc, row.payer, row.merchant, row.tx_hash ?? "", row.status ?? "pending"]
  );
  return result.rows[0];
}

export async function updatePaymentByTxHash(txHash: string, status: string) {
  const result = await query(
    `UPDATE payments SET status = $1 WHERE tx_hash = $2 RETURNING *`,
    [status, txHash]
  );
  return result.rows[0];
}

export async function getPaymentsByMerchant(merchant: string) {
  await ensureTable();
  const result = await query(
    `SELECT * FROM payments WHERE LOWER(merchant) = LOWER($1) ORDER BY created_at DESC LIMIT 50`,
    [merchant]
  );
  return result.rows;
}

export async function getPaymentByTxHash(txHash: string) {
  const result = await query(
    `SELECT * FROM payments WHERE tx_hash = $1 LIMIT 1`,
    [txHash]
  );
  return result.rows[0];
}

export async function getPaymentsBySlug(slug: string) {
  await ensureTable();
  const result = await query(
    `SELECT * FROM payments WHERE slug = $1 ORDER BY created_at DESC LIMIT 50`,
    [slug]
  );
  return result.rows;
}
