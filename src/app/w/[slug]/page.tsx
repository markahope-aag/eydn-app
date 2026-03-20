import { createSupabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RsvpForm } from "./RsvpForm";
import { PhotoUpload } from "./PhotoUpload";
import type { Database } from "@/lib/supabase/types";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];
type RegistryLink = Database["public"]["Tables"]["registry_links"]["Row"];
type WeddingPhoto = Database["public"]["Tables"]["wedding_photos"]["Row"];
type RsvpTokenRow = Database["public"]["Tables"]["rsvp_tokens"]["Row"];

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

  // Look up wedding by slug
  const { data: weddingRaw } = await supabase
    .from("weddings")
    .select("*")
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  const wedding = weddingRaw as Wedding | null;

  if (!wedding) {
    notFound();
  }

  // Get registry links
  const { data: registryLinksRaw } = await supabase
    .from("registry_links")
    .select("*")
    .eq("wedding_id", wedding.id)
    .order("sort_order", { ascending: true });

  const registryLinks = (registryLinksRaw ?? []) as RegistryLink[];

  // Get approved photos
  const { data: photosRaw } = await supabase
    .from("wedding_photos")
    .select("*")
    .eq("wedding_id", wedding.id)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  const photos = (photosRaw ?? []) as WeddingPhoto[];

  // If RSVP token provided, look up the guest
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
  const weddingDate = wedding.date
    ? new Date(wedding.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-whisper">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {wedding.website_cover_url ? (
          <div className="relative h-[70vh] min-h-[480px]">
            <img
              src={wedding.website_cover_url}
              alt="Wedding cover"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A1030]/30 via-transparent to-[#1A1030]/60" />
            <div className="relative z-10 flex flex-col items-center justify-end h-full pb-16 text-center px-6">
              <h1 className="text-[48px] font-semibold text-white drop-shadow-lg">
                {wedding.partner1_name} & {wedding.partner2_name}
              </h1>
              {weddingDate && (
                <p className="mt-3 text-[18px] text-white/90 drop-shadow">{weddingDate}</p>
              )}
              {wedding.website_headline && (
                <p className="mt-2 text-[16px] text-white/80 max-w-lg drop-shadow">
                  {wedding.website_headline}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-brand-gradient py-24 text-center px-6">
            <h1 className="text-[48px] font-semibold text-white">
              {wedding.partner1_name} & {wedding.partner2_name}
            </h1>
            {weddingDate && (
              <p className="mt-3 text-[18px] text-white/90">{weddingDate}</p>
            )}
            {wedding.website_headline && (
              <p className="mt-2 text-[16px] text-white/80 max-w-lg mx-auto">
                {wedding.website_headline}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-20">
        {/* Our Story */}
        {wedding.website_story && (
          <section className="text-center">
            <h2 className="text-[24px] font-semibold text-plum">Our Story</h2>
            <div className="mt-6 text-[15px] text-muted leading-relaxed whitespace-pre-line">
              {wedding.website_story}
            </div>
          </section>
        )}

        {/* Schedule */}
        {schedule.length > 0 && (
          <section>
            <h2 className="text-[24px] font-semibold text-plum text-center">Schedule</h2>
            <div className="mt-8 space-y-4 max-w-md mx-auto">
              {schedule.map((item, i) => (
                <div key={i} className="flex gap-6 items-baseline">
                  <span className="text-[15px] font-semibold text-violet min-w-[100px] text-right">
                    {item.time}
                  </span>
                  <span className="text-[15px] text-plum">{item.event}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Travel Info */}
        {wedding.website_travel_info && (
          <section className="text-center">
            <h2 className="text-[24px] font-semibold text-plum">Travel</h2>
            <p className="mt-6 text-[15px] text-muted leading-relaxed whitespace-pre-line">
              {wedding.website_travel_info}
            </p>
          </section>
        )}

        {/* Accommodations */}
        {wedding.website_accommodations && (
          <section className="text-center">
            <h2 className="text-[24px] font-semibold text-plum">Accommodations</h2>
            <p className="mt-6 text-[15px] text-muted leading-relaxed whitespace-pre-line">
              {wedding.website_accommodations}
            </p>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section>
            <h2 className="text-[24px] font-semibold text-plum text-center">FAQ</h2>
            <div className="mt-8 space-y-6 max-w-lg mx-auto">
              {faq.map((item, i) => (
                <div key={i}>
                  <h3 className="text-[15px] font-semibold text-plum">{item.question}</h3>
                  <p className="mt-1 text-[15px] text-muted">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Registry */}
        {registryLinks.length > 0 && (
          <section className="text-center">
            <h2 className="text-[24px] font-semibold text-plum">Registry</h2>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {registryLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <section>
            <h2 className="text-[24px] font-semibold text-plum text-center">Photos</h2>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-[16px] overflow-hidden aspect-square">
                  <img
                    src={photo.file_url}
                    alt={photo.caption || "Wedding photo"}
                    className="w-full h-full object-cover"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition">
                      <p className="text-[12px] text-white">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo Upload */}
        <section className="text-center">
          <h2 className="text-[24px] font-semibold text-plum">Share Your Photos</h2>
          <p className="mt-2 text-[15px] text-muted">
            Upload your favourite moments from the celebration
          </p>
          <div className="mt-6 max-w-md mx-auto">
            <PhotoUpload weddingSlug={slug} />
          </div>
        </section>

        {/* RSVP Section */}
        <section className="text-center" id="rsvp">
          <h2 className="text-[24px] font-semibold text-plum">RSVP</h2>
          {rsvpGuest ? (
            <div className="mt-6 max-w-md mx-auto">
              {rsvpGuest.responded ? (
                <div className="card p-8">
                  <p className="text-[15px] text-muted">
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
            <div className="mt-6 max-w-md mx-auto">
              <p className="text-[15px] text-muted mb-4">
                Enter your RSVP code to respond to this invitation.
              </p>
              <RsvpCodeInput slug={slug} />
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-[12px] text-muted">
          Made with love using{" "}
          <Link href="/" className="text-violet hover:underline">
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
        className="rounded-[10px] border border-border px-4 py-2 text-[15px] w-48 focus:outline-none focus:ring-2 focus:ring-violet/30"
      />
      <button type="submit" className="btn-primary btn-sm">
        Go
      </button>
    </form>
  );
}
