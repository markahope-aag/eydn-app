import { TASK_TIMELINE } from "./task-timeline";
import type { Database } from "@/lib/supabase/types";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

type WeddingContext = {
  weddingId: string;
  weddingDate: string; // ISO date
  hasWeddingParty: boolean;
  hasPreWeddingEvents: boolean;
  hasHoneymoon: boolean;
  bookedVendors: string[]; // vendor categories already booked
};

function addMonths(date: Date, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + Math.floor(months));
  // Handle fractional months (0.25 = ~1 week)
  const fractional = months - Math.floor(months);
  if (fractional !== 0) {
    d.setDate(d.getDate() + Math.round(fractional * 30));
  }
  return d.toISOString().split("T")[0];
}

function shouldIncludeTask(
  task: (typeof TASK_TIMELINE)[0],
  ctx: WeddingContext
): boolean {
  if (!task.conditional) return true;

  switch (task.conditional) {
    case "has_wedding_party":
      return ctx.hasWeddingParty;
    case "has_pre_wedding_events":
      return ctx.hasPreWeddingEvents;
    case "has_honeymoon":
      return ctx.hasHoneymoon;
    default:
      return true;
  }
}

function isVendorTaskAlreadyBooked(
  title: string,
  bookedVendors: string[]
): boolean {
  const vendorMap: Record<string, string> = {
    "Book Venue": "Venue",
    "Book Photographer": "Photographer",
    "Book Videographer": "Videographer",
    "Book Caterer": "Caterer",
    "Book DJ or Band": "DJ or Band",
    "Book Officiant": "Officiant",
    "Book Florist": "Florist",
    "Book Rentals": "Rentals",
    "Book Hair Stylist": "Hair Stylist",
    "Book Makeup Artist": "Makeup Artist",
    "Book Transportation": "Transportation",
    "Book Cake/Dessert Baker": "Cake/Dessert Baker",
  };

  const vendorCategory = vendorMap[title];
  return vendorCategory ? bookedVendors.includes(vendorCategory) : false;
}

export function generateTasks(ctx: WeddingContext): TaskInsert[] {
  const weddingDate = new Date(ctx.weddingDate);
  const tasks: TaskInsert[] = [];
  let sortOrder = 0;

  for (const taskDef of TASK_TIMELINE) {
    if (!shouldIncludeTask(taskDef, ctx)) continue;

    const isBooked = isVendorTaskAlreadyBooked(taskDef.title, ctx.bookedVendors);

    const dueDate =
      taskDef.monthsBefore >= 0
        ? addMonths(weddingDate, -taskDef.monthsBefore)
        : addMonths(weddingDate, Math.abs(taskDef.monthsBefore));

    const parentTask: TaskInsert = {
      wedding_id: ctx.weddingId,
      title: taskDef.title,
      category: taskDef.category,
      due_date: dueDate,
      completed: isBooked,
      edyn_message: taskDef.edynMessage,
      sort_order: sortOrder++,
      timeline_phase: taskDef.phase,
      is_system_generated: true,
      notes: taskDef.notes || null,
    };

    tasks.push(parentTask);

    // Sub-tasks will be inserted with parent_task_id set after parent insertion
    if (taskDef.subTasks) {
      for (const sub of taskDef.subTasks) {
        const subDueDate =
          sub.monthsBefore >= 0
            ? addMonths(weddingDate, -sub.monthsBefore)
            : addMonths(weddingDate, Math.abs(sub.monthsBefore));

        tasks.push({
          wedding_id: ctx.weddingId,
          title: sub.title,
          category: taskDef.category,
          due_date: subDueDate,
          completed: false,
          edyn_message: sub.edynMessage || null,
          sort_order: sortOrder++,
          timeline_phase: taskDef.phase,
          is_system_generated: true,
          // parent_task_id will be set after insertion
        });
      }
    }
  }

  return tasks;
}
