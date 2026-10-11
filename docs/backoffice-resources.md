# Backoffice Resources, Schedules and Availability

## Purpose and ownership

The Angular Services feature owns operational resources: stations, professionals or shared room pools, weekly calendars, temporary full-capacity blocks, immutable resource history and advisory availability. These screens use the existing Services domain and scheduling rules. Booking administration is implemented as a separate feature; see [Backoffice Bookings](backoffice-bookings.md).

Superadministrators and active business teams with scoped `services.manage` can operate their company resources. Global publication reviewers have no private operational resource access. API authorization remains authoritative; company/resource identifiers are validated at the adapter boundary and responses must match the requested scope.

## Routes and user flow

- `/servicios/recursos?organizationId=<uuid>`: company selector and bounded resource directory (up to 100 records per company).
- `/servicios/<organizationId>/recursos/nuevo`: create an appointment or lodging resource.
- `/servicios/<organizationId>/recursos/<resourceId>`: edit profile/calendar, query/create/release blocks and read history.
- `/servicios/<organizationId>/<serviceId>`: published offers expose availability for assigned active resources. Moderation previews do not fetch operational data.

Local Docker backoffice: `http://localhost:4300/servicios/recursos`. API Swagger: `http://localhost:3100/api/docs`. Authentication is required for management.

Resource kind is immutable. Capacity is an integer from 1 to 100. Up to 21 weekly windows use ISO weekdays 1–7. Appointment windows use quarter-hour boundaries with start before end; 24:00 is accepted only as closing. Adjacent windows are permitted, overlaps are rejected. Lodging windows are full days, 00:00–24:00, one per selected weekday. Inactivation prevents new reservations while preserving accepted bookings. No physical resource deletion is exposed.

All datetime-local input is interpreted explicitly as America/Bogota (UTC−05:00), independently of the browser timezone. Invalid calendar dates are rejected rather than silently rolled forward. API block timestamps remain UTC ISO strings. Displayed audit, block and availability times explicitly use Colombia.

## Blocks and history

Query future intervals up to 210 days; at most 100 future active blocks are permitted per resource. A block consumes all capacity and must not overlap occupied bookings or another active block. Creating and releasing require an explicit reason, confirmation and the current resource version. Release is permanent, preserves the database row and advances resource version. Released blocks leave the active list but retain their audit entry.

`GET /api/services/admin/resources/{resourceId}/audit` (`listServiceResourceAudit`) exposes existing immutable resource audits with bounded page/limit (UI limit 20), under scoped `services.manage`. It reuses the hexagonal repository port and Services audit response DTO; no schema migration or new storage is needed. Creation, profile/calendar updates, blocks and releases record actor UUID, request UUID, reason, timestamp, resource snapshot and version. The interface renders these fields without loading private account details or arbitrary snapshot JSON.

## Availability

Public published service availability is advisory. Select an assigned active resource and inclusive Colombia dates (maximum 31 dates within a 180-day horizon). Lodging nights must match service policy. The response provides current service/resource versions, remaining capacity, accepted total in minor COP units, timezone and up to 1,000 slots. `truncated` asks the operator to narrow the interval; only 50 slots are rendered per page.

The adapter rejects stale versions, mismatched resource scope, duplicate starts, impossible remaining capacity and inconsistent prices. Query changes cancel previous reads and clear prior results. Service/resource refresh also invalidates old results. No booking or hold is created by this screen. The Bookings API revalidates capacity, blocks, policies and professional eligibility under PostgreSQL locks; Redis is not the allocation authority.

## Angular architecture and concurrency

Existing resources show a compact weekly agenda; the profile/calendar form is expanded only for editing. New resources display the creation form directly.

Standalone components are explicitly OnPush and run zoneless. Tailwind semantic tokens, responsive cards, labeled controls, live error/status regions and keyboard-operable confirmations follow the established backoffice design.

Generated OpenAPI request/response/query types remain transport contracts. Named Zod Mini schemas and mappers validate boundaries and calendar rules. `RESOURCE_GATEWAY` is an injectable port implemented by `HttpResourceGateway`; `ResourceDirectoryStore` and `ResourceDetailStore` are page-scoped SignalStores. Read queries switch/cancel on scope changes. Mutations use exhaust semantics to exclude duplicate submissions and ignore late results from another route.

Every edit uses `expectedVersion`. HTTP 409 freezes writes until explicit refresh. Network/server/response uncertainty also freezes replay: inspect the directory/resource/history before trying again. There is no invented idempotency or automatic retry for resource creation. After a block mutation, the current resource version is read before another write is permitted; a failed follow-up read is treated as uncertain.

## Manual checks

1. Sign in as superadmin or an eligible business member; select a company and create an appointment resource with capacity and weekly windows.
2. Try overlapping windows or non-quarter-hour times; saving must fail locally. Verify adjacent windows and a 24:00 closing are accepted.
3. Create lodging; time inputs disappear and selected weekdays serialize as full days.
4. Edit a resource from two sessions; the stale write must fail and require refresh.
5. Open a published service, select the assigned resource and dates; verify Colombia times and COP totals.
6. Block a free interval, confirm it disappears from availability, release it and inspect both immutable audit entries.
7. Attempt to block an occupied interval or reduce capacity below existing occupancy; the API rejects the change and retains bookings.
8. Try a publication-review-only account or another company resource URL; private operational data must remain inaccessible.

## Verification

The delivery passed 74 Angular unit tests, 68 API unit tests and all nine isolated browser scenarios. The real flow verifies overlapping-window rejection, seven-day appointment calendars, canonical lodging days, stale resource edits requiring refresh, Colombia input conversion in a browser configured for Europe/Madrid, advisory availability, blocking/removal and release/reappearance of slots, immutable audit, existing-booking protection for calendar/capacity and scoped access. Axe found no violations in tested resource and availability views; resource detail at 390px has no horizontal overflow. Compact weekly agenda and expanded editing were verified visually.

All 63 application components explicitly declare OnPush. Typecheck, lint, hexagonal/feature architecture checks, production build, formatting and the 194-operation generated OpenAPI drift check passed. Existing login Lighthouse remains 98 performance / 100 accessibility / 100 best practices in the complete regression suite. Test fixtures, rate resets and reservations use only temporary PostgreSQL/Redis/Mailpit infrastructure. Shared development services are never seeded or reset by this suite.

API and admin Docker images were rebuilt and both containers are healthy. `/servicios/recursos`, proxied readiness and Swagger return 200. Live `/api/openapi.json` exposes 194 operations including `listServiceResourceAudit`; anonymous resource audit access returns 401. Shared-network verification was read-only, with no new migration or manual configuration.
