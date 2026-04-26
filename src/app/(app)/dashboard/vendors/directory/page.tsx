"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { VENDOR_CATEGORIES, categoryLabel } from "@/lib/vendors/categories";

// ─── Types ───────────────────────────────────────────────────────────────────

type SuggestedVendor = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  city: string;
  state: string;
  price_range: string | null;
  featured: boolean;
};

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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
};

type SortOption = "featured" | "name" | "price_low" | "price_high" | "location";

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

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
          &#9733;
        </span>
      ))}
    </span>
  );
}

// ─── Price range helper ─────────────────────────────────────────────────────

const PRICE_ORDER: Record<string, number> = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };

function priceRank(range: string | null): number {
  if (!range) return 99;
  return PRICE_ORDER[range] ?? 99;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function VendorDirectoryPage() {
  const [vendors, setVendors] = useState<SuggestedVendor[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPrice, setFilterPrice] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gmbCache, setGmbCache] = useState<Record<string, PlaceData | "loading" | "error">>({});
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Admin "Preview as couple" deep link: /dashboard/vendors/directory?expand=<id>
  // pins the requested vendor to the top of the list and auto-expands it.
  const searchParams = useSearchParams();
  const previewId = searchParams.get("expand");

  const debouncedSearch = useDebounce(search, 300);

  const activeFilterCount = [filterCategory, filterPrice, filterLocation].filter(Boolean).length;

  // Build API URL from current filters
  const buildUrl = useCallback((page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "25");
    if (filterCategory) params.set("category", filterCategory);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    return `/api/suggested-vendors?${params.toString()}`;
  }, [filterCategory, debouncedSearch]);

  // Fetch first page when filters change
  useEffect(() => {
    setLoading(true);
    setVendors([]);
    setPagination(null);

    fetch(buildUrl(1))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { vendors: SuggestedVendor[]; pagination: Pagination }) => {
        setVendors(data.vendors);
        setPagination(data.pagination);
      })
      .catch(() => toast.error("Couldn't load the directory. Try refreshing."))
      .finally(() => setLoading(false));
  }, [buildUrl]);

  // Load more (next page)
  const loadMore = useCallback(() => {
    if (!pagination || !pagination.hasMore || loadingMore) return;

    setLoadingMore(true);
    fetch(buildUrl(pagination.page + 1))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { vendors: SuggestedVendor[]; pagination: Pagination }) => {
        setVendors((prev) => [...prev, ...data.vendors]);
        setPagination(data.pagination);
      })
      .catch(() => toast.error("Couldn't load more vendors."))
      .finally(() => setLoadingMore(false));
  }, [pagination, loadingMore, buildUrl]);

  // Infinite scroll — observe sentinel element
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Auto-fetch GMB for a vendor
  const fetchGmb = useCallback((vendorId: string) => {
    setGmbCache((prev) => {
      if (prev[vendorId]) return prev;
      fetch(`/api/suggested-vendors/${vendorId}/gmb`)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data: PlaceData) => {
          setGmbCache((p) => ({ ...p, [vendorId]: data }));
        })
        .catch(() => {
          setGmbCache((p) => ({ ...p, [vendorId]: "error" }));
        });
      return { ...prev, [vendorId]: "loading" };
    });
  }, []);

  // Auto-fetch GMB for featured vendors on load
  useEffect(() => {
    const featured = vendors.filter((v) => v.featured);
    for (const v of featured.slice(0, 6)) {
      fetchGmb(v.id);
    }
  }, [vendors, fetchGmb]);

  // ?expand=<id> handler — pins the requested vendor to the top, expands
  // it, and scrolls into view. Fetches the vendor via the id filter when
  // it's not already in the loaded page (e.g. it's on page 4 of 10).
  useEffect(() => {
    if (!previewId || loading) return;
    const inList = vendors.some((v) => v.id === previewId);

    if (inList) {
      setExpandedId(previewId);
      fetchGmb(previewId);
      requestAnimationFrame(() => {
        document.getElementById(`vendor-${previewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    fetch(`/api/suggested-vendors?id=${previewId}&limit=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { vendors: SuggestedVendor[] }) => {
        if (data.vendors.length === 0) {
          toast.error("Vendor isn't visible to couples (inactive or removed).");
          return;
        }
        setVendors((prev) => [data.vendors[0], ...prev.filter((v) => v.id !== previewId)]);
        setExpandedId(previewId);
        fetchGmb(previewId);
        requestAnimationFrame(() => {
          document.getElementById(`vendor-${previewId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      })
      .catch(() => toast.error("Couldn't load vendor preview."));
  }, [previewId, loading, vendors, fetchGmb]);

  function toggleDetails(vendorId: string) {
    if (expandedId === vendorId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(vendorId);
    fetchGmb(vendorId);
  }

  async function addToMyVendors(vendor: SuggestedVendor) {
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: vendor.name,
          category: vendor.category,
          poc_email: vendor.email,
          poc_phone: vendor.phone,
          status: "contacted",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${vendor.name} added to your vendors`);
    } catch {
      toast.error("Couldn't add that vendor. Try again.");
    }
  }

  // Client-side filtering & sorting
  let filtered = vendors;
  if (filterPrice) {
    filtered = filtered.filter((v) => v.price_range === filterPrice);
  }
  if (filterLocation) {
    const loc = filterLocation.toLowerCase();
    filtered = filtered.filter((v) =>
      v.city.toLowerCase().includes(loc) || v.state.toLowerCase().includes(loc)
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name": return a.name.localeCompare(b.name);
      case "price_low": return priceRank(a.price_range) - priceRank(b.price_range);
      case "price_high": return priceRank(b.price_range) - priceRank(a.price_range);
      case "location": return `${a.city}, ${a.state}`.localeCompare(`${b.city}, ${b.state}`);
      default: return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
  });

  const featured = sorted.filter((v) => v.featured);
  const regular = sorted.filter((v) => !v.featured);

  function clearFilters() {
    setFilterCategory("");
    setFilterPrice("");
    setFilterLocation("");
    setSortBy("featured");
  }

  if (loading) {
    return (
      <div className="space-y-3 py-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-[16px] border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[10px] bg-lavender flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-lavender rounded w-1/3" />
                <div className="h-3 bg-lavender rounded w-1/4" />
              </div>
              <div className="h-8 w-16 bg-lavender rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1>Vendor Directory</h1>
          <p className="mt-1 text-[15px] text-muted">
            {pagination ? `${pagination.total.toLocaleString()} vendors` : "Browse recommended vendors in your area"}
          </p>
        </div>
        <Link href="/dashboard/vendors" className="btn-secondary">
          My Vendors
        </Link>
      </div>

      {/* Search + filter button */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1 min-w-0"
        />
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[14px] transition ${
            activeFilterCount > 0
              ? "bg-violet/10 text-violet font-semibold"
              : "bg-whisper text-muted hover:bg-lavender hover:text-plum"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M1.5 3h11M3.5 7h7M5.5 11h3" />
          </svg>
          Filter
          {activeFilterCount > 0 && (
            <span className="bg-violet text-white text-[11px] w-4 h-4 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="mt-2 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-center">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px] w-full sm:w-auto"
          >
            <option value="">All Categories</option>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
            ))}
          </select>
          <select
            value={filterPrice}
            onChange={(e) => setFilterPrice(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          >
            <option value="">Any Price</option>
            <option value="$">$ — Budget-friendly</option>
            <option value="$$">$$ — Mid-range</option>
            <option value="$$$">$$$ — Premium</option>
            <option value="$$$$">$$$$ — Luxury</option>
          </select>
          <input
            type="text"
            placeholder="City or state..."
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px] w-44"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-[10px] border-border px-3 py-1.5 text-[14px]"
          >
            <option value="featured">Sort: Featured first</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="price_low">Sort: Price low to high</option>
            <option value="price_high">Sort: Price high to low</option>
            <option value="location">Sort: Location</option>
          </select>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12px] text-muted hover:text-plum transition"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <h2>Top Rated in Your Area</h2>
            <span className="text-[11px] text-muted bg-whisper px-2 py-0.5 rounded-full">Recommended</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featured.map((v) => (
              <FeaturedCard
                key={v.id}
                vendor={v}
                onAdd={addToMyVendors}
                expanded={expandedId === v.id}
                gmbState={gmbCache[v.id]}
                onToggle={() => toggleDetails(v.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All vendors */}
      <div className="mt-6">
        {featured.length > 0 && <h2>All vendors</h2>}
        <div className="mt-3 space-y-2">
          {regular.map((v) => (
            <VendorRow
              key={v.id}
              vendor={v}
              onAdd={addToMyVendors}
              expanded={expandedId === v.id}
              gmbState={gmbCache[v.id]}
              onToggle={() => toggleDetails(v.id)}
              onVisible={() => fetchGmb(v.id)}
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <p className="text-[15px] text-muted text-center py-8">
            No vendors found. Try a different search or category.
          </p>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-pulse flex gap-2 items-center text-[14px] text-muted">
              <div className="w-2 h-2 bg-muted rounded-full animate-bounce" />
              Loading more vendors...
            </div>
          </div>
        )}

        {pagination && !pagination.hasMore && vendors.length > 0 && (
          <p className="text-[13px] text-muted text-center py-4">
            Showing all {pagination.total.toLocaleString()} vendors
          </p>
        )}
      </div>
    </div>
  );
}

// ─── GMB Highlight Card ──────────────────────────────────────────────────────

function GmbHighlightCard({ state }: { state: PlaceData | "loading" | "error" | undefined }) {
  if (state === "loading") {
    return (
      <div className="animate-pulse space-y-3 pt-3">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-[12px] bg-lavender flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-lavender rounded w-3/4" />
            <div className="h-3 bg-lavender rounded w-1/2" />
            <div className="h-3 bg-lavender rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "error" || !state) {
    return (
      <p className="text-[12px] text-muted pt-3">
        Could not load Google Business profile for this vendor.
      </p>
    );
  }

  const data = state;

  return (
    <div className="pt-3 space-y-3">
      <div className="flex gap-4">
        {data.photoUrl && (
          <div className="w-24 h-24 rounded-[12px] overflow-hidden flex-shrink-0 relative">
            <Image
              src={data.photoUrl}
              alt={data.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {data.rating != null && (
            <div className="flex items-center gap-2">
              <StarRating rating={data.rating} />
              <span className="text-[13px] font-semibold text-plum">{data.rating}</span>
              {data.userRatingCount != null && (
                <span className="text-[12px] text-muted">({data.userRatingCount} reviews)</span>
              )}
            </div>
          )}
          {data.formattedAddress && (
            <p className="text-[12px] text-muted mt-1">{data.formattedAddress}</p>
          )}
          {data.nationalPhoneNumber && (
            <p className="text-[12px] text-muted mt-0.5">{data.nationalPhoneNumber}</p>
          )}
          {data.businessStatus && data.businessStatus !== "OPERATIONAL" && (
            <span className="inline-block mt-1 text-[11px] font-semibold text-error bg-red-50 px-2 py-0.5 rounded-full">
              {data.businessStatus.replace(/_/g, " ")}
            </span>
          )}
        </div>
      </div>

      {data.editorialSummary && (
        <p className="text-[13px] text-muted leading-relaxed">{data.editorialSummary}</p>
      )}

      <div className="flex flex-wrap gap-2">
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

      {data.reviews.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[12px] font-semibold text-plum">Google Reviews</p>
          {data.reviews.map((r, i) => (
            <div key={i} className="bg-lavender/30 rounded-[10px] p-2.5">
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
  );
}

// ─── Compact GMB preview (photo + rating for card display) ──────────────────

function GmbPreview({ state }: { state: PlaceData | "loading" | "error" | undefined }) {
  if (!state || state === "loading" || state === "error") return null;
  const data = state;

  return (
    <>
      {data.rating != null && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[13px] text-yellow-400">★</span>
          <span className="text-[12px] font-semibold text-plum">{data.rating}</span>
          {data.userRatingCount != null && (
            <span className="text-[11px] text-muted">({data.userRatingCount})</span>
          )}
        </div>
      )}
    </>
  );
}

// ─── Featured Card ───────────────────────────────────────────────────────────

function FeaturedCard({
  vendor,
  onAdd,
  expanded,
  gmbState,
  onToggle,
}: {
  vendor: SuggestedVendor;
  onAdd: (_v: SuggestedVendor) => void;
  expanded: boolean;
  gmbState: PlaceData | "loading" | "error" | undefined;
  onToggle: () => void;
}) {
  const photo = gmbState && gmbState !== "loading" && gmbState !== "error" ? gmbState.photoUrl : null;

  return (
    <div id={`vendor-${vendor.id}`} className="card-summary overflow-hidden">
      {/* Photo */}
      {photo && (
        <div className="relative w-full h-36">
          <Image src={photo} alt={vendor.name} fill className="object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[15px] font-semibold text-plum">{vendor.name}</h3>
            <p className="text-[12px] text-muted">
              {categoryLabel(vendor.category)} · {vendor.city}, {vendor.state}
            </p>
            <GmbPreview state={gmbState} />
          </div>
          {vendor.price_range && (
            <span className="text-[13px] font-semibold text-violet">{vendor.price_range}</span>
          )}
        </div>
        {vendor.description && (
          <p className="text-[13px] text-muted mt-2">{vendor.description}</p>
        )}
        <div className="mt-3 flex gap-2">
          <button onClick={() => onAdd(vendor)} className="btn-primary btn-sm">
            Add to my vendors
          </button>
          <button onClick={onToggle} className="btn-secondary btn-sm">
            {expanded ? "Hide Details" : "Details"}
          </button>
        </div>
        {expanded && <GmbHighlightCard state={gmbState} />}
      </div>
    </div>
  );
}

// ─── Regular Vendor Row ──────────────────────────────────────────────────────

function VendorRow({
  vendor,
  onAdd,
  expanded,
  gmbState,
  onToggle,
  onVisible,
}: {
  vendor: SuggestedVendor;
  onAdd: (_v: SuggestedVendor) => void;
  expanded: boolean;
  gmbState: PlaceData | "loading" | "error" | undefined;
  onToggle: () => void;
  onVisible: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  // Lazy-load GMB when row becomes visible
  useEffect(() => {
    const el = rowRef.current;
    if (!el || gmbState) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible();
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [gmbState, onVisible]);

  const photo = gmbState && gmbState !== "loading" && gmbState !== "error" ? gmbState.photoUrl : null;

  return (
    <div id={`vendor-${vendor.id}`} ref={rowRef} className="rounded-[16px] border border-border bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Thumbnail */}
        {photo ? (
          <div className="w-12 h-12 rounded-[10px] overflow-hidden relative flex-shrink-0">
            <Image src={photo} alt={vendor.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-[10px] bg-lavender flex items-center justify-center flex-shrink-0">
            <span className="text-[18px] font-semibold text-violet">{vendor.name.charAt(0)}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[15px] font-semibold text-plum">{vendor.name}</span>
          <p className="text-[12px] text-muted">
            {categoryLabel(vendor.category)} · {vendor.city}, {vendor.state}
            {vendor.price_range && ` · ${vendor.price_range}`}
          </p>
          <GmbPreview state={gmbState} />
        </div>
        <button onClick={onToggle} className="btn-secondary btn-sm flex-shrink-0">
          {expanded ? "Hide" : "Details"}
        </button>
        <button onClick={() => onAdd(vendor)} className="btn-primary btn-sm flex-shrink-0">
          Add
        </button>
      </div>
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-lavender/10">
          <GmbHighlightCard state={gmbState} />
        </div>
      )}
    </div>
  );
}
