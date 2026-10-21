# Authorization module

Status: implemented foundation. Updated: 2026-10-08. Architecture: [DESIGN](../DESIGN.md). Related modules: [Users](users.md), [Auth](auth.md), [Organizations](organizations.md).

## Purpose and approved policy

Authorization defines seven fixed roles and their action/resource permissions. It exposes the catalog and current account access, and a public application port for permission checks by future features. Users owns the global role; Organizations owns organization memberships. The API checks current database state; client controls and JWT claims do not grant permissions.

Every registration starts as `user`, active and email unverified, with no memberships. Requests cannot choose roles, status or permissions. Only a currently active, email-verified `super_admin` may assign, change or remove any global or organization role. This includes business/adoption administrators: they cannot appoint operators or administrators. This explicit user decision overrides the earlier proposal allowing organization administrators to manage their teams' roles.

The first superadministrator remains the one-time trusted operator bootstrap described in Users. There is no automatic promotion, public signup for a privileged account, arbitrary role creation or editable permission catalog. After bootstrap, role administration uses authenticated superadministrator endpoints.

## Roles and scope

| Role                | Scope               | Purpose                                                                                                                           |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `user`              | Personal/platform   | Customer account: own profile, orders, bookings and adoption requests. Default registration role.                                 |
| `moderator`         | Platform            | Publication moderation and incident/report handling; no user suspension or role assignment.                                       |
| `super_admin`       | Platform            | Administrative role assignment, account suspension, organization creation, platform configuration and audited exceptional access. |
| `business_admin`    | One business        | Company identity configuration and commercial operations. Team roles remain superadministrator-only.                              |
| `business_operator` | One business        | Catalog, inventory, fulfillment, services and bookings; no company identity configuration or role assignment.                     |
| `adoption_admin`    | One adoption entity | Entity identity configuration, animal management and adoption request workflow. Team roles remain superadministrator-only.        |
| `adoption_operator` | One adoption entity | Animal management and adoption request workflow; no entity identity configuration or role assignment.                             |

`users.globalRole` holds one of user/moderator/super_admin. Customer capabilities are included in all global roles. The four organization roles are memberships, not global labels. A person can be a moderator, business administrator in one company and adoption operator in another simultaneously. Each user has at most one membership role per organization; multiple organizations are supported. Removing a membership does not change the global role or other memberships.

A guest can browse future public resources without a persisted role. Pet owner, adopter, veterinarian and Product Owner are not extra application roles. `support_agent` remains optional future work and is not part of the seven approved roles.

## Exact permission matrix

| Permission                           | Granted by                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `profile.self.manage`                | All three global roles                                                          |
| `orders.self.manage`                 | All three global roles                                                          |
| `bookings.self.manage`               | All three global roles                                                          |
| `adoptions.self.manage`              | All three global roles                                                          |
| `users.status.update`                | super_admin                                                                     |
| `users.roles.manage`                 | super_admin                                                                     |
| `organizations.create`               | super_admin                                                                     |
| `organizations.members.roles.manage` | super_admin                                                                     |
| `platform.settings.manage`           | super_admin                                                                     |
| `moderation.publications.review`     | moderator, super_admin                                                          |
| `reports.manage`                     | moderator, super_admin                                                          |
| `organizations.read`                 | moderator, super_admin; all four membership roles within their own organization |
| `organizations.profile.update`       | super_admin; business_admin/adoption_admin within their own organization        |
| `catalog.manage`                     | super_admin; business_admin/business_operator within their own business         |
| `inventory.manage`                   | super_admin; business_admin/business_operator within their own business         |
| `orders.fulfillment.manage`          | super_admin; business_admin/business_operator within their own business         |
| `services.manage`                    | super_admin; business_admin/business_operator within their own business         |
| `bookings.manage`                    | super_admin; business_admin/business_operator within their own business         |
| `animals.manage`                     | super_admin; adoption_admin/adoption_operator within their own entity           |
| `adoptions.requests.review`          | super_admin; adoption_admin/adoption_operator within their own entity           |

These are code-defined capabilities, not proof that all their business endpoints exist. Current routes enforce identity/profile, status, global role administration, organization identity access and membership role administration. Catalog, Inventory and Adoptions implement their resource workflows; Cart and Orders now implement commerce selection/checkout/fulfillment; Payments implements scoped financial queries and reconciliation scheduling; Services and Bookings implement scoped calendars, service moderation, own reservations and provider lifecycle; reports and a general platform settings editor remain future modules. Their handlers must additionally check resource ownership, organization context, allowed transitions and specific business rules. Financial refunds/payouts are deliberately not authorized by a generic commercial role; approval policy remains pending.

For personal permissions, `self` always means the authenticated person's own resources. A superadministrator's catalog of capabilities does not make a customer's personal records unrestricted. Define exceptional operational access explicitly and audit it in the relevant feature.

## Architecture and API

`modules/authorization/domain` contains the pure permission policy. Application contains queries, result contracts, AccessHandler and the public `Authorization` input port. Its dependencies are public UsersDirectory and OrganizationAccess ports. HTTP controllers and separate response DTO schemas form the inbound adapter; Nest wires dependencies in AuthorizationModule. Role vocabulary and grants in `shared/domain/authorization.ts` are pure cross-feature contracts, with no database or Nest dependency. Roles are not persisted as mutable seed records.

All endpoints require bearer authentication. Requests/responses use strict Zod schemas and Swagger is English:

| Endpoint                                                           | Permission and result                                                                                                                                                                                                      |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/authorization/roles`                                     | Authenticated account; seven role definitions with scope, organizationType and permissions.                                                                                                                                |
| `GET /api/authorization/me`                                        | Active verified current account; globalRole/globalPermissions and scoped organization memberships/permissions.                                                                                                             |
| `GET /api/authorization/users/{userId}`                            | super_admin only; inspect the target's configured roles, including disabled accounts, without contact/profile details. Configured grants do not enable a disabled account. Unknown target is 404 only after authorization. |
| `PATCH /api/users/{userId}/role`                                   | super_admin only; assign user/moderator/super_admin. See Users.                                                                                                                                                            |
| `PUT /api/organizations/{organizationId}/members/{userId}/role`    | super_admin only; assign/replace a scoped role. See Organizations.                                                                                                                                                         |
| `DELETE /api/organizations/{organizationId}/members/{userId}/role` | super_admin only; remove membership with reason body. See Organizations.                                                                                                                                                   |

The catalog returns `{ roles: [{ role, scope, organizationType, permissions }] }`. Access returns `{ userId, globalRole, globalPermissions, organizations: [{ organizationId, name, type, status, role, permissions }] }`. Organization permissions combine the global grants with that membership's grants and filter them by current state/type. Only active organizations expose operational grants; deleted organizations expose none. Membership permissions never become global permissions.

`Authorization.requirePermission(userId, permission, organizationId?)` re-reads current active verified identity and memberships, denies missing permissions by default and checks membership only for the selected organization. Calling an organization-specific membership capability without its organization context cannot obtain that grant. Future feature handlers consume this public port and apply additional domain checks; they must not directly query another module's tables.

## Sessions, audit and concurrency

Global role changes revoke all target Auth sessions in the same transaction as role and audit update; login is required again. Same-role requests are no-ops. Membership changes keep sessions usable: subsequent checks read PostgreSQL and do not wait for JWT expiry or a permissions cache. Removal takes effect on subsequent requests; already-started operations may complete according to their transaction boundary.

Global role/status administration, bootstrap and membership administration share the PostgreSQL administration advisory lock, followed by sorted user locks; membership writes also lock the organization. Last-active-superadministrator demotion and suspension are protected under concurrency. Unauthorized actors cannot use write endpoints to discover target accounts/organizations. Every actual administrative write requires a trimmed 10–500 character reason without control characters.

User and organization audit records are transactional and append-only in PostgreSQL. Audit insertion failure rolls back the operation; updates/deletes of audit records are rejected. Module-specific audit listings exist; Redis permission cache, MFA and a custom permission editor remain pending. The source's proposal for administrative MFA remains a separate pending feature.

## Sources and verification

Business originals are `negocio.docx` and `tecnico.docx` in the repository root; reading copies are [NEGOCIO](../NEGOCIO.md) and [TECNICO](../TECNICO.md). Downloaded from the ANIMALES Drive folder on 2026-10-08. Technical section 2 proposes six roles; adoption_admin was added and the seven-role list approved in this session. The sources are snapshots; approved session decisions and DESIGN govern implementation.

Unit tests cover seven roles, default user, denied escalation, correct company/adoption scope, current active account checks and strict role DTOs. Real HTTP integration covers role assignment/demotion, revoked sessions, no-op auditing, last-superadministrator concurrency, organization isolation, role/type database constraints, concurrent unique memberships and audit rollback/immutability. Update this document, Organizations, Users, DESIGN, permission policy, Swagger and meaningful tests together whenever grants change.

Swagger: Docker http://localhost:3100/api/docs; native http://localhost:3000/api/docs. JSON: `/api/openapi.json`.

Organization lifecycle verification covers immediate permission changes during review/suspension/archive and business/adoption type restrictions, including superadmin organization context. See Organizations for contracts and development for validation commands.

## Organization lifecycle permissions

`organizations.requests.manage` is a personal capability included in all global roles. `organizations.profile.read` and `organizations.members.read` belong to own business_admin/adoption_admin and super_admin. `organizations.review`, `organizations.status.update`, `organizations.delete` and `organizations.audit.read` belong only to super_admin. Operators and moderators do not gain private-profile, review or team-administration access. Applicants have narrowly scoped access to their draft/pending/rejected application through the onboarding handlers; this does not become a membership grant.

Operational permissions require an explicit organization UUID, active organization state and compatible business/adoption type, including for superadmin. Non-superadmins cannot update pending/suspended profiles. Superadmins may administer such profiles, but legal identity changes require renewed approval. Own access views retain configured suspended/archived memberships with filtered permissions; deleted entries have no grants. Reads are current database state and are not authorization tokens. Future resource-changing handlers must lock the organization in their transaction before permission checks to serialize with lifecycle decisions.

## Animal and adoption capabilities

`animals.self.manage` is included in all global customer roles; personal record ownership is enforced by Animals, with superadmin personal-detail access. `animals.manage` and `adoptions.publications.manage` require an explicit active adoption_entity and its adoption_admin/adoption_operator membership, or superadmin subject to the same type/state rule. `adoptions.requests.review` applies only within that active entity. Business memberships cannot manage animals/adoptions.

`moderation.publications.review` is implemented for global moderator/super_admin. Pending queue/private publication inspection are administrative reads; decisions require active entity/animal and exclude the creator and any member of that entity. This does not grant applicant contact or request-review access. Applicants retain own request list/detail/withdrawal during suspension; public listing/photo visibility disappears based on current entity/animal/photo state. See Animals/Adoptions documents for exact rules and accepted-condition renewal. No new roles or automatic assignments are introduced.

## Catalog and inventory capabilities

Existing catalog.manage and inventory.manage grants are now implemented for active business contexts only. Business admin/operators work within their own company; superadmin also requires active compatible business state. Categories require global platform.settings.manage (superadmin); product review requires global moderation.publications.review outside the company and excludes its creator/members. Inventory holds are company operational actions, not customer checkout permission. Public prices/availability recheck current publication, company and category state. No new roles or automatic assignments are introduced. See Catalog and Inventory for exact lifecycle, concurrency and idempotency contracts.

## Cart and Orders capabilities

`cart.self.manage` is granted to every customer/global role and operates exclusively on the JWT principal. Existing `orders.self.manage` allows own checkout/history/cancellation. `orders.settings.manage` is granted only to business_admin in its own active business and global super_admin in an active compatible business; business_operator cannot set taxes, delivery or terms. Existing `orders.fulfillment.manage` is enforced for own active business admins/operators (or superadmin with explicit business scope). Global moderator has no business/customer-contact access merely by being a moderator. Membership/global roles are never assigned automatically on purchase. Internal verified payment/expiry ports use system actors, not a new client role; no role receives a generic permission to declare an unpaid order paid or refund funds. See [Cart](cart.md) and [Orders](orders.md).

## Payments capabilities

`payments.self.manage` belongs to all global roles for own attempts/current policy. `payments.business.read` belongs to business_admin in its active business and global super_admin in compatible active business scope; operators/moderators/adoption memberships do not gain seller financial access. `payments.platform.manage` is super_admin-only for platform-wide search, financial evidence and scheduling authoritative reconciliation. Global evidence queries support investigation of suspended sellers. No role can submit payment status or arbitrary amounts, mark paid, refund or distribute funds. Commission is configured through PETTLY_COMMISSION_PERCENT, not seller policy DTOs. See [Payments](payments.md).

## Services and Bookings capabilities

Existing services.manage and bookings.manage are now enforced for current active business context, including superadmin. Company admin/operator manage their own calendars, resources, blocks and provider reservation states; they do not gain financial payout/refund access. Global moderation.publications.review grants a pending service queue/preview and independent publication decisions, never private reservations or business operational access. Creator/own-organization membership cannot self-review.

bookings.self.manage allows active verified accounts to reserve for their own active personal pets and read/cancel/reprogram their own buyer records. A superadmin using customer endpoints also needs buyer/pet ownership; no role supplied in a DTO elevates access. Own accepted history/cancellation survive provider suspension. Scoped provider endpoints require current active owning company. See [Services](services.md) and [Bookings](bookings.md); no roles or JWT claims were added.

## Notifications integration — 2026-10-09

Notifications valida super_admin global actual mediante UsersDirectory para metadatos de fallo/retry; no agrega roles/grants de organización. Toda lectura/marcado de inbox se limita al destinatario autenticado, también para superadmin. Los avisos históricos no conceden permisos sobre sus recursos; la consulta al módulo original verifica permisos actuales.
