import Link from "next/link";

export default function PledgePage() {
  return (
    <div id="main-content" className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>

      <h1 className="font-serif text-[40px] leading-tight text-plum mb-4">
        The Eydn Pledge
      </h1>
      <p className="text-[16px] text-muted mb-10">
        Five promises. If we ever break one, you get a refund. No argument, no fine print.
      </p>

      <ol className="space-y-8 text-[17px] text-plum leading-relaxed">
        <li>
          <div className="font-semibold text-violet text-[13px] uppercase tracking-wide mb-1">
            One
          </div>
          <p>
            <strong>We don&apos;t take money from vendors.</strong> No paid placements, no
            sponsored listings, no preferred-partner kickbacks. A photographer can&apos;t pay
            us to appear higher in your results.
          </p>
        </li>
        <li>
          <div className="font-semibold text-violet text-[13px] uppercase tracking-wide mb-1">
            Two
          </div>
          <p>
            <strong>We don&apos;t sell your data.</strong> Not to ad networks, not to vendor
            directories, not to lead brokers. Your guest list, your budget, your timeline —
            they belong to you.
          </p>
        </li>
        <li>
          <div className="font-semibold text-violet text-[13px] uppercase tracking-wide mb-1">
            Three
          </div>
          <p>
            <strong>No business can influence what the AI says.</strong> Ask Eydn
            recommends things because they fit your wedding, not because someone paid
            for the answer.
          </p>
        </li>
        <li>
          <div className="font-semibold text-violet text-[13px] uppercase tracking-wide mb-1">
            Four
          </div>
          <p>
            <strong>$79 Lifetime, because we mean it.</strong> One payment, one wedding,
            yours forever. No upsells waiting on the other side. If monthly fits you
            better, that&apos;s $14.99 — same features, cancel anytime.
          </p>
        </li>
        <li>
          <div className="font-semibold text-violet text-[13px] uppercase tracking-wide mb-1">
            Five
          </div>
          <p>
            <strong>If we ever break any of the above, you get a refund.</strong> Every
            customer. Not just the one who noticed. That&apos;s the deal.
          </p>
        </li>
      </ol>

      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-[15px] text-muted">
          Want to know{" "}
          <Link href="/how-we-make-money" className="text-violet hover:text-soft-violet underline">
            how we make money
          </Link>
          , or why we charge for Pro? Read{" "}
          <Link
            href="/why-we-charge-for-pro"
            className="text-violet hover:text-soft-violet underline"
          >
            why we charge for Pro
          </Link>{" "}
          and{" "}
          <Link
            href="/what-free-costs"
            className="text-violet hover:text-soft-violet underline"
          >
            what &ldquo;free&rdquo; really costs you
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
