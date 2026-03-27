import type { Database } from "@/lib/supabase/types";

// ── Row types (full database rows) ──────────────────────────────
export type Wedding = Database["public"]["Tables"]["weddings"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Guest = Database["public"]["Tables"]["guests"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
