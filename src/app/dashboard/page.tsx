import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  const supabase = createSupabaseAdmin();
  const { data: wedding } = await supabase
    .from("weddings")
    .select("*")
    .eq("user_id", userId!)
    .single();

  if (!wedding) {
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900">Welcome!</h1>
        <p className="mt-2 text-gray-600">
          You haven&apos;t set up your wedding yet. Let&apos;s get started.
        </p>
        <a
          href="/dashboard/setup"
          className="mt-6 inline-block rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 transition"
        >
          Set Up Your Wedding
        </a>
      </div>
    );
  }

  const [{ count: guestCount }, { count: taskCount }, { count: completedTasks }] =
    await Promise.all([
      supabase
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("wedding_id", wedding.id)
        .eq("completed", true),
    ]);

  const daysUntilWedding = wedding.date
    ? Math.ceil(
        (new Date(wedding.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {wedding.partner1_name} & {wedding.partner2_name}
      </h1>
      {wedding.date && (
        <p className="mt-1 text-gray-500">
          {new Date(wedding.date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {daysUntilWedding !== null && daysUntilWedding > 0 && (
            <span className="ml-2 text-rose-600 font-medium">
              ({daysUntilWedding} days away)
            </span>
          )}
        </p>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Guests" value={guestCount ?? 0} />
        <StatCard label="Tasks" value={taskCount ?? 0} />
        <StatCard
          label="Completed"
          value={`${completedTasks ?? 0}/${taskCount ?? 0}`}
        />
        <StatCard
          label="Budget"
          value={wedding.budget ? `$${wedding.budget.toLocaleString()}` : "Not set"}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
