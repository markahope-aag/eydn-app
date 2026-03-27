/**
 * Subset of the full database Task row used by dashboard task components.
 * Intentionally narrower than the Supabase-generated type — only the fields
 * the UI needs, with stricter union types for status and priority.
 */
export type Task = {
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
