# Bookings

Status: implemented for appointments and lodging in Colombia. Updated: 2026-10-09. Swagger: http://localhost:3100/api/docs. Read [Services](services.md), [Notifications](notifications.md) and [DESIGN](../DESIGN.md).

## Purpose and architecture

Bookings owns reservation allocation, customer acceptance, provider decisions, lifecycle, deadlines and immutable revision history. Hexagonal feature: pure Booking aggregate; command/query handlers and repository/use-case/occupancy ports; inbound HTTP/scheduler adapters with separate strict request/response Zod DTOs and mappers; outbound Prisma persistence mapper/repository. ServicesBooking supplies eligible current offers and blocks, AnimalsBooking supplies only an owned personal pet's id/name/species, Authorization supplies current permissions, UsersDirectory supplies the recipient and BookingNotifications schedules transactional mail. Application code does not query another feature's tables. BookingsReadModule supplies occupancy independently so Services can validate resources without a circular dependency.

No online booking payment is implemented. Accepted price is tax-inclusive COP, appointment price or nightly price multiplied by actual nights. Collection mode is explicitly pay_at_business and appears in terms, Swagger and mail. Completed/confirmed does not mean charged or paid. Product Orders/Payments split and its configurable commission are independent; no payment/order or commission ledger is fabricated for a reservation. Connecting service prepayment requires provider confirmation, booking/payment lifecycle, fees/refunds and accepted financial terms.

## Allocation and accepted contract

One active personal pet owned by the verified active buyer per reservation; company/refuge animals are not client bookings. Pet species must be accepted by the service. Only pet id/name/species is shared with the chosen business, never medical records, microchip or arbitrary private animal fields. Customer explicitly accepts the displayed total, requirements, terms, cancellation policy and sharing necessary pet/contact data.

Create body: serviceId, animalId, resourceId, buyer-scoped UUID idempotencyKey, expectedServiceVersion, expectedResourceVersion, expectedTotalMinor, contact `{name,phone}` (2–100 characters and E.164), consent=true, and strict slot union. Appointment slot `{kind:"appointment",startsAt:"...Z"}` uses exact quarter hours. Lodging slot `{kind:"lodging",startDate:"YYYY-MM-DD",endDate:"YYYY-MM-DD"}` uses local Colombia checkin/checkout and actual nights. All ids are UUIDs; unknown/injected state/owner fields are rejected. Service start must satisfy notice and the 180-day horizon; appointment buffers consume capacity.

The accepted snapshot records service policy/version, provider/resource name/version, pet id/name/species, contact/consent/acceptedAt, local timezone, slot, nights and total. Subsequent service edits do not mutate this contract. Idempotent identical retries return the same booking; altered input with the same key returns 409, including after cancellation. Responses omit idempotencyKey/fingerprint.

Creation locks the actor, buyer key, organization and resource, then validates owned pet, current offer, full calendar interval, total, blocks, concurrent peak capacity and any conflicting reservation for the same pet. All allocation, audit and encrypted notification-outbox writes commit together. Database row locks and guards protect capacity/pet conflicts even if a caller bypasses application advisory locks. Half-open occupied intervals allow adjacency; pending unexpired, confirmed, in_progress and completed windows count. Completed early still occupies setup/cleanup through its original end. A block consumes all places. Advisory availability can become stale; booking is authoritative.

## Lifecycle and deadlines

| State / transition | Rule                                                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| requested          | Manual provider mode; capacity held until earlier of requestTtlMinutes (15–1440) or accepted start                           |
| confirmed          | Automatic allocation, or provider confirms an unexpired request                                                              |
| rejected           | Provider rejects requested state; releases allocation                                                                        |
| cancelled          | Buyer cancels requested/confirmed inside accepted cutoff, or provider cancels requested/confirmed before start with a reason |
| expired            | Requested deadline elapsed; releases capacity immediately for conflict/availability even before status recovery              |
| in_progress        | Provider starts confirmed booking while now is within accepted start/end                                                     |
| completed          | Provider completes in_progress; accepted occupied window remains until its original end                                      |
| no_show            | Provider marks confirmed booking after a fifteen-minute grace from accepted start; releases capacity                         |

Every mutation requires expectedVersion and a 10–500 character reason; closed states are terminal. Buyer cutoff compares now strictly before `startsAt - accepted cancellationCutoffMinutes`. Provider cannot cancel after start; attendance/no-show are separate audited actions. A late command for an expired requested booking persists/returns expired instead of confirming it. No automatic completion/no-show is inferred.

Customer rescheduling keeps booking UUID, buyer, service and pet. Resource may change within service; both resource locks are acquired in stable order. It requires the existing accepted cutoff, current booking/service/resource versions, new expected total and renewed consent/contact. Only after the new interval can be allocated does the old interval release; failure rolls everything back. New terms/price are saved as a new acceptance revision. Manual mode returns to requested and needs another provider decision; automatic mode confirms. Old snapshots remain in audit.

Expiry scheduler runs at API startup and every fifteen seconds, reads at most 100 due rows and rechecks each under locks. Restarts/multiple API instances cannot lose deadline state or duplicate a revision. Private detail reads also recover an elapsed requested state. List/history may show requested until scheduler recovery; conflict/availability never count an elapsed deadline. A scheduled-expiry failure is logged without credentials and retried from persisted deadlines.

## Permissions and privacy

`bookings.self.manage`: current active verified customer, strictly its buyer UUID; superadmin does not bypass personal ownership through customer endpoints. Own history/cancellation remain accessible when provider is suspended, using accepted policy. `bookings.manage`: current company admin/staff or superadmin in the explicit active owning business. A global moderator is not granted private reservation access through the service-review permission. Public service catalog never includes reservation contact, buyer/pet UUIDs or audit.

Acceptance and immutable audits contain personal contact/pet identity required to deliver and evidence the accepted service. Account anonymization preserves business evidence; it does not imply erasing these snapshots. A legally reviewed retention/anonymization process for this historical business data remains an explicit future task; no indefinite-retention or compliance guarantee is made.

## HTTP routes

All routes have `/api` prefix. Authenticated Bearer access token, English Swagger, strict request validation and validated response DTOs. Common failures: 400 malformed contract, 401 unauthenticated, 403 ownership/scope failure, 404 unavailable service/unknown record, 409 stale version, changed total, calendar/capacity/pet conflict or invalid lifecycle.

| Route                                     | Purpose                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| POST /bookings                            | Idempotent customer allocation                                 |
| GET /bookings                             | Own bounded search by status/service, page 1–10000, limit 1–50 |
| GET /bookings/{bookingId}                 | Own accepted policy and current state                          |
| GET /bookings/{bookingId}/audit           | Own bounded immutable revisions                                |
| POST /bookings/{bookingId}/cancel         | Own cancellation under accepted cutoff                         |
| POST /bookings/{bookingId}/reschedule     | Renew policy and allocation atomically                         |
| GET /bookings/admin                       | Business-scoped search; organizationId required                |
| GET /bookings/admin/{bookingId}           | Private accepted information for service delivery              |
| GET /bookings/admin/{bookingId}/audit     | Scoped revision history                                        |
| POST /bookings/admin/{bookingId}/confirm  | Decide unexpired pending request                               |
| POST /bookings/admin/{bookingId}/reject   | Reject pending request                                         |
| POST /bookings/admin/{bookingId}/cancel   | Provider cancellation of future booking                        |
| POST /bookings/admin/{bookingId}/start    | Record attendance during interval                              |
| POST /bookings/admin/{bookingId}/complete | Finish attended service                                        |
| POST /bookings/admin/{bookingId}/no_show  | Record missed service after grace                              |

## PostgreSQL storage

Migration `202610090011_services_bookings`, dedicated Pettly database only. `bookings`: UUID id; organizationId/serviceId/resourceId with composite business foreign keys; animalId/buyerId reference retained identities; buyerId/idempotencyKey unique; fingerprint hashes normalized command; status/version; startsAt/endsAt service interval; occupiedStartsAt/occupiedEndsAt include buffers; expiresAt only while requested; snapshot stores complete accepted BookingState; createdAt immutable and updatedAt per revision. Resource/status/interval, pet/status/interval, deadline, buyer and organization indexes support allocation and history.

`booking_audit`: UUID id, bookingId, nullable actorId for automatic expiry, action/version, full revision snapshot, reason, requestId and createdAt; unique bookingId/version. Audit cannot update/delete and deferred evidence requires exact matching snapshot for every revision. Booking rows cannot be deleted. Indexed projections must equal JSON snapshot; identities/fingerprint/creation time are immutable and versions advance exactly one. Actual resource/pet row locks, calendar and capacity guards protect raw concurrent writes. Block/calendar/resource edits share the same allocation guarantees. JSON/date conversion happens in explicit persistence mappers.

## Transactional mail

Creation, provider decisions, cancellation, rescheduling, attendance/completion/no-show and expiry emit a minimal customer notice. Confirmed bookings also schedule reminders 24h/1h before start if those instants are still future. No reminder is sent retroactively. Notifications owns outbox scheduling/encryption; the worker reads only Notifications-owned outbox/preferences, not Bookings tables. Revision changes cancel unsent obsolete rows and remove their ciphertext, then enqueue current notices in the same business transaction. Queue rows use stable booking/revision/purpose deduplication and notBefore deadlines. Mail is Spanish, HTML-escaped, plain text/HTML, local Colombian times, accepted total and explicit pay-at-business wording; no nonexistent UI link is presented.

Mailpit is the current local inbox: http://localhost:8025. SMTP delivery remains at least once; an obsolete notice already being sent may arrive. There is no push/SMS or external sender configured; superadmin can recover eligible failed delivery through Notifications. SMS OTP remains paused. Real sender/DNS/provider setup remains required before deploying external email.

## Verification and manual checks

Unit rules cover civil dates/calendar windows, exact appointment starts, buffers/notice, nightly totals, half-open peak concurrency, publication/self-review, cancellation/attendance/grace, manual expiry, strict DTOs and escaped mail.

Isolated real PostgreSQL/Redis/Mailpit scenarios cover scope/ownership, capacity/idempotency races, projection/evidence guards, raw concurrent capacity protection, immutable history, rollback on audit failure, rescheduling, policy changes, block/capacity/calendar conflicts, manual provider decisions, scheduled mail, durable expiry and lodging. `scripts/testing/booking-system-port.ts` supplies a trusted clock for isolated expiry/attendance/no-show tests and refuses any database except temporary loopback pettly_test; never included in application builds or HTTP routes.

1. Publish a service with capacity 2; query availability and copy its versions/total/slot into POST /bookings for a personal pet.
2. Repeat exactly with the same idempotency UUID; one booking/audit. Change payload under that key: 409.
3. Book the same slot for a second pet; third conflicts. Same pet also conflicts in another overlapping resource.
4. Try wrong owner, company or unaccepted species. No health notes appear in booking response.
5. Reprogram inside cutoff, inspect accepted revisions and cancelled obsolete reminders. Change price/terms first: new booking requires renewed review, old booking still shows original policy.
6. In manual mode inspect requested/expiresAt, confirm or reject from the business; leave another request until deadline and observe expiry/released capacity.
7. Book lodging dates and verify nights × minor-unit price and UTC checkin/checkout. No online payment exists.
8. Check immediate mail and scheduled outbox; reminders become deliverable only at notBefore. Use real near-start reservations to test attendance/grace, rather than altering development DB timestamps.

Group/multi-pet bookings, provider-initiated rescheduling, deposits/online split payments/refunds, no-show fees, veterinarian verification, recurring appointments, holidays/opening exceptions and retention automation remain future scope.

Delivery verification (2026-10-09): API/worker lint, typecheck/build, Prisma schema, hexagonal boundaries, formatting, 58 unit tests and 58 isolated integration scenarios passed (59 results with the suite). OpenAPI validates 168 operations, including 21 Services and 15 Bookings. Final Docker image built; migration 011 applied only to pettly_db on shared-network, with six new tables and fourteen guards/triggers verified. API/worker healthy; Swagger/public services return 200 and anonymous private operations 401. No real service/resource/booking fixtures were created in shared development infrastructure. All mutation/concurrency/mail fixtures ran in temporary PostgreSQL/Redis/Mailpit and were removed.

## Notifications integration — 2026-10-09

Cada revisión también conserva una entrada en la bandeja persistente del cliente. Preferencia bookingsEmail controla actualización/recordatorios SMTP; la bandeja permanece. Cambio de revisión supersede entregas anteriores no enviadas, incluidos intentos fallidos. Worker revalida preferencia, preservando compatibilidad de payloads anteriores. Ver [Notifications](notifications.md).

## Veterinary appointments

Accepted snapshots retain optional category/veterinaryCredentialId; legacy snapshots remain compatible. Clinical selection must end before independently verified accreditation deadline; new bookings and provider confirm/start recheck current professional membership/account/credential. Revocation does not erase accepted appointments; cancellations/history/completion remain explicit. SQL guards also protect current clinical eligibility. See [Veterinary](veterinary.md).
