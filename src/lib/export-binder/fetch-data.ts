import type {
  Wedding,
  DayOfPlan,
  Vendor,
  WeddingPartyMember,
  Guest,
  SeatingTable,
  SeatAssignment,
  CeremonyPosition,
  Expense,
  RehearsalDinner,
  RegistryLink,
  BinderData,
} from "./types";

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBinderData(): Promise<BinderData> {
  const [
    weddingData,
    dayOfRaw,
    vendors,
    weddingParty,
    guests,
    tables,
    assignments,
    ceremonyPositions,
    expenses,
    rehearsalDinner,
    registryLinks,
  ] = await Promise.all([
    fetchJSON<Wedding>("/api/weddings"),
    fetchJSON<{ content: DayOfPlan }>("/api/day-of"),
    fetchJSON<Vendor[]>("/api/vendors"),
    fetchJSON<WeddingPartyMember[]>("/api/wedding-party"),
    fetchJSON<Guest[]>("/api/guests"),
    fetchJSON<SeatingTable[]>("/api/seating/tables"),
    fetchJSON<SeatAssignment[]>("/api/seating/assignments"),
    fetchJSON<CeremonyPosition[]>("/api/ceremony"),
    fetchJSON<Expense[]>("/api/expenses"),
    fetchJSON<RehearsalDinner>("/api/rehearsal-dinner"),
    fetchJSON<RegistryLink[]>("/api/wedding-website/registry"),
  ]);

  const wedding = weddingData || {
    partner1_name: "Partner 1",
    partner2_name: "Partner 2",
    date: null,
    venue: null,
    budget: null,
  };

  const rawDayOf = (dayOfRaw?.content as DayOfPlan) || ({} as Partial<DayOfPlan>);

  // Migrate old string[] packing checklist to { item, notes }[]
  let packingChecklist = rawDayOf.packingChecklist || [];
  if (packingChecklist.length > 0 && typeof packingChecklist[0] === "string") {
    packingChecklist = (packingChecklist as unknown as string[]).map(
      (item) => ({ item, notes: "" })
    );
  }

  const dayOf: DayOfPlan = {
    ceremonyTime: rawDayOf.ceremonyTime || "",
    timeline: rawDayOf.timeline || [],
    vendorContacts: rawDayOf.vendorContacts || [],
    partyAssignments: rawDayOf.partyAssignments || [],
    packingChecklist,
    ceremonyScript: rawDayOf.ceremonyScript || "",
    processionalOrder: rawDayOf.processionalOrder || [],
    officiantNotes: rawDayOf.officiantNotes || "",
    music: rawDayOf.music || [],
    speeches: rawDayOf.speeches || [],
    setupTasks: rawDayOf.setupTasks || [],
    attire: rawDayOf.attire || [],
  };

  return {
    wedding,
    dayOf,
    vendorList: vendors || [],
    partyList: weddingParty || [],
    guestList: (guests || []).sort((a, b) => a.name.localeCompare(b.name)),
    tableList: tables || [],
    assignmentList: assignments || [],
    positionList: ceremonyPositions || [],
    expenseList: expenses || [],
    rehearsal: rehearsalDinner,
    registry: registryLinks || [],
  };
}
