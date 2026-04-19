import Link from "next/link";

export default function WhyWeChargeForProPage() {
  return (
    <div id="main-content" className="max-w-2xl mx-auto px-6 py-16">
      <Link href="/" className="text-[15px] text-muted hover:text-plum mb-6 block">
        &larr; Back to home
      </Link>

      <h1 className="font-serif text-[40px] leading-tight text-plum mb-4">
        Why we charge for Pro
      </h1>
      <p className="text-[16px] text-muted mb-10">
        Two reasons. One is practical. The other is the whole reason Eydn exists.
      </p>

      <div className="space-y-10 text-[17px] text-plum leading-relaxed">
        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">1. The AI costs real money to run.</h2>
          <p>
            Ask Eydn is a proper AI assistant that reads your wedding context — your
            budget, your guests, your timeline, your vendor notes — and answers
            questions about it. Every conversation costs us money in model fees. Not
            pennies. Real dollars, per user, per month.
          </p>
          <p className="mt-4">
            If we gave that away for free, we&apos;d need a way to make it back. That
            normally means one of two things: ads, or a cut of what your vendors
            charge you. Both of those change what the product is for. So we chose
            door three: charge the couples who use it.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">
            2. It&apos;s the only way to stay independent.
          </h2>
          <p>
            The wedding industry runs on kickbacks. Vendors pay directories for
            placement. Directories call that placement &ldquo;editorial.&rdquo; The
            couple planning the wedding pays with their trust, then again when the
            vendor raises prices to cover the placement fee.
          </p>
          <p className="mt-4">
            We didn&apos;t want to build that. But &ldquo;free&rdquo; without vendor
            money is a product that can&apos;t pay its own bills. So Pro is how we keep
            the lights on without selling you to anyone.
          </p>
          <p className="mt-4">
            We think of Pro as the price of a photographer&apos;s raised invoice — you
            pay it either way. This way, you know where it&apos;s going.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-[24px] text-plum mb-3">Two ways to pay</h2>
          <p>
            <strong>$79 Lifetime.</strong> One payment. One wedding. Forever. The best
            value if you know you want Eydn through your whole planning timeline.
          </p>
          <p className="mt-4">
            <strong>$14.99 / month.</strong> Cancel anytime. Better if you&apos;d rather
            try a few months without committing. Six months of Monthly costs more than
            Lifetime, so if you pass month five, switch.
          </p>
          <p className="mt-4">
            Either plan unlocks the same features. No upgrades, no add-ons.{" "}
            <Link href="/dashboard/pricing" className="text-violet hover:text-soft-violet underline">
              See pricing
            </Link>
            .
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <p className="text-[15px] text-muted">
          Related:{" "}
          <Link href="/pledge" className="text-violet hover:text-soft-violet underline">
            The Eydn Pledge
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/how-we-make-money"
            className="text-violet hover:text-soft-violet underline"
          >
            How we make money
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
