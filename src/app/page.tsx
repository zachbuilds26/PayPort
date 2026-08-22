import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PayPortLogo } from "@/components/ui/payport-logo";
import { SplashWrapper } from "@/components/ui/splash-wrapper";
import { explorerAddress, xlayerChain, shortenAddress } from "@/lib/chain";
import { PAYPORT_ADDRESS } from "@/lib/contract-address";

const faqItems = [
  {
    question: "What is PayPort?",
    answer:
      "PayPort gives a merchant one link per payment priced in US dollars. Customers pay the exact dollar price in native USDC on X Layer, and the settlement arrives directly in the merchant wallet.",
  },
  {
    question: "How does the AI copilot work?",
    answer:
      "Type what you want to charge, like create a $5 payment link named shoepayment. The copilot fills in the amount, the name, and the URL. You confirm in your wallet and the link goes live.",
  },
  {
    question: "Do you hold funds?",
    answer:
      "No. The contract pulls only the exact price from the payer and forwards it straight to the merchant. Anything extra is refunded in the same transaction.",
  },
  {
    question: "Can a link be paid twice?",
    answer:
      "No. Every link works once. It closes as soon as a payment settles, so it can never be used again.",
  },
  {
    question: "Is this ready for mainnet?",
    answer:
      "The demo runs on X Layer Testnet today. The same contract deploys to mainnet with Circle's regular USDC address.",
  },
  {
    question: "Which wallets work?",
    answer: "Any browser wallet works. OKX Wallet and MetaMask are both fine.",
  },
];



const problems = [
  {
    title: "Coin quotes eat people alive",
    body: "Fix a coin amount and the merchant eats the volatility. Convert at checkout and either the price has moved or you are trusting some backend nobody can inspect.",
  },
  {
    title: "Addresses are where money dies",
    body: "Copy an address, pick a network, hope the gas token is there. One wrong tap and the payment is gone. There is no undo button in crypto.",
  },
  {
    title: "Processors gatekeep the money",
    body: "Custodial payment apps take a cut, hold your balance until payout day, and block entire countries. Your revenue lives on their schedule.",
  },
];

const fixes = [
  {
    title: "You owe $10. Click. Paid.",
    body: "Links show the dollar amount and settle in Circle-issued USDC. The number at checkout is the number that leaves the wallet. Nothing moves in between.",
  },
  {
    title: "No address to get wrong",
    body: "There is nothing to copy and no network to pick. The link knows the merchant, the chain, and the amount. First-timers pay it without reading a guide.",
  },
  {
    title: "Any country, straight to your wallet",
    body: "One transaction carries USDC from the payer to the merchant. No account, no borders, no payout queue. PayPort holds nothing and takes nothing.",
  },
];

const copilotSteps = [
  {
    number: "01",
    step: "Say it",
    body: "Type one sentence into the copilot. The amount, the name, whatever matters for the invoice.",
    sample: "create a $5 payment link named shoepayment",
  },
  {
    number: "02",
    step: "Review it",
    body: "The copilot drafts the link and shows it to you right in the chat. Nothing publishes until you sign.",
    sample: "shoepayment · $5.00 · /pay/shoepayment",
  },
  {
    number: "03",
    step: "Share it",
    body: "Confirm once in your wallet and the link is live on X Layer. Copy the URL and send it anywhere.",
    sample: "Copy checkout URL",
  },
];

const settlementPoints = [
  {
    icon: "grid",
    title: "Prices live onchain as cents",
    copy: "A $12.50 link stores 1250 cents in the contract. Native USDC tracks the dollar, so the quote is the price. Nothing drifts with the market.",
  },
  {
    icon: "wallet",
    title: "Approvals that respect the payer",
    copy: "PayPort asks for the exact amount plus a small rounding buffer. It never asks to spend your whole wallet.",
  },
  {
    icon: "check",
    title: "One transaction does everything",
    copy: "One transaction pays the merchant, refunds the extra to the customer, and closes the link. It all happens at once.",
  },
  {
    icon: "receipt",
    title: "A ledger anyone can read",
    copy: "Settlement history is stored in the contract itself and read back in pages, so the merchant dashboard runs on public RPC infrastructure with no indexer to trust.",
  },
] as const;

export default function Home() {
  return (
    <SplashWrapper>
    <main className="min-h-screen overflow-hidden bg-background text-ink">
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-fade opacity-60">
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
          <div className="absolute right-0 bottom-0 z-0 w-[120%] h-[120%] opacity-[0.20]" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', transform: 'translateX(350px) translateY(80px) scale(1.8)', transformOrigin: 'bottom right' }}>
            <Image
              src="/hero-engraving.webp"
              alt=""
              fill
              sizes="100vw"
              priority
              unoptimized
              className="object-contain object-right-bottom"
            />
          </div>
        </div>
        <header className="relative z-10 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <PayPortLogo />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted sm:gap-6" aria-label="Main navigation">
            <a href="#problem" className="py-2 hover:text-ink">
              The problem
            </a>
            <a href="#copilot" className="py-2 hover:text-ink">
              Copilot
            </a>
            <a href="#settlement" className="py-2 hover:text-ink">
              Settlement
            </a>
            <a href="#faq" className="py-2 hover:text-ink">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="border border-line px-3 py-2.5 text-xs font-semibold text-ink hover:border-line-strong hover:bg-surface"
            >
              Open dashboard
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 pb-10 pt-8 text-center sm:px-8 sm:pb-14 lg:px-10 lg:pt-16">
          <p className="inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">
            <span className="size-1.5 bg-accent animate-pulse" />
            <span className="grid size-5 place-items-center bg-white/10 p-0.5">
              <Image src="/xlayer-logo.png" alt="" width={16} height={16} unoptimized className="brightness-0 invert" />
            </span>
            Live on {xlayerChain.name}
          </p>
          <h1 className="font-display mt-5 max-w-3xl text-4xl leading-[0.92] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
            Payment links
            <br />
            <span className="text-accent/95">Settled in native USDC.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
            Publish a payment link with a clear dollar price. Your customers pay it in
            native USDC on X Layer. The copilot writes it, you sign it.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 bg-accent px-5 py-3 text-sm font-semibold text-accent-ink hover:bg-white sm:w-auto"
            >
              <Icon name="plus" className="size-4" />
              Create a payment link
            </Link>
            <Link
              href="/docs"
              className="inline-flex w-full items-center justify-center gap-2 border border-line px-5 py-3 text-sm font-semibold hover:border-line-strong hover:bg-surface sm:w-auto"
            >
              View docs <Icon name="arrow-up-right" className="size-4" />
            </Link>
          </div>
          <p className="mt-4 max-w-xl text-xs leading-5 text-muted">
            Testnet only. Get free test USDC from{" "}
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:text-white"
            >
              Circle&apos;s official faucet
            </a>{" "}
            and gas OKB from the{" "}
            <a
              href="https://web3.okx.com/xlayer/faucet/xlayerfaucet"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:text-white"
            >
              X Layer faucet
            </a>
            .
          </p>
        </div>
      </section>

      <section id="problem" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
            The problem
          </p>
          <h2 className="font-display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">
            Accept crypto without
            <br />
            quoting crypto.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            Small merchants, creators, and freelancers think in dollars but want to take
            crypto payments. Customers do not want to work out what 0.005 ETH costs.
            They want to see &ldquo;you owe $10&rdquo; and click pay. Today both sides get tools
            built for somebody else.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <article className="border border-line bg-surface p-6 sm:p-8">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-faint uppercase">
              The usual way
            </p>
            <ul className="mt-6 space-y-7">
              {problems.map((item) => (
                <li key={item.title}>
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="border border-accent/15 bg-accent/5 p-6 sm:p-8">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
              The PayPort way
            </p>
            <ul className="mt-6 space-y-7">
              {fixes.map((item) => (
                <li key={item.title}>
                  <h3 className="text-lg font-medium">{item.title}</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

    <section id="copilot" className="relative border-t border-line bg-background-deep/40 mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
            The copilot
          </p>
          <h2 className="font-display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">
            From sentence to invoice.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            Creating a link is a conversation. The copilot writes the draft and your wallet
            signs it. That is the only way to publish here, and your keys stay yours.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {copilotSteps.map((step) => (
            <article key={step.number} className="flex flex-col border border-line bg-background p-5 sm:p-6">
              <p className="text-xs font-semibold tracking-[0.16em] text-accent">{step.number}</p>
              <h3 className="mt-3 text-lg font-medium">{step.step}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
              <p className="mt-5 break-words border border-line bg-background-deep px-3 py-2.5 font-mono text-xs leading-5 text-muted">
                {step.sample}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="settlement" className="relative bg-background-deep overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">
              Settlement
            </p>
            <h2 className="font-display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">
              Exact by design.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              No oracle rates. No stale prices. No refund surprises. Here is what actually
              happens onchain when a payment settles.
            </p>
          </div>

          <div className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2">
            {settlementPoints.map((point) => (
              <article key={point.title} className="bg-surface p-6 sm:p-8">
                <span className="grid size-10 place-items-center border border-line text-accent">
                  <Icon name={point.icon} className="size-4.5" />
                </span>
                <h3 className="mt-5 text-lg font-medium">{point.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">{point.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="relative border-t border-line bg-background-deep/30 mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 overflow-hidden">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold tracking-[0.15em] text-accent uppercase">FAQ</p>
          <h2 className="font-display mt-4 text-4xl tracking-[-0.045em] sm:text-5xl">
            Straight answers for merchants.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            A few quick notes on pricing, the copilot, and testnet use.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {faqItems.map((item) => (
            <details
              key={item.question}
              name="faq"
              className="group rounded-none border border-line bg-background p-5 transition hover:border-line-strong hover:bg-surface-hover"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-4 text-left font-display text-xl leading-tight tracking-[-0.035em]">
                <span>{item.question}</span>
                <Icon
                  name="chevron"
                  className="size-4 shrink-0 text-accent transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="mt-4 text-sm leading-6 text-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-line px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <PayPortLogo />
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href={explorerAddress(PAYPORT_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-accent underline underline-offset-2 hover:text-white"
          >
            {shortenAddress(PAYPORT_ADDRESS)}
          </a>
          <p>Running on {xlayerChain.name}. Testnet funds only.</p>
        </div>
      </footer>
    </main>
    </SplashWrapper>
  );
}
