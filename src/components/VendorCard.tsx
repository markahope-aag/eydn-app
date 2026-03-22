"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";

type PlaceData = {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  rating: number | null;
  userRatingCount: number | null;
  websiteUri: string | null;
  nationalPhoneNumber: string | null;
  googleMapsUri: string | null;
  photoUrl: string | null;
  businessStatus: string | null;
  editorialSummary: string | null;
  reviews: Array<{
    authorName: string;
    rating: number;
    text: string;
    relativeTime: string;
  }>;
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.3;
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-[14px] ${
            i < full ? "text-yellow-400" : i === full && hasHalf ? "text-yellow-300" : "text-gray-300"
          }`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function VendorCard({ vendorId }: { vendorId: string }) {
  const [data, setData] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function fetchData() {
    setLoading(true);
    setError(null);
    fetch(`/api/vendors/${vendorId}/enrich`, { method: "POST" })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || "Not found"); });
        return r.json();
      })
      .then(setData)
      .catch((err) => {
        setError(err.message);
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  }

  // Auto-fetch on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  if (loading) {
    return (
      <div className="rounded-[16px] border border-border bg-lavender/20 p-4 animate-pulse">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-[12px] bg-lavender" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-lavender rounded w-2/3" />
            <div className="h-3 bg-lavender rounded w-1/2" />
            <div className="h-3 bg-lavender rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[16px] border border-border bg-lavender/10 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-muted">
            {error || "No Google business profile found"}
          </p>
          <button onClick={fetchData} className="text-[12px] text-violet font-semibold hover:text-soft-violet">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[16px] border border-border overflow-hidden">
      {/* Header with photo */}
      <div className="flex gap-4 p-4">
        {data.photoUrl && (
          <div className="w-20 h-20 rounded-[12px] overflow-hidden flex-shrink-0 relative">
            <Image
              src={data.photoUrl}
              alt={data.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-plum truncate">{data.name}</h3>
          {data.rating && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={data.rating} />
              <span className="text-[13px] font-semibold text-plum">{data.rating}</span>
              {data.userRatingCount && (
                <span className="text-[12px] text-muted">({data.userRatingCount} reviews)</span>
              )}
            </div>
          )}
          {data.formattedAddress && (
            <p className="text-[12px] text-muted mt-1 truncate">{data.formattedAddress}</p>
          )}
        </div>
      </div>

      {/* Summary */}
      {data.editorialSummary && (
        <div className="px-4 pb-3">
          <p className="text-[13px] text-muted leading-relaxed">{data.editorialSummary}</p>
        </div>
      )}

      {/* Contact row */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {data.nationalPhoneNumber && (
          <a
            href={`tel:${data.nationalPhoneNumber}`}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet bg-lavender px-2.5 py-1 rounded-full hover:bg-violet hover:text-white transition"
          >
            Call
          </a>
        )}
        {data.websiteUri && (
          <a
            href={data.websiteUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet bg-lavender px-2.5 py-1 rounded-full hover:bg-violet hover:text-white transition"
          >
            Website
          </a>
        )}
        {data.googleMapsUri && (
          <a
            href={data.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet bg-lavender px-2.5 py-1 rounded-full hover:bg-violet hover:text-white transition"
          >
            Directions
          </a>
        )}
      </div>

      {/* Reviews (expandable) */}
      {data.reviews.length > 0 && (
        <div className="border-t border-border">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 text-[12px] font-semibold text-violet hover:bg-lavender/30 transition text-left flex items-center justify-between"
          >
            <span>Google Reviews ({data.reviews.length})</span>
            <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
          </button>
          {expanded && (
            <div className="px-4 pb-3 space-y-3">
              {data.reviews.map((r, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-plum">{r.authorName}</span>
                    <StarRating rating={r.rating} />
                    <span className="text-[11px] text-muted">{r.relativeTime}</span>
                  </div>
                  <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
                    {r.text.length > 200 ? `${r.text.slice(0, 200)}...` : r.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
