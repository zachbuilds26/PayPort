import { NextRequest, NextResponse } from "next/server";
import { insertPayment, getPaymentsByMerchant } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, amount_usdc, payer, merchant, tx_hash, status } = body;
    if (!slug || !amount_usdc || !payer || !merchant) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }
    const row = await insertPayment({ slug, amount_usdc, payer, merchant, tx_hash, status });
    return NextResponse.json(row);
  } catch (err) {
    console.error("payments POST error:", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const merchant = req.nextUrl.searchParams.get("merchant");
    if (!merchant) {
      return NextResponse.json({ error: "missing merchant" }, { status: 400 });
    }
    const rows = await getPaymentsByMerchant(merchant);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("payments GET error:", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
