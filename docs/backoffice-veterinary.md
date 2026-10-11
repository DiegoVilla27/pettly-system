# Backoffice: veterinary accreditation

## Purpose and scope

The Angular Veterinary feature implements the superadministrator's private review workspace: a paginated queue, status/organization filters, direct UUID lookup, professional metadata, on-demand sanitized evidence, independent approval/rejection, revocation and immutable audit. It consumes the existing Veterinary API; there is no automatic official-register verification, new role or automatic membership assignment.

This delivery is the review side of the flow. Professional draft creation, profile corrections, evidence upload/removal and resubmission remain available through the existing API; professional self-service screens and service/calendar management are separate deliveries. This workspace does not invent clinical records, facility licensing or legal-document verification for Organizations.

## Routes and access

| Route                                  | Purpose                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `/veterinaria`                         | Private queue and filters; direct credential UUID lookup       |
| `/veterinaria/:credentialId`           | Profile, consent, professional/organization links and evidence |
| `/veterinaria/:credentialId/revision`  | Approval/rejection or audited revocation                       |
| `/veterinaria/:credentialId/auditoria` | Paginated immutable revision snapshots                         |

Docker: **http://localhost:4300/veterinaria**. Native Angular: **http://localhost:4200/veterinaria**, subject to the origin configuration in [Backoffice](backoffice.md). Swagger: **http://localhost:3100/api/docs**.

The sidebar, home link and lazy `CanMatch` require `super_admin`. Every HTTP request is independently authorized by the backend against current PostgreSQL data. Professionals can use their own private API endpoints but do not receive these administrative routes. Moderators and business managers cannot inspect another professional's evidence.

The server supports status and organization UUID filters, not name/university/registration text search. The interface exposes those actual filters and direct credential UUID lookup. Valid filters and page size 10/20/50 are stored in the URL; page is bounded to 1–10000. Reload/back navigation preserves the queue. Invalid URL values normalize to safe defaults; invalid submitted IDs show validation instead of sending malformed API paths. The queue loads metadata only, without document bytes or one user-profile request per row.

## Profile and private evidence

The detail shows numeric registration, recognized veterinary qualification, university, recorded consent, immutable professional/business/resource UUIDs, status/version, timestamps, last review and reference. One independently authorized Users projection supplies the professional's display name on detail/review, without importing Users feature internals. If the projection is unavailable, the UUID and authorized account link remain available; it never substitutes fabricated identity. Organization links allow checking the owning business. Resource UUID identifies the dedicated schedule, managed in the Resources feature.

An approved historical state alone does not prove current clinical eligibility. The detail reports a passed recheck deadline without changing history. Its clock updates once per minute; the API checks current time, professional, business and membership on every applicable clinical operation. Browser clock checks are only form/UI assistance.

Images load only when explicitly opened, through typed `ApiClient.image()` operations and the existing authenticated session interceptor. Paths are encoded and UUID-validated; the response must be nonempty `image/jpeg` and no larger than 2 MiB. The backend rechecks exact attachment/ownership and returns `Cache-Control: no-store`. No bearer token enters an image URL. Only one evidence preview is held in memory at a time; object URLs are revoked on replacement, closing, navigation and destruction. Late closed/other-credential responses are ignored. No evidence, profile or tokens enter local/session storage.

The preview uses a native bounded image with explicit dimensions and aspect ratio. Angular's `NgOptimizedImage` explicitly rejects blob URLs; native `src` is necessary for this authenticated private byte flow. No public image optimizer or external image host receives documents. The viewer provides a descriptive alt, loading/problem states, close control and decode-error feedback. Audit retains evidence references/counts, not original image bytes; removed images cannot be recovered from historical snapshots.

## Independent review and lifecycle

Only pending credentials admit review. Decisions are explicit, with no approval preselected. Both decisions require the API's official-check attestation and an audited 10–500 character reason without control characters. The reviewer must manually compare identity, qualification, registration and current habilitation with the official COMVEZCOL register/certificate. An official-source link opens a separate tab; Pettly does not fetch, scrape or assert an external verification result.

Approval additionally requires a 10–500 character verification reference and a future recheck deadline within 90 days. The datetime input uses browser local time and converts it explicitly to UTC ISO for the generated request. Invalid/rolled-over local dates, expired deadlines and deadlines beyond the policy are rejected. No default approval deadline is invented. **This is Pettly's review-freshness policy, not a statutory professional-license expiration.** Rejection sends null deadline/reference, as required by the current API.

The UI blocks review if the known current identity is the professional or belongs to the owning company. The backend performs its own current independent-review check and is authoritative even when session metadata changes. Revocation has the backend's distinct superadmin permission; it withdraws clinical eligibility immediately. Existing bookings remain recorded and require explicit provider handling, rather than being silently deleted. Revoked entries expose no duplicate revocation action.

Every decision sends the displayed positive `expectedVersion`. `exhaustMap` ignores duplicate mutation clicks. A 409 preserves the viewed credential, explains that state/version/eligibility may have changed and requires **Actualizar datos** plus a fresh decision. There is no automatic retry or version replacement. Confirmed revisions reset form decision, attestation and reason. Late mutation responses cannot replace another credential after navigation. Confirmed 401/403 clears private state. Renewing an approved/expired credential requires the professional's existing resubmission flow and a fresh independent review.

## Architecture and contracts

`features/veterinary` owns generated DTO aliases and interface models, the `VETERINARY_GATEWAY` port, its HTTP adapter, Zod Mini schemas/mappers, page-scoped NgRx SignalStores, presentational components and lazy pages. All components explicitly declare OnPush; Angular is zoneless and Tailwind uses the shared semantic tokens.

The queue uses `withEntities`, cancellable `rxMethod`/`switchMap` and `tapResponse`. Detail manages credential, decisions, audit and private evidence through Signals; simple professional display-name loading uses `rxResource`. Runtime schemas validate consumed JSON, target UUIDs, unique document IDs, paged bounds, review metadata and audit snapshot identity/version. Strict decision schemas reject privilege injection. Safe problems omit raw server messages, SQL and stacks. Shared audited-reason validation is reused from `shared/forms`.

Request/response/path/query contracts come from the generated 190-operation OpenAPI client. `ApiImageOperationId` derives JPEG operation IDs from the generated responses so private byte requests remain typed. A preexisting nullable `verificationReference` Swagger reflection issue was corrected by declaring its existing maximum length; export asserts string-or-null and contracts were regenerated. No database migration, permission or domain-policy change is required.

## Verification and manual checks

Commands: `pnpm exec nx run-many -t test,typecheck,lint,architecture -p admin,api`, `pnpm api-client:check`, `pnpm exec nx run admin:test:integration`, `pnpm format:check`.

Tests operate on disposable PostgreSQL, Redis and Mailpit with real API/worker and a production Angular build; they never create or approve real professionals in shared-network. Unit checks cover contract/identity isolation, invalid deadlines/attestation/privilege fields, revision conflicts, duplicate mutations, closed evidence lifetime and form reset. The browser flow prepares an isolated Colombian company, dedicated schedule, professional and sanitized evidence, then exercises queue filters/pagination, private image reads, independent review restrictions, stale decisions, rejection/resubmission, approval and revocation/audit.

Manual flow: prepare and submit complete evidence through the professional backoffice screens; log in as an independent superadministrator; filter pending credentials; open profile and each evidence page; compare with the official source; select a decision and provide the required attestation/reference/date/reason. Inspect the returned state and audit. Test a stale decision in another tab, mobile/keyboard operation, denied access with a moderator, expired deadlines and revocation. Renewal uses the preparation screens; affected appointment management is available in Bookings.

Verified delivery: 41 Angular unit tests, 64 API unit tests and all five real browser scenarios passed. The veterinary scenario includes a company-member superadmin denied in both UI/API, moderator private-image denial, authenticated JPEG/no-store reads, persistent filters/pagination, stale-version conflict requiring refresh, invalid recheck deadline, rejection/resubmission, approval and revocation/audit. Axe found no violations on tested queue/evidence/review/audit screens; mobile audit had no horizontal overflow and desktop/mobile screenshots were inspected. Login Lighthouse: performance 97, accessibility 100, best practices 100. All 42 application components explicitly declare OnPush. Strict types, lint, architecture, build, generated contracts and root formatting passed.

Local Docker verification: API/admin images rebuilt; veterinary SPA, proxied readiness and Swagger returned 200. Anonymous private queue returns 401, and the running Swagger verificationReference is string-or-null. No migration was added or real professional fabricated/approved during this delivery.

## Professional preparation and minimal eligible selection

`/veterinaria/mis-acreditaciones`, `/veterinaria/nueva` and `/:credentialId/preparar` support own listing, named company/professional/dedicated-agenda selection, profile, consent, private document upload/removal and explicit submission. Pending reviews freeze preparation. Non-superadministrators can prepare only their own qualification; evidence detail/audit remains owner-or-superadministrator. Company staff can select eligible professionals by name when configuring clinical services without reading their documents. See [Veterinary API](veterinary.md) for the new minimal projection and candidate pagination.
