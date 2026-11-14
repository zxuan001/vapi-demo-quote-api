# vAPI Demo Quote API

A paid API an agent can call: one `GET` returns server time plus a rotating developer tip, after a **$0.001 USDC** payment enforced by an **x402 v2** paywall on **Base**.

Live endpoint: **https://vapi-demo-quote.yyakuza929.workers.dev/quote**

## How it works

- `GET /quote` — unpaid requests get an HTTP 402 with a machine-readable x402 v2 payment challenge (exact scheme, 1000 atomic USDC on Base `eip155:8453`, payTo the operator's wallet, 300s timeout). A client that pays gets `{time, tip, paid: true}`.
- `GET /` — service info, unprotected.

Runs on Cloudflare Workers (always on, stable URL, free tier). Facilitator: [PayAI public facilitator](https://facilitator.payai.network) (verified to support v2 exact USDC on Base; the x402.org facilitator is testnets-only).

- Price: $0.001 USDC per call
- Payout wallet: `0xf44905988Af5AdD871762E71C0B6535113ccd9DC`
- vAPI listing: https://api.vapinetwork.ai/call/vapi-demo-quote-api-2

## Proof it settles

One real paid call settled 15 Nov 2026 via the `vapi pay` CLI — HTTP 200, `paid: true`:

- Settlement tx: [0x9f883c445caa28271013041d2a67a84221cf830965f76b8eade8e04f5590d884](https://basescan.org/tx/0x9f883c445caa28271013041d2a67a84221cf830965f76b8eade8e04f5590d884) (block 57437549, USDC Transfer 0.001 on Base)
- vAPI Discover independently verified the live x402 challenge on this URL ("Live x402 challenge verified", 1 payment option, exact, 1000 atomic USDC).

## Deploy your own

```bash
npm install
npx wrangler login   # once, in your own terminal
npm run deploy
```

Run `npm run bundle` to build `dist/worker.js`, the single-file bundle — you can also paste it into the Cloudflare dashboard (Workers & Pages → Create Worker → Edit Code).

Two porting notes (Express → Worker): the facilitator `/supported` fetch is lazily initialised inside the first `/quote` request (Workers forbid fetch at module load), and a `url` builtin shim (`shims/url.js`) satisfies the bundler for an unused `@x402` chunk.

## Why this exists

AI agents that sell API calls have no trustless way to get paid per call, and agents that buy them have no on-chain proof the call happened. API keys, invoices and goodwill don't work between autonomous agents. This is the smallest working version of the fix: a metered endpoint where every paid call is a signed, settled, on-chain fact.

Built in one night (14–15 Nov 2026), documented in this thread: https://x.com/Notz_You/status/2121690129341600165

Submitted to zkVerify Agent Games Season 01 — Wildcard track.
