import { NextRequest } from "next/server";
import { resolveInput, getOrBuildReceipt } from "@/lib/engine/build-receipt";
import { summarize } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-sent events: each collector reports the moment it finishes, so the
 *  UI shows what is actually being read, not a fake progress bar. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const force = req.nextUrl.searchParams.get("force") === "1";
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const t0 = Date.now();
      try {
        if (!q.trim()) throw new Error("Paste a token address or $ticker.");
        const resolved = await resolveInput(q);
        if (!resolved.address) throw new Error(resolved.error ?? "Could not resolve that token.");
        send("stage", { id: "resolve", detail: `${resolved.address.slice(0, 4)}…${resolved.address.slice(-4)}`, ms: Date.now() - t0 });
        const receipt = await getOrBuildReceipt(resolved.address, {
          force,
          onStage: (id, detail) => send("stage", { id, detail, ms: Date.now() - t0 }),
        });
        send("done", { summary: summarize(receipt), ms: Date.now() - t0 });
      } catch (e) {
        send("error", { message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
