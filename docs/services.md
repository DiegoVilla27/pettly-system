# Services

Status: implemented, Colombia/COP. Updated: 2026-10-09. Swagger: http://localhost:3100/api/docs; JSON: http://localhost:3100/api/openapi.json. Read [DESIGN](../DESIGN.md) and [Bookings](bookings.md) together with this document.

## Purpose and boundaries

Services owns the business service catalog, accepted booking policies, shared resources, weekly calendars, administrative blocks and publication revisions. Bookings owns reservations and occupancy; Services reads occupancy through `BookingOccupancy`, never through a booking table in application code. Organizations/Authorization provide current business eligibility and scoped permissions. `ServicesBooking` is the internal offer port used by Bookings. No circular dependency: the small BookingsReadModule provides the outbound occupancy adapter independently of the Bookings command module.

Feature structure: pure domain service aggregate and scheduling rules; application commands/queries/use-case and repository ports; inbound Nest HTTP controllers with distinct strict Zod request/response DTOs and HTTP mappers; outbound Prisma repository and persistence mapper. No Nest, Prisma, Redis or HTTP dependency in the domain/application layers.

Only active `business` organizations with country `CO` can offer services. Public reads recheck current eligibility; disabled/unpublished businesses return no public detail. Global superadmin/moderator reviews require `moderation.publications.review` and no membership in the owning company; the creator cannot self-review. Operational management uses `services.manage` in the explicit current organization, including superadmin. A customer cannot infer private records by supplying another organization UUID.

## Service contract

All ids are application-generated UUIDs. `profile` is a full replacement, not a partial patch. Unknown request and response keys are rejected. Mutations require a 10–500 character audited reason; updates require the current expectedVersion and stale writes return 409.

| Field                                    | Meaning and validation                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| name / description                       | Trimmed 2–150 / 10–2000 characters; no control characters                                                                          |
| category                                 | grooming, daycare, training, lodging or veterinary; veterinary appointments require independent current professional accreditation |
| kind                                     | appointment or lodging; lodging category requires lodging kind                                                                     |
| priceMinor / currency                    | Positive integer, up to 2147483647, COP only. 100 minor units = 1 COP. Tax-inclusive price per appointment or per night            |
| acceptedSpecies                          | Distinct supported dog/cat/bird/rabbit/reptile/rodent/equine/other values, 1–8                                                     |
| requirements / terms                     | Explicit provider requirements and accepted conditions, 2–2000 / 10–2000 characters                                                |
| collectionMode                           | pay_at_business. No Pettly online booking charge, deposit, split, receipt or refund is implied                                     |
| confirmationMode                         | automatic confirms on allocation; manual creates a request holding capacity until provider decision/deadline                       |
| durationMinutes                          | Appointment only: 15–480, multiples of 15. Lodging: null                                                                           |
| bufferBeforeMinutes / bufferAfterMinutes | Appointment setup/cleanup: 0–120, multiples of 15. Lodging: zero                                                                   |
| checkInMinute / checkOutMinute           | Lodging local minute of day; multiples of 15 and checkout strictly before checkin. Appointment: null                               |
| minNights / maxNights                    | Lodging 1–30, minimum no greater than maximum. Appointment both 1                                                                  |
| minimumNoticeMinutes                     | 15–43200 before start                                                                                                              |
| cancellationCutoffMinutes                | 0–43200 before start; accepted snapshot governs buyer cancellation/reprogramming                                                   |
| requestTtlMinutes                        | 15–1440; pending request expires at the earlier of this duration and service start                                                 |
| resourceIds                              | At most twenty distinct UUIDs, same business/kind, active at assignment/submission/review                                          |

Lifecycle: draft → pending → published or rejected. Draft/rejected/paused can be submitted; editing any mutable profile produces draft and clears the current review. Pending cannot be edited. Published can be paused; archive is terminal. Every change increments version and saves an immutable matching audit snapshot in the same transaction. Existing reservations retain their accepted policy even if a service changes, pauses or archives.

## Resources and calendar

A resource represents a professional, station, room group or another shared capacity pool. A business can have up to 100 resources, each capacity 1–100. One booking consumes one place for one pet. Multiple services may reference the same resource and compete for its capacity. Resource kind is immutable; name, capacity, calendar and active/inactive status are versioned. Inactivation stops new bookings and leaves accepted ones intact. Calendar/capacity edits cannot invalidate occupied reservations; domain checks and PostgreSQL guards enforce this.

`windows` contains 1–21 nonoverlapping weekly windows: ISO day Monday=1 through Sunday=7, startMinute inclusive, endMinute exclusive, quarter-hour multiples, 0 ≤ start < end ≤ 1440. Appointments including buffers must fit entirely inside one window on one local day. Lodging requires full-day [0,1440) windows for each occupied night; the checkout date does not require another overnight window. Colombia's America/Bogota UTC−05:00 is fixed in this version; extending geography requires timezone/DST rules, not changing an environment variable.

Each resource supports at most 100 future active blocks. Blocks use future UTC intervals within 210 days, consume all resource capacity and cannot overlap an occupied reservation or another active block. Release is one-way and preserves the row; block/release advances resource version and audit. No physical deletion of service, resource, block or audit history is allowed.

Public availability accepts inclusive local `from/to` dates, at most 31 dates and a 180-day horizon. Lodging specifies nights; appointment starts use quarter hours. Response includes serviceVersion/resourceVersion, timeZone, up to 1000 available slots, remaining concurrent capacity and accepted totalMinor. `truncated=true` means narrow the query. Buffers and current pending requests count; expired requests stop counting immediately. Half-open intervals allow adjacent bookings; capacity is concurrent peak, not the sum of all rows overlapping the query. Availability never reserves a place. Bookings repeats all checks under transactional locks. Every response is no-store; no Redis cache decides allocation.

## HTTP routes

All routes below have `/api` prefix, English operation descriptions, UUID/query/body Zod validation and response validation.

| Route                                                          | Purpose                                                                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET /services                                                  | Public bounded search; organization/search/category/kind filters, page/limit, nextPage. Ineligible businesses are filtered so pages may be short; no misleading eligible total |
| GET /services/{serviceId}                                      | Public policy without creator/reviewer metadata                                                                                                                                |
| GET /services/{serviceId}/resources                            | Public selectable active resource names, calendars, capacity and versions                                                                                                      |
| GET /services/{serviceId}/availability                         | resourceId/from/to/nights; advisory current slots                                                                                                                              |
| POST /services/admin                                           | Create draft                                                                                                                                                                   |
| GET /services/admin                                            | Private scoped search, required organizationId, optional status                                                                                                                |
| GET/PATCH /services/admin/{serviceId}                          | Read managed record / replace profile with organizationId and expectedVersion                                                                                                  |
| POST /services/admin/{serviceId}/submit                        | Request moderation                                                                                                                                                             |
| GET /services/admin/moderation                                 | Global bounded pending review queue                                                                                                                                            |
| GET /services/admin/moderation/{serviceId}                     | Global pending preview, without operational booking access                                                                                                                     |
| POST /services/admin/{serviceId}/review                        | Global independent approval/rejection                                                                                                                                          |
| POST /services/admin/{serviceId}/pause                         | Withdraw current visibility                                                                                                                                                    |
| DELETE /services/admin/{serviceId}                             | Terminal archive, not row deletion                                                                                                                                             |
| GET /services/admin/{serviceId}/audit                          | Bounded immutable revisions                                                                                                                                                    |
| POST/GET /services/admin/resources                             | Create / list scoped resources                                                                                                                                                 |
| PATCH /services/admin/resources/{resourceId}                   | Replace resource profile safely                                                                                                                                                |
| GET /services/admin/resources/{resourceId}/blocks              | Active future blocks in UTC from/to interval within 210 days                                                                                                                   |
| POST /services/admin/resources/{resourceId}/blocks             | Add full-capacity block using expected resource version                                                                                                                        |
| DELETE /services/admin/resources/{resourceId}/blocks/{blockId} | Release using expected resource version                                                                                                                                        |

## Persistence

Migration `202610090011_services_bookings` adds `services`, `service_resources`, `service_blocks` and `service_audit`, plus Bookings and notification scheduling changes.

`services`: id/organizationId reference identity and owner; name/category/kind/status index search; version detects stale commands; snapshot stores the full validated service, policy, assigned resources and review metadata; createdAt is immutable, updatedAt changes on every revision. `service_resources`: identity/owner/kind/capacity/status/version index allocation and administration; snapshot stores name/calendar and matching aggregate fields; timestamps follow the same revision rules. Projections and snapshot must match in PostgreSQL.

`service_blocks`: id/resourceId/organizationId, startsAt/endsAt, reason, createdBy, createdAt and nullable releasedAt. All original fields are immutable; only the first release changes releasedAt. Composite resource/business foreign key prevents ownership mismatch. `service_audit`: id, owner, nullable serviceId/resourceId, actorId, action, version, exact aggregate snapshot, reason, requestId and createdAt. Inserted transactionally; never updated/deleted. Deferred evidence constraints reject an aggregate revision without matching audit. Foreign keys retain referenced identities and histories.

JSON snapshots hold a validated aggregate, while frequently filtered fields and booking allocation intervals have typed indexed projections. Separate persistence mappers are responsible for JSON/date conversion; no JSON request object is written directly. SQL guards protect projection identity/version, lifecycle, occupied calendar/capacity and evidence. Reads/mutations of other features use public ports in application code.

## Manual checks

1. Create/approve a Colombian business and assign a company admin. Create an appointment resource with weekday windows and capacity 2.
2. Create a draft profile, submit, independently approve. Verify public detail hides review metadata and unauthorized administration returns 403.
3. Query future local dates. Check UTC slot conversion, notice, duration, buffers and total. Unknown fields, bad UUIDs and invalid calendars return 400.
4. Reserve through Bookings, observe remaining capacity, reject a third simultaneous reservation, reject a block/calendar reduction conflicting with an accepted reservation.
5. Edit service price/terms: public listing withdraws, accepted reservations preserve original terms. Submit/review again to offer the changed policy.
6. Block a free interval, obtain new resource version, verify affected availability disappears. Release using the new version; stale version returns 409.
7. Repeat with lodging full-day windows, checkin/checkout and min/max nights. Checkout-day availability is distinct from another booked night.

Multi-resource packages, recurring appointments, branch locations, maps/travel time, service photos, custom holiday opening exceptions and online booking payments are not implemented. Redis availability caching will be introduced only with measured need and invalidation; PostgreSQL remains authoritative.

Delivery verification (2026-10-09): API/worker lint, typecheck/build, Prisma schema, hexagonal boundaries, formatting, 58 unit tests and 58 isolated integration scenarios passed (59 results with the suite). OpenAPI validates 168 operations, including 21 Services and 15 Bookings. Final Docker image built; migration 011 applied only to pettly_db on shared-network, with six new tables and fourteen guards/triggers verified. API/worker healthy; Swagger/public services return 200 and anonymous private operations 401. No real service/resource/booking fixtures were created in shared development infrastructure. All mutation/concurrency/mail fixtures ran in temporary PostgreSQL/Redis/Mailpit and were removed.

## Veterinary clinical eligibility

Veterinary appointments require veterinaryCredentialId and exactly the credential’s active dedicated capacity-one resource. Configure/submit/review, public search/detail/availability and booking offer recheck VeterinaryEligibility; appointments must end before the reviewer’s deadline. Service pause/archive remains available after revocation. ServicesReadModule exposes a minimal resource directory independently, avoiding a cycle with Veterinary. Private evidence/registration/reference is never included in public services. See [Veterinary](veterinary.md).
