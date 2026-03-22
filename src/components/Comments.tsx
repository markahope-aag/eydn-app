"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

type Comment = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

type Props = {
  entityType: "task" | "vendor" | "guest" | "expense" | "general";
  entityId: string;
};

export function Comments({ entityType, entityId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          content: newComment.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setComments((prev) => [...prev, saved]);
      setNewComment("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-muted mb-2">
        Comments {comments.length > 0 && <span className="text-violet">({comments.length})</span>}
      </h3>

      {loading ? (
        <p className="text-[13px] text-muted py-2">Loading...</p>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-3 mb-3 max-h-[240px] overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full bg-violet flex-shrink-0 flex items-center justify-center"
                  >
                    <span className="text-[11px] font-semibold text-white">
                      {c.user_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-plum">{c.user_name}</span>
                      <span className="text-[11px] text-muted">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-[14px] text-plum leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {comments.length === 0 && (
            <p className="text-[13px] text-muted mb-3">No comments yet. Start the conversation.</p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-[10px] border-border px-3 py-1.5 text-[13px]"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="btn-primary btn-sm disabled:opacity-50"
            >
              {submitting ? "..." : "Post"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
