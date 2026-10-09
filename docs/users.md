# Users module

Status: implemented. Updated: 2026-10-08. General architecture: [DESIGN.md](../DESIGN.md).

Swagger (Docker): [http://localhost:3100/api/docs](http://localhost:3100/api/docs). Native development: [http://localhost:3000/api/docs](http://localhost:3000/api/docs). JSON: `/api/openapi.json`.

## Purpose and ownership

Users owns identity, personal/contact profile, account state, the platform administrative role and its administrative audit trail. Auth owns passwords, sessions and authentication tokens. Organization membership roles are owned by Organizations: `globalRole` does not describe membership of a company or shelter.

Role assignment is restricted to superadministrators through the global-role and organization-membership endpoints. Administrative account creation uses email invitations; search, pagination, detail, audited profile editing, deletion and audit reads are implemented. Auth owns verified email changes and sensitive self-service flows through its public application ports. The status endpoint is ready for the future backoffice; the Angular UI is not connected yet.

## Hexagonal architecture

Source: `apps/api/src/modules/users`. `User` is the domain aggregate; shared pure TypeScript profile rules validate names, dates and contact fields independently of HTTP. Application contains commands/queries, handlers, results, `UsersUseCases`, `UsersDirectory` and the `UsersAdministration` unit-of-work port. HTTP request/response DTOs, controllers and mappers are inbound adapters; Prisma directory, administration adapter and persistence mapper are outbound adapters. `UsersModule` is the composition root.

Zod is confined to HTTP adapters/shared HTTP schemas. Domain and application never import NestJS, Prisma or Zod. Auth consumes the public Users application contract. Administrative session revocation consumes Auth's public `SessionRevocation` port; Users never writes Auth tables directly. Shared AsyncLocalStorage propagates the same PostgreSQL transaction across both adapters.

## Profile fields, validation and persistence

| Field             | Contract and validation                                                                                    | Storage / update                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `id`              | Read-only UUID                                                                                             | Fixed at registration                                                        |
| `email`           | Unique normalized email, max 254                                                                           | Registration/invitation; changes require the Auth verification workflow      |
| `name`            | Given name(s), trimmed, 1–100; Unicode letters, spaces, apostrophes, periods, hyphens; at least one letter | Required at registration; editable                                           |
| `lastName`        | Family name(s), same validation as name                                                                    | Required for new registrations; editable; cannot be cleared                  |
| `dateOfBirth`     | Optional real `YYYY-MM-DD`, not future, no calculated age above 120                                        | PostgreSQL `date`; editable/clearable                                        |
| `age`             | Read-only integer or null, calculated in UTC from dateOfBirth at response time                             | Not stored; stays correct as birthdays pass                                  |
| `phone`           | Optional E.164: `+` and 7–15 digits, nonzero first digit                                                   | Editable/clearable; format does not prove ownership                          |
| `address`         | Optional street/building, 1–200 trimmed characters                                                         | Editable/clearable                                                           |
| `addressLine2`    | Optional apartment/floor/details, 1–200                                                                    | Editable/clearable                                                           |
| `countryCode`     | Optional supported uppercase ISO 3166-1 alpha-2 code, e.g. `ES`, `CO`                                      | Editable/clearable; names/localized country labels belong to clients         |
| `region`          | Optional state/province/region, 1–100                                                                      | Editable/clearable                                                           |
| `city`            | Optional city/locality, 1–100                                                                              | Editable/clearable                                                           |
| `postalCode`      | Optional 1–20 characters; international text formats and leading zeros preserved                           | Editable/clearable                                                           |
| `status`          | `active` / `disabled` / `deleted`                                                                          | Defaults active; status workflow sets active/disabled; deletion sets deleted |
| `globalRole`      | `user` / `moderator` / `super_admin`                                                                       | Defaults user; public registration/profile requests cannot set it            |
| `emailVerifiedAt` | Read-only nullable verification timestamp                                                                  | Auth verification via Users public port                                      |
| `deletedAt`       | Read-only nullable ISO timestamp                                                                           | Set once during deletion/anonymization; deleted accounts cannot be restored  |
| `createdAt`       | Read-only ISO timestamp                                                                                    | Registration only                                                            |
| `updatedAt`       | Read-only ISO timestamp                                                                                    | Profile, verification, status or role transition                             |

Free-text profile fields reject control characters. Contact/address fields are optional and can be completed independently; this endpoint does not validate geographic existence or postal deliverability. Shipping/billing addresses will need their own business requirements when those modules are implemented.

`PATCH /users/me` is a partial update: omitted fields remain unchanged; null clears optional birth/contact/address fields. Empty bodies, blank strings, unknown fields, and writes to email, age, status or globalRole return 400. Profile changes are serialized per user in a transaction, preventing a concurrent update from overwriting another field or racing a status transition.

Migration `202610080003_user_profile_administration` is additive. Existing names are kept intact: no heuristic splits compound names. The response name contract tolerates pre-migration text; new name writes always use the stricter real-name rules. Existing lastName and optional fields are null until supplied; that migration initialized existing accounts as role user; subsequent audited assignments may change it. New registrations require both name and lastName. PostgreSQL enforces unique normalized email, allowed roles/statuses, phone/country format, nonblank surname, nonfuture birth date and audit constraints. More detailed formatting rules live in the domain and Zod contracts.

## HTTP contracts and Zod

All routes use `/api`; Bearer authentication requires an active persisted session and verified active account.

| Route                                 | Success                                         | Authorization               |
| ------------------------------------- | ----------------------------------------------- | --------------------------- |
| `POST /api/users`                     | `202 UserResponseDto`, pending email invitation | Active verified super_admin |
| `POST /api/users/{userId}/invitation` | `200 { message }`, resend pending invitation    | Active verified super_admin |
| `GET /api/users`                      | `200 { items, total, page, limit }`             | Active verified super_admin |
| `GET /api/users/{userId}`             | `200 UserResponseDto`                           | Active verified super_admin |
| `PATCH /api/users/{userId}`           | `200 UserResponseDto`, audited profile update   | Active verified super_admin |
| `DELETE /api/users/{userId}`          | `200 { message }`, anonymization                | Active verified super_admin |
| `GET /api/users/{userId}/audit`       | `200 { items, total, page, limit }`             | Active verified super_admin |
| `GET /api/users/me`                   | `200 UserResponseDto` (own full profile)        | Current user                |
| `PATCH /api/users/me`                 | `200 UserResponseDto`                           | Current user                |
| `PATCH /api/users/{userId}/status`    | `200 { id, status, updatedAt }`                 | Active verified super_admin |
| `PATCH /api/users/{userId}/role`      | `200 { id, globalRole, updatedAt }`             | Active verified super_admin |

Requests are strict `createZodDto` schemas validated by global ZodValidationPipe. Success responses are checked by ZodSerializerInterceptor and ZodSerializerDto; unexpected fields fail the contract instead of exposing data. Swagger uses the same schemas with cleanupOpenApiDoc. Errors are validated against a shared Zod response schema: `{ code, message, requestId, details? }`; validation details contain field paths/messages, never submitted values. Invalid server responses produce a safe 500.

Example profile update:

```json
{
  "name": "Diego",
  "lastName": "Villa",
  "dateOfBirth": "1995-06-15",
  "phone": "+34612345678",
  "address": "Calle Mayor 10",
  "addressLine2": "2B",
  "countryCode": "ES",
  "region": "Comunidad de Madrid",
  "city": "Madrid",
  "postalCode": "28013"
}
```

## Administrative status transition

```http
PATCH /api/users/<uuid>/status
Authorization: Bearer <super-admin-access-token>
```

```json
{
  "status": "disabled",
  "reason": "Account suspended after reviewing repeated abuse reports."
}
```

Reason is required, trimmed, 10–500 characters, without control characters. The handler locks administration operations and involved users, then reads the actor's current role/state from PostgreSQL. A stale JWT or client-supplied role cannot authorize this operation.

A transition atomically changes status, revokes every target session when disabling and inserts an audit entry. Audit failure rolls back both status and revocation. Reactivation does not restore revoked sessions or verify email; the person must sign in again. Repeating the current state is a no-op with no extra audit event. The last active verified superadministrator cannot be disabled, including under concurrent requests. Self-disable is possible only when another eligible superadministrator remains.

Errors: 400 invalid UUID/status/reason/body; 401 missing or invalid authentication; 403 missing super_admin permission; 404 missing target (only after permission check); 409 last administrator protection; 429 rate limiting; safe 500 for unexpected failures and 503 where a dependency adapter reports unavailability. Default route/IP limit is 120/minute.

## Administrative audit table

`user_audit_entries` is append-only: PostgreSQL rejects updates and deletes.

| Field                         | Purpose                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `id`                          | UUID of the event                                                                        |
| `actorId`                     | Administrator UUID; null only for trusted initial operator bootstrap                     |
| `targetId`                    | Affected account UUID                                                                    |
| `action`                      | Status/role transitions, creation, invitation resend, profile/email changes and deletion |
| `previousValue` / `nextValue` | Before/after status/role or symbolic profile/email/lifecycle values                      |
| `reason`                      | Operator justification or fixed self-service security reason                             |
| `requestId`                   | HTTP request UUID; null for operator bootstrap or token-only email confirmation          |
| `createdAt`                   | Transition timestamp                                                                     |

Indexes cover target/time and actor/time. User foreign keys use RESTRICT to preserve audit identity. GET /users/{id}/audit exposes paginated audit reads exclusively to current superadministrators. Avoid putting unnecessary personal data into reasons; retention/export tooling is future work.

## Provisioning the first superadministrator

Register an account and verify its email normally. A trusted operator then runs:

```sh
pnpm users:bootstrap-super-admin --email your-verified-account@example.com
```

The CLI builds the API and runs its application command without opening an HTTP listener, against the configured DATABASE_URL. It grants the role only if there is no existing superadministrator and the selected account is active and verified, and records an audit entry. It is not invoked automatically by migrations or server startup. No real account has been granted privileges as part of this implementation. Additional administrators are assigned through the authenticated PATCH /api/users/{userId}/role endpoint.

## Verification and maintenance

`pnpm test:api` checks pure profile invariants, birthday calculation, strict request/response schemas and security. `pnpm test:api:integration` exercises actual HTTP/PostgreSQL/Redis/Mailpit: profile normalization and clearing, invalid fields, public privilege injection, verified bootstrap, forbidden access, missing targets, audit rollback, append-only enforcement, session revocation, reactivation and last-administrator concurrency. Infrastructure is isolated and cleaned afterwards.

`pnpm check:architecture` validates layer/module boundaries. `pnpm docs:api` exports the English OpenAPI contract. Update this document, DESIGN, Swagger schemas and meaningful tests when behavior changes.

Verification includes response-contract rejection and concurrent last-administrator protection. Authorization adds seven-role policy, scoped memberships and role-administration integration scenarios; see authorization.md and organizations.md.

## Global role administration

Registration always assigns `globalRole: user`; no memberships are created. Supported global roles are user, moderator and super_admin. The four business/adoption roles live in Organizations, not this column. See [Authorization](authorization.md) for the exact permission matrix and [Organizations](organizations.md) for scoped assignments.

`PATCH /api/users/{userId}/role` requires bearer authentication from a currently active, verified super_admin. Body:

```json
{
  "role": "moderator",
  "reason": "Moderator access approved by platform administration."
}
```

Returns 200 `{ id, globalRole, updatedAt }`. Only global roles are accepted; organization roles sent here return 400. Target must exist, be active and verified (404/409). Invalid UUID, short reason and unknown fields return 400; missing authentication is 401; unauthorized actors are 403. A real transition updates globalRole/updatedAt, revokes all target sessions through Auth's public port and inserts user.global_role_changed audit in one transaction. Login is required again; even an already issued JWT cannot keep the old grants. Same-role requests are a no-op and preserve sessions/timestamps/audit counts.

The shared administration lock protects both status and role changes: the last active verified superadministrator cannot be demoted or disabled, even concurrently. Superadministrators may grant another superadministrator; there is no self-service privilege escalation. Every reason is trimmed, 10–500 characters and rejects control characters. Audit append-only protection remains unchanged.

`GET /api/authorization/users/{userId}` allows superadministrators to inspect the target's configured global role and memberships without exposing profile/contact fields. Other accounts use GET /api/authorization/me for their own access. No public registration/profile DTO can write any role.

Migration 202610080004_authorization_organizations expands the users.globalRole constraint to include moderator and adds the new audited HTTP role transition action. Existing global roles and users are preserved. The static seven-role catalog is code-defined; there is no roles seed table or user-editable permission list.

## Administrative account lifecycle and queries

`POST /users` accepts email, name, lastName, optional profile fields and reason (10–500 characters). It always creates globalRole user with no organization memberships. Password, role, status and verification injection are rejected. The administrator never chooses or receives the user password. User creation, hashed 24-hour invitation token, encrypted email and append-only audit commit together. Acceptance is `POST /auth/accept-invitation {token,password}`; it verifies the recipient email, stores an Argon2id credential and consumes the token under the user lock. Sign-in is a separate operation. A pending invitation has no credential. Forgot-password and public resend-verification retain uniform acknowledgements but cannot activate it. The superadministrator may resend through `/users/{id}/invitation`; previous links are invalidated. Disabled, deleted or activated accounts are not eligible for resend.

`GET /users` supports `page` (1–100000, default 1), `limit` (1–100, default 20), `search` (1–100 characters), `status`, `role` (global role), `organizationRole`, `emailVerified=true|false`, `sortBy=createdAt|email|name` and `sortOrder=asc|desc`. Search is case-insensitive substring matching across email, given name and surname. Filters combine with AND; organization role matches any configured membership. Deleted account profiles are anonymized. Unknown fields, repeated query keys, unsupported sort fields and invalid pagination return 400. Responses contain items, total, page and limit. Offset pagination has a deterministic UUID tie-breaker; records can move between pages when concurrent changes alter their sorting fields. PostgreSQL pg_trgm GIN indexes support substring search, with additional session/member/order indexes. Totals and items are separate reads and can reflect concurrent commits.

Detail and audit queries authorize the actor before looking up the target; unauthorized actors cannot discover whether a UUID exists. Administrative profile editing accepts `{profile:{...},reason}` and supports active/disabled accounts. Profile changes and audit are atomic. Email/password/state/roles use explicit workflows and cannot be changed through generic profile edits.

`GET /users/{id}/audit?page=1&limit=20` lists newest entries with UUID tie-breaker: id, actorId, targetId, action, previousValue, nextValue, reason, requestId and createdAt. It is read-only and restricted to superadministrators. Profile/email events record symbolic operation values, avoiding copies of historical personal fields. This audit is not a full profile version history. Creation, invitation resend, profile update, email change and deletion extend the existing status/role audit. Reason is operator text and may itself contain personal information; retained audit is not a claim of complete legal erasure.

## Deletion and privacy boundaries

`DELETE /users/{id} {reason}` requires super_admin. `DELETE /auth/account {password,reason}` deletes only the current account and rechecks its current password. Deletion locks the same administrative boundary used by status/role changes, preventing concurrent loss of the last active verified superadministrator. A disabled superadministrator does not count as an active survivor. The target UUID, createdAt, revoked session history and immutable audit remain for historical references; generic database DELETE is never exposed.

The account becomes status deleted/globalRole user. Email becomes `deleted.<uuid>@anonymized.invalid`, name/lastName become Deleted/Account, birth/contact/address fields and emailVerifiedAt become null, and deletedAt/updatedAt are set. Auth removes the credential (including pending email), action tokens and refresh hashes, revokes all sessions and cancels pending account emails, including those to an unconfirmed new address. Profile/anonymization/authentication cleanup/audit are one transaction: any failure rolls them back. Repeating administrative deletion is a no-op and does not duplicate audit. Deleted accounts cannot be reactivated, edited or assigned roles. The former email can be used by a new account with a new UUID.

Organization membership/history references remain attached to the deleted UUID; an inactive account has no valid access. This is not organization deletion or ownership transfer. Future modules must enforce active ownership and their business retention/transfer rules. Completed external emails cannot be recalled. Self-deletion clears the web refresh cookie; administrative deletion immediately invalidates target cookies/tokens through persisted revocation.

## Manual checks for this delivery

1. Sign in as super_admin in Swagger; create a user through POST /users and open the invitation in Mailpit. Submit its fragment token and a password to accept-invitation, then sign in as that user.
2. Search by mixed-case email/name, combine state/role/verification filters and paginate. Repeat as a client: expect 403.
3. Disable a target, edit its profile as administrator and inspect `/users/{id}/audit`; re-enable it and verify old sessions remain invalid.
4. Change password with the wrong/current password, then verify successful change requires sign-in again and invalidates existing reset/email-change links.
5. Request a new email; verify the old email remains until confirmation, then confirm once and check sign-in uses the new address.
6. Create two sessions, list them, revoke one by UUID and verify only that session stops working.
7. Delete a test account, inspect the anonymized profile/audit and verify credentials cannot authenticate it or restore its status. Use disposable accounts for this permanent operation.

OTP/SMS and recovery codes are explicitly paused by the user; no OTP endpoints or mandatory MFA enforcement are present in this delivery.

Delivery validation: 14 unit tests and 25 integration tests passed (24 feature scenarios plus the parent integration test). API/worker lint, typecheck and build passed; architecture boundaries and the OpenAPI export passed with 35 operations. The original credential/session flows remain covered alongside the new administrative/security workflows.

Local deployment verification: migration 202610080005 is applied to pettly_db on shared-network; pg_trgm is installed. The API/worker production image built successfully, the API is healthy, and live Swagger exposes 35 operations. Unauthenticated administrative/session requests return 401. No real account was created, deleted or granted privileges by this delivery's tests; all test fixtures used isolated temporary infrastructure.
