import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { purgeWeddingData, PurgeBackupError, SUNSET_PURGE_TABLES } from "./purge";
import { isR2Configured } from "@/lib/backup/r2";

// By default R2 is configured and the final backup stores + verifies fine, so
// the purge proceeds to delete. Individual tests override isR2Configured to
// exercise the fail-safe.
vi.mock("@/lib/backup/r2", () => ({
  isR2Configured: vi.fn(() => true),
  putObject: vi.fn(async (key: string) => key),
  objectExists: vi.fn(async () => true),
}));

const TABLE_DATA: Record<string, unknown[]> = {
  seating_tables: [{ id: "t1" }, { id: "t2" }],
  guests: [{ id: "g1" }],
};

type DeleteCall = { table: string; method: "eq" | "in"; arg: unknown };

function createMockSupabase(deleteErrors: Record<string, { message: string }> = {}) {
  const deletes: DeleteCall[] = [];

  const client = {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              const data = TABLE_DATA[table] ?? [];
              const thenable = Promise.resolve({ data, error: null }) as Promise<{
                data: unknown[];
                error: null;
              }> & { single?: () => Promise<{ data: unknown; error: null }> };
              thenable.single = () =>
                Promise.resolve({ data: data[0] ?? null, error: null });
              return thenable;
            },
          };
        },
        delete() {
          return {
            eq(_col: string, val: string) {
              deletes.push({ table, method: "eq", arg: val });
              return Promise.resolve({ error: deleteErrors[table] ?? null });
            },
            in(_col: string, vals: string[]) {
              deletes.push({ table, method: "in", arg: vals });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, deletes };
}

describe("purgeWeddingData", () => {
  it("deletes from every purge table for the wedding", async () => {
    const { client, deletes } = createMockSupabase();
    await purgeWeddingData(client, "w1");

    for (const table of SUNSET_PURGE_TABLES) {
      expect(deletes.some((d) => d.table === table)).toBe(true);
    }
  });

  it("deletes seat_assignments via parent seating_tables ids, not wedding_id", async () => {
    const { client, deletes } = createMockSupabase();
    await purgeWeddingData(client, "w1");

    const seatDelete = deletes.find((d) => d.table === "seat_assignments");
    expect(seatDelete).toBeDefined();
    expect(seatDelete!.method).toBe("in");
    expect(seatDelete!.arg).toEqual(["t1", "t2"]);
  });

  it("scopes all other deletes to the wedding id", async () => {
    const { client, deletes } = createMockSupabase();
    await purgeWeddingData(client, "w1");

    for (const d of deletes) {
      if (d.table === "seat_assignments") continue;
      expect(d.method).toBe("eq");
      expect(d.arg).toBe("w1");
    }
  });

  it("deletes children before parents (FK-safe order)", async () => {
    const { client, deletes } = createMockSupabase();
    await purgeWeddingData(client, "w1");

    const order = deletes.map((d) => d.table);
    expect(order.indexOf("seat_assignments")).toBeLessThan(order.indexOf("seating_tables"));
    expect(order.indexOf("expenses")).toBeLessThan(order.indexOf("guests"));
  });

  it("does not throw when a table delete returns an error", async () => {
    const { client, deletes } = createMockSupabase({ tasks: { message: "boom" } });
    // Resolves with the stored backup key; a delete error is logged, not thrown.
    await expect(purgeWeddingData(client, "w1")).resolves.toContain("sunset/");
    // The failure is logged but the remaining tables are still purged.
    expect(deletes.some((d) => d.table === "guests")).toBe(true);
  });

  it("returns the R2 key of the stored final backup", async () => {
    const { client } = createMockSupabase();
    await expect(purgeWeddingData(client, "w1")).resolves.toMatch(/^sunset\/w1-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it("FAIL-SAFE: aborts without deleting when R2 is not configured", async () => {
    vi.mocked(isR2Configured).mockReturnValueOnce(false);
    const { client, deletes } = createMockSupabase();
    await expect(purgeWeddingData(client, "w1")).rejects.toBeInstanceOf(PurgeBackupError);
    // Nothing was deleted — the data is left intact.
    expect(deletes).toHaveLength(0);
  });

  it("keeps the deletion table list FK-ordered (regression guard)", () => {
    expect(SUNSET_PURGE_TABLES[0]).toBe("seat_assignments");
    expect(SUNSET_PURGE_TABLES).toContain("guests");
    expect(new Set(SUNSET_PURGE_TABLES).size).toBe(SUNSET_PURGE_TABLES.length);
  });
});

// Silence the structured logger's stdout during the error test.
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
