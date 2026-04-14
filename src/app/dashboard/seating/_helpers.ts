import type { Assignment, Guest } from "./_types";

export function getTableAssignments(assignments: Assignment[], tableId: string): Assignment[] {
  return assignments.filter((a) => a.seating_table_id === tableId);
}

export function getTableGuests(
  assignments: Assignment[],
  guests: Guest[],
  tableId: string
): Guest[] {
  const tableAssigns = getTableAssignments(assignments, tableId);
  return guests.filter((g) => tableAssigns.some((a) => a.guest_id === g.id));
}

/**
 * Return an array of length `capacity` where each index is either a guest
 * or null, respecting seat_number assignments. Unpositioned guests fill
 * the remaining empty seats in order.
 */
export function getSeatMap(
  assignments: Assignment[],
  guests: Guest[],
  tableId: string,
  capacity: number
): (Guest | null)[] {
  const tableAssigns = getTableAssignments(assignments, tableId);
  const seats: (Guest | null)[] = Array.from({ length: capacity }, () => null);
  const unpositioned: Guest[] = [];

  for (const a of tableAssigns) {
    const guest = guests.find((g) => g.id === a.guest_id);
    if (!guest) continue;
    if (a.seat_number != null && a.seat_number >= 1 && a.seat_number <= capacity) {
      seats[a.seat_number - 1] = guest; // seat_number is 1-indexed
    } else {
      unpositioned.push(guest);
    }
  }

  // Fill unpositioned guests into empty seats
  let nextEmpty = 0;
  for (const guest of unpositioned) {
    while (nextEmpty < capacity && seats[nextEmpty] !== null) nextEmpty++;
    if (nextEmpty < capacity) {
      seats[nextEmpty] = guest;
      nextEmpty++;
    }
  }

  return seats;
}
