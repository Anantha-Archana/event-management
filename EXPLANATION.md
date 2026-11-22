# Gather: Project Explanation

This document is a guided explanation of the implementation for review, handoff, and an interview walkthrough. It describes the code as it exists today, including the shortcuts and known gaps.

## 1. What the app does

Gather is a small event discovery and registration app with two demo roles:

- An **organizer** creates, edits, publishes, and cancels their own events, then reviews registrations and attendee details.
- An **attendee** browses upcoming published events, registers, and cancels their own registrations.

The main product flow is: organizer publishes an event → attendee discovers and books it → organizer reviews the attendee list → attendee cancels if needed, releasing the seat.

## 2. Technology and structure

- **Next.js App Router** serves the React pages and the Node.js API route handlers.
- **TypeScript** is used for UI, API handlers, and shared domain rules.
- **MongoDB and Mongoose** persist events and registrations.
- **Node's built-in test runner** runs focused domain tests without requiring a database.

Useful files:

| File | Responsibility |
| --- | --- |
| `app/page.tsx` | Public event discovery, search, sign-in modal, and event links |
| `app/event/[id]/page.tsx` | Event schedule, venue, description, availability, and registration action |
| `app/dashboard/page.tsx` | Organizer and attendee dashboard experiences |
| `app/api/**/route.ts` | Authentication, event, registration, and attendee-list API handlers |
| `lib/auth.ts` | Demo identities and signed session cookie helpers |
| `lib/db.ts` | Mongoose connection to the `event-management` database |
| `lib/models.ts` | Event and Registration schemas and indexes |
| `lib/domain.ts` | Small, database-independent business rules used by routes and tests |
| `tests/domain.test.mjs` | Automated rule tests |

## 3. Authentication and authorization

The app has three fixed demo identities defined in `lib/auth.ts`: one organizer and two attendees. The password check is for demonstrating role-based flows; it is not a production identity system. There is no account registration, user collection, password hashing, password reset, or session revocation list.

After login, the server signs a small user payload with HMAC-SHA256 and sends it in an HTTP-only, same-site cookie. The browser cannot read the cookie from JavaScript. The app verifies the signature on server requests, and protected API handlers check the role and, when relevant, the event's `organizerId` or registration's `attendeeId`.

The browser may hide or show actions based on the role for usability, but those UI choices are not the security boundary. For example, attendee-list access checks both that the caller is an organizer and that the event belongs to that organizer. An attendee cannot cancel another attendee's registration because the delete query includes the signed-in attendee ID.

For production, replace demo accounts with an identity provider or properly hashed passwords, require a strong secret from a secret manager (with no fallback), add rate limiting and CSRF/origin defenses, and audit attendee-data access.

## 4. Data model

### Event

An Event document stores:

- Organizer ID and display name
- Title and description
- `startsAt`: the event start as a Date/instant
- `timeZone`: the IANA zone used to render that instant for people attending
- Venue, positive capacity, and status (`draft`, `published`, or `canceled`)
- `activeCount`: the number of current registrations, used for availability and atomic seat claims
- Mongoose creation and update timestamps

Draft and canceled events do not appear in public discovery and cannot be registered for. Organizer dashboards use a separate `mine=1` listing to show all of their own statuses.

### Registration

A Registration stores the event ID, attendee ID/name/email, registration timestamp, and nullable cancellation timestamp. Canceled records are retained for history; active queries use `canceledAt: null` and the attendee dashboard only displays active registrations.

The schema defines a **unique partial index** on `(eventId, attendeeId)` for records where `canceledAt` is null. This allows one active booking per attendee/event while permitting the attendee to book again after cancellation. Registration creation waits for `Registration.init()` so the index is available before the booking route relies on it.

The counter is intentionally stored on Event rather than calculated from all Registration documents for every listing. That makes availability reads cheap and makes the final-seat claim a single conditional MongoDB update. The trade-off is that counter maintenance must stay consistent with registration writes.

## 5. Event creation, editing, and discovery

The organizer form accepts title, description, local date/time, IANA time-zone name, venue, integer capacity, and status. The API validates required values, the date, positive whole-number capacity, allowed status, and a valid IANA zone. Editing checks ownership in the API and uses a conditional update so a capacity reduction cannot race past a newly arriving registration. Capacity may not be lower than current active registrations.

The public event query returns only published events whose start is in the future. The public listing has search, loading, empty, and error states. The detail page shows the schedule in the event's selected time zone, venue, capacity, active count, and places remaining. Registration is hidden from draft/canceled events at both the UI discovery layer and the server endpoint.

The date/time input is interpreted in the browser's local zone. The selected event zone is stored separately and used for display; choose a zone matching the intended local input time. A production-quality editor would convert wall-clock time in the selected zone explicitly and handle daylight-saving ambiguity.

## 6. The capacity constraint and duplicate protection

The registration API does not decide capacity by reading a count and later incrementing it. That read-then-write approach can let two requests both observe the final place. Instead it sends one conditional update to MongoDB:

```text
match: event is published, start is in the future, and activeCount < capacity
update: increment activeCount by one
```

MongoDB applies the predicate and increment atomically to the event document. If no document is updated, the event is full or no longer available and the caller receives HTTP 409.

After claiming a seat, the route inserts the Registration document. A duplicate pre-check gives a friendly duplicate message, while the unique partial index is the actual protection against two simultaneous requests from the same attendee. If the insert loses that race, the route decrements the counter to release the extra claim and returns HTTP 409.

To reproduce a last-place race manually, publish an event with capacity 1. Sign in to two separate browser sessions using the two attendee demo accounts and submit at nearly the same time. Exactly one request should succeed; the other should receive HTTP 409, and the active count should be 1.

This protects against simultaneous claims while the process is running. There is still a crash window between incrementing the counter and inserting the registration. Cancellation also updates the registration and event counter in two writes. A replica-set transaction or a reservation/reconciliation design would close those consistency gaps for production.

## 7. API map

| Method and path | Access | Behavior |
| --- | --- | --- |
| `POST /api/auth` | Public | Validate a demo identity and set the signed cookie |
| `DELETE /api/auth` | Any browser | Clear the session cookie |
| `GET /api/me` | Signed in | Return the authenticated demo identity |
| `GET /api/events` | Public | List upcoming published events |
| `GET /api/events?mine=1` | Organizer | List only the organizer's events, including drafts/canceled |
| `POST /api/events` | Organizer | Validate and create an event owned by the caller |
| `GET /api/events/:id` | Public | Read a published upcoming event detail |
| `PATCH /api/events/:id` | Owning organizer | Validate changes and update the event |
| `DELETE /api/events/:id` | Owning organizer | Mark the event canceled |
| `POST /api/events/:id` | Attendee | Claim a place and create a registration |
| `GET /api/events/:id/attendees` | Owning organizer | List active attendee names, emails, and registration times |
| `GET /api/registrations` | Attendee | List the caller's active registrations |
| `DELETE /api/registrations?id=...` | Owning attendee | Cancel the caller's registration and release a place |

Protected handlers return 401 when there is no valid session and 403 when the signed-in role or ownership is wrong. Validation failures return 400; full or duplicate bookings return 409.

## 8. Tests and verification

Run the focused tests with:

```bash
npm test
```

The tests cover published/future/not-full eligibility, full and started events, capacity reductions, active duplicate detection versus rebooking after cancel, remaining places, and organizer ownership decisions. These are domain tests and do not need MongoDB. The actual API's atomic predicate and unique index are visible in the booking handler and schema; the two-attendee manual walkthrough exercises them against MongoDB.

Other checks used during implementation:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## 9. Run it locally

1. Install Node.js 20 or newer and have a MongoDB instance available.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `MONGODB_URI` to the MongoDB host/credentials and `SESSION_SECRET` to a long random value.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Sign in with the organizer demo account and publish a future event. Then use an attendee account to register.

The database name is selected by `lib/db.ts` as `event-management`. `.env.local` is ignored by Git and must not be included in a source archive. The checked-in `.env.example` contains only a local placeholder.

## 10. Interview walkthrough

1. Show the organizer dashboard and create a published event with capacity 1, an upcoming time, and an IANA zone.
2. Open the event from public discovery and point out its schedule, location, capacity, and remaining places.
3. Register as attendee one; show the success message and organizer's attendee list.
4. Try a second registration as attendee two in a separate session. Explain that the conditional update arbitrates the final seat and the unique index prevents duplicate active registrations.
5. Cancel the first registration and show the released place; edit the event to show capacity cannot go below active bookings.
6. Explain the ownership check in the attendee-list endpoint and how the integration tests could be expanded against a test MongoDB replica set.

No recording is included. This is a step-by-step live demo guide.

## 11. Current scope and next improvements

Implemented: full demo journey, organizer and attendee roles, server-side role/ownership checks, event validation and lifecycle, upcoming discovery/detail, registration/cancellation, duplicate prevention, capacity protection, dashboards, and focused domain tests.

Intentionally omitted: real user registration, production credential management, payments, notifications, pagination, event images, automated browser tests, MongoDB API integration tests, and a recorded demo. With more time, I would add replica-set integration tests for concurrent bookings and cancellation, use transactions or a repairable reservation ledger, explicitly convert event wall-clock times in the selected zone, and add operational logging/metrics.

AI tools helped scaffold and review implementation ideas. The submitter should be prepared to explain the seat-claim predicate, unique index, authorization checks, and the demo-auth trade-offs, and to debug or modify the code directly.
