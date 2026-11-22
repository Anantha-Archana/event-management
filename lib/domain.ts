export type EventState = "draft" | "published" | "canceled";
export function placesRemaining(capacity: number, active: number) { return Math.max(0, capacity - active); }
export function canRegister(input: { status: EventState; startsAt: Date; capacity: number; active: number; now?: Date }) {
  return input.status === "published" && input.startsAt.getTime() > (input.now ?? new Date()).getTime() && input.active < input.capacity;
}
export function canReduceCapacity(next: number, active: number) { return Number.isInteger(next) && next > 0 && next >= active; }
export function ownsEvent(userId: string, organizerId: string) { return userId === organizerId; }
export function hasActiveRegistration(registrations: { attendeeId: string; canceledAt: Date | null }[], attendeeId: string) { return registrations.some(r => r.attendeeId === attendeeId && r.canceledAt === null); }
