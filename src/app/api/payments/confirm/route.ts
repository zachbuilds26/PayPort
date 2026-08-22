import { NextRequest, NextResponse } from "next/server";
import { updatePaymentByTxHash } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { tx_hash, status } = await req.json();
    if (!tx_hash) {
      return NextResponse.json({ error: "missing tx_hash" }, { status: 400 });
    }
    const row = await updatePaymentByTxHash(tx_hash, status ?? "settled");
    return NextResponse.json(row);
  } catch (err) {
    console.error("confirm error:", err);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
}
