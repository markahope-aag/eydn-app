import Link from "next/link";

export default function HowWeMakeMoneyPage() {
  return (
    <div id="main-content" className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>

      <h1 className="font-serif text-[40px] leading-tight text-plum mb-4">
        How Eydn makes money
      </h1>
      <p className="text-[16px] text-muted mb-10">
        Short version: couples pay us directly. That&apos;s it. That&apos;s the business.
      </p>

      <div className="space-y-6 text-[17px] text-plum leading-relaxed">
        <p>
          You pay us $79 once for Lifetime access, or $14.99 per month. In return you get
          the whole product — Ask Eydn, timeline, budget, guests, seating, vendors,
          day-of plan, wedding website. No upsells waiting inside.
        </p>

        <p>
          That&apos;s the whole money equation. No vendor commissions. No sponsored
          listings. No &ldquo;preferred partner&rdquo; kickbacks. No ad network. We don&apos;t sell your
          guest list, your budget, or your email to anyone, ever.
        </p>

        <p>
          We do this on purpose. Most wedding apps make their money from vendors — which
          means the product&apos;s real job is funneling you toward whoever paid to be at the
          top of the list. We&apos;d rather just charge you, work for you, and be done.
        </p>

        <p>
          If that arrangement ever changes, we&apos;ll tell you directly. And per{" "}
          <Link href="/pledge" className="text-violet hover:text-soft-violet underline">
            the Eydn Pledge
          </Link>
          , if we ever break any of it, you get a refund.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-[15px] text-muted">
          Related:{" "}
          <Link
            href="/why-we-charge-for-pro"
            className="text-violet hover:text-soft-violet underline"
          >
            Why we charge for Pro
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/what-free-costs"
            className="text-violet hover:text-soft-violet underline"
          >
            What &ldquo;free&rdquo; really costs you
          </Link>
        </p>
      </div>
    </div>
  );
}
