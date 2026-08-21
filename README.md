# PayPort

PayPort is where merchants dock to get paid. Publish a payment link priced in US dollars,
share one URL, and customers pay the exact price in native USDC on X Layer — settled fully onchain,
straight to the merchant's wallet.

Built for the X Layer BuildX AI Season Hackathon.

**The AI part:** the merchant dashboard ships with a copilot. Describe the payment in plain
language — *"create a $5 payment link named shoepayment"* — and the copilot extracts the
amount, names the link, generates the URL slug, and pre-fills the publish form. The merchant
keeps full custody: nothing goes onchain without their wallet signature. The copilot runs on
Groq (`openai/gpt-oss-20b`) through a single server route and can only fill forms; it cannot
move funds.

## What the app has

- Public home page and product docs
- Merchant dashboard with settlement metrics, links table, and a live onchain ledger
- AI copilot chat that drafts payment links from natural language
- Payment link creation with live preview and QR/share after publishing
- Public checkout page paying the exact dollar price in USDT (approve + pull, surplus refunded)
- Customer receipt page (download as JPEG, view on explorer)
- "My receipts" history saved on the payer's device

## How settlement works

Prices are stored onchain as cents. Customers pay in Circle-issued native USDC, which tracks the dollar, so the
quoted amount is exact — there is no oracle rate that can go stale between quote and payment.
Each link is single use: the same transaction that settles a payment deactivates the link
before any value moves, then forwards the exact price to the merchant and refunds any surplus
to the payer. Settlement history is stored onchain (not just emitted as events) and read back
in pages, so the dashboard works on public RPC infrastructure.

## Stack

- Solidity 0.8.25 (Hardhat workspace in `contracts/`)
- Next.js 16, React 19, Tailwind CSS 4
- wagmi + viem
- Groq API for the copilot
- X Layer Testnet (chain 1952)

## Run the app

1. Install packages at the repo root:

   ```bash
   npm install
   ```

2. Add `.env.local` with your Groq key:

   ```
   GROQ_API_KEY=your-key
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Deployed contracts (X Layer Testnet)

- PayPort: `0x8E29beF64b0a357A5C31ea36736c2f9f5541b431`
- Settlement token: Circle native USDC `0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3` (same issuer as X Layer mainnet USDC `0xB6CEceAB302E2E4948951eE7843FC24E92933061`)

Chain data:

- RPC: `https://testrpc.xlayer.tech/terigon`
- Explorer: `https://www.okx.com/web3/explorer/xlayer-test`
- Faucet: `https://web3.okx.com/xlayer/faucet/xlayerfaucet`

Deployed addresses live in `src/lib/contract-address.ts`, written by the deploy script.

## Contract workspace

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network xlayerTestnet
node scripts/write-abi.js
```

Pass `USDT_ADDRESS` to attach a settlement token; unset, it deploys a MockUSDT for isolated testing.
seeds sample links, and writes the addresses into the Next.js app.
