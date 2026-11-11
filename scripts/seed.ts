// Pre-build Receipts for a handful of live tokens so the shelves aren't empty.
// Uses only public endpoints, no keys required. These are REAL lookups.
//
//   npm run seed
//
// Note: we deliberately do NOT auto-freeze live tokens into the graveyard.
// A Receipt never calls a project a failure; the graveyard is for genuine,
// hand-reviewed failures added via POST /api/graveyard.

import { getOrBuildReceipt } from "../src/lib/engine/build-receipt";

const TOKENS: { address: string; label: string }[] = [
  { address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", label: "JUP" },
  { address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL", label: "JTO" },
  { address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", label: "BONK" },
  { address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", label: "WIF" },
];

async function main() {
  for (const t of TOKENS) {
    process.stdout.write(`Building ${t.label}… `);
    try {
      const r = await getOrBuildReceipt(t.address, { force: true });
      console.log(`✓ ${r.evidence.level} (${r.evidence.sourced}/${r.evidence.total}) in ${(r.buildMs / 1000).toFixed(1)}s`);
    } catch (e) {
      console.log(`✗ ${(e as Error).message}`);
    }
  }
  console.log("\nDone. Visit http://localhost:3000");
}

main();
