# Gather — Event Management

A small event discovery and booking app for organizers and attendees. Built with Next.js, TypeScript, MongoDB, and Mongoose.

See [EXPLANATION.md](./EXPLANATION.md) for the architecture, data model, API map, capacity behavior, test coverage, limitations, and an interview walkthrough.

## Run locally

Requirements: Node.js 20+ and MongoDB (local or Atlas).

```bash
npm install
Copy-Item .env.example .env.local  # PowerShell; use cp on macOS/Linux
# Set MONGODB_URI to your MongoDB URI and SESSION_SECRET to a long random value
npm run dev
```

Open http://localhost:3000. The app connects to the `event-management` database on the MongoDB host in `MONGODB_URI`. A local placeholder URI is provided in `.env.example`; replace it with your own before running. No real credentials are included in the source or example environment file. Keep `.env.local` out of commits and archives.

## Demo accounts

- Organizer: `organizer@demo.test` / `organizer123`
- Attendee: `attendee@demo.test` / `attendee123`
- Second attendee (for independent booking/concurrency checks): `attendee2@demo.test` / `attendee234`

These accounts are in-memory demo identities, not database users. Create and publish an event as the organizer, sign out, then sign in as the attendee to register. The organizer dashboard lists capacity and attendees; the attendee dashboard allows cancellation and releases a place.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (placeholder in `.env.example`) |
| `SESSION_SECRET` | HMAC signing secret for the demo session cookie; set a random value locally |

## Tests

```bash
npm test
```

Domain tests cover duplicate active-registration decisions, capacity bounds, event availability, and ownership decisions. The registration endpoint also has a MongoDB unique partial index on `(eventId, attendeeId)` for active registrations. The capacity claim is a conditional atomic update, so two requests for the final place cannot both increment the count past capacity. For a manual concurrency check, create a published event with capacity 1, sign in two separate browser sessions as the two attendee accounts, and submit registration from both at nearly the same time. Exactly one should succeed; the other receives HTTP 409. API integration tests against a running MongoDB instance are a next step.

## Data model and decisions

- **Event** stores organizer identity, title, description, start instant, IANA time-zone name, venue, capacity, status, and an `activeCount` counter.
- **Registration** stores event and attendee identity, contact details, registration time, and an optional cancellation time. A partial unique index prevents two active registrations for one attendee and event while allowing a canceled attendee to register again.
- Capacity uses an atomic conditional `find/update` predicate (`activeCount < capacity`) rather than a read-then-write count. If unique-index insertion detects a duplicate after the seat claim, the counter is decremented to release that claim.
- Canceled registrations remain for history but do not count toward capacity. Canceled and draft events are omitted from public discovery.
- Start time is stored as an instant and the selected IANA time zone is stored separately for display. The date/time input is interpreted in the browser's local time zone; choose the matching time-zone field when creating an event.

## Security and production follow-up

This is intentionally a local interview demo. Demo credentials are fixed in source, there is no account registration or password hashing, and the HMAC secret has a local fallback. The cookie is HTTP-only, same-site, and secure in production mode. Every protected API enforces role and event ownership on the server. For production, replace demo auth with a real identity provider or hashed passwords, remove the fallback secret, add rate limiting and CSRF/origin defenses, validate all request shapes centrally, and audit access to attendee data.

The seat counter and unique index handle concurrent seat claims without a replica set. A process crash between increment and registration insertion could leave a stale counter; production hardening should use MongoDB transactions on a replica set or a reservation/repair strategy. Cancellation is performed as two database writes and merits the same transactional treatment.

## Interview walkthrough

1. Sign in as the organizer, publish an event with capacity 1, and point out the stored IANA time zone and attendee count.
2. Sign out, register the attendee, then open the organizer dashboard and show the attendee row.
3. Attempt another registration (or run the two-request concurrency check above) to show duplicate/full handling.
4. Cancel the attendee registration and show that the available seat returns.
5. Explain the conditional atomic counter update and unique active-registration index.

No demo video is included; the walkthrough above is a short live demo script.

## Status

Completed: event creation/edit/cancel, public upcoming discovery and detail pages, registration/cancellation, organizer and attendee dashboards, backend role/ownership checks, capacity constraints, and focused domain tests.

Not included: production identity management, automated browser/API integration tests, email notifications, pagination, and a recorded demo video. With more time, I would add transactional integration tests on a replica-set test database, richer event image support, and observability around booking failures.

AI tools were used to scaffold and review implementation ideas. The source should be read and verified by the submitter before use in an interview.
