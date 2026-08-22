import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function ensureTable() {
  await sql`
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
  `;
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
  const [result] = await sql`
    INSERT INTO payments (slug, amount_usdc, payer, merchant, tx_hash, status)
    VALUES (${row.slug}, ${row.amount_usdc}, ${row.payer}, ${row.merchant}, ${row.tx_hash ?? ""}, ${row.status ?? "pending"})
    RETURNING *
  `;
  return result;
}

export async function updatePaymentByTxHash(txHash: string, status: string) {
  const [result] = await sql`
    UPDATE payments SET status = ${status} WHERE tx_hash = ${txHash} RETURNING *
  `;
  return result;
}

export async function getPaymentsByMerchant(merchant: string) {
  await ensureTable();
  return sql`
    SELECT * FROM payments
    WHERE LOWER(merchant) = LOWER(${merchant})
    ORDER BY created_at DESC
    LIMIT 50
  `;
}

export async function getPaymentByTxHash(txHash: string) {
  const [result] = await sql`
    SELECT * FROM payments WHERE tx_hash = ${txHash} LIMIT 1
  `;
  return result;
}

export async function getPaymentsBySlug(slug: string) {
  await ensureTable();
  return sql`
    SELECT * FROM payments
    WHERE slug = ${slug}
    ORDER BY created_at DESC
    LIMIT 50
  `;
}
