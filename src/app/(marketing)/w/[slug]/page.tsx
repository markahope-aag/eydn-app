import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Playfair_Display } from "next/font/google";
import { StickyNav } from "./StickyNav";
import { RsvpForm, RsvpNameLookup } from "./RsvpForm";
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
  display: "swap",
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

// Revalidate public wedding websites every 60 seconds for fresh data
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseAdmin();
  const { data: w } = await supabase
    .from("weddings")
    .select("partner1_name, partner2_name, date, venue, website_cover_url, website_headline")
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  if (!w) return { title: "Wedding Not Found" };

  const coupleNames = `${w.partner1_name} & ${w.partner2_name}`;
  const dateStr = w.date
    ? new Date(w.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const description = [
    w.website_headline || `Join us for our wedding`,
    dateStr && `on ${dateStr}`,
    w.venue && `at ${w.venue}`,
  ].filter(Boolean).join(" ");

  // Sign cover image for OG if it's a storage path
  let ogImageUrl: string | undefined;
  if (w.website_cover_url) {
    if (w.website_cover_url.startsWith("http")) {
      ogImageUrl = w.website_cover_url;
    } else {
      const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(w.website_cover_url, 604800);
      if (signed?.signedUrl) ogImageUrl = signed.signedUrl;
    }
  }

  return {
    title: `${coupleNames} Wedding`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      title: `${coupleNames} Wedding`,
      description,
      ...(ogImageUrl && { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `${coupleNames} wedding` }] }),
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title: `${coupleNames} Wedding`,
      description,
      ...(ogImageUrl && { images: [ogImageUrl] }),
    },
  };
}

export default async function WeddingWebsitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rsvp?: string; token?: string }>;
}) {
  const { slug } = await params;
  const { rsvp, token } = await searchParams;
  const rsvpToken = token || rsvp;
  const supabase = createSupabaseAdmin();

  const { data: weddingRaw } = await supabase
    .from("weddings")
    .select("*")
    .eq("website_slug", slug)
    .eq("website_enabled", true)
    .maybeSingle();

  const wedding = weddingRaw as Wedding | null;
  if (!wedding) notFound();

  // Generate fresh signed URLs for storage paths
  if (wedding.website_cover_url && !wedding.website_cover_url.startsWith("http")) {
    const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(wedding.website_cover_url, 3600);
    if (signed?.signedUrl) (wedding as Record<string, unknown>).website_cover_url = signed.signedUrl;
  }
  if (wedding.website_couple_photo_url && !wedding.website_couple_photo_url.startsWith("http")) {
    const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(wedding.website_couple_photo_url, 3600);
    if (signed?.signedUrl) (wedding as Record<string, unknown>).website_couple_photo_url = signed.signedUrl;
  }

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
        .select("id, name, role, sort_order, photo_url")
        .eq("wedding_id", wedding.id)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true }),
    ]);

  const registryLinks = (registryLinksRaw ?? []) as RegistryLink[];
  const photos = (photosRaw ?? []) as WeddingPhoto[];
  const weddingParty = (weddingPartyRaw ?? []) as WeddingPartyMember[];

  // Sign wedding party photo storage paths
  for (const member of weddingParty) {
    const photoUrl = (member as Record<string, unknown>).photo_url as string | null;
    if (photoUrl && !photoUrl.startsWith("http")) {
      const { data: signed } = await supabase.storage.from("attachments").createSignedUrl(photoUrl, 3600);
      if (signed?.signedUrl) (member as Record<string, unknown>).photo_url = signed.signedUrl;
    }
  }

  // RSVP token lookup (supports ?token=xxx or legacy ?rsvp=xxx)
  let rsvpGuest: { id: string; name: string; token: string; responded: boolean } | null = null;
  if (rsvpToken) {
    const { data: tokenDataRaw } = await supabase
      .from("rsvp_tokens")
      .select("*, guests(id, name)")
      .eq("token", rsvpToken)
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
  const theme = ((wedding as Record<string, unknown>).website_theme ?? {}) as { primaryColor?: string; accentColor?: string; fontFamily?: string; heroLayout?: string };
  const hotels = ((wedding as Record<string, unknown>).website_hotels ?? []) as Array<{ name: string; url?: string; discountCode?: string; notes?: string }>;
  const coupleNames = `${wedding.partner1_name} & ${wedding.partner2_name}`;
  const rsvpDeadline = (wedding as Record<string, unknown>).rsvp_deadline as string | null;
  const weddingDate = wedding.date
    ? new Date(wedding.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  // Countdown — computed at request time (server component renders once per request)
  const requestTime = new Date();
  const daysUntil = wedding.date
    ? Math.ceil((new Date(wedding.date).getTime() - requestTime.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Build sections for sticky nav
  const sections: Array<{ id: string; label: string }> = [];
  if (wedding.website_story) sections.push({ id: "our-story", label: "Our Story" });
  if (wedding.website_couple_photo_url) sections.push({ id: "couple", label: "The Couple" });
  if (weddingParty.length > 0) sections.push({ id: "wedding-party", label: "Wedding Party" });
  if (schedule.length > 0) sections.push({ id: "schedule", label: "Schedule" });
  if (wedding.venue || wedding.website_travel_info) sections.push({ id: "travel", label: "Travel" });
  if (wedding.website_accommodations || hotels.length > 0) sections.push({ id: "accommodations", label: "Stay" });
  if (faq.length > 0) sections.push({ id: "faq", label: "FAQ" });
  if (registryLinks.length > 0) sections.push({ id: "registry", label: "Registry" });
  if (photos.length > 0) sections.push({ id: "photos", label: "Photos" });
  sections.push({ id: "rsvp", label: "RSVP" });

  return (
    <div id="main-content" className={`min-h-screen bg-whisper ${playfair.variable}`} style={{ '--theme-primary': theme.primaryColor || '#2C3E2D', '--theme-accent': theme.accentColor || '#D4A5A5' } as React.CSSProperties}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {wedding.website_cover_url && theme.heroLayout === "side-by-side" ? (
          /* Side-by-side layout: image left, text right */
          <div className="flex flex-col md:flex-row min-h-[520px]">
            <div className="relative w-full md:w-1/2 min-h-[300px] md:min-h-[520px]">
              <Image
                src={wedding.website_cover_url}
                alt={`${coupleNames} wedding cover photo`}
                className="object-cover"
                fill
                priority
              />
            </div>
            <div className="w-full md:w-1/2 flex flex-col items-center justify-center text-center px-8 py-16" style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-accent))` }}>
              <h1 className="text-[48px] md:text-[60px] font-[family-name:var(--font-serif)] font-normal text-white leading-tight">
                {wedding.partner1_name}
                <span className="block text-[22px] md:text-[26px] font-[family-name:var(--font-serif)] italic text-white/80 my-2">&</span>
                {wedding.partner2_name}
              </h1>
              {weddingDate && (
                <p className="mt-4 text-[18px] text-white/90 tracking-wide">{weddingDate}</p>
              )}
              {wedding.venue && (
                <p className="mt-1 text-[16px] text-white/75">{wedding.venue}</p>
              )}
              {wedding.website_headline && (
                <p className="mt-4 text-[16px] text-white/70 max-w-sm italic">{wedding.website_headline}</p>
              )}
              {daysUntil !== null && daysUntil > 0 && (
                <p className="mt-4 text-[14px] text-white/60 tracking-widest uppercase">{daysUntil} days to go</p>
              )}
            </div>
          </div>
        ) : wedding.website_cover_url ? (
          /* Fullscreen layout: image background with text overlay */
          <div className="relative h-[80vh] min-h-[520px]">
            <Image
              src={wedding.website_cover_url}
              alt={`${coupleNames} wedding cover photo`}
              className="object-cover"
              fill
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A2E]/20 via-transparent to-[#1A1A2E]/70" />
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
              {daysUntil !== null && daysUntil > 0 && (
                <p className="mt-4 text-[14px] text-white/60 tracking-widest uppercase">{daysUntil} days to go</p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden py-32 text-center px-6" style={{ background: `linear-gradient(135deg, var(--theme-primary), var(--theme-accent))` }}>
            {/* Subtle decorative pattern */}
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
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
              {daysUntil !== null && daysUntil > 0 && (
                <p className="mt-4 text-[14px] text-white/60 tracking-widest uppercase">{daysUntil} days to go</p>
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
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Our Story</h2>
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
                    />
              </div>
              <p className="mt-6 text-[20px] font-[family-name:var(--font-serif)] text-plum">{coupleNames}</p>
            </div>
          </section>
        )}

        {/* Wedding Party */}
        {weddingParty.length > 0 && (
          <section id="wedding-party" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Wedding Party</h2>
            <SectionDivider />
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {weddingParty.map((member) => (
                <div key={member.id} className="group">
                  {(member as Record<string, unknown>).photo_url ? (
                    <div className="w-20 h-20 rounded-full mx-auto overflow-hidden relative">
                      <Image src={(member as Record<string, unknown>).photo_url as string} alt={member.name} className="object-cover" fill />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-lavender mx-auto flex items-center justify-center">
                      <span className="text-[24px] font-[family-name:var(--font-serif)] text-violet">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  )}
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
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Schedule</h2>
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
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Travel</h2>
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
        {(wedding.website_accommodations || hotels.length > 0) && (
          <section id="accommodations" className="text-center max-w-2xl mx-auto">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Where to Stay</h2>
            <SectionDivider />
            {hotels.length > 0 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {hotels.map((hotel, i) => (
                  <div key={i} className="bg-white rounded-[20px] border border-border p-6 text-left">
                    {hotel.url ? (
                      <a href={hotel.url} target="_blank" rel="noopener noreferrer" className="text-[18px] font-[family-name:var(--font-serif)] hover:underline" style={{ color: 'var(--theme-primary)' }}>
                        {hotel.name} &rarr;
                      </a>
                    ) : (
                      <p className="text-[18px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>{hotel.name}</p>
                    )}
                    {hotel.discountCode && (
                      <p className="mt-2 text-[14px] text-muted">
                        Discount code: <span className="font-mono font-semibold text-plum">{hotel.discountCode}</span>
                      </p>
                    )}
                    {hotel.notes && (
                      <p className="mt-2 text-[14px] text-muted leading-relaxed">{hotel.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {wedding.website_accommodations && (
              <p className="mt-8 text-[16px] text-muted leading-loose whitespace-pre-line">
                {wedding.website_accommodations}
              </p>
            )}
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section id="faq" className="text-center">
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>FAQ</h2>
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
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Registry</h2>
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
            <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Photos</h2>
            <SectionDivider />
            <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-[16px] overflow-hidden aspect-square">
                  <Image
                    src={photo.file_url}
                    alt={photo.caption || "Wedding photo"}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    fill
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
          <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>Share Your Photos</h2>
          <SectionDivider />
          <p className="mt-4 text-[16px] text-muted">
            Upload your favorite moments from the celebration
          </p>
          <div className="mt-8 max-w-md mx-auto">
            <PhotoUpload weddingSlug={slug} hasPhotos={photos.length > 0} />
          </div>
        </section>

        {/* RSVP */}
        <section className="text-center" id="rsvp">
          <h2 className="text-[32px] font-[family-name:var(--font-serif)]" style={{ color: 'var(--theme-primary)' }}>RSVP</h2>
          <SectionDivider />
          <p className="mt-4 text-[16px] text-muted">We can&apos;t wait to celebrate with you!</p>
          {rsvpDeadline && (
            <p className="mt-2 text-[14px] text-violet font-semibold">
              Please respond by {new Date(rsvpDeadline + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
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
              <RsvpNameLookup weddingSlug={slug} />
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 text-center space-y-2">
        <p className="text-[18px] font-[family-name:var(--font-serif)] text-plum/60">{coupleNames}</p>
        {weddingDate && <p className="text-[13px] text-muted/60">{weddingDate}</p>}
        {wedding.venue && <p className="text-[13px] text-muted/50">{wedding.venue}</p>}
        <p className="text-[11px] text-muted/40 pt-4">
          Made with love using{" "}
          <Link href="/" className="text-violet/60 hover:underline">
            Eydn
          </Link>
        </p>
      </footer>
    </div>
  );
}

