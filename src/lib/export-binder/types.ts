export type Wedding = {
  partner1_name: string;
  partner2_name: string;
  date: string | null;
  venue: string | null;
  budget: number | null;
};

export type DayOfPlan = {
  ceremonyTime: string;
  timeline: { time: string; event: string; notes: string; forGroup?: string }[];
  vendorContacts: { vendor: string; category: string; contact: string; phone: string }[];
  partyAssignments: { name: string; role: string; job: string; phone: string }[];
  packingChecklist: { item: string; notes: string }[];
  ceremonyScript: string;
  processionalOrder: string[];
  officiantNotes: string;
  music: { moment: string; song: string; artist: string }[];
  speeches: { speaker: string; role: string; topic: string }[];
  setupTasks: { task: string; assignedTo: string; notes: string }[];
  attire: { person: string; description: string; photoUrl: string | null }[];
};

export type Vendor = {
  id: string;
  category: string;
  name: string;
  poc_name: string | null;
  poc_email: string | null;
  poc_phone: string | null;
  notes: string | null;
  amount: number | null;
  amount_paid: number | null;
  arrival_time: string | null;
  meal_count: number;
};

export type WeddingPartyMember = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  job_assignment: string | null;
  attire: string | null;
  /** Inlined as a data URL by fetch-data for the PDF; null when none. */
  photo_url: string | null;
};

export type Guest = {
  id: string;
  name: string;
  rsvp_status: string;
  meal_preference: string | null;
  role: string | null;
  group_name: string | null;
};

export type SeatingTable = {
  id: string;
  table_number: number;
  name: string | null;
  shape: string;
  capacity: number;
  x: number;
  y: number;
};

export type FloorObject = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SeatAssignment = {
  id: string;
  seating_table_id: string;
  guest_id: string;
  seat_number: number | null;
};

export type CeremonyPosition = {
  id: string;
  person_name: string;
  person_type: string;
  role: string | null;
  side: string | null;
  position_order: number;
};

export type Expense = {
  id: string;
  description: string;
  estimated: number;
  amount_paid: number;
  final_cost: number | null;
  category: string;
  paid: boolean;
  vendor_name: string | null;
};

export type RegistryLink = {
  id: string;
  name: string;
  url: string;
  sort_order: number;
};

export type RehearsalDinner = {
  venue: string | null;
  date: string | null;
  time: string | null;
  address: string | null;
  notes: string | null;
  timeline: { time?: string; event?: string; notes?: string }[];
  guest_list: string[];
};

export type VendorDoc = {
  vendorId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
};

export type BinderData = {
  wedding: Wedding;
  dayOf: DayOfPlan;
  vendorList: Vendor[];
  partyList: WeddingPartyMember[];
  guestList: Guest[];
  tableList: SeatingTable[];
  floorObjects: FloorObject[];
  assignmentList: SeatAssignment[];
  positionList: CeremonyPosition[];
  expenseList: Expense[];
  rehearsal: RehearsalDinner | null;
  registry: RegistryLink[];
  insuranceCerts: VendorDoc[];
  vendorContracts: VendorDoc[];
};

export type TimelineGroup = {
  label: string;
  items: DayOfPlan["timeline"];
};

export type BudgetCategory = {
  estimated: number;
  paid: number;
};

// React-PDF component types passed to section renderers
export type PdfComponents = {
  PdfPage: React.ComponentType<Record<string, unknown>>;
  Text: React.ComponentType<Record<string, unknown>>;
  View: React.ComponentType<Record<string, unknown>>;
};
