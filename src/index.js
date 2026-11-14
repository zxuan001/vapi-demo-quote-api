// vAPI Demo Quote API — Cloudflare Worker port of ~/workspace/vapi-api/server.mjs
// Same behaviour, same x402 v2 paywall: GET /quote costs $0.001 USDC (exact,
// Base mainnet eip155:8453), payee = the user's vAPI account wallet.
// Unpaid GET /quote -> 402 with the payment challenge. GET / -> service info.
//
// Differences from the Express version (deliberate):
// - No in-memory counter: the tip rotates deterministically by minute
//   (Workers are stateless; a counter would reset on every isolate anyway).
// - Hono + @x402/hono instead of Express + @x402/express (same accepts config).
// - The facilitator's /supported list is fetched lazily inside the first
//   /quote request (Workers forbid fetch at module load); see the middleware
//   below. On Cloudflare's edge this fetch goes direct (no proxy), unlike
//   local wrangler dev on this VM, where workerd's outbound TLS is broken
//   by the egress proxy — local 402 tests use a stub facilitator instead
//   (worker/test-local/).
// - Facilitator: PayAI public facilitator (verified live 2026-11-15 to support
//   v2 exact USDC on eip155:8453; x402.org/facilitator is testnets-only).
import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

const PAY_TO = "0xf44905988Af5AdD871762E71C0B6535113ccd9DC"; // user's vAPI wallet (Base)
const NETWORK = "eip155:8453"; // Base mainnet
const FACILITATOR_URL = "https://facilitator.payai.network";

const TIPS = [
  "Ship the smallest thing that works, then iterate.",
  "Read the error message twice before changing code.",
  "A paid API should fail closed: no payment, no data.",
  "Pin your dependency versions; latest is a moving target.",
  "Log the request, never the secret.",
  "Verify on-chain before you report a mint.",
  "A 402 is a price tag, not an error.",
  "Test the unhappy path first - it is the one users hit.",
];

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme(),
);

const app = new Hono();

// Workers fix: the @x402 middleware's default `syncFacilitatorOnStart` calls
// facilitator /supported at module load (global scope), where Workers forbid
// fetch. So pass syncFacilitatorOnStart=false and initialise lazily inside
// the first /quote request instead (cached per isolate; reset on failure so
// a later request retries if the facilitator was briefly down).
let facilitatorInit = null;
app.use("/quote", async (c, next) => {
  if (!facilitatorInit) {
    facilitatorInit = resourceServer.initialize().catch((err) => {
      facilitatorInit = null;
      throw err;
    });
  }
  await facilitatorInit;
  await next();
});

app.use(
  paymentMiddleware(
    {
      "GET /quote": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: NETWORK,
            payTo: PAY_TO,
            maxTimeoutSeconds: 300,
          },
        ],
        description: "One paid quote: server time plus a rotating developer tip.",
      },
    },
    resourceServer,
    undefined,
    undefined,
    false, // syncFacilitatorOnStart — see lazy init above
  ),
);

app.get("/", (c) => {
  return c.json({
    service: "vapi-demo-quote",
    endpoint: "GET /quote",
    price: "$0.001 USDC",
    network: "Base (eip155:8453)",
    payTo: PAY_TO,
    protocol: "x402 v2 (exact)",
    facilitator: FACILITATOR_URL,
  });
});

app.get("/quote", (c) => {
  // Deterministic rotation: one tip per minute, same for every caller.
  const tip = TIPS[Math.floor(Date.now() / 60000) % TIPS.length];
  return c.json({
    time: new Date().toISOString(),
    tip,
    paid: true,
    price: "$0.001 USDC",
  });
});

export default app;
