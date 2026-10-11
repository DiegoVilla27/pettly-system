# Backoffice: users

## Purpose and access

The Angular `users` feature provides account administration for the current active, verified **super_admin**. It consumes existing Users, Authorization and Organizations API contracts. The sidebar and home entry reflect permissions; the lazy route has a `CanMatch` role guard. NestJS independently authorizes every request against PostgreSQL. A moderator or organization member cannot administer accounts through this feature.

## Routes and workflows

| Route                         | Purpose                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `/usuarios`                   | Server-side search, combined filters, ordering and pagination                             |
| `/usuarios/invitar`           | Create an account with an email invitation                                                |
| `/usuarios/:userId`           | Profile, timestamps, verification and audited status changes; resend a pending invitation |
| `/usuarios/:userId/editar`    | Edit basic profile fields with a mandatory administrative reason                          |
| `/usuarios/:userId/acceso`    | Assign global roles and organization memberships; remove a membership with a reason       |
| `/usuarios/:userId/auditoria` | Paginated immutable administrative audit                                                  |

Search covers name, surname and email. Filters include status, global role, organization role and email verification; page sizes are 10/20/50/100. Sorting supports creation date, name and email. Validated filters live in URL query parameters and survive reload/back navigation. Requests cancel obsolete searches rather than applying late responses. Switching account routes resets membership selections; a mutation response for a previous account cannot replace the currently displayed account. Empty, loading, error and retry states are explicit. Personal search values appear in the URL: avoid sharing account-search links unnecessarily.

Invitation creation always starts with global role `user`, unverified email and no password. The person chooses their password using the emailed invitation link. The UI never accepts an initial role or password from the administrator. An accepted creation response confirms that the API queued the invitation, not that an external inbox received it. Resending invalidates the previous link; the API restricts this action to active, unverified invited accounts without credentials. Other unverified accounts may receive a conflict because the public profile does not expose credential availability. Acceptance remains part of the client authentication flow.

Profile editing covers names, surname, date of birth, E.164 phone, country, department/region, city, address, address complement and postal code. Age is derived by the API from date of birth. Country options come from the generated OpenAPI enum and display Spanish names through `Intl.DisplayNames`. Validation accepts real Unicode names, calendar dates with age at most 120 and bounded text without control characters. Optional values can be cleared to `null`; unchanged fields are omitted. Existing accounts with a null surname remain editable without inventing one. Email changes require the owner's existing confirmation workflow; the administrative profile form cannot overwrite credentials, verification, email, status or roles.

Status and global-role changes require an explicit confirmation action and a 10–500-character single-line audit reason. Disabling revokes all target sessions; reactivation preserves revocation and does not verify email. Assigning `user`, `moderator` or `super_admin` requires an active, verified target and revokes their sessions. The backend protects the last active verified superadministrator. If the API confirms revocation of the operator's own account session, Angular expires its local session and broadcasts logout to other tabs immediately; no additional network logout is needed to confirm a revocation that already committed. Failed/conflicting changes preserve the operator session.

Organization memberships use a paginated real organization lookup. Only roles compatible with the selected type appear: `business_admin` / `business_operator` for businesses and `adoption_admin` / `adoption_operator` for adoption entities. An assignment creates or updates the user's unique membership in that organization. Removing a membership leaves the global role and other memberships intact. The API protects organization ownership and rejects incompatible or archived organization operations. A membership in a non-active organization does not grant operational permissions. Membership changes retain sessions and are recorded in the **organization** audit. The user audit is a record of administrative actions and reasons, not full profile version history.

Deleted accounts remain read-only and display their anonymized historical identity. Account erasure is irreversible and has a separate API workflow; this delivery does not provide a deletion button.

## Architecture and contracts

`features/users` owns `models`, `mappers`, `services`, `state`, `components`, `pages` and `users.routes.ts`. `USERS_GATEWAY` is its application-facing port; `HttpUsersGateway` adapts the generated API client. Pages never call raw HTTP. DTO request/response/path/query types come from `@pettly/api-client`, generated from the API's OpenAPI export. The core transport requires typed path parameters, encodes each segment and independently encodes query values. Zod Mini validates consumed responses and mutation requests, including UUIDs, target identity and strict privilege boundaries. Invalid contracts fail closed.

NgRx SignalStore owns page-scoped async state. The list uses `withEntities`; detail/access/audit use signal state and derived values. `rxMethod` + `tapResponse` keep failed requests from terminating future interactions. `switchMap` cancels obsolete reads; `exhaustMap` prevents duplicate mutations. Confirmed mutations reload profile/access from the server. Conflicts display a safe explanation and request reference without raw server internals. All components explicitly use OnPush; execution is zoneless. Forms are typed Reactive Forms, inputs/outputs are signals, routes are lazy and styles use Tailwind semantic tokens.

## API operations

| Operation                     | Endpoint                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| List / detail / edit / invite | `GET /api/users`, `GET/PATCH /api/users/:userId`, `POST /api/users`  |
| Status / role                 | `PATCH /api/users/:userId/status`, `PATCH /api/users/:userId/role`   |
| Resend / audit                | `POST /api/users/:userId/invitation`, `GET /api/users/:userId/audit` |
| Target access                 | `GET /api/authorization/users/:userId`                               |
| Organization lookup           | `GET /api/organizations`                                             |
| Membership upsert / remove    | `PUT/DELETE /api/organizations/:organizationId/members/:userId/role` |

See [Users](users.md), [Authorization](authorization.md), [Organizations](organizations.md) and [Backoffice](backoffice.md) for backend invariants and session setup. Local Docker UI: **http://localhost:4300/usuarios**; native Angular server: **http://localhost:4200/usuarios**, subject to the documented API origin configuration.

## Verification and manual checks

Run `pnpm exec nx run-many -t test,typecheck,lint,architecture -p admin` and `pnpm exec nx run admin:test:integration`. The integration harness migrates disposable PostgreSQL, Redis and Mailpit services, uses real API/worker endpoints and drives the production Angular application. Test accounts and emails are confined to that infrastructure. It does not seed shared-network users, change their passwords/roles or clear shared Redis keys.

Manual checks with an authorized account: combine filters and reload/page through results; invite an account and resend its pending link; accept the newest invitation through the client flow; edit and clear optional fields; disable/reactivate the account; assign a global role; assign/change/remove compatible business and adoption memberships; inspect audit reasons; attempt to demote the final superadministrator; confirm that a moderator cannot access `/usuarios`. Repeat at mobile width and with keyboard navigation. The UI requires actual configured SMTP delivery for manual invitation acceptance outside the test Mailpit setup.

Verified on 2026-10-09: 21 Angular unit tests and three browser scenarios passed, including real pagination, invite/resend and invalidation of the old link, profile editing/null clearing, status changes, global role changes, business membership assignment/removal, user audit, last-superadmin protection and moderator denial in both UI and API. axe checks reported zero violations on tested user screens; the mobile audit view has no horizontal overflow at 390px. Production build, strict types, lint, architecture (22 components explicitly OnPush), formatting and the 190-operation generated contract check passed. Login Lighthouse scores were 98 performance, 100 accessibility and 100 best practices. Initial assets are approximately 357 KB raw / 96 KB estimated compressed; user pages and state load lazily. These are local measurements, not a production capacity claim.

## Account anonymization

The user detail now exposes irreversible administrative deletion with a reason and explicit confirmation. It consumes the existing deletion endpoint, retains historical UUID references and clears credentials/sessions through the API; last-superadministrator and organization-responsibility protections remain enforced. Deleted accounts are read-only. Conflicting or unknown mutation outcomes require explicit refresh before another write. Own profile/security is separately documented in [Account](backoffice-account.md).
