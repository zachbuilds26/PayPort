import { NextRequest, NextResponse } from "next/server";
import { updatePaymentByTxHash } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { tx_hash, status } = await req.json();
    if (!tx_hash || typeof tx_hash !== "string") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const row = await updatePaymentByTxHash(tx_hash, status ?? "settled");
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
