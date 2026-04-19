import Link from "next/link";

export default function WhatFreeCostsPage() {
  return (
    <div id="main-content" className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>

      <h1 className="font-serif text-[40px] leading-tight text-plum mb-4">
        What &ldquo;free&rdquo; really costs you
      </h1>
      <p className="text-[16px] text-muted mb-10">
        An honest breakdown of who actually pays when a wedding app is free.
      </p>

      <div className="space-y-10 text-[17px] text-plum leading-relaxed">
        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">The short version</h2>
          <p>
            Free wedding apps aren&apos;t free. You pay. You just don&apos;t see the
            invoice. Best industry estimates put the extraction at roughly{" "}
            <strong>$20 per user per year</strong> in raised vendor prices — money
            that routes through the directory first, then lands on your final bill as
            a slightly more expensive photographer, DJ, florist, caterer, or venue.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">How the extraction works</h2>
          <p>Here&apos;s the mechanic, step by step:</p>
          <ol className="mt-4 space-y-3 list-decimal pl-6">
            <li>
              You sign up for a &ldquo;free&rdquo; wedding planning app. You trust the
              results you see.
            </li>
            <li>
              Vendors pay the app to appear higher in the results. The good ones. The
              bad ones. It&apos;s the same auction — the highest bidder wins the top of
              the page.
            </li>
            <li>
              Vendor placement isn&apos;t cheap. A mid-tier directory listing runs
              hundreds to thousands of dollars per year depending on the market.
            </li>
            <li>
              Vendors don&apos;t eat that cost. They can&apos;t. It goes into their
              overhead, which goes into every invoice they write — including yours.
            </li>
            <li>
              You hire the &ldquo;top recommended&rdquo; photographer. You pay slightly
              more than you would have paid in a world without directories. That
              slightly-more is how the free app gets funded.
            </li>
          </ol>
          <p className="mt-4">
            You were the paying customer the whole time. You just never saw the line
            item.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">
            The math on $20/year
          </h2>
          <p>
            Most couples hire 5–10 vendors. Average wedding spend in the U.S. is
            roughly $30,000. A directory-influenced markup of even 0.5% on the
            vendor-facing portion of that spend is $100–$150 per wedding — spread
            across the planning year, that&apos;s the rough $20/user/year figure. More
            sophisticated estimates using public directory pricing put the number
            higher, not lower.
          </p>
          <p className="mt-4">
            That&apos;s the cost of &ldquo;free.&rdquo; And unlike a subscription fee,
            there&apos;s no way to see what you paid or why.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">
            The less-obvious cost: recommendation bias
          </h2>
          <p>
            The money is the easy part. The harder cost is this: when the app&apos;s
            income depends on vendor placement, the recommendations can&apos;t be
            neutral. They&apos;re optimized to monetize, not to fit your wedding.
          </p>
          <p className="mt-4">
            That&apos;s why your &ldquo;top match&rdquo; florist is always the one
            paying for the top slot — not the one whose aesthetic actually matches the
            board you built. You&apos;re not getting planning help. You&apos;re getting
            a sales funnel in planning clothes.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">
            What Eydn does differently
          </h2>
          <p>
            You pay us directly — $79 Lifetime or $14.99 per month — and that&apos;s
            the whole business model. No vendor commissions. No data sales. No ads.
            See{" "}
            <Link
              href="/how-we-make-money"
              className="text-violet hover:text-soft-violet underline"
            >
              How we make money
            </Link>{" "}
            and{" "}
            <Link href="/pledge" className="text-violet hover:text-soft-violet underline">
              the Eydn Pledge
            </Link>
            .
          </p>
          <p className="mt-4">
            You&apos;re going to pay something to plan your wedding online. We just
            think you should get to see the invoice.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-[13px] text-muted italic">
          Note: the figures on this page are our best industry estimates based on
          public directory pricing and average wedding spend. Fuller citations will
          be added as we publish the Pay-to-Play Receipt content series.
        </p>
      </div>
    </div>
  );
}
