# Backoffice Animals

## Purpose and boundaries

Manage the private animal records of active shelters (`adoption_entity`). Registration does not publish an adoption. Publication review, applications and confirmed handover belong to Adoptions and will have their own backoffice feature. Personal customer animal records are outside this shelter UI.

The lazy feature is organized into models, gateway port, HTTP adapter, mappers, page-scoped NgRx SignalStores, typed reactive forms and pages. All five components explicitly use OnPush; the application uses Signals, zoneless change detection and Tailwind. Request/response types derive from generated OpenAPI contracts. Zod Mini validates and projects inputs/responses; there are no backend or cross-feature implementation imports.

## Routes and access

- `/animales`: explicit shelter selection, name/species/status filters and page/limit in the URL. Search accepts 1–100 characters; page size is bounded to 100.
- `/animales/:organizationId/nuevo`: creation after loading an active, authorized shelter. Its name and identifier are displayed before confirmation.
- `/animales/:organizationId/:animalId`: private profile, photographs, version and paginated immutable history.

Superadministrators discover active shelters through bounded organization searches. Staff discover only active adoption-entity memberships with `animals.manage`. The lazy guard and navigation use those permissions, while the API remains authoritative. Suspended shelters are inaccessible even to superadministrators through these animal operations.

Every list sends an explicit organization UUID; it never falls back to the API's personal-owner default. Detail and mutation preflight verify `ownerUserId === null`, matching organization and animal identifiers. A superadministrator's API ability to access a personal animal cannot turn a shelter URL into a personal-record editor. Authentication/access/not-found failures clear the private detail and history. Pending responses from a previous route cannot overwrite the current animal.

## Profile and lifecycle

Create and edit name, species, breed, sex, size, real nonfuture birth date, estimated-date flag, weight, color, description, special needs, private clinical notes, private microchip and declared vaccination/sterilization status. Optional blank fields become `null`; unknown health status remains `null`, distinct from `false`. Declarations are not professional veterinary certificates.

Weight is entered in kilograms with at most three decimal places (comma or dot). It is converted exactly to integer grams, without floating-point rounding; valid range is 0.001–2000 kg. Text uses the API's length and control-character restrictions. Reasons contain 10–500 characters and must omit private clinical data. Every write requires an explicit confirmation.

Profile edits send the complete editable profile with `expectedVersion`, excluding ownership, IDs and lifecycle fields. Version conflicts require an explicit reload. An unchanged profile is a supported no-op and need not increment the version. The gateway reloads the complete detail after a confirmed write, since several mutation responses omit photos.

Available lifecycle actions follow the existing domain:

- Register death for an active animal; it cannot be reversed.
- Archive a record permanently; it becomes read-only and retains its private profile, photos and history.
- `adopted` is displayed but cannot be assigned by this interface. Adoptions assigns it only after confirmed handover; no direct restore/adopt button exists.

## Private photographs

Upload multipart JPEG, PNG or WebP, up to 5 MiB, 20 megapixels and ten photos per animal. The API validates actual content, strips metadata and encodes a bounded JPEG. The generic generated-contract transport uses FormData and lets the browser set its multipart boundary; authenticated session/CSRF behavior remains consistent with other writes.

Preview fetches the private endpoint with authentication, checks attachment membership and bounded JPEG content, and displays a Blob URL. The shared private-image component revokes URLs when closed or changed. No private image is placed in public storage or a bearer-token URL. The endpoint uses `Cache-Control: no-store`.

Removal requires the photo UUID, reason, confirmation and expected version. The server deletes bytes and retains audit metadata. Removing the last eligible photo hides a publication as defined by the API. Changing an animal or its private photos does not silently rewrite a previously reviewed public adoption snapshot.

## Reliability and history

Writes are exclusive while pending. Network/timeout/server failures can occur after a successful commit; the UI blocks repeat actions and instructs the operator to reload and inspect history. Creation has no API idempotency key, so an uncertain create must be checked in the shelter list before repeating. No automatic write retry or invented idempotency guarantee is provided.

History shows action, reason, actor, date in Colombia and request correlation, with 20 records per page. Clinical notes and microchips are excluded from list projections and audit reasons. Private state and upload intentions stay in memory.

## API contracts

`createAnimal`, `listAnimals`, `getAnimal`, `updateAnimal`, `updateAnimalStatus`, `archiveAnimal`, `uploadAnimalPhoto`, `getPrivateAnimalPhoto`, `removeAnimalPhoto`, `listAnimalAudit`.

Swagger reflection for nullable `vaccinated`/`neutered` was corrected to boolean + nullable for both record/detail responses. Their runtime contract remains `boolean | null`. OpenAPI export checks prevent regression to the incorrect boolean-array reflection. No database migration or new endpoint is needed.

## Manual checks

1. Select an active shelter in `/animales`, search, filter by species/status and paginate.
2. Register an animal with decimal weight, unknown health declarations and private notes; verify its organization and history.
3. Edit data, clear optional fields and verify null values. Reject future/invalid dates and unsupported weight precision.
4. Upload and privately preview a valid image; reject unsupported files and remove the photo with a reason.
5. Open the same animal in two sessions. After one edits, the stale session must require reload before another write.
6. Register death or archive a separate test animal. Archived records retain details/history and expose no edit actions.
7. Verify unauthorized memberships, foreign/personal animal context and suspended shelters cannot reveal or change private records.

## Automated validation

155 Angular unit tests and 72 API unit tests pass, together with type checks, lint, production builds and architecture checks. The architecture checker confirms 87 explicitly OnPush components. Generated-contract checks cover 194 operations, including the corrected nullable health booleans.

The isolated browser suite passes all 14 scenarios. The Animals scenario verifies creation, decimal weight, unknown/false declarations, leap-day birth date, private photo processing/preview/deletion, optional-field clearing, stale-version protection, a committed mutation with an aborted response and exactly one audit event, archive/read-only behavior, search/pagination, moderator denial and suspension denial even for superadmin. Axe reports no violations in the tested creation/detail/photo/archive/list views, and the list fits a 390px viewport. Test fixtures use temporary PostgreSQL, Redis and Mailpit; shared development services are not reset or seeded.

## Local runtime

The rebuilt API and admin containers are healthy. Open the backoffice at [http://localhost:4300/animales](http://localhost:4300/animales) and Swagger at [http://localhost:3100/api/docs](http://localhost:3100/api/docs). Animal routes require authentication; the anonymous API check returns 401. Live OpenAPI contains 194 operations and the corrected nullable health booleans. This rebuild used an override with `RUN_DATABASE_MIGRATIONS=false`; it ran no shared-database migrations or test fixtures. There is no new manual configuration for this feature.

Related publications delivery: the animal UUID lookup now binds a typed FormGroup, preventing native form navigation/reset. The real Animals browser scenario verifies opening the scoped archived animal through this lookup.
