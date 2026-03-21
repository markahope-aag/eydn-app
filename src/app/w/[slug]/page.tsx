import { createSupabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { StickyNav } from "./StickyNav";
import { RsvpForm } from "./RsvpForm";
import { PhotoUpload } from "./PhotoUpload";
import type { Database } from "@/lib/supabase/types";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];
type RegistryLink = Database["public"]["Tables"]["registry_links"]["Row"];
type WeddingPhoto = Database["public"]["Tables"]["wedding_photos"]["Row"];
type RsvpTokenRow = Database["public"]["Tables"]["rsvp_tokens"]["Row"];
type WeddingPartyMember = Database["public"]["Tables"]["wedding_party"]["Row"];

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
});

function SectionDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      <div className="w-12 h-px bg-border" />
      <div className="w-1.5 h-1.5 rounded-full bg-violet/40" />
      <div className="w-12 h-px bg-border" />
    </div>
  );
}

export default async function WeddingWebsitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rsvp?: string }>;
}) {
  const { slug } = await params;
  const { rsvp } = await searchParams;
  const supabase = createSupabaseAdmin();

  const { data: weddingRaw } = await supabase
    .from("weddings")
    .select("*")
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  const wedding = weddingRaw as Wedding | null;
  if (!wedding) notFound();

  // Parallel data fetches
  const [{ data: registryLinksRaw }, { data: photosRaw }, { data: weddingPartyRaw }] =
    await Promise.all([
      supabase
        .from("registry_links")
        .select("*")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("wedding_photos")
        .select("*")
        .eq("wedding_id", wedding.id)
        .eq("approved", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("wedding_party")
        .select("id, name, role, sort_order")
        .eq("wedding_id", wedding.id)
        .order("sort_order", { ascending: true }),
    ]);

  const registryLinks = (registryLinksRaw ?? []) as RegistryLink[];
  const photos = (photosRaw ?? []) as WeddingPhoto[];
  const weddingParty = (weddingPartyRaw ?? []) as WeddingPartyMember[];

  // RSVP token lookup
  let rsvpGuest: { id: string; name: string; token: string; responded: boolean } | null = null;
  if (rsvp) {
    const { data: tokenDataRaw } = await supabase
      .from("rsvp_tokens")
      .select("*, guests(id, name)")
      .eq("token", rsvp)
      .eq("wedding_id", wedding.id)
      .maybeSingle();

    const tokenData = tokenDataRaw as (RsvpTokenRow & { guests: { id: string; name: string } | null }) | null;
    if (tokenData?.guests) {
      rsvpGuest = {
        id: tokenData.guests.id,
        name: tokenData.guests.name,
        token: tokenData.token,
        responded: tokenData.responded,
      };
    }
  }

  const schedule = (wedding.website_schedule ?? []) as Array<{ time: string; event: string }>;
  const faq = (wedding.website_faq ?? []) as Array<{ question: string; answer: string }>;
  const coupleNames = `${wedding.partner1_name} & ${wedding.partner2_name}`;
  const weddingDate = wedding.date
    ? new Date(wedding.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Build sections for sticky nav
  const sections: Array<{ id: string; label: string }> = [];
  if (wedding.website_story) sections.push({ id: "our-story", label: "Our Story" });
  if (wedding.website_couple_photo_url) sections.push({ id: "couple", label: "The Couple" });
  if (weddingParty.length > 0) sections.push({ id: "wedding-party", label: "Wedding Party" });
  if (schedule.length > 0) sections.push({ id: "schedule", label: "Schedule" });
  if (wedding.venue || wedding.website_travel_info) sections.push({ id: "travel", label: "Travel" });
  if (wedding.website_accommodations) sections.push({ id: "accommodations", label: "Stay" });
  if (faq.length > 0) sections.push({ id: "faq", label: "FAQ" });
  if (registryLinks.length > 0) sections.push({ id: "registry", label: "Registry" });
  if (photos.length > 0) sections.push({ id: "photos", label: "Photos" });
  sections.push({ id: "rsvp", label: "RSVP" });

  return (
    <div className={`min-h-screen bg-whisper ${playfair.variable}`}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {wedding.website_cover_url ? (
          <div className="relative h-[80vh] min-h-[520px]">
            <Image
              src={wedding.website_cover_url}
              alt="Wedding cover"
              className="object-cover"
              fill
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A1030]/20 via-transparent to-[#1A1030]/70" />
            <div className="relative z-10 flex flex-col items-center justify-end h-full pb-20 text-center px-6">
              <h1
                className="text-[56px] md:text-[72px] font-[family-name:var(--font-serif)] font-normal text-white drop-shadow-lg leading-tight"
              >
                {wedding.partner1_name}
                <span className="block text-[24px] md:text-[28px] font-[family-name:var(--font-serif)] italic text-white/80 my-2">&</span>
                {wedding.partner2_name}
              </h1>
              {weddingDate && (
                <p className="mt-4 text-[18px] text-white/90 drop-shadow tracking-wide">{weddingDate}</p>
              )}
              {wedding.venue && (
                <p className="mt-1 text-[16px] text-white/75 drop-shadow">{wedding.venue}</p>
              )}
              {wedding.website_headline && (
                <p className="mt-4 text-[16px] text-white/70 max-w-lg drop-shadow italic">
                  {wedding.website_headline}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden py-32 text-center px-6" style={{ background: "linear-gradient(135deg, var(--violet), var(--blush-pink))" }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
            <div className="relative z-10">
              <h1 className="text-[56px] md:text-[72px] font-[family-name:var(--font-serif)] font-normal text-white leading-tight">
                {wedding.partner1_name}
                <span className="block text-[24px] md:text-[28px] font-[family-name:var(--font-serif)] italic text-white/80 my-2">&</span>
                {wedding.partner2_name}
              </h1>
              {weddingDate && (
                <p className="mt-4 text-[18px] text-white/90 tracking-wide">{weddingDate}</p>
              )}
              {wedding.venue && (
                <p className="mt-1 text-[16px] text-white/75">{wedding.venue}</p>
              )}
              {wedding.website_headline && (
                <p className="mt-4 text-[16px] text-white/70 max-w-lg mx-auto italic">
                  {wedding.website_headline}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Sticky Nav */}
      <StickyNav sections={sections} coupleNames={coupleNames} />

      <div className="max-w-4xl mx-auto px-6 py-20 space-y-24">
        {/* Our Story */}
        {wedding.website_story && (
          <section id="our-story" className="text-center max-w-2xl mx-auto">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Our Story</h2>
            <SectionDivider />
            <div className="mt-6 text-[16px] text-muted leading-loose whitespace-pre-line">
              {wedding.website_story}
            </div>
          </section>
        )}

        {/* Couple Photo */}
        {wedding.website_couple_photo_url && (
          <section id="couple" className="text-center">
            <div className="inline-block">
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-full overflow-hidden border-4 border-white shadow-xl mx-auto relative">
                <Image
                  src={wedding.website_couple_photo_url}
                  alt={coupleNames}
                  className="object-cover"
                  fill
                  unoptimized
                />
              </div>
              <p className="mt-6 text-[20px] font-[family-name:var(--font-serif)] text-plum">{coupleNames}</p>
            </div>
          </section>
        )}

        {/* Wedding Party */}
        {weddingParty.length > 0 && (
          <section id="wedding-party" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Wedding Party</h2>
            <SectionDivider />
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {weddingParty.map((member) => (
                <div key={member.id} className="group">
                  <div className="w-20 h-20 rounded-full bg-lavender mx-auto flex items-center justify-center">
                    <span className="text-[24px] font-[family-name:var(--font-serif)] text-violet">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <p className="mt-3 text-[16px] font-semibold text-plum">{member.name}</p>
                  <p className="text-[13px] text-muted">{member.role}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Schedule */}
        {schedule.length > 0 && (
          <section id="schedule" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Schedule</h2>
            <SectionDivider />
            <div className="mt-10 max-w-md mx-auto">
              {schedule.map((item, i) => (
                <div key={i} className="flex items-start gap-6 relative">
                  {/* Timeline line */}
                  {i < schedule.length - 1 && (
                    <div className="absolute left-[7px] top-[18px] bottom-0 w-px bg-border" />
                  )}
                  <div className="flex-shrink-0 mt-[6px]">
                    <div className="w-[15px] h-[15px] rounded-full border-2 border-violet bg-white relative z-10" />
                  </div>
                  <div className="pb-8 text-left">
                    <p className="text-[14px] font-semibold text-violet tracking-wide">{item.time}</p>
                    <p className="text-[16px] text-plum mt-0.5">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Travel */}
        {(wedding.venue || wedding.website_travel_info) && (
          <section id="travel" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Travel</h2>
            <SectionDivider />
            <div className="mt-8 max-w-2xl mx-auto space-y-6">
              {wedding.venue && (
                <div className="bg-white rounded-[20px] border border-border p-8">
                  <p className="text-[13px] font-semibold text-violet uppercase tracking-widest">Venue</p>
                  <p className="mt-2 text-[20px] font-[family-name:var(--font-serif)] text-plum">{wedding.venue}</p>
                </div>
              )}
              {wedding.website_travel_info && (
                <p className="text-[16px] text-muted leading-loose whitespace-pre-line">
                  {wedding.website_travel_info}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Accommodations */}
        {wedding.website_accommodations && (
          <section id="accommodations" className="text-center max-w-2xl mx-auto">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Where to Stay</h2>
            <SectionDivider />
            <p className="mt-8 text-[16px] text-muted leading-loose whitespace-pre-line">
              {wedding.website_accommodations}
            </p>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section id="faq" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">FAQ</h2>
            <SectionDivider />
            <div className="mt-10 space-y-3 max-w-2xl mx-auto">
              {faq.map((item, i) => (
                <details key={i} className="group text-left bg-white border border-border rounded-[16px] overflow-hidden">
                  <summary className="cursor-pointer px-6 py-4 text-[16px] font-semibold text-plum flex items-center justify-between list-none">
                    {item.question}
                    <span className="text-violet text-[20px] font-normal transition-transform group-open:rotate-45 ml-4 flex-shrink-0">+</span>
                  </summary>
                  <div className="px-6 pb-5 text-[15px] text-muted leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Registry */}
        {registryLinks.length > 0 && (
          <section id="registry" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Registry</h2>
            <SectionDivider />
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              {registryLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white border border-border rounded-[16px] px-8 py-5 hover:border-violet hover:shadow-md transition-all"
                >
                  <p className="text-[16px] font-semibold text-plum group-hover:text-violet transition">{link.name}</p>
                  <p className="text-[12px] text-muted mt-1">View Registry &rarr;</p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <section id="photos" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Photos</h2>
            <SectionDivider />
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-[16px] overflow-hidden aspect-square">
                  <Image
                    src={photo.file_url}
                    alt={photo.caption || "Wedding photo"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    fill
                    unoptimized
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition">
                      <p className="text-[13px] text-white">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo Upload */}
        <section className="text-center">
          <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">Share Your Photos</h2>
          <SectionDivider />
          <p className="mt-4 text-[16px] text-muted">
            Upload your favourite moments from the celebration
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <PhotoUpload weddingSlug={slug} />
          </div>
        </section>

        {/* RSVP */}
        <section className="text-center" id="rsvp">
          <h2 className="text-[32px] font-[family-name:var(--font-serif)] text-plum">RSVP</h2>
          <SectionDivider />
          {rsvpGuest ? (
            <div className="mt-8 max-w-md mx-auto">
              {rsvpGuest.responded ? (
                <div className="bg-white border border-border rounded-[20px] p-10">
                  <p className="text-[16px] text-muted">
                    Thank you, <span className="font-semibold text-plum">{rsvpGuest.name}</span>! Your RSVP has been recorded.
                  </p>
                </div>
              ) : (
                <RsvpForm
                  token={rsvpGuest.token}
                  guestName={rsvpGuest.name}
                  guestId={rsvpGuest.id}
                  weddingSlug={slug}
                />
              )}
            </div>
          ) : (
            <div className="mt-8 max-w-md mx-auto">
              <p className="text-[16px] text-muted mb-6">
                Enter your RSVP code to respond to this invitation.
              </p>
              <RsvpCodeInput slug={slug} />
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 text-center space-y-2">
        <p className="text-[18px] font-[family-name:var(--font-serif)] text-plum/60">{coupleNames}</p>
        {weddingDate && <p className="text-[13px] text-muted/60">{weddingDate}</p>}
        <p className="text-[11px] text-muted/40 pt-4">
          Made with love using{" "}
          <Link href="/" className="text-violet/60 hover:underline">
            eydn
          </Link>
        </p>
      </footer>
    </div>
  );
}

function RsvpCodeInput({ slug }: { slug: string }) {
  return (
    <form
      action={`/w/${slug}`}
      method="get"
      className="flex gap-3 items-center justify-center"
    >
      <input
        type="text"
        name="rsvp"
        placeholder="Enter your code"
        className="rounded-[12px] border border-border px-5 py-3 text-[16px] w-52 focus:outline-none focus:ring-2 focus:ring-violet/30"
      />
      <button type="submit" className="btn-primary">
        Go
      </button>
    </form>
  );
}
