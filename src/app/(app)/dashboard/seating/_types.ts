export type Table = {
  id: string;
  table_number: number;
  name: string | null;
  x: number;
  y: number;
  shape: "round" | "rectangle";
  capacity: number;
  /** Explicit footprint in canvas px. Null means "use the shape default"
   *  (round 140, rectangle 200x90) — set once the table is resized. */
  width: number | null;
  height: number | null;
};

export type Guest = {
  id: string;
  name: string;
  rsvp_status: string;
};

export type Assignment = {
  id: string;
  seating_table_id: string;
  guest_id: string;
  seat_number: number | null;
};

export type WeddingPartyMember = {
  id: string;
  name: string;
  role: string;
};

export type CeremonyPosition = {
  id: string;
  person_type: "wedding_party" | "officiant" | "couple";
  person_name: string;
  role: string | null;
  side: "left" | "right" | "center" | null;
  position_order: number;
};

export type FloorObject = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Tab = "reception" | "ceremony";
