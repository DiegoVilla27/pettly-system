# Backoffice Services

Implemented service management and independent publication review. Updated: 2026-10-10. Read [DESIGN](../DESIGN.md), [Services API](services.md), [Veterinary](veterinary.md) and [Backoffice](backoffice.md).

## Purpose and scope

The Angular feature gives authorized business teams and superadmin an operational interface for the service catalog. It includes scoped search, filters and pagination; creation and full profile replacement; appointment and nightly lodging policies; compatible existing resource assignment; submit, pause and permanent archive; independent approve/reject; and immutable paginated history.

Resource creation/editing, weekly calendars, blocks and availability exploration are implemented in [Backoffice Resources](backoffice-resources.md). Reservation management is implemented in [Backoffice Bookings](backoffice-bookings.md). Services can be drafted without resources except veterinary; submission requires assigned active compatible resources. Existing resources are selected from the owning company's bounded private directory, never by arbitrary cross-company resource ID. Existing bookings retain their accepted policy when the offer changes or closes. Archive retains records rather than deleting them.

Payment is currently collected at the business (`pay_at_business`). The interface does not imply online checkout, split, booking commission, payment confirmation or refunds. All prices are tax-inclusive COP; users enter actual COP with up to two decimal places, converted exactly by decimal-string parsing to integer minor units (100 minor units = 1 COP). Appointments charge per appointment and lodging per night.

## Architecture and contracts

`features/services/` owns generated OpenAPI DTO aliases, view labels, request/response validators and mappers, an injectable `ServicesGateway` port and HTTP adapter, page-scoped NgRx SignalStores, presentational editor/decision components and lazy route pages. It does not import another feature's internals or backend domain/Prisma. Core supplies the session and typed API client; shared supplies safe problems, audit reason validation and pagination.

Every component explicitly declares OnPush. Synchronous state uses Signals/computed/effect with zoneless rendering; forms use typed reactive controls and FormArray for species. Tailwind uses the existing semantic tokens and responsive layout. Forms mark invalid fields, describe restrictions, focus the first invalid field or policy error, and require an explicit publication action plus confirmation. There is no preselected destructive or approval action.

All requests use the generated operation identifiers, path/query/body types and responses. Named Zod Mini imports validate consumed fields and policy arithmetic, scheduling modes, distinct species/resource identities, company scope, expected entity ID, bounded paging and command-result version/status. The gateway never displays arbitrary audit snapshot JSON. History validates ownership and matching snapshot identity/version, then renders audited action/reason/account UUID/time/request reference. Business teams do not gain access to private user profiles by viewing history.

The existing API is authoritative. No new endpoint, migration, Redis cache, permission or business-state transition was introduced. The Services response DTO now describes `reviewReason` as bounded nullable text consistent with its existing domain invariant; this fixes Swagger reflection that previously generated an array. The OpenAPI export asserts this shape and the TypeScript client is regenerated. API summaries/descriptions remain in English.

## Routes and authorization

| Route                                   | Capability                                                    |
| --------------------------------------- | ------------------------------------------------------------- |
| `/servicios`                            | Scoped company search and service directory                   |
| `/servicios/:organizationId/nuevo`      | Create a draft for the explicit company                       |
| `/servicios/:organizationId/:serviceId` | Read policy, replace profile, publication actions and history |
| `/servicios/revision`                   | Independent pending review queue                              |
| `/servicios/revision/:serviceId`        | Pending preview and independent approve/reject                |

The root lazy guard allows superadmin, global publication reviewers or active business members with `services.manage`. Operational child routes require superadmin or an eligible scoped membership. A reviewer without a business membership opening `/servicios` is directed to the review queue. The review branch requires `moderation.publications.review`.

Superadmin searches at most 20 active business matches per query; the currently selected company can be resolved separately to preserve URL navigation. Business operators see only eligible own memberships and never request the global organization directory. There is no automatic company selection. Query state records company/search/category/status/page/limit in the URL, allowing reload and sharing without persisting private state or credentials.

A private service detail must match both company and service UUID from its route. The moderation preview grants no operational resource, audit or booking access: assigned resource identifiers are shown without fetching another company's private directory. Reviewer UI blocks the creator and all memberships in the owning company, including inactive historical memberships available in current identity. The backend independently rechecks creator/company membership, permission, current business eligibility, compatible resources and professional eligibility for the decision.

## Profile and lifecycle

The full form includes name/description/category, tax-inclusive price, distinct pet species, requirements, accepted terms, manual/automatic booking confirmation, minimum notice, cancellation cutoff and request lifetime. Appointment controls enforce quarter-hour duration and buffers. Lodging controls enforce quarter-hour local check-in/out, checkout before check-in, min/max nights and canonical null appointment duration/zero buffers. Policy mismatches prevent submission.

Only resources active in the owning company and matching the selected kind appear. Clinical veterinary choices additionally require capacity one. Veterinary uses the currently eligible professional selected by name, bound to exactly the credential’s dedicated resource; the interface does not certify a professional or bypass the API. A credential UUID alone is insufficient: Services/Veterinary recheck independently approved status, professional affiliation and deadline when configuring/submitting/reviewing and later offering bookings. Professional preparation is delivered in Veterinary. The scoped eligible picker returns a minimal projection and rechecks current account, membership, resource and deadline. No clinical files or registration evidence are loaded in this feature.

Saving creates/returns `draft`, including edits of previously published or paused offers; pending/archived services cannot be edited. Draft/rejected/paused may submit with active assigned resources. Published may pause. Every nonarchived state may archive permanently. Approval/rejection is available only for pending offers and requires an independent reviewer. The UI renders the current review reason and immutable revision history for operational users; moderators get pending policy preview only.

## Concurrency and uncertain outcomes

All noncreation writes capture the currently displayed `expectedVersion`. `exhaustMap` excludes duplicate in-flight writes. A conflict disables new mutations until the user explicitly refreshes; the interface does not silently fetch a newer version and replay the original decision. A late result cannot replace a different routed record.

These API operations do not provide a durable idempotency key. Network failure or an invalid/server response therefore blocks repeated writes and asks the user to inspect the actual state. Creation particularly directs the user back to the company directory to check whether the draft was created before consciously starting another. There is no automatic retry or guarantee of replay across reloads. Mutation state and credentials remain in memory. Confirmed review results retain the returned new state; reopening a pending-only preview after decision may return 404 because it left that queue.

## Manual verification

1. Open `http://localhost:4300/servicios`. Select an active Colombian business, filter name/category/state, change page size and reload; verify URL filters persist.
2. Create a grooming appointment using a compatible resource, supported species, COP price and explicit policy/reason. Verify exact decimal price, draft state and creation history.
3. Submit with a reason and confirmation. Independently review from `/servicios/revision`; verify creator/member cannot approve and operational edits are hidden while pending.
4. Approve and then edit price/terms: offer becomes draft, previous accepted reservations remain unchanged. A stale version must return 409 and require explicit refresh.
5. Reject, inspect reason, resubmit, approve and pause. Archive permanently and verify readonly detail plus retained history.
6. Create lodging using an existing lodging resource and valid local check-in/out/night bounds. Invalid departure or night bounds must fail before a write.
7. Attempt a clinical offer without a valid approved accreditation or its dedicated resource. Verify form/API denial, including a correctly formatted nonexistent UUID.
8. Use a business operator, another-company URL, a moderator without scoped access, and suspended company; verify the UI never broadens backend authorization.

Verification uses disposable PostgreSQL/Redis/Mailpit only. Browser tests drive real API data, including resource provisioning through the real API and the resource screens; no mutable fixture or rate reset runs against shared development services. Check results are recorded after the test run below.

## Verified delivery (2026-10-10)

63 Angular unit tests and 68 API unit tests passed. All eight real browser scenarios passed against disposable PostgreSQL/Redis/Mailpit. The new Services scenario covers company selection, exact decimal COP conversion, creation/history, resource assignment, submit and independent approval/rejection, stale profile conflict without automatic replay, resubmission, pause/archive with retained audit, lodging policies, invalid veterinary accreditation, mismatched route scope, self-review denial, moderator-only access and suspension. Axe reported no violations on the tested service list/detail/review views; detail had no horizontal overflow at 390px. Desktop list/detail and mobile screenshots were visually reviewed. Login Lighthouse measured 98 performance / 100 accessibility / 100 best practices. These are results for the tested views and flows, not blanket accessibility or capacity certification.

Typecheck, lint, feature/hexagonal architecture, production build, formatting and OpenAPI drift checks passed. The 193-operation generated contract includes the corrected nullable review reason; all 59 application components explicitly declare OnPush. The existing Users browser scenario now waits for the invitation button to finish rendering before its accessibility check; service decisions wait for the real mutation response and confirmed state before starting the next action. No check disables accessibility rules or fabricates business API responses. No mutable fixtures or rate resets touched shared development services.

## Local deployment verification

API and admin Docker images were rebuilt; both containers are healthy. `http://localhost:4300/servicios`, proxied `/api/health/ready` and `http://localhost:3100/api/docs` return 200. The live `/api/openapi.json` exposes 193 operations and nullable string `ServiceResponseDto.reviewReason`; anonymous managed service access returns 401. Shared-network checks were read-only. No migration or additional environment configuration is required. Resources/calendars are implemented in [Backoffice Resources](backoffice-resources.md), and reservation management is implemented in [Backoffice Bookings](backoffice-bookings.md).
