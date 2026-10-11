# Backoffice adoption requests

## Purpose and boundaries

Shelter teams review consented adoption applications and explicitly confirm a physical handover. Approval selects an applicant; it does not adopt the animal. Completion is an administrative declaration that the handover already occurred. No adoption fee, payment, automatic ownership transfer or post-adoption follow-up is introduced.

This extends the existing Angular Adoptions feature. Animal records remain owned by Animals; publication preparation/moderation remains documented in [Backoffice Adoptions](backoffice-adoptions.md). The customer submits/withdraws through the existing API; public web/mobile application screens are still planned.

## Navigation and permissions

Open **Adopciones**, choose an active shelter, open a publication and select **Gestionar solicitudes**.

- `/adopciones/:organizationId/:publicationId/solicitudes`: bounded list, status filter and page/limit in URL. There is no unbounded cross-shelter aggregation, contact search or per-row contact fetching.
- `/adopciones/:organizationId/:publicationId/solicitudes/:adoptionRequestId`: individual private contact, accepted conditions, decisions and publication/request history.

Functional lazy CanMatch checks `adoptions.requests.review` for active adoption-entity memberships (adoption_admin/operator), or superadmin. The gateway validates UUIDs, explicit shelter scope and returned publication/request identities before rendering. It reuses the publication gateway to verify operational context, including active shelter/type for superadmin. A global moderator's publication-review permission alone grants no access to this operational UI. An applicant cannot process their own request; the UI omits actions and the backend independently enforces authorization. Customer self-read/withdrawal remains an API capability, including during shelter suspension.

Current shelter roles have both publication-manage and request-review permissions; the UI's shared publication preflight/history additionally requires publication management. A future request-only role needs a separately scoped API/publication read rather than widening global moderator access.

## Contracts and privacy

Generated `@pettly/api-client` request/response types back a RequestsGateway port and HttpRequestsGateway. Zod Mini validates paths, queries, response shapes, identifiers, status, versions, dates, contact fields, duplicate IDs and pagination consistency. Mappers strip unknown/private properties. No backend/Prisma/domain imports or cross-feature internal dependencies.

- `listShelterAdoptionRequests`: page 1–100000, limit 1–100 and optional status; list DTOs contain no contact, and cards show status/identifier/time rather than contact/message previews.
- `getAdoptionRequest`: current consented name/lastName/email/phone/country/city only; null after account anonymization. No address, date of birth, credentials, clinical notes or microchip. Contact is fetched only on authorized detail and held in page memory, not browser storage.
- `reviewAdoptionRequest`: reason 10–500, expectedVersion, status in_review/approved/rejected.
- `completeAdoptionRequest`: reason, expectedVersion and explicit handover declaration in the UI.
- `listAdoptionAudit`: bounded 20-entry publication history, showing business requestId and highlighting the current request. This is the complete publication history, not a misleading locally filtered request page/total. Applicant contacts are absent from audit DTOs.

All APIs remain documented in English Swagger at [local Swagger](http://localhost:3100/api/docs). No new endpoint, contract regeneration, migration, package dependency or environment variable is required by this delivery; the client still exposes 195 operations.

## Consent and lifecycle

Submitted requests may enter review or receive a direct approval/rejection. In-review requests can approve/reject. An approved selection may reject or confirm delivery. Withdrawn/rejected/completed/closed requests have no administrative decisions. Publication must be published for processing; current animal/photo/shelter eligibility and current active verified applicant are checked by the API at mutation time.

The detail displays immutable consentedAt, publicationVersion and exact conditionsAccepted. Changed conditions block review/approval/completion in the UI and API; rejection remains available for an otherwise eligible published listing. The applicant must withdraw and submit again with explicit consent. A numerically newer publication version alone is not a substitute for comparing conditions: the existing API binds initial submission to the version read and compares the accepted conditions for later decisions.

Only one approved/completed applicant is allowed by the API/database. Other requests can remain open after approval. Confirmed completion atomically marks the request completed, animal adopted and publication closed; closes other open requests; writes immutable audits and notification events. It cannot prove physical delivery independently of the operator's declaration.

## State, forms and accessibility

Three standalone components explicitly OnPush, Signals/zoneless and Tailwind. Typed non-nullable Reactive Forms require validated reason and confirmation. Switching actions resets confirmation; detail/version/context changes reset the form. Completion has its own explicit physical-handover checkbox, effects explanation and button. Accessible labels, errors, invalid-field focus, disabled fieldsets, status/alert feedback and responsive layouts are provided.

Page-scoped NgRx SignalStores cancel replaced reads, clear private detail/history on route change or access loss, serialize writes through exhaustMap and ignore late write results from an old context. Before every mutation, the gateway re-reads authorized publication/request context, expectedVersion and legal action; API remains authoritative for races/current eligibility. Mutation success reloads both request and publication. Conflict/uncertain network or server outcomes freeze repeat writes until explicit refresh and review; no automatic replay or invented idempotency guarantee. A completion that committed despite a lost response is revealed as completed on refresh and cannot be submitted again from the interface.

## Manual checks

1. Create and independently approve a publication with an active animal and attached photo. Apply as an unrelated verified customer with phone/country/city, consent and current publication version.
2. Open the publication's requests; filter status, change page size and reload the URL. Verify contact is absent from lists and appears only in an authorized detail.
3. Review and approve with justification. Check the animal remains active and delivery remains pending.
4. Change public conditions, resubmit/moderate, then inspect the old request. Approval/delivery must be unavailable until new consent. Reject the old application or have the applicant withdraw and apply again.
5. Change the request concurrently, then submit a stale UI decision. Repeat is blocked until refresh.
6. Confirm handover only after real delivery. Check animal adopted, publication closed, other open requests closed and a single completion audit. Refresh is read-only.
7. Verify self decisions/global moderation-only/cross-context access and suspended-shelter denial. Private contact must disappear when access fails.
8. Test a committed completion with a lost response: the UI warns of uncertainty, blocks repeat, and refresh reveals the committed state.

## Delivery verification — 2026-10-10

194 Angular unit tests pass, including 19 new cases covering safe response projections, private-contact removal, consent/state/self decisions, expectedVersion, duplicate writes, context changes, uncertain outcomes and the explicit handover declaration. Types, lint, production build and architecture checks pass: 96 components explicitly OnPush, initial bundle 385.40 kB raw / 101.62 kB transfer; seven existing lint warnings and no new errors/warnings.

All 16 isolated real-browser scenarios pass. The added request scenario verifies scoped listing/filtering, no list contact, forbidden cross-applicant reads, authorized detail, absence of self decisions, changed-condition rejection/new consent, stale-version freeze, approval preserving active animal status, mandatory physical-handover confirmation, committed delivery with lost network response, exactly one completion audit, animal adopted/publication closed/competitor closed, terminal read-only state, suspended-shelter contact removal and guard redirection on reload. Axe reports no violations on tested list/detail/handover/terminal views; mobile 390 px has no overflow. Desktop/mobile captures were inspected.

The existing Services browser helper now checks its decision response status and resulting visible UI state instead of unnecessarily parsing a response body Chrome may discard. This fixes a test transport race without changing Services behavior. Test infrastructure is isolated and removed; no shared database migrations, fixtures or shared Redis keys are used.

## Local runtime verification

The admin image was rebuilt and only the admin container recreated; it is healthy. [Adoptions](http://localhost:4300/adopciones) and nested request list/detail SPA paths return 200, as do proxied API readiness and [Swagger](http://localhost:3100/api/docs). These SPA checks do not imply anonymous data access: applicant detail and shelter request-list API calls without credentials return 401. Live OpenAPI retains 195 operations including all four request list/detail/review/complete contracts.

Compose was checked with `RUN_DATABASE_MIGRATIONS=false` and admin started with `--no-deps`; the shared API/database were not restarted or migrated. No real development fixtures or additional manual setup were needed.
