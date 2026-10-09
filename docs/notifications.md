# Notifications

Status: persistent business inbox, optional email preferences, SMTP delivery/reminders and superadmin delivery recovery implemented. Updated: 2026-10-09.

## Purpose, ownership and architecture

Notifications owns informational business events addressed to individual accounts, their read state, email preferences and delivery recovery. It does not grant permissions or represent the current state of an order, adoption, organization or reservation. Clients must query the original feature, which enforces current permissions. Global superadmin cannot inspect another person's inbox through these endpoints.

Hexagonal feature: pure Notification aggregate and email policy; commands/queries and NotificationsHandlers; public BusinessNotifications and BookingNotifications ports; NotificationsRepository unit of work; Prisma persistence mapper/adapter; HTTP controller, separate strict Zod request/response DTOs and safe HTTP mapper. Domain/application import neither NestJS nor Prisma. Nest composition injects the publisher into business modules. Notifications depends only on the public UsersDirectory for current active verified recipient/administrator checks; it does not depend on Organizations or Authorization, avoiding a dependency cycle. No direct reads of their private tables.

Business producers call the port inside their existing database transaction. Source mutation, audit, recipient inbox and encrypted delivery jobs commit together; persistence failure rolls everything back. SMTP calls take place outside transactions. A recipient-scoped advisory lock serializes event replay, preference changes and retry enqueueing. Duplicate event key per recipient is idempotent; a conflicting reused identity fails. Up to twenty distinct recipients per publish; inactive/unverified/missing recipients are skipped. No broadcast marketing or historical backfill.

`apps/worker` is separate from API. `packages/notifications-runtime` owns email contracts, AES-256-GCM encryption, escaped HTML/plain-text templates, SMTP transport and BullMQ/outbox processing. Worker reads Notifications-owned outbox/preferences, never business feature or Auth token tables. Redis holds prefixed delivery queues; PostgreSQL remains the source of truth. Inbox queries/counts use indexed SQL without an additional Redis cache.

## Implemented business events and audiences

| Source        | Events                                                                                                                           | Recipients                                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Orders        | Creation, cancellation, expiration, verified payment and fulfilment/delivery transitions recorded in order audit                 | Buyer and current organization responsible administrator, deduplicated                                                          |
| Adoptions     | Request submission, review decisions, withdrawal, closing and completed handover, including requests closed by another selection | Applicant and current shelter responsible administrator                                                                         |
| Organizations | Lifecycle application/review/approval/rejection/status/responsibility/archive changes; membership assignments/removals           | Applicant, responsible administrator (including previous responsible on transfer) and explicitly affected member, as applicable |
| Bookings      | Reservation revisions and future reminders for confirmed reservations                                                            | Booking customer                                                                                                                |

Organization profile-only edits and no-op membership commands do not create notices. Staff-wide broadcast is not implemented. Payments produces an order-paid notice only through the internal verified settlement port; financial reconciliation/distribution is not represented as a fake paid order. Real payment provider remains disabled pending activation.

Business text is Spanish, with state/reference and an instruction to consult the current account. It excludes private adoption answers/messages, cancellation reasons, addresses, animal health records, credentials and financial provider secrets. Booking delivery retains accepted service/business name, interval and total; these minimal details are stored internally for safe reconstruction but omitted from public inbox DTOs. There are no invented frontend routes. Historical messages may survive a later role/status change; they convey an event, never continuing resource access.

Auth retains its independent established action/security-mail producer. It encrypts recipient, purpose, token and expiry in notification_outbox. A SHA-256 account/recipient/purpose correlation key cancels superseded pending actions without exposing token tables to the worker; legacy keys remain compatible. Auth does not create a business inbox entry. Verification/reset/invitation/email-change and security messages cannot be disabled through business preferences or reissued by delivery retry.

## Database and lifecycle

Migration `202610090012_notifications` adds three UUID-based tables and extends the existing outbox. It applies only to Pettly's database.

| Table                    | Fields and updates                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| notification_inbox       | UUID id and recipient userId; unique recipient/eventKey; category/eventType; subjectType/UUID/version; historical status; title/body; internal details JSON; createdAt; nullable readAt. Created once in the source transaction. Only first readAt is mutable; no delete/unread/content mutation. Recipient and chronological/unread indexes support bounded queries. |
| notification_preferences | Recipient UUID primary key, ordersEmail/adoptionsEmail/bookingsEmail, optimistic version and updatedAt. No row initially: all enabled, virtual version 0. First save writes version 1; each later save increments exactly one. Owner immutable.                                                                                                                       |
| notification_retry_audit | UUID id, unique failedOutboxId and newOutboxId, actor UUID, reason and createdAt. Written with a fresh retry job; immutable and never physically deleted.                                                                                                                                                                                                             |
| notification_outbox      | Existing delivery UUID, ciphertext, scheduling/lease/attempt/timestamps/correlation/dedup/subject metadata; added nullable notificationId, retryOfId, mailPurpose and failureKind. Auth and legacy rows may have these fields null. Linked business rows preserve notification identity and purpose.                                                                  |

Failures: delivery_failed after exhausted attempts; expired; superseded booking revision; preferences_disabled. Existing canceled/Auth rows can have a null failureKind. Ciphertext is removed on success, expiration, cancellation and terminal failure. Inbox/audit contain no email address or token; pending ciphertext contains the recipient used for that event. Retry resolves the current verified email. Data-retention/anonymization beyond existing account identity deletion and production key rotation remain separate policies to implement; the inbox currently has no deletion or retention purge.

Database guards enforce immutable historical content and one-way reads, preference owner/version, failure categories, retry parent identity and unchanged deadline/purpose. A deferred constraint requires immutable administrator evidence before a retry commits. Foreign keys preserve account/notification/delivery references. Every identifier is a UUID, never an auto-incrementing public key.

## HTTP contracts and permissions

Base: `/api/notifications`. Active verified authenticated account required. Swagger: http://localhost:3100/api/docs (tag Notifications); JSON: http://localhost:3100/api/openapi.json. Documentation and schema descriptions are English.

| Method/path                              | Behavior                                                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /                                    | Own inbox, page 1–10000, limit 1–50 (default 20), optional category orders/adoptions/organizations/bookings and unreadOnly true/false. Latest first with stable UUID tie-break; items/total/page/limit. No foreign user filter.              |
| GET /unread-count                        | Own current unread count.                                                                                                                                                                                                                    |
| POST /:notificationId/read               | Strict empty JSON body. First read time retained on replay; foreign/unknown UUID gives 404.                                                                                                                                                  |
| POST /read-all                           | Body through UTC timestamp, at or before now. Marks own entries created at/before cutoff; newer events remain unread. Returns updated count, replay yields zero.                                                                             |
| GET /preferences                         | Three optional email booleans, version, updatedAt, organizationEmailMandatory=true and inAppMandatory=true.                                                                                                                                  |
| PUT /preferences                         | All three booleans and expectedVersion required. Stale writes give 409; opt-out cancels pending matching business emails/reminders.                                                                                                          |
| GET /admin/failed-deliveries             | Global superadmin only; bounded pagination of safe failure/deadline/attempt/subject/retry metadata. Includes nonretryable legacy/Auth/canceled rows. No ciphertext, recipient addresses, correlation keys, action tokens or provider errors. |
| POST /admin/deliveries/:deliveryId/retry | Global superadmin, reason 10–500 characters. Creates a fresh attempt plus immutable audit. Returns 201 and same child on replay/concurrent retries.                                                                                          |

Inbox DTO includes id/category/eventType/subjectType/subjectId/subjectVersion/status/title/body/createdAt/readAt. It omits recipient UUID, internal event key and booking details. Notification read state has no effect on mail delivery. Strict DTOs reject unknown keys, identity spoofing, invalid dates/UUIDs/pagination and mandatory-channel override.

Optional email changes preserve the in-app event. Re-enabling affects future events, without replaying canceled history. Organizations/access and Auth/security mail remain mandatory. Worker rechecks current optional preferences before sending, including legacy booking payloads that lack an inbox link. An SMTP send already in progress may still arrive.

Recovery only accepts an inbox-backed, unexpired, terminal delivery_failed row not already delivered, with an active verified recipient and currently enabled email category. Creates a new outbox/BullMQ UUID, unique parent/deduplication key and original expiration deadline; reconstructs minimal informational content from the immutable inbox. Auth token jobs, expired/canceled/superseded jobs and disabled categories are rejected with 409; they require the original business/Auth action rather than stale replay. Replaying an already accepted retry returns its child, without sending a second new attempt. Parent failures remain historical.

## Scheduling and delivery guarantees

Dispatcher polls every second and leases up to fifty eligible rows using PostgreSQL FOR UPDATE SKIP LOCKED. Leases last thirty seconds; due rows may be republished after sixty seconds if queue state is lost. Queue stores only outbox UUID, with project/environment Redis prefix. Worker concurrency three; five attempts with exponential backoff from two seconds; retained completed/failed BullMQ jobs bounded to one thousand each. Logs expose safe event/job IDs, not recipient payload or provider exception bodies.

Immediate notices expire after twenty-four hours. Confirmed booking snapshots schedule future 24h/1h reminders, expiring at booking start. Inbox identity is booking:UUID:version; jobs use notice:inboxUUID:update/24h/1h. Old migration-011 keys remain readable. Booking revisions atomically supersede unsent older deliveries, including failed attempts, and enqueue the new revision/reminders. Both dispatcher and worker respect notBefore. Reading a notice does not cancel its reminders.

Delivery is at least once. Stable jobs, deterministic Message-ID and persisted timestamps reduce duplicates, but SMTP acceptance followed by process failure before recording success can send again. An already sending obsolete notice can arrive. Clients query original feature state and permissions; no exactly-once guarantee or authoritative decision through email.

## SMTP and local manual checks

Mailpit SMTP is mailpit:1025 in Compose, inbox http://localhost:8025. Existing SMTP/env/key settings are reused; no new credential or service is necessary locally. Production sender/provider and SPF/DKIM/DMARC remain pending. Encryption key must stay available for pending payloads; rotating it without migration makes them unreadable.

Auth action URLs use fragments in English templates: /verify-email#token=..., /reset-password#token=..., /accept-invitation#token=..., /confirm-email-change#token=.... Future web extracts/submits tokens; corresponding UI pages do not exist yet. Business and booking templates are Spanish and escape user-controlled text.

Manual checks through Swagger:

1. Login as an active verified customer and perform an order, adoption or booking action; inspect own inbox and Mailpit. Log in as another account to verify access isolation.
2. Mark one event read twice; first readAt remains. Use read-all with current UTC cutoff and inspect unread count. Future cutoff gives 400.
3. Read preferences, save all booleans with its version, then replay the old version (409). Disable booking email: unsent reminders cancel but the inbox remains. Organization membership mail still arrives.
4. As superadmin list failed deliveries. An eligible SMTP failure can be retried with a reason: new ID, original deadline, one child/audit under repeated requests. Customers get 403; Auth/expired/canceled rows cannot be retried.
5. Open Swagger Notifications tag to inspect all eight strict request/response contracts and documented error/security behavior.

Do not fabricate a production SMTP outage or mutate shared business data merely to test failures; automated failure/retry fixtures run against isolated temporary infrastructure.

## Verification and remaining work

Automated checks cover unit policy/aggregate/contracts/template escaping; real PostgreSQL constraints and transaction rollback; all producer categories including internally verified paid orders; HTTP ownership/privacy, one-way reads and cutoff; optimistic concurrent preference updates and queue cancellation; mandatory membership delivery/idempotent no-op; concurrent audited retry and actual worker/Mailpit delivery; refusal of Auth/canceled replay; English OpenAPI. Runtime and application lint/type/build, Prisma schema and architecture checks apply.

Frontend inbox/preferences screens, push/device tokens, SMS/OTP, multilingual business templates, bulk campaigns, production SMTP sender, encryption rotation and historical retention cleanup remain pending. SMS OTP stays paused by user instruction. No mobile push or SMS provider is required for this release.

Delivery verification (2026-10-09): 62 unit tests and 61 isolated real-infrastructure scenarios passed (62 results including suite). API/worker lint, typecheck/build, Prisma schema, format, architecture and OpenAPI validation passed: 176 operations, eight Notifications. Docker image built and migration 012 applied only to pettly_db using pettly_dev; three new tables and six guards/triggers verified. API/worker/Mailpit healthy, Swagger 200, anonymous private routes 401. Shared inbox/preferences/retry audit remain empty; all mutable failure/concurrency/mail fixtures used temporary services and were removed. No new manual local setup required.

## Operational visibility and security cleanup

Operations adds private Prometheus backlog/oldest-due/terminal-failure metrics and a project-prefixed Redis worker heartbeat. Maintenance can clear terminal or expired encrypted delivery payloads, retaining inbox, delivery metadata and retry audit. It does not purge notification history. The worker Docker healthcheck verifies its recent heartbeat; SMTP success remains a separate delivery concern. See [Operations](operations.md) for monitoring, thresholds and explicit retention commands.
