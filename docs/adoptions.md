# Adoptions module

Updated: 2026-10-08. Implements reviewed publications, safe public browse/photos, consented applications, shelter decisions and explicit adoption completion. Related: [Animals](animals.md), [Media](media.md), [Organizations](organizations.md), [Authorization](authorization.md), [DESIGN](../DESIGN.md).

## Purpose, boundaries and architecture

Adoptions is separate from sales: no checkout, animal price, fee or payment is created. It owns publication and application aggregates plus their audit. An application records interest; approval selects an applicant; only explicit completion records the shelter's handover confirmation. The API cannot establish that a physical handover happened independently of that administrative declaration.

Domain protects publication/request state and self-review restrictions. Framework-free commands/queries/handlers coordinate AdoptionsRepository, AnimalsCatalog, OrganizationAccess, UsersDirectory, Authorization and Media ports. Prisma queries only Adoptions-owned tables; cross-feature eligibility is resolved by public ports. AnimalsCatalog exposes a minimal identity and safe card, not clinical records. DTO request/response schemas are separate strict Zod contracts, with HTTP/persistence mappers and Nest composition.

## Publication lifecycle and moderation

Draft → pending review → published or rejected. Rejected/draft/paused listings may be resubmitted; resubmission captures the current safe animal snapshot. Published listings may pause; resuming requires resubmission and moderation. Real profile edits return a mutable listing to draft. Pending, closed and deleted publications cannot be edited. Archiving is terminal; completed adoption closes the publication.

- Only staff with adoptions.publications.manage in an active adoption_entity can create/manage its active animal publications. Both adoption_admin and adoption_operator have that capability; superadmin is still constrained by entity type/state for operational actions.
- Only current moderator or super_admin can moderate. The creator and anyone with a membership in that entity cannot moderate its own listing. Pending queue/private publication inspection are available to global moderators/superadmin; applicants and business roles cannot access the queue.
- One open draft/listing per animal is enforced by a PostgreSQL partial unique index. There must be at least one sanitized attached photo to submit and at least one still-attached snapshot photo to approve/show the listing.
- Snapshot fields: name, species, breed, sex, size, birth date/estimated flag, color, public description, public specialNeeds and photo references. No clinical notes, microchip, private ownership/user identity or moderation reasons are published.
- Changes to the private animal profile do not silently change reviewed text. A resubmission refreshes it. Photo additions are similarly private until included by resubmission. Removal immediately excludes the photo; removing the last approved photo makes the listing unavailable even if its stored status remains published.
- Current active entity, active matching animal and published listing state govern browse/detail/photo reads and new applications. Suspension, deceased/adopted/archive status or unavailable photos stop public visibility without waiting for a cache.

## Application lifecycle and privacy

Submitted → in_review → approved or rejected. Direct submitted→approved/rejected is supported. Submitted/in_review/approved may be withdrawn by the applicant, including during entity suspension. Completed/rejected/closed are terminal for that request; a withdrawn/rejected applicant may submit a new request once no open request exists.

Applicants must have an active verified account and current phone, country and city. `expectedPublicationVersion` binds the application to the public version actually read; a changed listing returns 409 before recording consent. `consent: true` explicitly accepts publication conditions and sharing current name/lastName/email/phone/country/city with that shelter. Entity members cannot apply to their own listing; applicants cannot review or confirm their own request. No other applicant can read it.

Consent stores consentedAt, publicationVersion and exact conditionsAccepted, not a copy of contact details. If requirements change, old requests cannot enter approval/review or complete handover until the applicant withdraws and applies with new consent; rejection remains available to close an old application. Current account contact is fetched only for authorized individual detail. Account anonymization gives contact=null; lists and public endpoints contain no contact. Reasons/messages remain historical records and require a separately designed retention/erasure policy; no legal-compliance or automatic data-retention certification is implied.

Only current shelter reviewers (adoption_admin/operator or operationally authorized superadmin) process applications. Approval requires an active verified applicant. A PostgreSQL partial unique index permits one approved/completed applicant per publication. Others can remain submitted/in_review while a selection is approved; withdrawing/rejecting the selection releases that slot.

Completion requires an approved active verified applicant, available published listing, current accepted conditions and shelter permission. It atomically marks the request completed, the publication closed and the animal adopted; closes every other open request; and writes immutable audits. There are no payment effects. The animal's shelter ownership context is retained for history; automatic transfer into the adopter's personal-animal collection and systematic post-adoption follow-up are future work.

## Tables, fields and update timing

All IDs are UUIDs; instants UTC. Migration `202610080007_animals_media_adoptions` is additive.

### adoption_publications

| Field                                | Purpose and updates                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| id, animalId, organizationId         | Publication, source animal and owning adoption-entity UUIDs. Immutable; a composite FK binds the animal to the matching organization. |
| title                                | Trimmed 2–150 characters.                                                                                                             |
| description                          | Public adoption description, 2–4000 characters.                                                                                       |
| conditions                           | Public requirements, 2–2000 characters; exact text accepted by applicants.                                                            |
| countryCode, city                    | Public locality; ISO alpha-2 country and 2–100 character city. No street address.                                                     |
| status                               | draft/pending/published/rejected/paused/closed/deleted.                                                                               |
| version                              | Positive integer starting at 1; increments on real publication changes.                                                               |
| snapshot                             | Safe card JSON captured on submission, persists through review/history.                                                               |
| createdBy                            | Creator UUID; cannot review their own listing.                                                                                        |
| reviewedBy, reviewedAt, reviewReason | Latest moderation decision actor/time/reason; cleared on renewed submission/real edits.                                               |
| submittedAt, publishedAt             | Latest submission and successful publication time.                                                                                    |
| closedAt, deletedAt                  | Explicit completion or archive timestamps respectively.                                                                               |
| createdAt, updatedAt                 | Creation and latest real publication transition/edit.                                                                                 |

### adoption_requests

| Field                                  | Purpose and updates                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| id, publicationId, applicantId         | Request/publication/applicant UUIDs, immutable.                                                                     |
| message                                | Applicant introduction, trimmed 10–2000 characters, no control characters.                                          |
| consentedAt                            | Explicit consent time, immutable.                                                                                   |
| publicationVersion, conditionsAccepted | Exact accepted publication version/requirements, immutable.                                                         |
| status                                 | submitted/in_review/approved/rejected/withdrawn/completed/closed.                                                   |
| version                                | Positive integer; optimistic mutation control.                                                                      |
| reviewedBy, reviewedAt, reviewReason   | Latest shelter decision. Closing nonselected requests uses a generic reason without revealing the selected adopter. |
| completedAt                            | Set only on confirmed completion.                                                                                   |
| createdAt, updatedAt                   | Creation and latest real request transition.                                                                        |

### adoption_audit_entries

id, actorId, publicationId, optional requestId, action, reason, correlationId and createdAt. Actions: publication.created/updated/submitted/approved/rejected/paused/deleted/closed and request.submitted/reviewed/withdrawn/completed/closed. requestId is the business request UUID; correlationId is the HTTP request UUID. Audit contains decisions and justification, not contact snapshots/clinical values/photo bytes. PostgreSQL append-only triggers prevent audit mutation; all entity/user references are preserved.

State/version/profile checks and partial uniqueness live in PostgreSQL alongside domain invariants. Scoped/status/time indexes support management and applicant lists; publication title uses pg_trgm GIN. Animal/entity/user foreign keys use RESTRICT.

## HTTP contracts

Base `/api/adoptions`. Public GET operations use no Bearer token. All other operations require active verified Bearer authentication and the specified resource/global permission. All JSON/path/query contracts reject unknown fields.

| Method/path                                        | Behavior                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET /publications                                  | Public cursor browse; safe reviewed snapshots only.                                                           |
| GET /publications/{publicationId}                  | Public currently available detail; otherwise 404.                                                             |
| GET /publications/{publicationId}/photos/{mediaId} | Public sanitized JPEG only for an approved current attached photo; otherwise 404.                             |
| POST /publications                                 | Shelter `{animalId,profile,reason}` → 201 draft.                                                              |
| GET /organizations/{organizationId}/publications   | Shelter private paginated publications; status filter.                                                        |
| GET /publications/{publicationId}/manage           | Authorized shelter private detail or global moderator/superadmin inspection.                                  |
| GET /moderation/publications                       | Moderator/superadmin pending queue, oldest submission first.                                                  |
| PATCH /publications/{publicationId}                | Shelter `{profile,reason,expectedVersion}` → 200; real changes require renewed moderation.                    |
| POST /publications/{publicationId}/submit          | Shelter `{reason,expectedVersion}` → 201 pending snapshot.                                                    |
| POST /publications/{publicationId}/review          | Moderator/superadmin `{approved,reason,expectedVersion}` → 201 reviewed listing.                              |
| POST /publications/{publicationId}/pause           | Shelter `{reason,expectedVersion}` → 201 paused listing.                                                      |
| DELETE /publications/{publicationId}               | Shelter JSON `{reason,expectedVersion}` → 200 message; atomically closes open requests and preserves history. |
| POST /publications/{publicationId}/requests        | Customer `{message,consent:true,expectedPublicationVersion}` → 201 submitted request.                         |
| GET /requests/me                                   | Own paginated requests; status filter, no contact.                                                            |
| GET /publications/{publicationId}/requests         | Authorized shelter paginated requests; status filter, no contact.                                             |
| GET /requests/{adoptionRequestId}                  | Applicant or shelter reviewer detail with current consented contact.                                          |
| PATCH /requests/{adoptionRequestId}/review         | Shelter `{status:"in_review"\|"approved"\|"rejected",reason,expectedVersion}` → 200 request.                  |
| POST /requests/{adoptionRequestId}/withdraw        | Applicant `{reason,expectedVersion}` → 201 request; repeat withdrawal no-op.                                  |
| POST /requests/{adoptionRequestId}/complete        | Shelter `{reason,expectedVersion}` → 201 completed request; explicit handover confirmation.                   |
| GET /publications/{publicationId}/audit            | Authorized shelter paginated immutable history.                                                               |

Private pagination: page default 1/max 100000, limit default 20/max 100. Lists order creation descending then UUID; moderation queue oldest submittedAt first. Public browse accepts limit default 20/max 50, cursor, title/description search, species, countryCode and city. It scans at most 200 candidate publications and resolves eligibility via bounded batch public ports. Continue nextCursor until null, even if a filtered page contains fewer results; it intentionally reports no misleading total of eligible results. An extra empty final cursor page is valid when the preceding page filled its limit.

Public responses contain only publication ID/version, animal/entity IDs, title/description/conditions/locality, publishedAt and safe snapshot. Private responses additionally expose lifecycle/version/reviewer metadata. Request responses contain request fields above; only individual authorized detail adds contact.

Reason is 10–500 characters; expectedVersion must be current. Errors: 400 invalid body/UUID/filter; 401 missing/revoked token; 403 missing permission/self-review; 404 unavailable public listing/photo or missing record; 409 stale version, missing contact/consent renewal, unavailable listing, invalid state or duplicate/selected applicant; 429 existing route limit; 503 dependency failure; safe 500 unexpected/audit failure. All docs/errors are English. Swagger: [Docker](http://localhost:3100/api/docs).

## Manual walkthrough

1. Approve an adoption entity and appoint its verified responsible administrator through Organizations.
2. As shelter staff, create an animal through Animals, fill its public description/care needs and upload at least one valid photo.
3. POST /adoptions/publications with animalId, public profile (title/description/conditions/countryCode/city) and reason. Submit using its version.
4. As a different global moderator/superadmin outside that entity, inspect moderation queue and review approved=true. Browse anonymously and verify private health/microchip/user contact is absent.
5. With a verified customer, fill current phone/country/city in /users/me; apply with a message, consent=true and expectedPublicationVersion from the current public listing. Read /requests/me and own request. Another customer must be denied.
6. As shelter reviewer, read current applicant contact, move into review/approval and arrange contact outside this API. Approval leaves animal active.
7. After actual handover, explicitly call /requests/{id}/complete with reason/version. Animal becomes adopted, publication closes and competing open requests close atomically.
8. Test suspension, pause, removed last approved photo and deceased/archive state: public reads/applications must stop. Applicants can still inspect and withdraw their own open requests during suspension.
9. Change published conditions, resubmit/review, and verify old applicants must renew consent before approval/completion.

## Concurrency, infrastructure and remaining integrations

Lock order is sorted actor/applicant users, organization, animal, publication, then request when needed. New submissions, reviews, withdrawals, photo changes and completion serialize on their resource context. Shared Database propagates transactions into public feature ports, so a failed Adoptions audit rolls back Animals state/audit too. Unique database constraints back concurrency even with duplicate submissions/approvals.

Redis supplies existing distributed route limits. Public data/photo responses use no-store and live database eligibility, without a stale cached authorization decision. There is no object-storage/CDN backend, interview scheduling, payments, document verification, customer contact UI or post-adoption follow-up implementation in this delivery. Web/backoffice/mobile remain consumer bases; these are API workflows testable through Swagger.

Tests cover safe projections, moderation queue/permissions, incomplete contact, explicit consent, duplicate submissions, changed conditions, cross-user/entity access, suspended visibility/withdrawal, photo detach, selected-applicant concurrency, completion rollback across three features, one completion winner, other-request closure and immutable audit. Infrastructure is isolated and removed after tests.

Delivery verification (2026-10-08): API/worker lint, typecheck and build, hexagonal dependency checks, 25 unit tests and 34 isolated HTTP scenarios (35 test results including the suite) passed. OpenAPI export passed with 78 operations: 10 Animals and 20 Adoptions operations. Tests used temporary dedicated infrastructure.

Local deployment verification: migration 007 is applied to pettly_db on shared-network; seven new tables, four guards/audit triggers and three concurrency unique indexes were checked. API and worker use the rebuilt image; API is healthy, Swagger exposes 78 operations, anonymous browsing returns 200 with no-store and private Animals access without credentials returns 401. The runtime JPEG codec was checked inside the final image. No real adoption fixtures were created by verification.

## Notifications integration — 2026-10-09

Solicitud enviada, decisiones/retiro/cierre y entrega confirmada publican un evento mínimo en Notifications para solicitante y responsable actual del refugio. Inbox/outbox se guardan en la transacción original; fallo revierte la operación. No se incluyen respuestas privadas ni mensajes; correo opcional adoptionsEmail y bandeja obligatoria. No se notifica al publicar/editar una ficha. Ver [Notifications](notifications.md).
