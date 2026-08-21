"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PayPortLogo } from "@/components/ui/payport-logo";

const tocItems = [
  { id: "overview", label: "Overview" },
  { id: "flow", label: "Flow" },
  { id: "settlement", label: "Settlement" },
  { id: "wallet", label: "Wallets" },
  { id: "dashboard", label: "Dashboard" },
  { id: "testnet", label: "Testnet" },
  { id: "faq", label: "FAQ" },
  { id: "related", label: "Related" },
];

const faqItems = [
  {
    question: "What does PayPort do?",
    answer:
      "PayPort turns a merchant's dollar price into an onchain payment link on X Layer. The customer pays the exact price in USDC (Circle-issued), and the funds move to the merchant's wallet without an intermediary.",
  },
  {
    question: "How does the AI copilot help?",
    answer:
      "Describe the payment in plain language, like create a $5 payment link named shoepayment. The copilot fills in the form for you. Publishing still needs your wallet signature.",
  },
  {
    question: "Why does the checkout ask for slightly more than the price?",
    answer:
      "A small buffer covers rounding at the token's precision. The contract refunds whatever is left over in the same transaction, so the customer never overpays.",
  },
  {
    question: "What currency settles a payment?",
    answer:
      "USDC, issued by Circle. Prices are stored as cents and USDC tracks the dollar, so the quoted amount is exact.",
  },
  {
    question: "Can a link be paid twice?",
    answer:
      "No. Each link is single use. It is deactivated in the same transaction that settles it, before any value moves.",
  },
  {
    question: "Is this live on mainnet?",
    answer:
      "The demo runs on X Layer Testnet today. The same contract deploys unchanged to X Layer Mainnet with a canonical USDC address.",
  },
];

export function DocsPage() {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const targets = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!("IntersectionObserver" in window) || targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;

        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0.08, 0.16, 0.32, 0.5, 0.72] },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background text-ink">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <PayPortLogo />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
          >
            Open dashboard
          </Link>
        </div>
      </header>

      <div className="payport-docs mx-auto max-w-7xl px-5 pb-14 sm:px-8 lg:px-10 lg:pb-20">
        <aside className="payport-docs__toc" aria-label="On this page">
          <p className="payport-docs__toc-label">On this page</p>
          <nav aria-label="Document sections">
            <ul className="payport-docs__toc-list">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    className="payport-docs__toc-link"
                    href={`#${item.id}`}
                    aria-current={activeId === item.id ? "true" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="payport-docs__article">
          <header className="payport-docs__header">
            <span className="text-[10px] font-semibold tracking-[0.16em] text-accent uppercase">
              PayPort docs
            </span>
            <h1 className="font-display payport-docs__title">Clear payment links on X Layer.</h1>
            <p className="payport-docs__lead">
              PayPort is where merchants dock to get paid. Describe a payment to the AI copilot,
              publish one dollar-priced link, and customers pay the exact amount in Circle-native
              USDC on X Layer. It settles onchain and lands straight in the merchant wallet.
            </p>
            <div className="payport-docs__callout">
              <p>
                Start with the overview, then review the flow below. If you want the merchant view
                first, open <Link href="/dashboard" className="font-semibold text-ink underline underline-offset-2">/dashboard</Link>.
              </p>
            </div>
          </header>

          <section className="payport-docs__section" id="overview">
            <h2 className="payport-docs__section-title">Overview</h2>
            <p>
              The flow is simple: publish a dollar-priced link, share it, and the payment moves
              onchain to the merchant wallet. The merchant receives the dollar value they asked
              for, and the customer gets anything sent over refunded.
            </p>
            <p>
              The landing page introduces the product, the checkout confirms the amount, the
              dashboard shows merchant activity, and this page ties the flow together.
            </p>
          </section>

          <section className="payport-docs__section" id="flow">
            <h2 className="payport-docs__section-title">Flow</h2>
            <ol className="payport-docs__steps">
              <li>
                <strong>Describe the payment.</strong> Open the copilot and type what you want to
                charge, like &ldquo;create a $5 payment link named shoepayment.&rdquo; The copilot
                extracts the amount, names the link, and generates the URL slug.
              </li>
              <li>
                <strong>Review and publish.</strong> The draft shows up as a card in the chat with
                the name, price, and URL. One click sends it to your wallet to sign, so custody
                never leaves your hands. Prefer to tweak first? There is an edit option too.
              </li>
              <li>
                <strong>Share one payment link.</strong> Customers open the URL, connect a wallet,
                and see the exact dollar price with the USDC amount due.
              </li>
              <li>
                <strong>Settle onchain.</strong> The customer approves the exact amount, the
                contract pulls it, forwards USDC to the merchant, refunds any rounding surplus to
                the payer, and closes the single-use link. All of it happens in one transaction.
              </li>
            </ol>
          </section>

          <section className="payport-docs__section" id="settlement">
            <h2 className="payport-docs__section-title">Settlement</h2>
            <p>
              Prices are stored onchain as cents and payments settle in USDC from Circle.
              USDC tracks the dollar, so the quoted amount is exact. There is no oracle rate
              to go stale between quote and payment, and nothing for the customer to work out.
            </p>
            <ul className="payport-docs__list">
              <li>The merchant receives exactly the dollar price they set.</li>
              <li>Payers approve the precise amount plus a small rounding buffer; PayPort never requests unlimited spending rights.</li>
              <li>The settling transaction forwards USDC to the merchant and refunds any surplus to the payer atomically.</li>
              <li>Each link is single use and deactivates before value moves.</li>
              <li>Settlement history is stored onchain and read back in pages, newest first, so the dashboard loads from plain RPC calls with no indexer.</li>
            </ul>
          </section>

          <section className="payport-docs__section" id="wallet">
            <h2 className="payport-docs__section-title">Wallets</h2>
            <p>
              Any injected browser wallet works on X Layer
              Testnet (chain 1952).
            </p>
            <p>
              Customers need a little testnet OKB for gas and test USDC for the payment. Both are
              free: gas from the{" "}
              <a href="https://web3.okx.com/xlayer/faucet/xlayerfaucet" target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-2">
                X Layer faucet
              </a>{" "}
              and USDC from{" "}
              <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-2">
                Circle&apos;s official faucet
              </a>
              . Merchants only connect a wallet to publish links and see their own activity.
            </p>
          </section>

          <section className="payport-docs__section" id="dashboard">
            <h2 className="payport-docs__section-title">Dashboard</h2>
            <p>
              The merchant dashboard shows settlement metrics, every published link, and a live
              onchain ledger once a wallet is connected.
            </p>
            <ul className="payport-docs__list">
              <li>Links appear as onchain records with their dollar price and status: active, paid, closed, or expired.</li>
              <li>Recent settlements appear in a ledger with the dollar amount and exact USDC received.</li>
              <li>Every link has a one-click copy button for its checkout URL.</li>
              <li>Paid links offer a receipt, downloadable as a JPEG, that links to the explorer.</li>
              <li>The view stays scoped to the connected merchant wallet.</li>
            </ul>
          </section>

          <section className="payport-docs__section" id="testnet">
            <h2 className="payport-docs__section-title">Testnet</h2>
            <p>
              PayPort runs on X Layer Testnet (chain 1952) for the demo. The same contract deploys
              unchanged to X Layer Mainnet with Circle&apos;s canonical mainnet USDC. Contracts:
              PayPort at{" "}
              <a
                href="https://www.okx.com/web3/explorer/xlayer-test/address/0x8E29beF64b0a357A5C31ea36736c2f9f5541b431"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink underline underline-offset-2"
              >
                0x8E29beF64b0a357A5C31ea36736c2f9f5541b431
              </a>{" "}
              settled in native USDC at{" "}
              <a
                href="https://www.okx.com/web3/explorer/xlayer-test/address/0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink underline underline-offset-2"
              >
                0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3
              </a>
              .
            </p>
            <div className="payport-docs__note">
              Non-custodial by design. Payments move directly from payer to merchant wallet.
              PayPort never holds funds, and the copilot never signs anything.
            </div>
          </section>

          <section className="payport-docs__section" id="faq">
            <h2 className="payport-docs__section-title">FAQ</h2>
            <dl className="payport-docs__faq">
              {faqItems.map((item) => (
                <div className="payport-docs__qa" key={item.question}>
                  <dt>{item.question}</dt>
                  <dd>{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="payport-docs__section payport-docs__section--end" id="related">
            <h2 className="payport-docs__section-title">Related links</h2>
            <ul className="payport-docs__related">
              <li>
                <Link href="/dashboard" className="payport-docs__related-link">
                  Open dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/links/new" className="payport-docs__related-link">
                  Create a link
                </Link>
              </li>
              <li>
                <Link href="/" className="payport-docs__related-link">
                  Back home
                </Link>
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
