import Link from "next/link";
import { store } from "@/lib/store";
import { getOrBuildReceipt, resolveInput } from "@/lib/engine/build-receipt";
import { ClaimFlow } from "@/components/claim-flow";

export const dynamic = "force-dynamic";

export default async function ClaimTokenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cached = await store.getReceiptBySlug(slug);
  let address = cached?.token.address ?? null;
  let ticker = cached?.token.ticker ?? null;
  if (!address) {
    const r = await resolveInput(decodeURIComponent(slug));
    if (r.address) {
      const receipt = await getOrBuildReceipt(r.address).catch(() => null);
      address = r.address;
      ticker = receipt?.token.ticker ?? null;
    }
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-xl px-5 py-36 text-center">
        <h1 className="serif text-[48px]">Token not found.</h1>
        <Link href="/claim" className="btn btn-white mt-8">
          ← Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pt-12">
      <Link href={`/t/${slug}`} className="text-[13px] text-[var(--color-faint)] hover:text-white">
        ← Back to the receipt
      </Link>
      <p className="label mt-8">Claim</p>
      <h1 className="serif mt-3 text-[52px] leading-none sm:text-[64px]">
        {ticker ? `$${ticker}` : "This token"}
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--color-muted)]">
        Each method you verify adds a Verified line to Team. Identity links must be self-published by you.
      </p>
      <ClaimFlow address={address} ticker={ticker} slug={slug} />
    </div>
  );
}
