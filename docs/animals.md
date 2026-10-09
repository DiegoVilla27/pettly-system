# Animals module

Updated: 2026-10-08. Implements private personal/shelter animal records, safe public snapshots, photos, lifecycle and immutable audit. See [DESIGN](../DESIGN.md), [Media](media.md), [Adoptions](adoptions.md), [Authorization](authorization.md).

## Purpose, boundaries and architecture

Animals owns animal identity, profile, immutable ownership context, current lifecycle, photo attachments and audit. A record belongs either to a personal user or an adoption entity, never both. Business organizations cannot own these shelter records. Creating an animal grants no membership and creates no adoption publication.

The Animal aggregate validates profile and lifecycle independently of Nest, Zod and Prisma. Commands/queries and AnimalsUseCases coordinate UsersDirectory, Authorization, Media and AnimalsRepository ports. Nest modules compose adapters; separate request/response Zod DTOs and HTTP/persistence mappers enforce transport contracts. Other modules consume AnimalsCatalog: minimal eligibility identity and an explicitly safe public card; clinical notes, microchip and owner identity are excluded from that contract.

Personal profiles are available to their owner and superadmin. Shelter operations require animals.manage in the active adoption_entity owning the animal, including for superadmin. Adoption administrators/operators cannot access another entity's animal. Disabling the user or suspending the entity blocks subsequent operations. Public exposure is exclusively through Adoptions and its approved snapshot/eligibility rules.

## Data, validation and update timing

All identifiers are UUIDs; all instants are UTC. Migration `202610080007_animals_media_adoptions` is additive.

### animals

| Field                | Meaning, validation and updates                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                   | Immutable animal UUID, generated on creation.                                                                                                                      |
| ownerUserId          | Current user on personal creation; null for shelter records. Cannot be supplied or replaced through profile endpoints.                                             |
| organizationId       | Optional active adoption_entity UUID on creation; immutable through the current API. XOR with ownerUserId is enforced in PostgreSQL.                               |
| name                 | Trimmed 1–100 character display name, no control characters.                                                                                                       |
| species              | dog/cat/bird/rabbit/reptile/rodent/equine/other.                                                                                                                   |
| breed                | Optional 1–100 characters; null means unknown/not specified.                                                                                                       |
| sex                  | male/female/unknown; creation defaults unknown.                                                                                                                    |
| size                 | small/medium/large/extra_large/unknown; creation defaults unknown.                                                                                                 |
| dateOfBirth          | Optional real past/current YYYY-MM-DD date; age can be derived without storing a drifting integer.                                                                 |
| birthDateEstimated   | Boolean indicating an approximate supplied date, default false.                                                                                                    |
| weightGrams          | Optional integer 1–2000000; canonical grams avoid floating-point conversion.                                                                                       |
| color                | Optional 1–100 characters.                                                                                                                                         |
| description          | Optional 1–2000 characters; eligible for the reviewed public snapshot.                                                                                             |
| specialNeeds         | Optional 1–2000 characters, explicitly publicly shareable care needs.                                                                                              |
| healthNotes          | Optional private clinical notes, 1–4000 characters; never published. These are reported data, not medical verification.                                            |
| vaccinated, neutered | Optional booleans; null means unknown. No veterinary certificate is inferred.                                                                                      |
| microchip            | Optional private identifier, 1–30 characters; never published. No registry verification is performed.                                                              |
| status               | active/adopted/deceased/archived. Starts active. adopted is assigned only through confirmed Adoptions completion.                                                  |
| version              | Positive integer starting at 1; increments once on real profile/state/photo change. Stale expectedVersion returns 409; identical profile/state updates are no-ops. |
| archivedAt           | Set only on terminal archive.                                                                                                                                      |
| createdAt, updatedAt | Creation and latest real record/photo/lifecycle update.                                                                                                            |

Optional profile fields default null and accept null to clear. Profile updates cannot change identity, ownership, version or status. Domain validation applies even without HTTP. Deceased/adopted animals cannot be reactivated; adopted records can be archived. Archive preserves profile, IDs, photos and historical references as private records; it is not a privacy-erasure endpoint.

Adoption completion records the animal as adopted while preserving its shelter ownership context for history. The completed request identifies the adopter. Automatic reassignment into a customer's personal-pet collection, ownership transfers, veterinary records/certificates and post-adoption medical access are separate future capabilities.

### animal_photos and media_assets

animal_photos contains id, animalId, mediaId, position and createdAt. Position controls display ordering; gaps after removal are valid. At most ten active attachments per animal. The Media-owned record has its own UUID and bytes; attachment creation, sanitized bytes, animal version and audit commit in one transaction. A PostgreSQL trigger checks the maximum and exact resource binding; mediaId is unique across attachments.

Deleting a photo removes the attachment and purges its stored bytes atomically, retaining deleted Media metadata. A photo outside a record cannot be read by guessing its UUID. Uploading a new photo does not silently publish it; Adoptions refreshes the public photo snapshot on submission.

### animal_audit_entries

id, actorId, animalId, action, reason, requestId and createdAt record actual operations. Actions: animal.created/updated/status_changed/photo_added/photo_removed/adopted. Justification is 10–500 characters without control characters. Profile values, original filenames and image bytes are never copied into audit. PostgreSQL append-only triggers reject updates/deletes; foreign keys preserve actor/resource history.

## HTTP contracts

Base `/api/animals`. Every operation requires Bearer authentication and an active email-verified account. Strict Zod rejects unknown fields in bodies, query/path parameters and responses. Base responses contain every animal field above. Detail/upload responses additionally contain photo references `{id,animalId,mediaId,position,createdAt}`.

| Method/path                                 | Behavior                                                                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /animals                               | `{profile,organizationId?,reason}` → 201. Omit organizationId for current personal owner. name/species required; other base defaults as above. |
| GET /animals                                | Personal records by default; organizationId selects an authorized active shelter. page/limit/search/species/status filters → private page.     |
| GET /animals/{animalId}                     | Authorized private profile and photo references.                                                                                               |
| PATCH /animals/{animalId}                   | `{profile,reason,expectedVersion}` → 200; at least one editable field.                                                                         |
| PATCH /animals/{animalId}/status            | `{status:"active"\|"deceased",reason,expectedVersion}` → 200; only valid domain transitions.                                                   |
| DELETE /animals/{animalId}                  | JSON `{reason,expectedVersion}` → 200 archived animal. Repeated archive is a no-op after authorization.                                        |
| POST /animals/{animalId}/photos             | Multipart file/reason/expectedVersion → 201 detail. See Media for limits and format validation.                                                |
| GET /animals/{animalId}/photos/{mediaId}    | Authorized sanitized image/jpeg bytes, Cache-Control no-store.                                                                                 |
| DELETE /animals/{animalId}/photos/{mediaId} | JSON `{reason,expectedVersion}` → 200 animal; attachment and stored bytes removed.                                                             |
| GET /animals/{animalId}/audit               | Authorized paginated immutable audit.                                                                                                          |

Page defaults 1, max 100000; limit defaults 20, max 100. Animal lists order newest createdAt then UUID; audit is newest event first. Name search uses a pg_trgm GIN index; scoped status/time indexes support lists. A superadmin's default list still selects their personal records; organizationId explicitly selects a shelter, and detail grants privileged personal-record inspection.

Errors: 400 invalid date/profile/UUID or privilege injection; 401 missing/revoked token; 403 missing ownership or active shelter permission; 404 missing record/photo; 409 stale version, terminal state or photo limit; 413 oversized multipart upload; 429 rate limit; 503 dependency failure; safe 500 unexpected/audit failure. Uploads are limited to 20/minute per IP; other routes use the existing distributed default.

Swagger: [Docker](http://localhost:3100/api/docs). Operation descriptions, schemas and errors are English.

## Manual walkthrough

1. With a verified personal account, POST /animals using `{ "profile": { "name": "Luna", "species": "dog" }, "reason": "Animal registered by its current owner." }`.
2. Read detail/list and update weightGrams, birth date, estimated flag, clinical notes or contact-independent characteristics with current expectedVersion. Another user's token must return 403.
3. With shelter membership and active organization, include organizationId on creation. Business roles/entity must be rejected.
4. Upload JPEG/PNG/WebP through Swagger multipart using file, reason and expectedVersion. Check sanitized JPEG delivery, photo references and version increment. Invalid content, spoofed MIME, oversized image and an eleventh photo must fail.
5. Read audit and archive or declare deceased; verify it cannot reactivate and public adoption availability stops.
6. Follow [Adoptions](adoptions.md) to publish and complete a handover; direct status=adopted injection must fail.

## Transactions and verification

Write order: actor user lock, organization lock when scoped, animal lock. Current account/membership/entity permission is checked inside the transaction. PostgreSQL contains profile/status/ownership constraints; user and entity references use RESTRICT. Media uses the same propagated transaction; no cross-feature table access occurs in handlers/adapters. No notifications or file-processing jobs are queued by this feature.

Unit and isolated HTTP integration cover ownership/type isolation, strict DTOs, dates/weight/state invariants, stale concurrent updates, image limits/sanitization, audit immutability and rollback across image bytes/attachments/version. Adoption completion verifies cross-feature rollback and concurrency. Tests use temporary PostgreSQL/Redis/Mailpit and do not create real shelter/customer records.

Delivery verification (2026-10-08): API/worker lint, typecheck and build, hexagonal dependency checks, 25 unit tests and 34 isolated HTTP scenarios (35 test results including the suite) passed. OpenAPI export passed with 78 operations: 10 Animals and 20 Adoptions operations. Tests used temporary dedicated infrastructure.

Local deployment verification: migration 007 is applied to pettly_db on shared-network; seven new tables, four guards/audit triggers and three concurrency unique indexes were checked. API and worker use the rebuilt image; API is healthy, Swagger exposes 78 operations, anonymous browsing returns 200 with no-store and private Animals access without credentials returns 401. The runtime JPEG codec was checked inside the final image. No real adoption fixtures were created by verification.

## Booking boundary

The public AnimalsBooking port exposes forBooking(actorId,animalId) and only id/name/species. It joins the shared transaction, locks animal identity and requires an active personal pet whose ownerUserId is exactly the customer; company/refuge animals and superadmin ownership bypass are excluded. Bookings separately checks account eligibility and service species policy. No healthNotes, microchip, specialNeeds, photos or other clinical profile is copied into a booking. Current ownership/status is rechecked for creation/rescheduling; cancellation and accepted history remain available without requiring the pet to remain bookable. Tests verify foreign-pet rejection and no clinical text in reservation responses. Existing adoption/catalog contracts remain compatible.
