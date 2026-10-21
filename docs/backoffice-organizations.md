# Backoffice: organizations

## Purpose and authorization

The Angular Organizations feature lets an active, verified **super_admin** manage businesses and adoption entities globally: search, filtering, pagination, creation, profile editing, submission, approval/rejection, suspension/reactivation, responsibility transfer, members, audit and archive. Organization members instead enter their own team workspace. Its administrators can edit and submit their allowed profile and read their team/history; operators receive basic identity only. Global administrative routes remain restricted to superadministrators. Every API request is independently authorized by NestJS against PostgreSQL.

Organization approval establishes operational eligibility in Pettly. It does not certify legal registration, documents, veterinary licenses or professional qualifications. **Legal-document storage/upload is not implemented in the Organizations API.** The detail screen states this limitation; there are no simulated files or upload controls. Current decisions rely on the profile and an explicit audit reason. Veterinary accreditation review remains a separate feature.

## Routes

| Route                                       | Purpose                                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/organizaciones`                           | Server-side search and combined type/status/country filters                              |
| `/organizaciones/crear`                     | Create a draft without applicant, responsible account or role assignment                 |
| `/organizaciones/:organizationId`           | Private profile, applicant/responsible links, review information and document limitation |
| `/organizaciones/:organizationId/editar`    | Audited profile editing with optimistic concurrency                                      |
| `/organizaciones/:organizationId/revision`  | Submission, review decision, operational status and responsibility transfer              |
| `/organizaciones/:organizationId/miembros`  | Paginated UUID/role/timestamp membership projection and links to Users access management |
| `/organizaciones/:organizationId/auditoria` | Paginated lifecycle, responsibility and membership audit                                 |

Docker UI: **http://localhost:4300/organizaciones**. Native Angular: **http://localhost:4200/organizaciones**, subject to the origin configuration in [Backoffice](backoffice.md).

Search covers display name, legal name and registration. Validated filters and page size 10/20/50/100 live in query parameters; reload/back navigation preserves them. Sorting follows the API's creation date/UUID ordering. Reads cancel obsolete searches. Empty/loading/problem/retry states are explicit. Search terms can contain private names or registration numbers; avoid sharing search URLs unnecessarily.

## Profile and review flow

Draft creation accepts display name, immutable type, optional legal/contact profile and a mandatory audit reason. It creates no membership or operational permission. Customer self-onboarding already exists in the API; its applicant remains a global user until an explicit administrative decision.

Typed forms cover display/legal name, registration identifier, description, email, E.164 phone, HTTPS website without credentials, country, department/region, city, address, address complement and postal code. Registration normalizes to uppercase without spaces, dots, hyphens or slashes; formatting is not legal verification. Contact email normalizes to lowercase and remains separate from account authentication. Country labels use generated ISO codes and `Intl.DisplayNames`. Text lengths and control-character restrictions match the API. Optional values can be cleared to `null`; edits submit only changed fields.

Submission requires legal name, registration, contact email/phone, country, city and address. The review page lists missing fields and disables incomplete submission. Pending, active and suspended profiles cannot clear mandatory operational fields. An active/suspended legal name, registration or country change returns the organization to pending review and pauses its operational permissions. The editor explains this effect before saving.

Draft/rejected organizations can be submitted; only pending organizations can be approved or rejected. Approval requires an **explicitly selected active, verified account** from paginated server-side Users search. The API assigns `business_admin` or `adoption_admin` according to organization type in the same transaction. The client never chooses a global role or grants a role locally. Rejection preserves the ability to correct/resubmit and records the reason.

Active organizations may be suspended and suspended organizations reactivated. Suspension removes scoped operational permissions while preserving memberships, accounts and personal access. Global administrative permissions remain available to superadministrators. Reactivation checks current profile and responsible-account eligibility again. Transfer selects an eligible new responsible account; the previous administrator's membership is retained. Inspect/remove it through the existing Users access feature if appropriate. The API protects removal/demotion of the current responsible administrator.

All lifecycle/profile decisions include the displayed positive **expectedVersion**. A conflict does not silently retry or overwrite another review. The operator must click **Actualizar datos**, inspect the current version/state and confirm a fresh decision. Forms reset after confirmed version changes. Mutations ignore duplicate submissions and do not replace another organization's view if navigation occurs while the request is pending.

Archived organizations remain read-only and cannot be reactivated. The review screen exposes irreversible archive with a reason, expected version and explicit confirmation. Memberships display the existing API projection (account UUID, scoped role and timestamps), with a link to the account's access page; it does not issue one user-profile request per member. Audit displays action, reason, before/after values, actor, target account and request reference. It is not complete profile version history.

## Architecture and API contracts

`features/organizations` owns models, Zod Mini mappers, the `ORGANIZATIONS_GATEWAY` port, HTTP adapter, page-scoped SignalStores, presentational components, routed pages and lazy routes. No Users feature internals are imported; account lookup consumes the generated API contract and navigation uses route links. Shared audit-reason validation lives in `shared/forms` and is also used by Users. All components explicitly use OnPush; execution is zoneless, state uses Signals and styling uses Tailwind semantic tokens.

The list uses NgRx `withEntities`, `rxMethod`, `switchMap` and `tapResponse`. Detail/decisions own validated profile, version, audit/member pagination and eligible-account lookup. `exhaustMap` serializes mutations; responses are checked against the requested organization and expected decision result. Requests are strict schemas that reject privilege injection. Errors are translated without SQL, stack traces or raw server messages; conflicts preserve enough context for explicit refresh.

Request/response/path/query types come from the generated OpenAPI client. During integration, bare nullable text fields in the existing Organizations response schema were found to render incorrectly as arrays in Swagger. Bounded nullable strings now produce the actual `string | null` contract, including audit before/after values. The API export script checks these shapes to prevent regression; generated files remain generated, not manually patched. No database migration or lifecycle/domain change is required.

| Operation                 | Endpoint                                                                |
| ------------------------- | ----------------------------------------------------------------------- |
| List/create               | `GET/POST /api/organizations`                                           |
| Read/edit private profile | `GET/PATCH /api/organizations/:organizationId/profile`                  |
| Submit/approve/reject     | `POST /api/organizations/:organizationId/submit`, `/approve`, `/reject` |
| Operational status        | `PATCH /api/organizations/:organizationId/status`                       |
| Transfer responsibility   | `PATCH /api/organizations/:organizationId/responsible`                  |
| Members/audit             | `GET /api/organizations/:organizationId/members`, `/audit`              |
| Eligible account lookup   | `GET /api/users` with active/verified filters and pagination            |

See [Organizations](organizations.md), [Authorization](authorization.md) and [Backoffice users](backoffice-users.md) for authoritative backend invariants and membership management. Swagger: **http://localhost:3100/api/docs**; public API descriptions remain English.

## Verification and manual checks

Use `pnpm exec nx run-many -t test,typecheck,lint,architecture -p admin,api`, `pnpm api-client:check` and `pnpm exec nx run admin:test:integration`. Tests use disposable PostgreSQL, Redis and Mailpit, with real API/worker endpoints and a production Angular build. Shared-network users, organizations and Redis keys are untouched.

Manual flow: create a complete business draft; submit it; select a verified responsible account and approve; inspect members/audit; suspend and verify operational access disappears; reactivate; change legal identity and confirm renewed review; transfer responsibility and inspect both retained/new memberships; reject and resubmit a shelter application; combine search/type/status filters and reload/paginate. Open two review views, commit a change in one and confirm a stale decision in the other returns a conflict until explicitly refreshed. Check mobile layout, keyboard focus and denied access with a non-superadmin account. Legal-document upload remains pending. The separate veterinary review screens are implemented; see [Backoffice veterinary](backoffice-veterinary.md).

Verified: 31 Angular unit tests, 64 API unit tests and four real browser scenarios passed. The organization scenario covers all manual lifecycle operations above, stale-version rejection, scoped permission filtering, responsibility transfer, shelter rejection/resubmission and list filters/pagination. Axe found no violations on the tested organization pages; mobile audit has no horizontal overflow. Login Lighthouse: performance 98, accessibility 100, best practices 100. All 34 application components explicitly declare OnPush.

Local Docker verification: API/admin images rebuilt, organization SPA, proxied readiness and Swagger returned 200. The running Swagger profile contract exposes nullable text correctly. No migration was added and no real organization/account changes were made.

## Own organizations and archive

`/organizaciones/mis-equipos` and `/mis-equipos/:organizationId` add own basic details for members and profile/team/history for business/adoption administrators. Administrators can edit their allowed profile and submit draft/rejected applications. Operator views do not expose management controls. Team-role changes, approval, responsibility assignment, suspension and irreversible archive remain superadministrator operations. Archive requires a current version, reason and explicit irreversible confirmation.
