export type TimelineItem = { time: string; event: string; notes: string; forGroup?: string; duration?: number; vendorCategory?: string };
export type VendorContact = { vendor: string; category: string; contact: string; phone: string };
export type PartyAssignment = { name: string; role: string; job: string; phone: string };
export type PackingItem = { item: string; notes: string };
export type MusicEntry = { moment: string; song: string; artist: string };
export type SpeechEntry = { speaker: string; role: string; topic: string };
export type SetupTask = { task: string; assignedTo: string; notes: string };
export type AttireItem = { person: string; description: string; photoUrl: string | null };

export type DayOfPlan = {
  ceremonyTime: string;
  timeline: TimelineItem[];
  vendorContacts: VendorContact[];
  partyAssignments: PartyAssignment[];
  packingChecklist: PackingItem[];
  ceremonyScript: string;
  processionalOrder: string[];
  officiantNotes: string;
  music: MusicEntry[];
  speeches: SpeechEntry[];
  setupTasks: SetupTask[];
  attire: AttireItem[];
};

export type Tab = "timeline" | "vendors" | "packing" | "ceremony" | "music" | "speeches" | "setup" | "attire";

export const TIMELINE_GROUPS = ["Everyone", "Partner 1", "Partner 2", "Attendants", "Family", "Vendors"];

export const DEFAULT_MUSIC_MOMENTS = [
  "Processional",
  "Couple Entrance",
  "Recessional",
  "First Dance",
  "Parent Dance 1",
  "Parent Dance 2",
  "Cake Cutting",
  "Last Dance",
  "Exit Song",
];
