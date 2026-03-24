"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { SkeletonList } from "@/components/Skeleton";
import { NoWeddingState } from "@/components/NoWeddingState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";

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
};

const ROLES = [
  "Maid of Honor",
  "Best Man",
  "Bridesmaid",
  "Groomsman",
  "Flower Girl",
  "Ring Bearer",
  "Usher",
  "Other",
];

export default function WeddingPartyPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [noWedding, setNoWedding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddDetails, setShowAddDetails] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Bridesmaid");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newJobAssignment, setNewJobAssignment] = useState("");
  const [newAttire, setNewAttire] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const photoTargetId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/wedding-party")
      .then((r) => {
        if (r.status === 404) { setNoWedding(true); return []; }
        return r.ok ? r.json() : Promise.reject();
      })
      .then(setMembers)
      .catch(() => toast.error("Failed to load wedding party"))
      .finally(() => setLoading(false));
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
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
      toast.error("Failed to add member");
    }
  }

  async function updateField(id: string, field: string, value: string | null) {
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
      toast.error("Failed to update");
    }
  }

  async function deleteMember(id: string) {
    const prev = members;
    setMembers((m) => m.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/wedding-party/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Removed from wedding party");
    } catch {
      setMembers(prev);
      toast.error("Failed to remove");
    }
  }

  async function handlePhotoUpload(memberId: string) {
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
      const { file_url } = await uploadRes.json();
      await updateField(memberId, "photo_url", file_url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(null);
      if (photoRef.current) photoRef.current.value = "";
    }
  }

  if (loading) {
    return <SkeletonList count={4} />;
  }

  if (noWedding) return <NoWeddingState feature="Wedding Party" />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1>Wedding Party</h1>
          <p className="mt-1 text-[15px] text-muted">{members.length} members</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          {showAdd ? "Cancel" : "Add Member"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={addMember} className="mt-4 card overflow-hidden">
          <div className="flex gap-3 px-4 py-3">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-[10px] border-border px-3 py-2 text-[15px] flex-1"
              required
              autoFocus
            />
            <select
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
            <button type="submit" className="btn-primary">Add</button>
          </div>

          {showAddDetails && (
            <div className="border-t border-border px-4 py-4 bg-lavender/20">
              <p className="text-[12px] text-violet font-semibold mb-3">
                Optional &mdash; you can also add these later
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-[12px] font-semibold text-muted">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-muted">Phone</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[12px] font-semibold text-muted">Day-of Job Assignment</label>
                  <input
                    type="text"
                    value={newJobAssignment}
                    onChange={(e) => setNewJobAssignment(e.target.value)}
                    placeholder="e.g. Carry rings, hold bouquet during vows"
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[12px] font-semibold text-muted">Attire</label>
                  <input
                    type="text"
                    value={newAttire}
                    onChange={(e) => setNewAttire(e.target.value)}
                    placeholder="e.g. Navy suit, blush bridesmaid dress, accessories..."
                    className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
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
          <div key={member.id} className="rounded-[16px] border-border bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Photo avatar */}
              <div
                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative cursor-pointer group"
                onClick={() => { photoTargetId.current = member.id; photoRef.current?.click(); }}
              >
                {member.photo_url ? (
                  <>
                    <Image src={member.photo_url} alt={member.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="text-white text-[9px] font-semibold">Edit</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-lavender flex items-center justify-center group-hover:bg-violet transition">
                    <span className={`text-[16px] font-semibold ${uploadingPhoto === member.id ? "animate-pulse text-muted" : "text-violet group-hover:text-white"}`}>
                      {uploadingPhoto === member.id ? "..." : member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

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

              <button
                onClick={() => setEditing(editing === member.id ? null : member.id)}
                className={`text-[12px] font-semibold px-3 py-1 rounded-full transition ${
                  editing === member.id
                    ? "bg-violet text-white"
                    : "bg-lavender text-violet hover:bg-violet hover:text-white"
                }`}
              >
                {editing === member.id ? "Close" : "Edit Details"}
              </button>
              <button onClick={() => setConfirmDelete(member.id)} className="text-[12px] text-error hover:opacity-80">
                Remove
              </button>
            </div>

            {editing === member.id && (
              <div className="border-t border-border px-4 py-4 bg-lavender/20">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Email</label>
                    <input
                      type="email"
                      defaultValue={member.email || ""}
                      onBlur={(e) => updateField(member.id, "email", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted">Phone</label>
                    <input
                      type="tel"
                      defaultValue={member.phone || ""}
                      onBlur={(e) => updateField(member.id, "phone", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-semibold text-muted">Day-of Job Assignment</label>
                    <input
                      type="text"
                      defaultValue={member.job_assignment || ""}
                      onBlur={(e) => updateField(member.id, "job_assignment", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="e.g. Carry rings, hold bouquet during vows"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-semibold text-muted">Attire</label>
                    <input
                      type="text"
                      defaultValue={member.attire || ""}
                      onBlur={(e) => updateField(member.id, "attire", e.target.value || null)}
                      className="mt-1 w-full rounded-[10px] border-border px-3 py-1.5 text-[15px]"
                      placeholder="e.g. Navy suit, blush bridesmaid dress, accessories..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[12px] font-semibold text-muted">Photo</label>
                    <div className="mt-1 flex items-center gap-3">
                      {member.photo_url && (
                        <div className="w-16 h-16 rounded-[10px] overflow-hidden relative">
                          <Image src={member.photo_url} alt={member.name} fill className="object-cover" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => { photoTargetId.current = member.id; photoRef.current?.click(); }}
                        disabled={uploadingPhoto === member.id}
                        className="btn-secondary btn-sm disabled:opacity-50"
                      >
                        {uploadingPhoto === member.id ? "Uploading..." : member.photo_url ? "Change Photo" : "Upload Photo"}
                      </button>
                      {member.photo_url && (
                        <button type="button" onClick={() => updateField(member.id, "photo_url", null)} className="text-[12px] text-error hover:opacity-80">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <EmptyState
            icon="👗"
            title="No wedding party members yet"
            message="Add your bridesmaids, groomsmen, and other members of your wedding party."
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove member?"
        message="This person will be removed from your wedding party. This action cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => { if (confirmDelete) deleteMember(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
