# Backoffice Bookings

Implemented: 2026-10-10. Local interface: http://localhost:4300/reservas. Swagger: http://localhost:3100/api/docs. Read [Bookings](bookings.md), [Services](services.md) and [DESIGN](../DESIGN.md).

## Purpose, access and boundaries

The Angular Bookings feature lets the service provider find reservations, read the accepted contract, decide requests, record attendance and inspect immutable history. Superadministrators and active business members with scoped `bookings.manage` have access. A global moderator alone has no private reservation access. Guards control lazy routes and navigation; the API checks current permissions on every read and write, including suspension.

The selected business is explicit. No cross-company private directory is fetched. Superadministrators search active businesses in bounded pages; operators choose their eligible memberships. Changing the business cancels old reads. Detail and audit responses must match both the selected organization and booking UUID. The interface never loads customer medical records, private account profiles or veterinary evidence. It displays only the pet identity/contact and policies already accepted for this service.

Booking history is evidence. Later edits to a service, resource or pet do not replace accepted names, price, terms or requirements. A history revision displays its own validated acceptance, without rendering arbitrary snapshot JSON, allocation fingerprints or idempotency keys.

## Routes and filters

- `/reservas?organizationId=<uuid>`: business-scoped list.
- `/reservas/<organizationId>/<bookingId>`: current state, accepted conditions, decisions and history.

Search, status, optional service UUID, page and limit persist in the list URL. Names use case-insensitive literal search in accepted service/pet/contact names (2–100 characters); `%`, `_` and backslashes are escaped as PostgreSQL pattern literals. `organizationId` is required by `GET /api/bookings/admin`; search composes with its existing scope/status/service filters through the application query and repository port. Page is 1–10000 and API limit 1–50; UI sizes are 10, 20 and 50. Count and page use the same filter, ordered by creation time and UUID. Searching never joins live customer/pet profiles. No migration or Redis cache is added; PostgreSQL's existing organization indexes bound the scan. Large historical datasets may require measured JSON search/index optimization.

A known reservation UUID can be opened directly within the selected business. The optional service filter deliberately accepts a UUID: `bookings.manage` does not require `services.manage`, so the interface does not fetch a private service directory under an unrelated permission.

All displayed dates use America/Bogota regardless of the browser timezone. Appointment intervals, lodging check-in/out and actual nights come from the accepted contract. Totals are integer minor COP units, formatted with two decimals. Collection remains **pay at the establishment**. Confirming or completing a reservation does not record payment, commission or a refund.

## Decisions and concurrency

| Current state                                | Available provider actions |
| -------------------------------------------- | -------------------------- |
| Requested, before its deadline/start         | Confirm, reject, cancel    |
| Confirmed, before start                      | Cancel                     |
| Confirmed, during service interval           | Start attendance           |
| Confirmed, after 15-minute grace             | Mark no-show               |
| In progress                                  | Complete attendance        |
| Completed/cancelled/rejected/expired/no-show | Read history               |

Every action requires an explicit selection, reason (10–500 characters), confirmation and `expectedVersion`. Forms reset after a new revision or changed availability. Browser time updates action eligibility every 15 seconds without polling or writing; it is advisory and the API's clock/lifecycle/veterinary validation remain authoritative. A requested deadline that has passed offers refresh to read the recorded expiry. Expiry is performed by existing transactional backend handlers/scheduler, never by editing timestamps from the UI.

Mutations exclude duplicate in-flight submissions. There is no automatic mutation retry. HTTP 409 freezes further decisions until an explicit refresh; network/server/invalid-response uncertainty also freezes them and asks the operator to inspect state/history. A committed action whose response was lost is discovered by refresh. HTTP 401/403/404 removes the accepted detail and history. Responses arriving after another route/scope was selected cannot replace that route's booking. Refresh remains disabled while a decision is in flight.

History uses the existing `listManagedBookingAudit` operation, 20 revisions per page. Each revision shows action, state/version, actor UUID or System, timestamp, reason and request reference. Technical expiry references need not be UUIDs. Accepted details expand by revision. This delivery does not add deletion, arbitrary state assignment or provider-initiated rescheduling; the customer rescheduling API remains separately documented.

## Architecture and contracts

`features/bookings` contains models, mappers, services, state, presentational components, pages and lazy routes. Request/response/query types are generated from English OpenAPI. Named Zod Mini schemas validate incoming contracts, inputs, business scope, intervals/buffers, exact price/nights, accepted pet/resource identities and bounded unique lists. Unknown snapshot fields are stripped by the projection.

`BOOKINGS_GATEWAY` is the port; `HttpBookingsGateway` adapts the shared typed API client. Page-scoped `BookingsListStore` and `BookingDetailStore` use NgRx SignalStore, Entities, cancellable reads and exclusive mutations. Features import only public core APIs and shared utilities, never another feature's internals or API domain/Prisma. Colombia date/COP formatting is shared with Services. Components are standalone, explicitly OnPush and zoneless; Tailwind uses semantic tokens. Controls have explicit labels/help/errors, keyboard confirmations, focus handling and live status/problem feedback.

## Manual checks

1. Sign in with an active authorized business team or superadmin; select a company and filter by accepted name/status/service. Reload and paginate: filters persist.
2. Create a customer reservation through Swagger using a personal pet and published availability. In manual mode, inspect its deadline and original accepted conditions in the backoffice.
3. Edit the current service's price/terms; the earlier reservation and its history keep the original contract.
4. Confirm/reject/cancel with reason and confirmation. Attempt decisions from two sessions; the stale version must fail and require refresh.
5. During the real service interval, start attendance, then complete it. After 15 minutes, an unattended confirmed reservation can be marked no-show. Closed reservations expose history.
6. Book lodging and verify nights, Colombia times and COP total; no payment status is fabricated.
7. Simulate a lost response after a committed decision; refresh must reveal the result without another decision or duplicate audit.
8. Try a moderator-only account, another company UUID or a suspended company. Private reads/actions must be denied.

## Verification

Automated verification uses temporary PostgreSQL/Redis/Mailpit, real API requests and the production Angular artifact. Tests cover pagination/search (case-insensitive and literal wildcards), original acceptance after service edits, provider decisions, stale versions, transport loss after commit, history, lodging, expiry, scoped denial and suspension. Attendance/no-show/expiry fixtures use the existing trusted application-clock helper against loopback `pettly_test`; it is absent from production builds/HTTP routes and refuses shared development infrastructure. Start/no-show window controls are also unit-tested at their time boundaries. No development timestamps, customers, reservations or Redis keys are changed by these tests.

Verification results: 85 Angular unit tests, 68 API unit tests and all ten real browser scenarios passed. All 67 application components explicitly declare OnPush. Strict types, lint, feature/hexagonal architecture, production builds and generated contract drift checks (194 operations) passed. Axe found no WCAG A/AA violations in the tested booking views; mobile detail at 390px has no horizontal overflow, and desktop/mobile screenshots were inspected. Login Lighthouse scored 97 performance / 100 accessibility / 100 best practices. The login helper captures its response before route navigation; regression synchronization does not bypass authentication. These checks validate the delivered flows, not production capacity or untested assistive technologies.

Local execution: API/admin Docker images rebuilt. `/reservas`, proxied `/api/health/ready` and Swagger respond 200. Live `/api/openapi.json` exposes 194 operations and the bounded managed-search parameter; anonymous private booking access returns 401. No migration, seeded development reservations or additional manual configuration is required. Shared-network verification is read-only.

## CI response-capture regression (2026-10-11)

The booking decision browser helper now buffers the actual server response through Playwright routing before forwarding it unchanged to Chrome. The request retains its original authentication, body and optimistic version. No response is fabricated, and transport retries are disabled. This avoids Chromium discarding a response body during UI/history refresh and keeps the real 200/409/403 assertions and persisted audit checks. The complete 19-scenario browser suite passed on disposable infrastructure; Angular typecheck and lint passed. The application and API contracts are unchanged.
