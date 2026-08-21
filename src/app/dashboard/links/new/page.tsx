import type { Metadata } from "next";
import Link from "next/link";
import { PaymentLinkForm } from "@/components/payments/payment-link-form";

export const metadata: Metadata = {
  title: "New payment link",
};

export default async function NewPaymentLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; amount?: string; slug?: string }>;
}) {
  const params = await searchParams;
  const hasPrefill = Boolean(params.title || params.amount || params.slug);

  if (!hasPrefill) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-faint uppercase">
          New payment link
        </p>
        <h1 className="font-display mt-3 text-3xl tracking-[-0.045em] sm:text-4xl">
          Links start in the copilot.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted">
          Describe what you want to charge, like &ldquo;create a $5 payment link named
          shoepayment&rdquo;, and the AI copilot drafts it for you.
        </p>
        <Link
          href="/dashboard/create"
          className="mt-7 inline-flex items-center justify-center bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white"
        >
          Open the copilot
        </Link>
      </div>
    );
  }

  return (
    <PaymentLinkForm
      prefilledTitle={params.title}
      prefilledAmount={params.amount}
      prefilledSlug={params.slug}
    />
  );
}
