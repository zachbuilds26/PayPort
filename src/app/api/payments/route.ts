import { NextRequest, NextResponse } from "next/server";
import { insertPayment, getPaymentsByMerchant } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const body = await req.json();

    const slug = String(body.slug || "").trim().slice(0, 100);
    const amount_usdc = Number(body.amount_usdc);
    const payer = String(body.payer || "").trim().slice(0, 66);
    const merchant = String(body.merchant || "").trim().slice(0, 66);
    const tx_hash = body.tx_hash ? String(body.tx_hash).trim().slice(0, 66) : undefined;
    const status = body.status ? String(body.status).trim().slice(0, 20) : undefined;

    if (!slug || !Number.isFinite(amount_usdc) || amount_usdc <= 0 || !payer || !merchant) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const row = await insertPayment({ slug, amount_usdc, payer, merchant, tx_hash, status });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    const merchant = req.nextUrl.searchParams.get("merchant");
    if (!merchant || !/^0x[a-fA-F0-9]{4,64}$/.test(merchant)) {
      return NextResponse.json({ error: "Invalid merchant address" }, { status: 400 });
    }

    const rows = await getPaymentsByMerchant(merchant);
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
