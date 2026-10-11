# Backoffice Adoptions — Publications

## Purpose and delivery scope

Prepare shelter adoption publications, inspect the exact submitted public animal snapshot, moderate independently, pause availability and archive with immutable history. Publications and the separate request/contact/decision/handover interface are implemented; see [Backoffice adoption requests](backoffice-adoption-requests.md). Adoption has no sale, fee or checkout action.

Six standalone OnPush components use Signals, zoneless Angular and Tailwind. The feature owns models, generated request/response types, gateway port/HTTP adapter, Zod Mini mappers, typed reactive forms and three page-scoped NgRx SignalStores. It does not import backend code or another feature's internals.

## Navigation and permissions

- `/adopciones`: explicitly shelter-scoped, status-filtered, paginated publications. There is no global/personal default. Filters and page size live in the URL; moderation does not invent an unsupported search filter.
- `/adopciones/:organizationId/nuevo`: confirm an active authorized shelter and look up an active animal UUID. The animal must belong to that shelter and have no personal owner. The UI displays its name and identifier before editing public text; switching animals clears the form/confirmation.
- `/adopciones/:organizationId/:publicationId`: operational profile, snapshot, photographs, lifecycle decisions and 20-entry paginated history.
- `/adopciones/revision` and `/adopciones/revision/:publicationId`: global pending queue, oldest submission first, safe snapshot inspection and independent moderation.

`adoptions.publications.manage` requires an active `adoption_entity`. Adoption administrators/operators can manage their own context; superadministrators can select active shelters. Moderators enter the independent review routes, not operational editing. All lazy routes use functional CanMatch guards, and navigation reflects current permissions. Returned IDs and organization scope are checked before rendering and before mutations. A suspended entity cannot be used for operational writes/listing, even by superadmin. Global moderation can inspect metadata but its decision and photo access still require current eligibility.

Creators and members of the organization cannot approve or reject their own publication. The UI suppresses decisions for known conflicts and the gateway preflights again; the API checks current memberships and identity authoritatively. Global reviewer access does not grant applicant or operational audit access. The review view shows current review reason/reviewer metadata; detailed audit stays in the shelter view.

## Profile and lifecycle

Public fields: title (2–150), description (2–4000), conditions (2–2000), city (2–100) and country `CO`. Trimmed text must exclude control characters, including line breaks. Reasons contain 10–500 characters and must exclude private data. All writes require explicit confirmation. The form explains that actual public-profile changes return the listing to draft and may require existing applicants to renew consent.

1. Creating produces a draft and respects the API's one-open-publication-per-animal invariant.
2. Submitting draft/rejected/paused captures the current safe animal profile and all attached photographs; at least one photo and an active matching animal are required.
3. Pending profiles cannot be edited. An independent moderator approves or rejects the captured snapshot with a reason.
4. Rejected profiles can be corrected and resubmitted. Real edits require renewed moderation; no-op edits may keep their version.
5. Published listings can pause. Resuming requires resubmission/review rather than a direct publish toggle.
6. Archiving is permanent, stops public availability and closes open requests while preserving history. Deleted/closed listings are displayed read-only. Completion belongs to the explicit handover action in the request detail.

The stored `published` status alone does not prove current public availability: API reads recheck organization state, animal state and still-attached approved photographs. Animal profile edits and added photos do not silently replace a reviewed snapshot. The UI distinguishes the current public publication text from the profile captured on submission.

## Photo review and privacy

The new authenticated `getManagedAdoptionPhoto` operation serves a sanitized JPEG at `/api/adoptions/publications/{publicationId}/manage/photos/{mediaId}`. It is necessary for visual review before public release. It uses the Adoptions use-case port and existing OrganizationAccess, AnimalsCatalog, Authorization and Media ports; no cross-feature database access or migration is added.

The active verified actor must be a global moderator/superadmin or an authorized shelter publication manager. Organization/animal must remain active and matching. The exact media UUID must appear in both the publication snapshot and the current animal attachments. User/organization/animal locks serialize eligibility reads with writes; unknown/detached/unavailable photos return 404. It is not a generic media download endpoint. No-store responses prevent private or obsolete eligibility caching.

The browser obtains authenticated bounded JPEG blobs and uses the shared private-image component, which revokes its Blob URL on close/context changes. No bearer token appears in a URL. Snapshot mappers retain only safe name/species/breed/sex/size/birth-date/color/description/special-needs/photo fields; health notes, microchip, owner/user contacts and arbitrary properties are discarded. Operators must also avoid typing private information into public free text.

## Reliability and contracts

Reads cancel on context changes; writes are exclusive while pending. Every mutation preflights identity/scope/version and then sends `expectedVersion`. The API remains the concurrency authority. Conflicts and unknown outcomes (network/timeout/server errors after possible commit) block repeats until explicit reload/review. Creation has no idempotency key: after an uncertain result, inspect the shelter list before another creation. Neither route changes nor late responses can overwrite another publication context. Private state and intentions remain in memory.

Operations: `createAdoptionPublication`, `listManagedAdoptionPublications`, `getManagedAdoptionPublication`, `listAdoptionModerationQueue`, `updateAdoptionPublication`, `submitAdoptionPublication`, `reviewAdoptionPublication`, `pauseAdoptionPublication`, `archiveAdoptionPublication`, `listAdoptionAudit`, `getManagedAdoptionPhoto`; animal identity and shelter discovery use their existing generated contracts.

Review reasons are documented as nullable strings (up to 500), fixing nullable-string Swagger reflection in publication/request response DTOs without changing persistence. OpenAPI export checks protect these contracts. Documentation is in English at [Swagger](http://localhost:3100/api/docs).

## Manual verification

1. As refuge staff, prepare a publication for a matching active animal and confirm public text. Reject foreign, personal and inactive animals.
2. Add photographs through Animals if needed, then submit. Inspect the safe captured profile and verify pending profile editing is unavailable.
3. As an independent moderator, open the queue, preview photos and reject with feedback. The creator/member must not be able to self-review.
4. Correct the profile, resubmit and approve independently. Check anonymous public availability and absence of clinical/microchip data.
5. Pause; public detail must return 404. Edit/re-submit for renewed review, or archive permanently.
6. Try two sessions on the same version. The stale session must require reload before another mutation.
7. Detach a snapshot photo or suspend the shelter: image access/public availability and operational permissions must reflect the change.

## Automated verification

175 Angular unit tests and 72 API unit tests pass. Type checks, lint, production builds and architecture checks pass; all 93 components explicitly use OnPush. Generated OpenAPI contracts cover 195 operations.

All 15 isolated browser scenarios pass. The new adoption scenario uses real refuge and moderator sessions to verify preparation, pending safe snapshot, authenticated no-store JPEG preview before publication, anonymous denial, arbitrary-media denial, unauthorized self-review denial, rejection/correction/resubmission/independent approval, public privacy, detached-photo denial, pause, stale-version protection, immutable audit/archive, moderator audit denial and suspended-shelter denial. The related Animals UUID lookup also uses a typed form and is tested against accidental native navigation.

Axe reports no violations in the tested preparation/review/photo/archive views; the review page fits a 390px viewport. Desktop/mobile screenshots were visually inspected. Fixtures use temporary PostgreSQL/Redis/Mailpit and isolated Redis prefixes, never shared development data. No new manual secrets or environment variables are needed.

## Local runtime

API and admin containers were rebuilt and are healthy. [Publications](http://localhost:4300/adopciones), [moderation](http://localhost:4300/adopciones/revision), proxied readiness and [Swagger](http://localhost:3100/api/docs) return 200. Anonymous moderation/private-photo calls return 401. Live Swagger exposes 195 operations, including `getManagedAdoptionPhoto`, and correct nullable review reasons. Startup was verified with `RUN_DATABASE_MIGRATIONS=false`; no shared-database migration or test fixtures ran.
