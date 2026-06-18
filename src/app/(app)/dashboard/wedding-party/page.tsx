"use client";

import { useState, useEffect, useRef, useId } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Tooltip } from "@/components/Tooltip";
import { usePremium } from "@/components/PremiumGate";

type Member = {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  job_assignment: string | null;
  photo_url: string | null;
  attire: string | null;
  sort_order: number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

const DAY_OF_JOBS = [
  "Hold bouquet",
  "Carry rings",
  "Greet guests",
  "Manage timeline",
  "Coordinate vendors",
  "Distribute programs",
  "Handle gifts",
  "Manage guest book",
];

// Base roles shared by every wedding. The two side-specific
// "<name>'s Wedding Party" roles are prepended at runtime from the
// couple's names.
const BASE_ROLES = [
  "Honor Attendant",
  "Attendant",
  "Flower Girl",
  "Ring Bearer",
  "Usher",
  "Reader",
  "Other",
];

export default function WeddingPartyPage() {
  const { isReadOnly, notifyReadOnly } = usePremium();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [noWedding, setNoWedding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Attendant");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newJobAssignment, setNewJobAssignment] = useState("");
  const [newAttire, setNewAttire] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [sharedAttireNote, setSharedAttireNote] = useState("");
  const [weddingId, setWeddingId] = useState<string | null>(null);
  // Two side-specific wedding-party roles, built from the couple's names.
  const [partyRoles, setPartyRoles] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const photoTargetId = useRef<string | null>(null);
  const attireTimer = useRef<ReturnType<typeof setTimeout>>(null);
  // Stable ids for the add-form and shared-note controls so every <label>
  // ties to its control via htmlFor/id. Per-member rows derive ids from the
  // member id (see the member list) to stay unique across the list.
  const fid = useId();
  const ids = {
    name: `${fid}-name`,
    role: `${fid}-role`,
    email: `${fid}-email`,
    phone: `${fid}-phone`,
    job: `${fid}-job`,
    attire: `${fid}-attire`,
    sharedAttire: `${fid}-shared-attire`,
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/wedding-party").then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : Promise.reject();
      }),
      fetch("/api/weddings").then((r) => r.ok ? r.json() : null),
    ])
      .then(([partyData, weddingData]) => {
        setMembers(partyData);
        if (weddingData) {
          setWeddingId(weddingData.id);
          setSharedAttireNote(weddingData.shared_attire_note || "");
          const p1 = (weddingData.partner1_name as string | null)?.trim();
          const p2 = (weddingData.partner2_name as string | null)?.trim();
          setPartyRoles([
            `${p1 || "Partner 1"}'s Wedding Party`,
            `${p2 || "Partner 2"}'s Wedding Party`,
          ]);
        }
      })
      .catch(() => toast.error("Couldn't load your wedding party. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) { notifyReadOnly(); return; }
    if (!name.trim()) return;

    const tempId = crypto.randomUUID();
    const member: Member = {
      id: tempId,
      name: name.trim(),
      role,
      email: newEmail.trim() || null,
      phone: newPhone.trim() || null,
      job_assignment: newJobAssignment.trim() || null,
      photo_url: null,
      attire: newAttire.trim() || null,
      sort_order: members.length,
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
    };

    setMembers((prev) => [...prev, member]);
    setName("");
    setNewEmail("");
    setNewPhone("");
    setNewJobAssignment("");
    setNewAttire("");
    setShowAdd(false);
    setShowAddDetails(false);

    try {
      const res = await fetch("/api/wedding-party", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: member.name,
          role: member.role,
          email: member.email,
          phone: member.phone,
          job_assignment: member.job_assignment,
          attire: member.attire,
          sort_order: member.sort_order,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setMembers((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      toast.success("Added to wedding party");
    } catch {
      setMembers((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Couldn't add that person. Try again.");
    }
  }

  async function updateField(id: string, field: string, value: string | null) {
    if (isReadOnly) { notifyReadOnly(); return; }
    const prev = members;
    setMembers((m) =>
      m.map((x) => (x.id === id ? { ...x, [field]: value } : x))
    );
    try {
      const res = await fetch(`/api/wedding-party/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setMembers(prev);
      toast.error("Changes didn't save. Try again.");
    }
  }

  async function deleteMember(id: string) {
    if (isReadOnly) { notifyReadOnly(); return; }
    const prev = members;
    setMembers((m) => m.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/wedding-party/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Removed from wedding party");
    } catch {
      setMembers(prev);
      toast.error("Couldn't remove that person. Try again.");
    }
  }

  function handleSharedAttireChange(value: string) {
    if (isReadOnly) { notifyReadOnly(); return; }
    setSharedAttireNote(value);
    if (attireTimer.current) clearTimeout(attireTimer.current);
    attireTimer.current = setTimeout(async () => {
      if (!weddingId) return;
      try {
        const res = await fetch(`/api/weddings/${weddingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shared_attire_note: value || null }),
        });
        if (!res.ok) throw new Error();
      } catch {
        toast.error("Shared attire note didn't save. Try again.");
      }
    }, 800);
  }

  function toggleJob(memberId: string, job: string, currentJobs: string) {
    if (isReadOnly) { notifyReadOnly(); return; }
    const jobs = currentJobs ? currentJobs.split(", ").filter(Boolean) : [];
    const idx = jobs.indexOf(job);
    if (idx >= 0) jobs.splice(idx, 1);
    else jobs.push(job);
    updateField(memberId, "job_assignment", jobs.join(", ") || null);
  }

  async function handlePhotoUpload(memberId: string) {
    if (isReadOnly) { notifyReadOnly(); return; }
    const file = photoRef.current?.files?.[0];
    if (!file) return;
    setUploadingPhoto(memberId);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", "task");
    formData.append("entity_id", `wedding-party-photo`);

    try {
      const uploadRes = await fetch("/api/attachments", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const { file_url, signed_url } = await uploadRes.json();
      await updateField(memberId, "photo_url", file_url); // save storage path
      // Display the signed URL immediately
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, photo_url: signed_url || file_url } : m));
      toast.success("Photo saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo didn't upload. Try again.");
    } finally {
      setUploadingPhoto(null);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  // The two name-based roles, then the shared base roles.
  const ROLES = [...partyRoles, ...BASE_ROLES];

  if (loading) {
    return <SkeletonList count={4} />;
  }

  if (noWedding) return <NoWeddingState feature="Wedding Party" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1>Wedding Party</h1>
          <p className="mt-1 text-[15px] text-muted">{members.length} members{members.length > 0 && !members.every((m) => m.photo_url) ? " \u00B7 Tap a photo circle to add a picture" : ""}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} disabled={isReadOnly} className="btn-primary disabled:opacity-50">
          {showAdd ? "Cancel" : "Add Member"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addMember} className="mt-4 card overflow-hidden">
          <div className="flex gap-3 px-4 py-3">
            <input
              type="text"
              aria-label="Name"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
              required
              autoFocus
            />
            <select
              aria-label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-[10px] border-border px-3 py-2 text-[15px]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddDetails(!showAddDetails)}
              className={`text-[12px] font-semibold px-3 py-1 rounded-full transition ${
                showAddDetails ? "bg-violet text-white" : "bg-lavender text-violet hover:bg-violet hover:text-white"
              }`}
            >
              {showAddDetails ? "Less" : "More Details"}
            </button>
            <button type="submit" disabled={isReadOnly} className="btn-primary disabled:opacity-50">Add</button>
          </div>

          {showAddDetails && (
            <div className="border-t border-border px-4 py-4 bg-lavender/20">
              <p className="text-[12px] text-violet font-semibold mb-3">
                Optional &mdash; you can also add these later
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={ids.email} className="text-[12px] font-semibold text-muted">Email</label>
                  <input
                    id={ids.email}
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
                <div>
                  <label htmlFor={ids.phone} className="text-[12px] font-semibold text-muted">Phone</label>
                  <input
                    id={ids.phone}
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={ids.job} className="text-[12px] font-semibold text-muted">Day-of Job Assignment</label>
                  <input
                    id={ids.job}
                    type="text"
                    value={newJobAssignment}
                    onChange={(e) => setNewJobAssignment(e.target.value)}
                    placeholder="e.g. Carry rings, hold bouquet during vows"
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={ids.attire} className="text-[12px] font-semibold text-muted">Attire</label>
                  <input
                    id={ids.attire}
                    type="text"
                    value={newAttire}
                    onChange={(e) => setNewAttire(e.target.value)}
                    placeholder="e.g. Navy suit, blush floor-length dress, accessories..."
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Shared attire note */}
      {members.length > 0 && (
        <div className="mt-4 card p-4">
          <label htmlFor={ids.sharedAttire} className="text-[12px] font-semibold text-muted">Shared Attire Note</label>
          <p className="text-[11px] text-muted mt-0.5 mb-2">A note visible to everyone — e.g. &quot;Left side: Dusty Rose floor-length, Right side: Navy suit&quot;</p>
          <textarea
            id={ids.sharedAttire}
            value={sharedAttireNote}
            onChange={(e) => handleSharedAttireChange(e.target.value)}
            placeholder="e.g. Left side: Dusty Rose floor-length dress from Azazie. Right side: Navy suit with blush tie."
            rows={2}
            className="w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
          />
        </div>
      )}

      {/* Hidden file input for photo uploads */}
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={() => {
          if (photoTargetId.current) handlePhotoUpload(photoTargetId.current);
        }}
      />

      {/* Member list */}
      <div className="mt-6 space-y-2">
        {members.map((member) => (
          <div key={member.id} className="group/member rounded-[16px] border-border bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Photo avatar — click to upload */}
              <button
                type="button"
                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative cursor-pointer group/avatar"
                onClick={() => { photoTargetId.current = member.id; photoRef.current?.click(); }}
                aria-label={member.photo_url ? `Change photo for ${member.name}` : `Add photo for ${member.name}`}
              >
                {member.photo_url ? (
                  <>
                    <Image src={member.photo_url} alt={member.name} width={40} height={40} className="w-full h-full object-cover" unoptimized />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition flex items-center justify-center">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 1H3C1.89543 1 1 1.89543 1 3V13C1 14.1046 1.89543 15 3 15H13C14.1046 15 15 14.1046 15 13V10M11.5 1.5L14.5 4.5M7.5 8.5L13.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-lavender flex items-center justify-center group-hover/avatar:bg-violet transition">
                    <span className={`text-[16px] font-semibold ${uploadingPhoto === member.id ? "animate-pulse text-muted" : "text-violet group-hover/avatar:text-white"}`}>
                      {uploadingPhoto === member.id ? "..." : member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-plum">{member.name}</span>
                  <span className="rounded-full bg-lavender px-2 py-0.5 text-[12px] text-violet">{member.role}</span>
                </div>
                {(member.email || member.phone) && (
                  <p className="text-[12px] text-muted mt-0.5 truncate">
                    {[member.email, member.phone].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              {editing === member.id ? (
                <button
                  onClick={() => setEditing(null)}
                  aria-label="Close details"
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-plum hover:bg-lavender transition"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => setEditing(member.id)}
                  className="text-[12px] text-muted hover:text-violet transition"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(member.id)}
                aria-label={`Remove ${member.name}`}
                className="opacity-0 group-hover/member:opacity-100 transition-opacity text-muted hover:text-error"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5 2V1.5C5 1.22386 5.22386 1 5.5 1H10.5C10.7761 1 11 1.22386 11 1.5V2M2.5 3H13.5M3.5 3V13.5C3.5 14.0523 3.94772 14.5 4.5 14.5H11.5C12.0523 14.5 12.5 14.0523 12.5 13.5V3M6.5 6V11.5M9.5 6V11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {editing === member.id && (() => {
              const currentJobs = member.job_assignment || "";
              const jobList = currentJobs ? currentJobs.split(", ").filter(Boolean) : [];
              const hasCustomJob = jobList.some((j) => !DAY_OF_JOBS.includes(j));
              // Per-member ids keep htmlFor/id unique across the list.
              const rowIds = {
                role: `member-${member.id}-role`,
                email: `member-${member.id}-email`,
                phone: `member-${member.id}-phone`,
                attire: `member-${member.id}-attire`,
              };

              return (
              <div className="border-t border-border px-4 py-4 bg-lavender/20">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={rowIds.role} className="text-[12px] font-semibold text-muted">Role</label>
                    <select
                      id={rowIds.role}
                      value={member.role}
                      onChange={(e) => updateField(member.id, "role", e.target.value)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                    >
                      {!ROLES.includes(member.role) && (
                        <option value={member.role}>{member.role}</option>
                      )}
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={rowIds.email} className="text-[12px] font-semibold text-muted">Email</label>
                    <input
                      id={rowIds.email}
                      type="email"
                      defaultValue={member.email || ""}
                      onBlur={(e) => updateField(member.id, "email", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor={rowIds.phone} className="text-[12px] font-semibold text-muted">Phone</label>
                    <input
                      id={rowIds.phone}
                      type="tel"
                      defaultValue={member.phone || ""}
                      onBlur={(e) => updateField(member.id, "phone", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-semibold text-muted">Mailing Address <Tooltip text="Used for shipping rehearsal dinner invites, thank-you cards, or attendant gifts." /></label>
                    <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <input type="text" aria-label="Street address" defaultValue={member.address_line1 || ""} onBlur={(e) => updateField(member.id, "address_line1", e.target.value || null)} placeholder="Street address" className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2" />
                      <input type="text" aria-label="Apartment, suite, etc." defaultValue={member.address_line2 || ""} onBlur={(e) => updateField(member.id, "address_line2", e.target.value || null)} placeholder="Apt, suite, etc." className="rounded-[10px] border-border px-3 py-1.5 text-[15px] sm:col-span-2" />
                      <input type="text" aria-label="City" defaultValue={member.city || ""} onBlur={(e) => updateField(member.id, "city", e.target.value || null)} placeholder="City" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" />
                      <input type="text" aria-label="State" defaultValue={member.state || ""} onBlur={(e) => updateField(member.id, "state", e.target.value || null)} placeholder="State" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" maxLength={2} />
                      <input type="text" aria-label="ZIP" defaultValue={member.zip || ""} onBlur={(e) => updateField(member.id, "zip", e.target.value || null)} placeholder="ZIP" className="rounded-[10px] border-border px-3 py-1.5 text-[15px]" maxLength={10} />
                    </div>
                  </div>

                  {/* Day-of job assignment — multi-select chips */}
                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-semibold text-muted">Day-of Job Assignment <Tooltip text="Select common roles or type your own. These assignments appear in the Day-of Binder so your coordinator knows who's doing what." wide /></label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {DAY_OF_JOBS.map((job) => {
                        const active = jobList.includes(job);
                        return (
                          <button
                            key={job}
                            type="button"
                            onClick={() => toggleJob(member.id, job, currentJobs)}
                            className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                              active
                                ? "bg-violet text-white"
                                : "bg-lavender text-violet hover:bg-violet/20"
                            }`}
                          >
                            {job}
                          </button>
                        );
                      })}
                      {/* Custom job input */}
                      <input
                        type="text"
                        aria-label="Custom day-of job"
                        defaultValue={hasCustomJob ? jobList.filter((j) => !DAY_OF_JOBS.includes(j)).join(", ") : ""}
                        onBlur={(e) => {
                          const standardJobs = jobList.filter((j) => DAY_OF_JOBS.includes(j));
                          const custom = e.target.value.trim();
                          const all = custom ? [...standardJobs, custom] : standardJobs;
                          updateField(member.id, "job_assignment", all.join(", ") || null);
                        }}
                        placeholder="Other..."
                        className="rounded-full border-border px-3 py-1 text-[12px] w-28"
                      />
                    </div>
                  </div>

                  {/* Attire — individual note */}
                  <div className="sm:col-span-2">
                    <label htmlFor={rowIds.attire} className="text-[12px] font-semibold text-muted">Attire Note <Tooltip text="Individual attire details for this person — size, alterations, pickup dates. The shared note above applies to everyone." wide /></label>
                    {sharedAttireNote && (
                      <p className="text-[11px] text-muted mt-0.5">Shared: {sharedAttireNote}</p>
                    )}
                    <input
                      id={rowIds.attire}
                      type="text"
                      defaultValue={member.attire || ""}
                      onBlur={(e) => updateField(member.id, "attire", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="Individual notes — e.g. size 6, needs alterations by March"
                    />
                  </div>

                  {/* Photo management — compact since avatar handles upload */}
                  {member.photo_url && (
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <span className="text-[12px] text-muted">Photo uploaded</span>
                      <button type="button" onClick={() => updateField(member.id, "photo_url", null)} className="text-[12px] text-muted hover:text-error transition">
                        Remove photo
                      </button>
                    </div>
                  )}
                </div>
              </div>
              );
            })()}
          </div>
        ))}

        {members.length === 0 && (
          <EmptyState
            icon="👗"
            image="party_empty"
            title="No wedding party members yet"
            message="Add the people who'll be standing with you on the day."
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove member?"
        message="This permanently removes them from your wedding party."
        confirmLabel="Remove"
        onConfirm={() => { if (confirmDelete) deleteMember(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
