"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";

type Comment = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

type Member = { user_id: string; name: string };

type Props = {
  entityType: "task" | "vendor" | "guest" | "expense" | "general";
  entityId: string;
};

// Matches an in-progress "@" mention at the cursor: an "@" at the start of
// the text or after whitespace, followed by the (space-free) query so far.
const MENTION_RE = /(^|\s)@([^@\s]*)$/;

export function Comments({ entityType, entityId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setComments)
      .catch((e) => console.error("[fetch] comments", e))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  // People who can be @mentioned on this wedding.
  useEffect(() => {
    fetch("/api/wedding-members")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  // Members matching the active "@" query.
  const mentionMatches =
    mentionQuery === null
      ? []
      : members.filter((m) =>
          m.name.toLowerCase().includes(mentionQuery.toLowerCase())
        );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setNewComment(val);
    const cursor = e.target.selectionStart ?? val.length;
    const match = val.slice(0, cursor).match(MENTION_RE);
    setMentionQuery(match ? match[2] : null);
  }

  function selectMention(member: Member) {
    setNewComment((prev) => prev.replace(MENTION_RE, `$1@${member.name} `));
    setMentionQuery(null);
    inputRef.current?.focus();
  }

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
      setMentionQuery(null);
    } catch {
      toast.error("Comment didn't post. Try again.");
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

  // Highlight @mentions of known members in posted comment text.
  function renderContent(content: string): ReactNode {
    if (members.length === 0) return content;
    const names = members
      .map((m) => m.name)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = new RegExp(`@(?:${names.join("|")})`, "g");
    const out: ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m.index > last) out.push(content.slice(last, m.index));
      out.push(
        <span key={m.index} className="font-semibold text-violet">
          {m[0]}
        </span>
      );
      last = m.index + m[0].length;
    }
    if (last < content.length) out.push(content.slice(last));
    return out;
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
                    <p className="text-[14px] text-plum leading-relaxed mt-0.5">
                      {renderContent(c.content)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}

          {comments.length === 0 && (
            <p className="text-[13px] text-muted mb-3">No comments yet. Start the conversation.</p>
          )}

          <form onSubmit={handleSubmit} className="relative flex gap-2">
            {/* @mention picker */}
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-border rounded-[10px] shadow-lg overflow-hidden z-20">
                {mentionMatches.map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMention(m);
                    }}
                    className="w-full text-left px-3 py-2 text-[13px] text-plum hover:bg-lavender transition flex items-center gap-2"
                  >
                    <span className="w-5 h-5 rounded-full bg-violet flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </span>
                    {m.name}
                  </button>
                ))}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && mentionQuery !== null && mentionMatches.length > 0) {
                  e.preventDefault();
                  selectMention(mentionMatches[0]);
                } else if (e.key === "Escape" && mentionQuery !== null) {
                  setMentionQuery(null);
                }
              }}
              placeholder="Add a comment — type @ to tag someone"
              aria-label="Add a comment"
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
