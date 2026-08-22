import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.6-27b", "groq/compound-mini"];

const SYSTEM_PROMPT = `You are the PayPort Copilot, an assistant inside a merchant dashboard for PayPort.
PayPort is an app on X Layer (an Ethereum L2) where merchants publish payment links priced in US dollars and customers pay them in native USDC onchain.

Your only job is to turn what the merchant says into either:
1. A draft payment link, or
2. A plain helpful answer.

Respond with ONLY a JSON object, no markdown fences, matching this shape:
{"action":"prefill_link"|"answer","amount_usd":number|null,"title":string|null,"slug":string|null,"reply":string}

Rules:
- Use "prefill_link" when the merchant asks to create/publish/make/charge/set a payment amount. Extract the dollar amount and a short human title.
- The title should be 2-6 words describing what is being paid for, derived from their words. If they give a name for the payment ("set payment name as shoepayment"), use it as the title.
- Generate "slug" yourself: lowercase letters, numbers, single hyphens only, derived from the title, max 40 chars. Always provide it for prefill_link.
- If no dollar amount is present, set amount_usd to null and ask for it in reply.
- Use "answer" for questions about PayPort, USDC, X Layer, or anything else. Keep replies under 60 words.
- Never invent prices, wallet balances, or transaction data you were not given.`;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function parseModelJson(raw: string) {
  const trimmed = raw.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output.");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function sanitizeReply(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'&]/g, "")
    .trim()
    .slice(0, 500);
}

/**
 * Offline fallback: the core "create a $X link named Y" command is simple
 * enough to parse without a model, so a network blip never blocks publishing.
 */
function localParse(message: string) {
  const wantsLink =
    /\b(create|make|new|publish|charge|set up|invoice|link)\b/i.test(message);
  const amountMatch = message.match(
    /\$\s*(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:usd|usdc|dollars?)\b/i,
  );
  const amount = amountMatch ? Number(amountMatch[1] ?? amountMatch[2]) : undefined;

  const nameMatch = message.match(
    /(?:named?|called|titled)\s+"?([a-z0-9][a-z0-9 \-]{1,38}[a-z0-9])"?/i,
  );
  const title = nameMatch ? nameMatch[1].trim() : undefined;

  if (!wantsLink || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return undefined;
  }

  return {
    action: "prefill_link",
    amount_usd: amount,
    title: title ?? null,
    slug: slugify(title ?? "") || null,
    reply: `Ready to publish${title ? ` "${title}"` : ""} at $${amount}. Confirm on the form.`,
  };
}

async function callModel(apiKey: string, message: string) {
  let lastError: unknown;

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 300,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: message },
            ],
          }),
          signal: AbortSignal.timeout(15_000),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = payload.choices?.[0]?.message?.content;
          if (content) return { ok: true as const, content };
          lastError = new Error("Empty model response.");
        } else {
          lastError = new Error(`Model ${model} returned ${response.status}.`);
          if (response.status !== 429 && response.status < 500) break;
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("All models failed.");
}

function buildPrefill(parsed: {
  action?: unknown;
  amount_usd?: unknown;
  title?: unknown;
  slug?: unknown;
  reply?: unknown;
}) {
  const usd =
    typeof parsed.amount_usd === "number"
      ? parsed.amount_usd
      : Number(parsed.amount_usd);
  if (!Number.isFinite(usd) || usd <= 0) return undefined;

  const action: {
    type: "prefill_link";
    amount?: string;
    title?: string;
    slug?: string;
  } = {
    type: "prefill_link",
    amount: Math.round(usd * 100) / 100 === usd ? String(usd) : usd.toFixed(2),
  };

  if (typeof parsed.title === "string" && parsed.title.trim()) {
    action.title = parsed.title.trim().slice(0, 200);
  }

  action.slug =
    typeof parsed.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parsed.slug)
      ? parsed.slug.slice(0, 64)
      : slugify(action.title ?? "") || undefined;

  if (!action.slug) return undefined;

  return {
    reply: sanitizeReply(
      parsed.reply || `Ready to publish${action.title ? ` "${action.title}"` : ""} at $${action.amount}. Confirm on the form.`,
    ),
    action,
  };
}

/* ---------- simple in-memory rate limiter ---------- */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { reply: "The copilot is not configured yet. Add GROQ_API_KEY to enable it." },
      { status: 503 },
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { reply: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let message = "";
  try {
    const body = (await request.json()) as { message?: unknown };
    message = typeof body.message === "string" ? body.message.slice(0, 500) : "";
  } catch {
    return NextResponse.json({ reply: "That request could not be read." }, { status: 400 });
  }

  if (!message.trim()) {
    return NextResponse.json(
      { reply: "Tell me what to charge, like: create a $5 payment link named shoepayment." },
      { status: 400 },
    );
  }

  try {
    const result = await callModel(apiKey, message);
    const parsed = parseModelJson(result.content);

    if (parsed.action === "prefill_link") {
      const prefill = buildPrefill(parsed);

      if (!prefill) {
        return NextResponse.json({
          reply: sanitizeReply(parsed.reply) || "How much should this payment link charge, in dollars?",
        });
      }

      return NextResponse.json(prefill);
    }

    return NextResponse.json({
      reply: sanitizeReply(parsed.reply) || "Could you rephrase that?",
    });
  } catch (error) {
    console.error("[copilot] model unavailable, using local parser:", error);

    const local = localParse(message);
    if (local) {
      const prefill = buildPrefill(local);
      if (prefill) return NextResponse.json(prefill);
    }

    return NextResponse.json({
      reply:
        "The copilot is momentarily offline. Phrase it like \"create a $5 link named shoes\" and I can still draft it.",
    });
  }
}
