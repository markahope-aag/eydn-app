import type {
  Wedding,
  DayOfPlan,
  Vendor,
  WeddingPartyMember,
  Guest,
  SeatingTable,
  FloorObject,
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

/** Fetch an image and inline it as a data URL so it embeds reliably in
 *  the react-pdf binder. Returns null if the image can't be fetched. */
async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
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
    floorObjects,
    assignments,
    ceremonyPositions,
    expenses,
    rehearsalDinner,
    registryLinks,
    vendorDocsRaw,
  ] = await Promise.all([
    fetchJSON<Wedding>("/api/weddings"),
    fetchJSON<{ content: DayOfPlan }>("/api/day-of"),
    fetchJSON<Vendor[]>("/api/vendors"),
    fetchJSON<WeddingPartyMember[]>("/api/wedding-party"),
    fetchJSON<Guest[]>("/api/guests"),
    fetchJSON<SeatingTable[]>("/api/seating/tables"),
    fetchJSON<FloorObject[]>("/api/seating/floor-objects"),
    fetchJSON<SeatAssignment[]>("/api/seating/assignments"),
    fetchJSON<CeremonyPosition[]>("/api/ceremony"),
    fetchJSON<Expense[]>("/api/expenses"),
    fetchJSON<RehearsalDinner>("/api/rehearsal-dinner"),
    fetchJSON<RegistryLink[]>("/api/wedding-website/registry"),
    fetchJSON<Array<{ entity_id: string; file_name: string; file_url: string; mime_type: string | null; doc_type: string | null }>>(
      "/api/attachments?entity_type=vendor"
    ),
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

  // Inline attire photos as data URLs so they embed in the PDF.
  dayOf.attire = await Promise.all(
    dayOf.attire.map(async (a) => ({
      ...a,
      photoUrl: a.photoUrl ? await imageToDataUrl(a.photoUrl) : null,
    }))
  );

  // Inline wedding-party member photos as data URLs for the PDF.
  const partyList = await Promise.all(
    (weddingParty || []).map(async (m) => ({
      ...m,
      photo_url: m.photo_url ? await imageToDataUrl(m.photo_url) : null,
    }))
  );

  return {
    wedding,
    dayOf,
    vendorList: vendors || [],
    partyList,
    guestList: (guests || []).sort((a, b) => a.name.localeCompare(b.name)),
    tableList: tables || [],
    floorObjects: floorObjects || [],
    assignmentList: assignments || [],
    positionList: ceremonyPositions || [],
    expenseList: expenses || [],
    rehearsal: rehearsalDinner,
    registry: registryLinks || [],
    insuranceCerts: (vendorDocsRaw || [])
      .filter((a) => a.doc_type === "insurance")
      .map((a) => ({
        vendorId: a.entity_id,
        fileName: a.file_name,
        fileUrl: a.file_url,
        mimeType: a.mime_type,
      })),
    vendorContracts: (vendorDocsRaw || [])
      .filter((a) => a.doc_type !== "insurance")
      .map((a) => ({
        vendorId: a.entity_id,
        fileName: a.file_name,
        fileUrl: a.file_url,
        mimeType: a.mime_type,
      })),
  };
}
