import test from "node:test";
import assert from "node:assert/strict";
import { canRegister, canReduceCapacity, hasActiveRegistration, ownsEvent, placesRemaining } from "../lib/domain.ts";

test("capacity checks reject a full, started, or unavailable event", () => {
  const now = new Date("2030-01-01T00:00:00Z");
  assert.equal(canRegister({ status: "published", startsAt: new Date("2030-01-02"), capacity: 2, active: 1, now }), true);
  assert.equal(canRegister({ status: "published", startsAt: new Date("2030-01-02"), capacity: 2, active: 2, now }), false);
  assert.equal(canRegister({ status: "draft", startsAt: new Date("2030-01-02"), capacity: 2, active: 0, now }), false);
  assert.equal(canRegister({ status: "published", startsAt: now, capacity: 2, active: 0, now }), false);
  assert.equal(placesRemaining(2, 1), 1);
});

test("capacity cannot be lowered below active bookings", () => {
  assert.equal(canReduceCapacity(3, 3), true);
  assert.equal(canReduceCapacity(2, 3), false);
  assert.equal(canReduceCapacity(0, 0), false);
});

test("an attendee cannot hold a second active booking, but can rebook after canceling", () => {
  const records = [{ attendeeId: "a1", canceledAt: null }, { attendeeId: "a2", canceledAt: new Date() }];
  assert.equal(hasActiveRegistration(records, "a1"), true);
  assert.equal(hasActiveRegistration(records, "a2"), false);
});

test("event management requires matching organizer ownership", () => {
  assert.equal(ownsEvent("organizer-1", "organizer-1"), true);
  assert.equal(ownsEvent("organizer-2", "organizer-1"), false);
});
