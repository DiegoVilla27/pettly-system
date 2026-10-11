# Backoffice Notifications

Implemented: 2026-10-10. Local interface: http://localhost:4300/notificaciones. Swagger: http://localhost:3100/api/docs. Read [Notifications](notifications.md) and [DESIGN](../DESIGN.md).

## Purpose and permissions

This feature exposes a personal business inbox, optional email preferences and safe superadministrator delivery recovery. The authenticated account owns its inbox/preferences; a superadministrator cannot select another recipient. All accounts admitted to the existing team backoffice may use their personal screens. Customer-only accounts without workspace access continue to use the API until customer web/mobile screens are built. Only a global superadministrator can lazy-load delivery recovery. API authorization is authoritative on every operation.

Historical notices are informational: they do not grant current access or change an order, adoption or reservation. No fabricated customer destinations or links bypass original-feature permissions. Account medical data, booking details, recipient addresses, action tokens, ciphertext, event keys and provider exceptions are not rendered. Angular interpolation displays the supplied title/body as plain text.

## Routes and contracts

- `/notificaciones`: own paginated inbox and current unread count.
- `/notificaciones/preferencias`: own versioned optional email settings.
- `/notificaciones/entregas`: safe failed-delivery metadata and audited retry, superadmin only.

Category, unread-only, page and limit persist in the inbox URL. Categories are Orders, Adoptions, Organizations and Bookings. Page is 1–10000; API limits are 1–50 and inbox UI offers 10/20/50. Invalid URLs show an error instead of issuing unbounded queries. Count covers all own categories, independent of page/filter; list and count are separate reads and may observe a newly arrived event at different instants. There is explicit refresh, no polling or extra Redis cache. Data is page-scoped and removed on navigation/session loss, with no browser persistence.

Reading one notice uses the existing strict empty-body command; replay preserves its first read timestamp. Bulk reading requires confirmation and uses the newest creation time in the displayed page as the server-issued UTC cutoff. It explicitly includes **all categories and pages** at/before that cutoff. Later events remain unread; browser clock skew cannot produce a future cutoff. Empty result pages offer no bulk cutoff. Reading does not cancel mail or remove history. Mutations exclude concurrent duplicates, refresh the list/count after success and do not automatically retry after an uncertain result.

Preferences expose Orders, Adoptions and Bookings/reminder email booleans. In-app, Organizations/access and Auth/security mail remain mandatory. The first preference record can have virtual version zero. Every save sends all three booleans and the server version. Opt-out cancels pending matching mail; enabling affects future events and does not replay canceled history. An already sending message can arrive. Conflicts or uncertain network/server responses disable saving until explicit refresh, which replaces the form with persisted values.

Delivery listing uses the existing bounded page/limit operation. Cards show safe failure category, attempts, failure/deadline dates, subject reference/version and retry parent when present. Nullable legacy metadata remains readable. Visible retry candidates require inbox identity, terminal `delivery_failed`, a failure time, no recorded delivery and a future deadline. A 15-second advisory UI clock hides expired eligibility without polling. The backend additionally checks current verified recipient/preferences, original deadline and stable retry-parent uniqueness.

Recovery requires reason (10–500 characters, no controls) and explicit confirmation. The response is a new attempt reference, **not a delivery-success claim**. Repeating a request for the same parent returns the existing child. Auth/legacy, expired, superseded and preference-canceled mail cannot be reissued here. HTTP 409 or uncertain outcomes require refresh before another action. No forced SMTP outage or development outbox mutation is part of manual verification.

## Angular architecture

The lazy `features/notifications` module owns models, mappers, gateway services, page-scoped SignalStores, presentational components and pages. `NOTIFICATIONS_GATEWAY` is the port; its HTTP adapter consumes the shared typed API client and generated OpenAPI request/response/query contracts. Named Zod Mini schemas check UUIDs, timestamps, bounded unique pages, filters, mandatory flags, preference versions/values and retry-parent identity; projections omit undeclared fields. Requests use strict generated shapes. Features do not import backend/Prisma or another feature's internals.

`InboxStore`, `PreferencesStore` and `DeliveriesStore` cancel obsolete reads and exclude duplicate mutations. All seven new components are standalone, explicitly OnPush and zoneless. Tailwind follows existing semantic colors and responsive cards; controls have labels, validation/focus feedback, keyboard confirmation and live status/problem announcements. Colombia date formatting reuses the shared formatter.

Notifications API DTO metadata now includes the existing database bounds for nullable delivery subjectType (30), mailPurpose (40) and failureKind (30). This corrects their Swagger reflection as nullable strings instead of arrays. No migration, new endpoint or generated-file hand edit is needed; OpenAPI still contains 194 operations.

## Manual checks

1. Sign in with an admitted team account. Open the inbox, filter/category/page, reload and verify the selected filters persist.
2. Trigger an existing business event through its original module. Refresh the recipient's own inbox/count; another account cannot read that notice.
3. Mark one notice read twice and verify the first timestamp remains. Confirm the bulk cutoff, create a later event and verify it remains unread.
4. Save email preferences; in another session change them, then submit the stale version. Refresh is required before saving again.
5. Disable booking mail; the inbox remains available and pending optional mail follows existing backend cancellation. Mandatory channels stay enabled.
6. As superadmin inspect existing failed deliveries; only an eligible business event can be selected for a reasoned retry. The receipt is a queued-attempt reference. Inspect Mailpit or actual delivery telemetry separately.
7. Simulate loss of a mutation response; inspect persisted state after refresh. No automatic replay or false delivery-success message appears.
8. Try delivery recovery with a company member/moderator or an anonymous request; it must be denied.

## Verification

Tests use the production Angular build against isolated PostgreSQL/Redis/Mailpit and actual API endpoints. Normal organization lifecycle operations generate inbox events; a guarded metadata fixture creates eligible/legacy/superseded failed deliveries only in temporary loopback `pettly_test` with the suite-specific Redis prefix. The fixture is absent from application builds/routes. Real retry creates immutable audit and reaches the worker/Mailpit; no shared customers, outbox, timestamps or Redis keys are altered.

Delivery results: 96 Angular unit tests, 68 API unit tests and all eleven real browser scenarios passed. Verified category/unread pagination and reload, one-way read replay, bulk cutoff preserving later events, mandatory channels, stale preference versions, lost response after committed preference change, nullable legacy failure metadata, reasoned recovery, stable retry child/audit and actual worker/Mailpit delivery, recipient isolation and member denial. All 74 components explicitly use OnPush. Types/lint/architecture/build and generated OpenAPI drift checks (194 operations) passed. Axe found no violations in tested views; preferences and recovery fit 390px without horizontal overflow, and desktop/mobile screenshots were inspected. Login Lighthouse scores are 98 performance / 100 accessibility / 100 best practices.

API/admin Docker images were rebuilt and both containers are healthy. All three SPA routes, proxied readiness and Swagger return 200; anonymous inbox/recovery return 401. Live OpenAPI reflects bounded nullable delivery strings correctly. Shared-network checks were read-only, with no migration, new environment variable or development fixtures.
