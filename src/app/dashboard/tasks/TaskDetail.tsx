"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { EdynMessage } from "@/components/EdynMessage";
import { FileUpload } from "@/components/FileUpload";
import { VENDOR_EMAIL_TEMPLATES } from "@/lib/vendors/email-templates";
import { formatDueDate } from "@/lib/date-utils";
import { Comments } from "@/components/Comments";
import Link from "next/link";
import { TASK_GUIDE_MAP } from "@/lib/tasks/task-guide-map";

// Map task categories to email template vendor categories
const TASK_TO_EMAIL_CATEGORY: Record<string, string> = {
  "Photography": "Photographer",
  "Catering": "Caterer",
  "Music": "DJ or Band",
  "Entertainment": "DJ or Band",
  "Flowers": "Florist",
  "Florals": "Florist",
  "Video": "Videographer",
  "Videography": "Videographer",
  "Vendors": "Follow-Up",
};

function getEmailTemplate(taskCategory: string | null, taskTitle: string) {
  if (!taskCategory) return null;
  // Direct category match
  const mapped = TASK_TO_EMAIL_CATEGORY[taskCategory];
  if (mapped) return VENDOR_EMAIL_TEMPLATES.find((t) => t.category === mapped) || null;
  // Title-based match for "Book X" tasks
  const titleLower = taskTitle.toLowerCase();
  for (const tmpl of VENDOR_EMAIL_TEMPLATES) {
    if (tmpl.category === "Follow-Up") continue;
    if (titleLower.includes(tmpl.category.toLowerCase())) return tmpl;
  }
  return null;
}

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  due_date: string | null;
  completed: boolean;
  status: "not_started" | "in_progress" | "done";
  priority: "high" | "medium" | "low";
  edyn_message: string | null;
  timeline_phase: string | null;
  is_system_generated: boolean;
  notes: string | null;
  parent_task_id: string | null;
};

type TaskResource = {
  id: string;
  task_id: string;
  label: string;
  url: string;
};

type TaskAttachment = {
  id: string;
  entity_id: string;
  file_name: string;
  file_url: string;
};

type RelatedTask = {
  id: string;
  task_id: string;
  related_task_id: string;
};

type Props = {
  task: Task;
  subTasks: Task[];
  allTasks: Task[];
  onClose: () => void;
  onToggle: (_id: string) => void;
  onUpdateNotes: (_id: string, _notes: string) => void;
  onUpdatePriority: (_id: string, _priority: "high" | "medium" | "low") => void;
  onUpdateStatus: (_id: string, _status: "not_started" | "in_progress" | "done") => void;
};

const STATUS_OPTIONS: { value: "not_started" | "in_progress" | "done"; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS: { value: "high" | "medium" | "low"; label: string; dotClass: string }[] = [
  { value: "high", label: "High", dotClass: "bg-error" },
  { value: "medium", label: "Medium", dotClass: "bg-[#D4A017]" },
  { value: "low", label: "Low", dotClass: "bg-transparent border border-border" },
];

export function TaskDetail({
  task,
  subTasks,
  allTasks,
  onClose,
  onToggle,
  onUpdateNotes,
  onUpdatePriority,
  onUpdateStatus,
}: Props) {
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [relatedTasks, setRelatedTasks] = useState<RelatedTask[]>([]);
  const [newResourceLabel, setNewResourceLabel] = useState("");
  const [newResourceUrl, setNewResourceUrl] = useState("");
  const [showAddResource, setShowAddResource] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const emailTemplate = getEmailTemplate(task.category, task.title);
  const followUpTemplate = VENDOR_EMAIL_TEMPLATES.find((t) => t.category === "Follow-Up");
  const [relatedTaskId, setRelatedTaskId] = useState("");

  const dueDateInfo = task.due_date ? formatDueDate(task.due_date) : null;
  const isOverdue = dueDateInfo?.isOverdue && task.status !== "done";

  // Fetch resources, attachments, and related tasks on open
  useEffect(() => {
    fetchResources();
    fetchAttachments();
    fetchRelatedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  async function fetchResources() {
    try {
      const res = await fetch(`/api/tasks/${task.id}/resources`);
      if (res.ok) setResources(await res.json());
    } catch {
      /* silent */
    }
  }

  async function fetchAttachments() {
    try {
      const res = await fetch(
        `/api/attachments?entity_type=task&entity_id=${task.id}`
      );
      if (res.ok) setAttachments(await res.json());
    } catch {
      /* silent */
    }
  }

  async function fetchRelatedTasks() {
    try {
      const res = await fetch(`/api/tasks/${task.id}/related`);
      if (res.ok) setRelatedTasks(await res.json());
    } catch {
      /* silent */
    }
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    if (!newResourceLabel.trim() || !newResourceUrl.trim()) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newResourceLabel.trim(), url: newResourceUrl.trim() }),
      });
      if (!res.ok) throw new Error();
      setNewResourceLabel("");
      setNewResourceUrl("");
      setShowAddResource(false);
      fetchResources();
      toast.success("Resource added");
    } catch {
      toast.error("Couldn't add that resource. Try again.");
    }
  }

  async function deleteResource(resourceId: string) {
    try {
      const res = await fetch(`/api/tasks/${task.id}/resources/${resourceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch {
      toast.error("Couldn't remove that resource.");
    }
  }

  async function addRelatedTask() {
    if (!relatedTaskId) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/related`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ related_task_id: relatedTaskId }),
      });
      if (!res.ok) throw new Error();
      setRelatedTaskId("");
      fetchRelatedTasks();
      toast.success("Related task linked");
    } catch {
      toast.error("Couldn't link that task. Try again.");
    }
  }

  async function removeRelatedTask(relationId: string) {
    try {
      const res = await fetch(`/api/tasks/${task.id}/related/${relationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setRelatedTasks((prev) => prev.filter((r) => r.id !== relationId));
    } catch {
      toast.error("Couldn't unlink that task.");
    }
  }

  // Tasks available for relating (exclude self, sub-tasks, already-related)
  const relatedTaskIds = new Set(relatedTasks.map((r) => r.related_task_id));
  const availableTasks = allTasks.filter(
    (t) =>
      t.id !== task.id &&
      t.parent_task_id !== task.id &&
      !relatedTaskIds.has(t.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-[16px] shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-plum">{task.title}</h2>
              <div className="mt-1 flex gap-2 flex-wrap">
                {task.category && (
                  <span className="badge">
                    {task.category}
                  </span>
                )}
                {task.timeline_phase && (
                  <span className="rounded-full bg-lavender px-2 py-0.5 text-[12px] text-violet">
                    {task.timeline_phase}
                  </span>
                )}
                {isOverdue && (
                  <span className="badge badge-overdue">
                    Overdue
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-plum text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Due date */}
          {dueDateInfo && (
            <div className="mt-4 flex items-center gap-3">
              <span className={`text-[15px] ${isOverdue ? "text-error font-semibold" : dueDateInfo.isToday ? "text-violet font-semibold" : "text-muted"}`}>
                Due: {dueDateInfo.formatted} &middot; {dueDateInfo.relative}
              </span>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/tasks/${task.id}/ics`);
                    if (!res.ok) throw new Error();
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${task.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch {
                    toast.error("Couldn't generate calendar event.");
                  }
                }}
                className="text-[12px] text-violet hover:text-soft-violet font-semibold transition flex items-center gap-1"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add to Calendar
              </button>
            </div>
          )}

          {/* Status selector */}
          <div className="mt-4">
            <label className="text-[13px] text-muted">Status</label>
            <div className="mt-1 flex gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateStatus(task.id, opt.value)}
                  className={`rounded-full px-3 py-1 text-[13px] ${
                    task.status === opt.value
                      ? "bg-violet text-white"
                      : "bg-whisper text-muted hover:bg-lavender"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority selector */}
          <div className="mt-4">
            <label className="text-[13px] text-muted">Priority</label>
            <div className="mt-1 flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdatePriority(task.id, opt.value)}
                  className={`rounded-full px-3 py-1 text-[13px] flex items-center gap-1.5 ${
                    task.priority === opt.value
                      ? "bg-violet text-white"
                      : "bg-whisper text-muted hover:bg-lavender"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      task.priority === opt.value ? "bg-white" : opt.dotClass
                    }`}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="mt-4 text-[15px] text-muted">{task.description}</p>
          )}

          {/* Edyn message */}
          {task.edyn_message && (
            <div className="mt-4">
              <EdynMessage message={task.edyn_message} />
            </div>
          )}

          {/* Planning guide callout */}
          {TASK_GUIDE_MAP[task.title] && (
            <div className="mt-4 bg-violet/5 border border-violet/20 rounded-[12px] px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-violet">Planning Guide Available</p>
                <p className="text-[12px] text-muted">
                  Our {TASK_GUIDE_MAP[task.title].label} walks you through this step by step
                </p>
              </div>
              <Link
                href={TASK_GUIDE_MAP[task.title].slug === "insurance"
                  ? "/dashboard/guides/insurance"
                  : `/dashboard/guides/${TASK_GUIDE_MAP[task.title].slug}`}
                className="btn-secondary btn-sm flex-shrink-0"
              >
                Open Guide
              </Link>
            </div>
          )}

          {/* Email template callout */}
          {emailTemplate && !showEmailTemplate && (
            <div className="mt-4 bg-lavender/40 border border-violet/20 rounded-[12px] px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-violet">Vendor Email Template</p>
                <p className="text-[12px] text-muted">
                  Use our pre-written {emailTemplate.category.toLowerCase()} outreach email to save time
                </p>
              </div>
              <button
                onClick={() => setShowEmailTemplate(true)}
                className="btn-secondary btn-sm flex-shrink-0"
              >
                View Template
              </button>
            </div>
          )}

          {showEmailTemplate && emailTemplate && (
            <div className="mt-4 border border-border rounded-[12px] overflow-hidden">
              <div className="bg-lavender/30 px-4 py-2 flex items-center justify-between">
                <p className="text-[13px] font-semibold text-violet">{emailTemplate.category} Email Template</p>
                <button onClick={() => setShowEmailTemplate(false)} className="text-[12px] text-muted hover:text-plum">
                  Hide
                </button>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted uppercase">Subject</label>
                    <button
                      onClick={() => { navigator.clipboard.writeText(emailTemplate.subject); toast.success("Subject copied"); }}
                      className="text-[11px] text-violet hover:text-soft-violet"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-0.5 text-[14px] text-plum">{emailTemplate.subject}</p>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted uppercase">Body</label>
                    <button
                      onClick={() => { navigator.clipboard.writeText(emailTemplate.body); toast.success("Body copied"); }}
                      className="text-[11px] text-violet hover:text-soft-violet"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="mt-0.5 whitespace-pre-wrap text-[13px] text-muted bg-whisper rounded-[10px] p-3 font-sans leading-relaxed">
                    {emailTemplate.body}
                  </pre>
                </div>
                {followUpTemplate && (
                  <details className="group">
                    <summary className="text-[13px] text-violet font-semibold cursor-pointer hover:text-soft-violet">
                      Follow-up template
                    </summary>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[14px] text-plum">{followUpTemplate.subject}</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText(followUpTemplate.subject + "\n\n" + followUpTemplate.body); toast.success("Follow-up copied"); }}
                          className="text-[11px] text-violet hover:text-soft-violet"
                        >
                          Copy all
                        </button>
                      </div>
                      <pre className="whitespace-pre-wrap text-[13px] text-muted bg-whisper rounded-[10px] p-3 font-sans leading-relaxed">
                        {followUpTemplate.body}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Sub-tasks */}
          {subTasks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[15px] font-semibold text-muted mb-2">
                Sub-tasks
              </h3>
              <div className="space-y-1">
                {subTasks.map((sub) => (
                  <label
                    key={sub.id}
                    className="flex items-center gap-2 rounded-[10px] border-border px-3 py-2 text-[15px] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => onToggle(sub.id)}
                      className="accent-violet"
                    />
                    <span
                      className={
                        sub.completed
                          ? "text-muted line-through"
                          : "text-plum"
                      }
                    >
                      {sub.title}
                    </span>
                    {sub.due_date && (
                      <span className="ml-auto text-[12px] text-muted">
                        {sub.due_date}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          <div className="mt-4">
            <h3 className="text-[15px] font-semibold text-muted mb-2">Resources</h3>
            {resources.length > 0 && (
              <div className="space-y-1 mb-2">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded-[10px] border-border px-3 py-2"
                  >
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[15px] text-violet hover:opacity-80 flex-1 truncate"
                    >
                      {r.label}
                    </a>
                    <button
                      onClick={() => deleteResource(r.id)}
                      className="text-[12px] text-error hover:opacity-80 flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {showAddResource ? (
              <form onSubmit={addResource} className="rounded-[12px] border border-border bg-lavender/20 p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Venue contract)"
                  value={newResourceLabel}
                  onChange={(e) => setNewResourceLabel(e.target.value)}
                  className="w-full rounded-[10px] border-border px-3 py-1.5 text-[13px]"
                  autoFocus
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={newResourceUrl}
                  onChange={(e) => setNewResourceUrl(e.target.value)}
                  className="w-full rounded-[10px] border-border px-3 py-1.5 text-[13px]"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddResource(false); setNewResourceLabel(""); setNewResourceUrl(""); }}
                    className="text-[12px] text-muted hover:text-plum"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary btn-sm">
                    Add
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddResource(true)}
                className="text-[13px] text-violet font-semibold hover:text-soft-violet transition"
              >
                + Add Resource
              </button>
            )}
          </div>

          {/* Attachments */}
          <div className="mt-4">
            <h3 className="text-[15px] font-semibold text-muted mb-2">Attachments</h3>
            {attachments.length > 0 && (
              <div className="space-y-1 mb-2">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-[10px] border-border px-3 py-2 text-[15px] text-violet hover:bg-lavender transition"
                  >
                    {a.file_name}
                  </a>
                ))}
              </div>
            )}
            <FileUpload
              entityType="task"
              entityId={task.id}
              onUpload={fetchAttachments}
            />
          </div>

          {/* Related tasks */}
          <div className="mt-4">
            <h3 className="text-[15px] font-semibold text-muted mb-2">Related Tasks</h3>
            {relatedTasks.length > 0 && (
              <div className="space-y-1 mb-2">
                {relatedTasks.map((rel) => {
                  const relTask = allTasks.find((t) => t.id === rel.related_task_id);
                  return (
                    <div
                      key={rel.id}
                      className="flex items-center gap-2 rounded-[10px] border-border px-3 py-2"
                    >
                      <span className="text-[15px] text-plum flex-1 truncate">
                        {relTask?.title || "Unknown task"}
                      </span>
                      <button
                        onClick={() => removeRelatedTask(rel.id)}
                        className="text-[12px] text-error hover:opacity-80 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {availableTasks.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={relatedTaskId}
                  onChange={(e) => setRelatedTaskId(e.target.value)}
                  className="rounded-[10px] border-border px-3 py-1.5 text-[13px] flex-1"
                >
                  <option value="">Select a task...</option>
                  {availableTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addRelatedTask}
                  className="btn-secondary btn-sm"
                >
                  Link
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="text-[15px] font-semibold text-muted">Notes</label>
            <textarea
              defaultValue={task.notes || ""}
              onBlur={(e) => onUpdateNotes(task.id, e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="mt-1 w-full rounded-[10px] border-border px-3 py-2 text-[15px] resize-none"
            />
          </div>

          {/* Comments */}
          <div className="mt-4 pt-4 border-t border-border">
            <Comments entityType="task" entityId={task.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
