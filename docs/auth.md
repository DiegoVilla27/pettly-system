# Auth module

Status: implemented. Updated: 2026-10-08. General architecture: [DESIGN.md](../DESIGN.md).

## Purpose and boundaries

Auth owns registration/invitation orchestration, password credentials, authentication sessions, refresh rotation, email verification/change, password recovery/change and authentication cleanup during account deletion. It consumes the public Users application port to create and read identity; it does not access Users tables or adapters directly. Authorization resolves current global and scoped organization roles through public application ports; social login remains future work.

Source: `apps/api/src/modules/auth`. Domain contains the `Session` aggregate and `Password` value object. Application contains commands, an authentication query, handlers, results and input/output ports. HTTP controllers, request/response DTOs and mappers are inbound adapters. Prisma repositories, persistence mappers and the unit of work are outbound adapters. `AuthModule` wires pure handlers to implementations without a framework-dependent CQRS bus.

Output ports describe persistence, unit of work, clock, entropy, hashing and access tokens. The unit of work makes identity, credentials, action tokens and encrypted notification outbox changes atomic. PostgreSQL advisory locks serialize competing operations by normalized email or user id. Password hashing happens outside long-running transactions; login rechecks credentials after obtaining the user lock.

## Storage and cryptography

| Owned table           | Contents                                                         |
| --------------------- | ---------------------------------------------------------------- |
| `auth_credentials`    | User id, Argon2id password hash and optional pendingEmail        |
| `auth_sessions`       | Session id, user id, absolute expiry and revocation              |
| `auth_refresh_tokens` | SHA-256 hash, session id and consumption timestamp               |
| `auth_action_tokens`  | SHA-256 hash, user id, purpose, expiry and consumption timestamp |

Passwords contain 12–128 characters. Argon2id uses memoryCost 19456 KiB, timeCost 2 and parallelism 1; tune using measured latency and capacity before production. Unknown accounts perform dummy password verification to reduce login timing differences.

Access tokens use HS256, issuer `pettly-api`, audience `pettly-clients`, subject user id and `sid` session id. Default expiry is 900 seconds. The verification adapter restricts the algorithm, issuer and audience. Every authenticated request reads the session and active user state in PostgreSQL; revocation takes effect on subsequent requests without waiting for JWT expiration.

Refresh and action tokens contain 256 random bits encoded as 43 base64url characters. Only SHA-256 hashes persist in Auth tables. Refresh sessions expire after an absolute 30 days by default; rotation does not extend that expiry. Consumed refresh hashes remain associated with the session for replay detection. Reusing one revokes that session, with revocation committed before the error is returned. Parallel refresh calls have one successful rotation; the competing replay revokes the family, so clients must serialize refresh calls.

Verification tokens default to 24 hours; reset tokens to 30 minutes. Purpose, expiry and single use are checked under the user lock. Reissuing invalidates earlier tokens of the same purpose and cancels pending old emails. Verification cannot be performed with a reset token. Reset updates credentials, invalidates all outstanding action tokens and pending email changes, schedules a security notice and revokes all sessions; it does not verify an unverified email.

## HTTP contracts

All request DTOs reject undeclared fields. Email is trimmed and normalized. All public Swagger documentation is in English.

| Method and path                      | Request                                                                               | Success and behavior                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `POST /api/auth/register`            | email, name (given names), lastName (family names), password; optional profile fields | `202`, create unverified account and durable verification email; duplicate email `409`        |
| `POST /api/auth/login`               | email, password, optional client (`web` default or `mobile`)                          | `200`, access token and rotating refresh; unverified account `403`, invalid credentials `401` |
| `POST /api/auth/refresh`             | Web cookie and `{}`, or mobile `{ refreshToken }`                                     | `200`, rotate; invalid, expired or consumed token `400`                                       |
| `POST /api/auth/logout`              | Bearer access token                                                                   | `200`, revoke current session and clear web cookie                                            |
| `POST /api/auth/logout-all`          | Bearer access token                                                                   | `200`, revoke all account sessions and clear cookie                                           |
| `POST /api/auth/forgot-password`     | email                                                                                 | `202`, uniform acknowledgement regardless of eligible account existence                       |
| `POST /api/auth/reset-password`      | token, password                                                                       | `200`, reset password and revoke sessions                                                     |
| `POST /api/auth/verify-email`        | token                                                                                 | `200`, consume verification and verify email                                                  |
| `POST /api/auth/resend-verification` | email                                                                                 | `202`, uniform acknowledgement; replace token for an eligible unverified account              |

Login/refresh return `accessToken`, `tokenType`, `expiresIn` and `sessionId`; only mobile responses contain `refreshToken`. The session expiry is currently internal and determines the web cookie expiry; it is not returned as a JSON field. Neither operation embeds organization permissions. Message responses contain `message`. Errors contain `{ code, message, requestId }`, with stable codes and no raw dependency errors or tokens.

## Additional account-security contracts

| Method and path                         | Request                              | Behavior                                                                                                                      |
| --------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/accept-invitation`      | token, password                      | 200; single-use 24-hour invitation, sets own password and verifies email; no automatic session                                |
| `POST /api/auth/change-password`        | Bearer; currentPassword, newPassword | 200; verifies current credentials and a different password, revokes every session and invalidates action tokens/pending email |
| `POST /api/auth/change-email`           | Bearer; password, email              | 200; 30-minute verification to new address; notice to current address; no immediate profile change                            |
| `POST /api/auth/confirm-email-change`   | token                                | 200; verifies new address and changes email once, revokes sessions, notifies both addresses                                   |
| `GET /api/auth/sessions`                | Bearer; page, limit                  | 200; owned active sessions `{items,total,page,limit}`                                                                         |
| `DELETE /api/auth/sessions/{sessionId}` | Bearer; UUID                         | 200; owned session revocation, 404 for unknown/foreign UUID                                                                   |
| `DELETE /api/auth/account`              | Bearer; password, reason             | 200; irreversible own account anonymization and credential cleanup                                                            |

Successful mutation acknowledgements contain `{message}`. Session entries contain only id, createdAt, expiresAt and current; no refresh/access tokens, hashes or other accounts sessions. Pagination defaults to page 1/limit 20, maximum limit 100; expired/revoked sessions are excluded. Revoking an already revoked owned session is a no-op. Revoking the current session, successful password/email changes and self-deletion clear the web refresh cookie; password changes revoke all sessions, so clients must sign in again.

Password verification and Argon2id hashing happen before the mutation transaction, with credential and session rechecks under the user lock to reject concurrent stale operations. New passwords cannot equal current passwords. Invitation acceptance and email confirmation are single-use under concurrent requests. Email requests do not reserve an address: confirmation rechecks availability under the normalized email lock and the unique database constraint. Two accounts confirming the same address have at most one winner. A superseded email-change token cannot confirm a different pending address. Password change/reset invalidates pending email changes; deleting an account removes pending address and cancels its pending delivery payloads.

Users invokes Auth's public AccountAdministration port for invitation and deletion orchestration. Auth calls UsersDirectory for profile creation, verified email change, active-superadministrator count and anonymization/audit; it never reads/writes Users tables directly. AsyncLocalStorage reuses a transaction across public adapters, so cross-module writes and outbox/audit roll back together. Deletion is documented in [Users](users.md).

## OTP / SMS status

**Paused at the user's request on 2026-10-08.** SMS OTP, MFA enrollment/login/step-up and recovery codes are not implemented or required. Current sign-in remains verified email plus password and persisted JWT/refresh sessions. A later SMS delivery should use provider adapters behind application ports, short-lived single-use codes, resend/attempt limits, recovery and explicit backoffice enforcement rules. Provider selection and credentials remain pending; they do not block the rest of Users/Auth.

## Client transport and CSRF

Web login and cookie refresh require an explicitly allowed `Origin` and `X-CSRF-Protection: 1`. Fetch must use `credentials: 'include'`. Cookie `pettly_refresh` is HttpOnly, SameSite=Lax, scoped to `/api/auth`, and expires at the session's absolute expiry. Secure is enabled in production unless the explicit local development override is set. Mixing cookie and JSON refresh tokens is rejected. CORS allows only configured origins and the custom header.

Mobile sends `client: 'mobile'` at login and a JSON refresh token at refresh. The Flutter application must later store it in platform secure storage. Web access tokens should be held in memory by its future integration; client-side flows are not yet implemented. Email links use a URL fragment `#token=...`; future web pages must extract it and POST it to Auth, keeping it out of HTTP URL logs.

SameSite=Lax assumes frontend and API share a site. Cross-site production domains require an explicit cookie/CSRF design change, not simply widening CORS. Reverse proxies must have a deliberately configured trust policy before trusting forwarded client IPs; current limits use Express's direct peer IP.

## Rate limits and failure behavior

Redis uses atomic expiring counters scoped by project/environment, route, IP and normalized account (where supplied). Counter keys hash identifying inputs. Default per-route/IP limit: 120/minute. Auth overrides apply to both IP and account when an email is supplied:

| Operation                                                                            | Limit     |
| ------------------------------------------------------------------------------------ | --------- |
| Register                                                                             | 5/hour    |
| Login                                                                                | 5/minute  |
| Refresh                                                                              | 30/minute |
| Forgot / resend                                                                      | 3/hour    |
| Verify                                                                               | 10/minute |
| Reset / invitation acceptance / password change / email confirmation / self-deletion | 5/minute  |
| Email change request                                                                 | 3/hour    |

A blocked request returns `429` and Retry-After. Redis unavailable returns `503` rather than silently bypassing security. Uniform forgot/resend responses prevent direct response-based enumeration; they do not promise mathematically identical timing. Register deliberately reports a duplicate email.

## Dependencies and operations

NestJS/Express, Prisma 6.19/PostgreSQL, Redis/ioredis, Argon2, jsonwebtoken, Zod/nestjs-zod, Swagger and cookie-parser are adapter dependencies. [Notifications](notifications.md) handles encrypted outbox delivery through BullMQ and SMTP.

Configuration is documented in `.env.example` and [development.md](development.md). Use independent random `JWT_SECRET` and `MAIL_ENCRYPTION_KEY` values, each at least 32 characters. Production requires HTTPS and a verified SMTP sender; Swagger is disabled unless explicitly enabled. Secret rotation, bounded historical-record cleanup and delivery-failure operator tooling remain future operational work; do not delete consumed refresh hashes while their session can still be used.

## Verification

`pnpm test:api` checks domain/application behavior and security adapters. `pnpm test:api:integration` builds API/worker and runs real HTTP against isolated PostgreSQL, Redis and Mailpit, including transaction rollback on outbox failure, invalidation on verification resend, single-use verification, refresh concurrency/replay, web CSRF/cookies, profile boundaries, logout, password recovery, expiry, rate limits and OpenAPI. It removes only its temporary infrastructure. `pnpm check:architecture` enforces import boundaries; `pnpm docs:api` validates exported OpenAPI.

Update this document, DESIGN, Swagger contracts and meaningful tests with any change to authentication guarantees.

Tests additionally exercise invitation acceptance/resend, administrative filters and audit pagination, owned session revocation, password changes, email confirmation/collisions, deletion/anonymization and preservation of the last superadministrator under concurrency. Audit/outbox failures must roll back cross-module credentials and profile writes. Remote GitHub Actions will run when this branch is pushed.

## Profile registration and validated contracts

New registrations require separate `name` and `lastName`; optional dateOfBirth, E.164 phone and address/country/region/city/postalCode are accepted with the same validation as [Users](users.md). `age` is read-only and calculated from dateOfBirth. Public requests cannot set status or globalRole. Registration always creates an active unverified user with globalRole user. Older accounts remain usable with a null lastName until they update it.

All Auth request and response DTOs now use strict Zod schemas. ZodValidationPipe validates bodies and ZodSerializerInterceptor validates responses; Swagger is generated from these same schemas. Validation errors optionally include safe field/message details. Passwords are not trimmed, returned or placed in validation details. Login/refresh transport is unchanged.

Users exposes a public status command restricted to current super_admin accounts; its persistence adapter revokes Auth sessions through the public SessionRevocation application port inside the same shared transaction. Roles are not embedded as durable JWT authority. Bootstrap of the first administrator is a trusted, first-use-only CLI, documented in users.md; it does not create a second registration or authentication flow.

## Role assignment integration

Registration always creates globalRole user with no organization memberships. Strict request schemas reject role, globalRole, permissions and organization-membership injection. All seven roles and permissions are documented in [Authorization](authorization.md). Only current active verified superadministrators assign roles; the one-time operator CLI bootstraps the first one.

A real global role change revokes all target sessions atomically with Users role/audit persistence through SessionRevocation. Membership changes preserve sessions; subsequent organization checks read current PostgreSQL memberships rather than stale JWT or client roles. Auth remains responsible for session validity and active account state; the feature/application policy additionally authorizes each action and resource. There is no permissions cache to invalidate in this foundation.

## Security retention integration

Operations provides an explicit dry-run/apply maintenance command for expired sessions and action tokens older than thirty days. It preserves live session families and their consumed refresh hashes for replay detection; deletion of an expired session cascades only its refresh records. No users, audit or business history are removed. The grace period is an internal technical policy, not a legal retention rule. See [Operations](operations.md).
