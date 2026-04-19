"use client";

import { useRouter } from "next/navigation";

export default function InsuranceGuidePage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.push("/dashboard/guides")}
        className="text-[15px] text-muted hover:text-plum mb-4"
      >
        &larr; All Guides
      </button>

      <h1>Wedding Insurance Guide</h1>
      <p className="mt-1 text-[15px] text-muted">
        What to buy, when to buy it, and what to ask your vendors.
      </p>

      <div className="mt-8 space-y-8 text-[15px] text-plum leading-relaxed">
        {/* What is wedding insurance */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">What is wedding insurance?</h2>
          <p>
            Wedding insurance is a policy that protects your financial investment if something outside
            your control forces you to cancel, postpone, or make unexpected changes to your wedding.
            You hope you&apos;ll never need it. But if something does go wrong, having it in place makes
            a terrible situation significantly easier to deal with.
          </p>
        </section>

        {/* Types of coverage */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">Types of coverage</h2>

          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-[15px] font-semibold text-violet">Cancellation & Postponement</h3>
              <p className="mt-1 text-[14px] text-muted">
                The most important cover. Pays out if you have to cancel or move your date due to
                venue closure, supplier failure, extreme weather, serious illness, or military deployment.
              </p>
              <p className="mt-2 text-[13px] text-muted">
                <strong className="text-plum">Does not cover:</strong> changing your mind, suppliers booked without a contract,
                pre-existing conditions (unless declared), or pandemics (varies — check fine print).
              </p>
            </div>

            <div className="card p-4">
              <h3 className="text-[15px] font-semibold text-violet">Public Liability</h3>
              <p className="mt-1 text-[14px] text-muted">
                Covers you if a guest is injured or property is damaged at your wedding.
                Many venues require this before confirming a booking.
              </p>
            </div>

            <div className="card p-4">
              <h3 className="text-[15px] font-semibold text-violet">Supplier Failure</h3>
              <p className="mt-1 text-[14px] text-muted">
                Pays out if a booked supplier goes out of business or doesn&apos;t show up.
                Sometimes included in cancellation cover, sometimes a separate add-on.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card p-4">
                <h3 className="text-[15px] font-semibold text-violet">Personal Accident</h3>
                <p className="mt-1 text-[13px] text-muted">
                  Covers the couple if one of you is seriously injured and unable to attend.
                </p>
              </div>
              <div className="card p-4">
                <h3 className="text-[15px] font-semibold text-violet">Wedding Attire</h3>
                <p className="mt-1 text-[13px] text-muted">
                  Covers damage or loss of the wedding dress, suits, and accessories.
                </p>
              </div>
              <div className="card p-4">
                <h3 className="text-[15px] font-semibold text-violet">Wedding Gifts</h3>
                <p className="mt-1 text-[13px] text-muted">
                  Covers gifts lost, stolen, or damaged at the venue.
                </p>
              </div>
              <div className="card p-4">
                <h3 className="text-[15px] font-semibold text-violet">Wedding Rings</h3>
                <p className="mt-1 text-[13px] text-muted">
                  Covers loss or damage to rings. Check if your home contents insurance already covers this.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* When to buy */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">When to buy it</h2>
          <p>
            As soon as you start paying deposits. Most claims happen because couples wait
            and then something goes wrong with an early booking. The policy needs to be in
            place <em>before</em> the event you&apos;re claiming for occurs.
          </p>
        </section>

        {/* Cost */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">How much does it cost?</h2>
          <div className="card p-4 bg-lavender/30">
            <p className="text-[14px]">
              <strong>Liability:</strong> $120–$300 for $1 million in coverage
            </p>
            <p className="text-[14px] mt-1">
              <strong>Cancellation:</strong> $255–$420 for an average wedding
            </p>
            <p className="text-[13px] text-muted mt-2">
              Bundling both usually gets you a discount.
            </p>
          </div>
        </section>

        {/* What to look for */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">What to look for in a policy</h2>
          <ul className="space-y-2 text-[14px]">
            <li className="flex gap-2"><span className="text-violet font-bold">1.</span> Maximum cover limit at least equal to your total wedding spend</li>
            <li className="flex gap-2"><span className="text-violet font-bold">2.</span> Broad cancellation reasons covered</li>
            <li className="flex gap-2"><span className="text-violet font-bold">3.</span> Supplier failure included (not just an add-on)</li>
            <li className="flex gap-2"><span className="text-violet font-bold">4.</span> Public liability minimum of $1 million</li>
            <li className="flex gap-2"><span className="text-violet font-bold">5.</span> Low excess (deductible) amount</li>
            <li className="flex gap-2"><span className="text-violet font-bold">6.</span> Destination wedding coverage if applicable</li>
          </ul>
        </section>

        {/* Providers */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">Providers worth comparing</h2>
          <div className="space-y-3">
            {[
              { name: "Wedsure", note: "A+ rated, instant Certificate of Insurance. Solid all-rounder." },
              { name: "Travelers", note: "No deductible on basic/liability, up to $250K cancellation. Most US states." },
              { name: "WedSafe", note: "Up to $5M liability, 15% discount when bundling cancellation + liability." },
              { name: "Markel", note: "Covers US, Canada, UK, Mexico, Caribbean. Great for destination weddings." },
              { name: "Event Helper", note: "Starts at $66, includes liquor liability, covers multi-day events." },
              { name: "BriteCo", note: "COVID coverage available, 'cancel for any reason' add-on (75% reimbursement)." },
            ].map((p) => (
              <div key={p.name} className="flex gap-3 items-start">
                <span className="text-[13px] font-semibold text-violet bg-lavender px-2 py-0.5 rounded-full flex-shrink-0">
                  {p.name}
                </span>
                <p className="text-[14px] text-muted">{p.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 card p-4 bg-violet/5 border-violet/20">
            <p className="text-[13px] text-violet font-semibold">
              Eydn tip: Get quotes from at least three providers before buying. Coverage and pricing
              vary more than you&apos;d expect.
            </p>
          </div>
        </section>

        {/* Vendor insurance */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">What insurance to ask your vendors for</h2>
          <p className="mb-4 text-[14px] text-muted">
            Your vendors should carry their own insurance. Ask for proof before signing any contract.
            Request that their carrier send you a Certificate of Insurance (COI) directly.
          </p>
          <div className="space-y-2">
            {[
              { vendor: "Venue", ask: "Requires you to carry liability and name them as additional insured. Get requirements in writing." },
              { vendor: "Caterer", ask: "General liability + liquor liability if serving alcohol." },
              { vendor: "Photographer", ask: "Professional liability (errors & omissions) + equipment insurance." },
              { vendor: "Florist", ask: "General liability covering venue damage during setup/breakdown." },
              { vendor: "Band / DJ", ask: "General liability + equipment insurance." },
              { vendor: "Hair & Makeup", ask: "Professional liability covering reactions or incidents." },
              { vendor: "Officiant", ask: "General liability." },
            ].map((v) => (
              <div key={v.vendor} className="card p-3 flex gap-3">
                <span className="text-[13px] font-semibold text-plum w-28 flex-shrink-0">{v.vendor}</span>
                <p className="text-[13px] text-muted">{v.ask}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to claim */}
        <section>
          <h2 className="text-[18px] font-semibold text-plum mb-3">How to make a claim</h2>
          <ol className="space-y-2 text-[14px] list-decimal list-inside">
            <li>Contact your insurer as soon as the problem occurs — don&apos;t wait</li>
            <li>Keep every contract, receipt, and invoice from every supplier</li>
            <li>Get everything in writing — cancellation notices, supplier communications, medical certificates</li>
            <li>Don&apos;t agree to alternative arrangements before checking with your insurer first</li>
          </ol>
          <div className="mt-4 card p-4 bg-violet/5 border-violet/20">
            <p className="text-[13px] text-violet font-semibold">
              Eydn tip: Store all your supplier contracts, COIs, and payment receipts in Eydn.
              If you ever need to make a claim, everything is in one place.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
