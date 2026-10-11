# Backoffice

## Purpose and implemented scope

`apps/admin` is the Angular workspace for superadministrators, moderators, business teams and adoption teams. The first delivery implements browser login, session restoration and rotation, logout, route protection, a workspace shell, home and a read-only account/access view. It consumes the real NestJS API.

User management is implemented for superadministrators: search/filter/pagination, detail, invitation/resend, profile editing, audited status/global-role changes, scoped memberships and user audit. See [Backoffice users](backoffice-users.md). Organization management and review are implemented for superadministrators: draft creation/editing, submission, approval/rejection, suspension/reactivation, responsibility transfer, members and audit. See [Backoffice organizations](backoffice-organizations.md). Veterinary accreditation review is also implemented: private queue/evidence, independent approval/rejection, revocation and immutable revision history. See [Backoffice veterinary](backoffice-veterinary.md). Catalog categories and independent product moderation are implemented for their respective global roles; see [Backoffice catalog](backoffice-catalog.md). Inventory management is implemented for eligible business teams and superadmin; see [Backoffice inventory](backoffice-inventory.md). Services management and independent publication review are implemented; resources, weekly calendars, blocks and availability are implemented; booking management is implemented; see [Backoffice bookings](backoffice-bookings.md). See [Backoffice resources](backoffice-resources.md). See [Backoffice services](backoffice-services.md). Invitation activation, verification, password recovery and own account/security/session screens are implemented; see [Backoffice account](backoffice-account.md). Public customer registration remains part of the client application.

## Architecture and ownership

All components are standalone and explicitly `ChangeDetectionStrategy.OnPush`. `provideZonelessChangeDetection()` is explicit; the application neither imports nor loads Zone.js. Synchronous state uses `signal`, `computed` and signal input/output APIs. Templates use native control flow. Small forms use typed non-nullable Reactive Forms.

```text
apps/admin/src/app/
  core/
    api/                  Typed HTTP transport, configuration and safe problems
    auth/
      models/             AuthSession port, identity and session state
      mappers/            Runtime validation and DTO → identity mapping
      services/           Session lifecycle, HTTP interceptor, browser coordination
      guards/             Functional CanMatch guards
    layout/               Workspace shell, route focus and 404
  features/
    auth/                 Login form, routed access and denied pages
    workspace/            Home and current capabilities
    account/              Own profile, security, sessions and account lifecycle
    users/                Superadmin account administration and access
    organizations/        Superadmin organization lifecycle, members and audit
    veterinary/           Private professional evidence and independent review
    catalog/              Taxonomy and independent product publication review
    inventory/            Company balances, physical movements and ledger
    services/             Company service policies, publication and audit
  shared/forms/           Common audited-reason validation
  shared/ui/              Brand, icons and accessible problem display
packages/api-client/      Generated transport contracts and operation metadata
```

Features consume the public `AUTH_SESSION` injection token, rather than importing the session service or interceptor. `AuthSession` is the browser application port; `SessionService` implements it using the HTTP adapter and maps transport responses into `SessionIdentity`. Shared UI does not own business state. A feature cannot import another feature's internals. Add models, services, state and mappers to their owning feature when behavior needs them, rather than empty architectural folders.

`pnpm check:admin-architecture` checks component OnPush declarations, explicit zoneless configuration, feature boundaries and restricted persistence. Angular ESLint also rejects components without OnPush. Guards and menu visibility improve UX; backend authorization remains authoritative for every action and organization.

## API contracts and validation

`packages/api-client` contains generated TypeScript `paths`, `operations`, request and response types, plus method/path/security metadata. The generator reads the API's exported OpenAPI document, without copying backend entities or Prisma models into Angular. There are currently 194 API operations in the generated contract.

```sh
pnpm api-client:generate  # build API, export OpenAPI, regenerate checked-in contracts
pnpm api-client:check    # fail on contract drift
```

Do not manually edit generated files. They are excluded from Prettier to keep reproducible generation. API CI exports OpenAPI and verifies the generated files. `ApiRequest<OperationId>` and `ApiResponse<OperationId>` select the operation's JSON types. The transport requires `ApiPath` for parameterized operations, supports `ApiQuery`, encodes each path segment and uses independent query parameters. The generator also exports the country-code reference enum used by profile forms.

The session mapper validates consumed response fields with Zod Mini named imports: token type, lifetime, UUIDs, user status, verification timestamp, role, memberships and matching user/authorization identities. Fields unused by this read model are not duplicated into browser domain objects. Malformed or inconsistent identities fail closed. A browser auth response exposing a JSON refresh token is rejected. Form validators cover required fields, valid email and request length limits; passwords preserve whitespace.

Transport requests have a 15-second deadline. Problems expose translated Spanish messages and an optional validated request ID, without displaying raw server messages, stack traces, SQL or credentials. Invalid fields have associated descriptions, invalid state and focus on the first invalid input after submission.

## Authentication lifecycle

| Action         | API contract                                            | Browser behavior                                                             |
| -------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Login          | `POST /api/auth/login`, `{email,password,client:"web"}` | Normalize email, preserve password, accept access token in memory            |
| Restore/rotate | `POST /api/auth/refresh`, `{}`                          | Browser sends its HttpOnly cookie; hydrate current identity/access           |
| Identity       | `GET /api/users/me`                                     | Map active, verified profile                                                 |
| Access         | `GET /api/authorization/me`                             | Map current global/scoped permissions and organizations                      |
| Logout         | `POST /api/auth/logout`, bearer                         | Revoke server session, remove cookie, clear browser state, notify other tabs |

Refresh token storage belongs to the browser cookie jar: `pettly_refresh`, HttpOnly, SameSite=Lax, path `/api/auth`, with the API's absolute expiry. Secure requires HTTPS in deployed environments; the existing explicit localhost override supports development. No token or personal profile is written to localStorage or sessionStorage. LocalStorage stores only `pettly:backoffice:session-present=1`, a non-secret hint for whether to attempt restoration. Removing it forces a new login even if a server cookie remains; it never grants access. Restricted storage falls back to checking the cookie through the server.

Protected requests add the current bearer, credentials and `X-CSRF-Protection: 1` only for Pettly's configured `/api/` prefix. Tokens never accompany unrelated URLs. Cookie login/refresh also require the browser's allowed Origin. Token renewal is single-flight within a tab; Web Locks serialize renewal across tabs. BroadcastChannel synchronizes login changes and logout without exchanging tokens or user data. Supported browsers must provide these modern APIs; without Web Locks only in-tab serialization is available, and concurrent cross-tab cookie rotation may trigger the API's replay protection. Deploy the backoffice on one canonical origin and use current browsers.

Access tokens nearing expiry renew before a protected request. An HTTP 401 can trigger one renewal and one retry; service/network failures do not repeat mutations. Returning to a visible authenticated tab refreshes the server's identity and permissions. Epoch checks prevent an old response from restoring a locally invalidated session. Connectivity errors offer a restoration retry. A server logout failure keeps the current identity and shows an error, rather than claiming the session was revoked.

`super_admin` and `moderator` may enter the workspace. A `user` needs an organization membership that has not been deleted; otherwise the guarded `/sin-acceso` page explains the missing team access and offers logout. Global permissions never come from an organization role. Scoped operational permissions require the requested organization to be active. The account view shows memberships and their availability. The `/usuarios` and `/organizaciones` features additionally require a current `super_admin`, has its own gateway adapter and consumes existing backend authorization. Future management routes must add their own permission guards and adapters.

## Styling and accessibility

Tailwind CSS 4 runs through the admin-specific PostCSS configuration. `styles.css` defines semantic theme tokens for surfaces, green accents, text, status and borders. Class ordering uses the Tailwind Prettier plugin for admin TypeScript and HTML. Styles use logical properties, responsive utilities and visible focus, with reduced-motion and forced-colors support. There are no remote fonts, icon requests or stock images; the small decorative illustration is local SVG.

The UI provides a skip link, semantic navigation and main landmarks, labels/autocomplete, linked error descriptions, password visibility controls, accessible busy/error feedback and keyboard operability. Initial navigation preserves normal keyboard entry; subsequent navigation focuses the destination heading/main. Mobile navigation exposes expanded state and its controlled region. Responsive layouts are checked at 390px with no horizontal overflow. Nginx compresses scripts/styles and supports SPA route fallback.

## Running and verification

```sh
pnpm exec nx serve admin             # http://localhost:4200
pnpm exec nx test admin              # native Angular Vitest/jsdom runner
pnpm exec nx run admin:typecheck
pnpm exec nx lint admin
pnpm check:admin-architecture
pnpm exec nx run admin:test:integration
docker compose up -d --build admin   # http://localhost:4300
```

The development proxy targets `http://127.0.0.1:3100` and preserves the browser Origin; that origin must be present in the API's `CORS_ORIGINS`. Compose already allows `http://localhost:4300` by default. Add `http://localhost:4200` to the local API environment and recreate the API when using the Nx dev server. The frontend always calls `/api`; Nginx proxies it to `api:3000` on the existing Docker network. Remote deployments need equivalent API reachability and explicit HTTPS origins.

Reverse proxy client-IP trust remains deliberately disabled in the API. Current rate limits identify the direct proxy peer, so proxy clients share an IP bucket. Before a public deployment, configure and test a deliberately bounded trusted-proxy policy and sanitized forwarding at the chosen ingress; do not enable blanket forwarded-header trust. This delivery does not change the backend's existing trust policy.

The integration runner builds API/worker/admin through Nx, creates temporary PostgreSQL/Redis/Mailpit containers on an isolated network, migrates and registers/verifies test accounts through real endpoints, and bootstraps only the isolated superadmin. Playwright drives the production Angular artifact against the real API, including invalid login, HttpOnly cookie handling, reload and concurrent tab renewal, account permissions, mobile navigation, cross-tab logout and server-side revocation. axe checks login, home, account and denied pages. Lighthouse checks the production login with a minimum of 90 for performance, accessibility and best practices. Containers and volumes are removed afterward; shared-network accounts and Redis keys are untouched. CI installs Chromium only in the admin integration job. Local tests can use installed Chrome.

Manual checks: open a protected URL while logged out; submit empty/invalid credentials; toggle password visibility by keyboard; enter with an active verified superadmin; inspect account and memberships; reload/open a second tab; use mobile navigation; log out and confirm both tabs return to access; sign in with a customer without memberships and confirm guarded access denial. Existing real accounts retain their passwords and roles; no sample credentials are created in the shared development database.

## Verified delivery (2026-10-09)

12 Angular unit tests and both browser scenarios passed. Production build, strict application/browser-test types, lint, format, architecture, generated-contract drift and Actions syntax passed. axe reported no violations in the tested WCAG A/AA checks. Local Lighthouse login scores were 99 performance, 100 accessibility and 100 best practices; initial assets total approximately 336 KB raw / 90 KB estimated compressed, with feature routes lazy loaded. These measurements cover the first access/account delivery, not future management screens or production capacity. Docker admin is running on port 4300; login route and proxied API readiness both return 200.

References: [Angular zoneless](https://angular.dev/guide/zoneless), [native Angular testing](https://angular.dev/guide/testing), [Tailwind Angular installation](https://tailwindcss.com/docs/installation/framework-guides/angular), [OpenAPI TypeScript](https://openapi-ts.dev/).

The subsequent Users delivery passed 21 unit tests and all three browser scenarios. The user-management scenario uses actual API operations for invitation/resend/acceptance, profile edits, account status, roles, membership assignment/removal and audit, verifies the final superadmin invariant and moderator denial, and runs axe checks on the tested management pages. Current login Lighthouse scores are 98/100/100; initial assets are approximately 357 KB raw / 96 KB estimated compressed. See [Backoffice users](backoffice-users.md) for the implemented scope and manual checks.

The Organizations delivery passed 31 Angular unit tests, 64 API unit tests and all four browser scenarios. The new real-API scenario covers draft creation, review/approval, responsibility transfer, stale-version conflicts, legal changes requiring review, operational permissions after suspension, rejection/resubmission, members/audit and persistent list filters/pagination. Axe reports no violations on the tested pages; mobile audit has no horizontal overflow. Login Lighthouse remains 98/100/100. Documents for organization legal verification are not stored by this API feature; veterinary accreditation has its own API and its Angular review screens are now implemented; see [Backoffice veterinary](backoffice-veterinary.md).

The Veterinary delivery passed 41 Angular unit tests, 64 API unit tests and all five browser scenarios on disposable infrastructure. It verifies private evidence/no-store and moderator denial, independent company-member review restrictions in UI/API, stale-version conflicts, dates, rejection/resubmission, approval and revocation/audit. Axe found no violations in tested views; mobile audit has no horizontal overflow. Login Lighthouse is 97/100/100. All 42 application components explicitly declare OnPush.

Catalog delivery passed 46 Angular unit tests, 66 API unit tests and all six real browser scenarios on isolated infrastructure. Categories/audit, pending queue/search/pagination, private preview/JPEG, independent moderator/company-member rules, stale versions, price formatting and category eligibility are verified. Axe has no violations in the tested views; product preview has no horizontal overflow at 390px. Login Lighthouse is 98/100/100; all 51 components are explicitly OnPush, with 192 generated API operations. See [Backoffice catalog](backoffice-catalog.md).

Inventory delivery passed 54 Angular unit tests, 68 API unit tests and all seven browser scenarios with isolated infrastructure. Company-scoped paging, physical movements, reserved stock, concurrency, transport loss after commit and identical-key retry, expiry, archived history and suspension are verified. Axe found no violations in tested views and the detail has no horizontal overflow at 390px. Login Lighthouse is 97/100/100; all 54 components are OnPush, with 193 generated operations. See [Backoffice inventory](backoffice-inventory.md).

## Services delivery (2026-10-10)

The lazy Services feature adds scoped catalog management, COP policy forms, existing-resource assignment, independent moderation and immutable history. Forms distinguish appointments and lodging; veterinary requires a verified credential and dedicated capacity-one resource, revalidated by the API. SignalStore mutations exclude in-flight duplicates and require explicit reconciliation after conflicts or uncertain outcomes. The first clinical form uses an accreditation UUID, not a professional picker. Resource/calendar/block and booking screens are implemented in their own operational deliveries. See [Backoffice Services](backoffice-services.md).

Services verification: 63 Angular unit tests, 68 API unit tests and eight isolated browser scenarios passed. All 59 components are explicitly OnPush. Type/lint/architecture/build/format and 193-operation OpenAPI drift checks passed. Details and tested limitations are in [Backoffice Services](backoffice-services.md).

Resources verification: 74 Angular unit tests, 68 API unit tests and all nine isolated browser scenarios passed. Resource calendars, occupied-capacity protection, blocks/releases, immutable history, Colombia availability and scoped permissions are covered. All 63 components are OnPush; contract drift checks cover 194 API operations. See [Backoffice resources](backoffice-resources.md).

## Bookings delivery (2026-10-10)

A lazy Bookings feature adds explicit company scope, accepted-name search/status/service/paging in URL, accepted appointment/lodging policies, provider decisions and revision history. Guards reflect bookings.manage; the API remains authoritative. OnPush/Signals/zoneless/Tailwind, generated DTOs, Zod Mini, gateway/HTTP adapter and page-scoped SignalStores preserve feature boundaries. Reasons, confirmation and expectedVersion protect changes; conflicts or uncertain outcomes require explicit reconciliation without mutation replay. Colombia dates and minor COP totals are shared formatters. See [Backoffice Bookings](backoffice-bookings.md).

Bookings verification: 85 Angular unit tests, 68 API unit tests and all ten isolated browser scenarios passed. All 67 components explicitly use OnPush, with 194 generated operations. Axe has no violations in tested booking views; the mobile detail has no overflow at 390px and screenshots were inspected. Login Lighthouse is 97/100/100.

## Notifications delivery (2026-10-10)

Personal inbox/count and bounded confirmed reads, versioned optional email preferences and global superadmin delivery recovery are implemented as a lazy feature. Historical notice data never grants current business access. Mutation conflicts/uncertainty require explicit reconciliation. OnPush/Signals/zoneless/Tailwind, generated DTOs, Zod Mini and page-scoped gateway/SignalStore boundaries remain mandatory. See [Backoffice Notifications](backoffice-notifications.md).

Notifications verification: 96 Angular unit tests, 68 API unit tests and all eleven isolated browser scenarios passed. Retry evidence/deadline/idempotency and actual Mailpit delivery, personal read isolation, bulk cutoff, preference conflict/transport uncertainty and mandatory channels are verified. Axe found no violations in tested views; preferences/recovery have no mobile overflow at 390px. Login Lighthouse is 98/100/100; all 74 components explicitly use OnPush, with 194 generated operations. New recovery forms/receipts receive keyboard focus, and desktop sidebar navigation scrolls within low viewports. Docker API/admin are healthy; SPA, proxied readiness and Swagger return 200.

## Orders delivery (2026-10-10)

Lazy Orders management adds explicit business search/status/paging, accepted purchase/contact/split, verified Order payment evidence, sequential delivery/pickup and immutable audit. Reasons, confirmation, expectedVersion, duplicate exclusion and explicit reconciliation after conflicts/uncertainty protect mutations. Current scoped staff permissions are enforced in both UI and API. Real provider integration and payment-attempt/distribution investigation remain separate work. See [Backoffice Orders](backoffice-orders.md).

Verification result (2026-10-10): 107 Angular unit tests, 69 API unit tests and all twelve real browser scenarios passed on disposable infrastructure. Orders covers scoped literal search/paging, accepted allocation and verified capture, sequential delivery/pickup, unpaid cancellation, immutable audit, stale versions, committed-response loss and company/moderator denial. Axe found no violations in tested order views; the detail has no horizontal overflow at 390px. Login Lighthouse is 98/100/100. All 78 components explicitly declare OnPush; types, lint, architecture, builds, formatting and 194-operation contract drift checks passed. The UI-login test helper buffers the real response before browser navigation, avoiding Chrome response-body races without changing application login. Docker API/admin are healthy; orders SPA, proxied readiness and Swagger return 200, anonymous orders return 401. No shared development fixtures or real gateway operations were created.

## Payments delivery (2026-10-10)

Lazy Payments adds explicit platform/business scope, status/paging/UUID lookup, accepted immutable split and distinct buyer approval/seller distribution, audit and on-demand normalized financial evidence. Superadministrator reconciliation requests an authoritative background lookup with a strict empty body and a same-version queue receipt; disabled/incompatible provider or unknown policy keeps the UI action disabled. Duplicate exclusion and explicit review after uncertain/conflicting writes apply. See [Backoffice Payments](backoffice-payments.md). The actual gateway remains unconfigured; no bank balance, simulated paid shortcut or refund action is exposed.

Payments verification: 131 Angular unit tests, 71 API unit tests and all thirteen isolated browser scenarios passed. All 82 components explicitly use OnPush; generated contracts cover 194 operations. Axe found no violations in tested financial views, mobile detail has no horizontal overflow at 390px, screenshots were inspected and login Lighthouse is 98/100/100. Types, lint, production builds, format and architecture checks passed. Suspended-business platform oversight and ordinary staff denial, mismatched provider evidence, disabled-provider 503 and late-private-response suppression are covered. No shared fixtures or real money operations were created.

Animals now provides shelter-scoped private listing, creation, profile editing, authenticated photograph upload/preview/removal, death/archive decisions and history. It uses generated contracts, explicit shelter context and version checks. All five feature components use OnPush. Suspended shelters and foreign/personal records are denied; adoption publication and handover remain separate. See [Backoffice Animals](backoffice-animals.md).

Animals validation: 155 Angular units, 72 API units and 14 isolated browser scenarios passed. Types, lint, production builds, architecture and generated-contract checks passed; 87 components explicitly use OnPush. Animal creation/detail/photo/archive/list accessibility checks found no Axe violations, and the list fits at 390px. See the feature document for the tested boundaries and manual checks.

Adoptions publications now has shelter-context listing, preparation, safe snapshot submission, independent global moderation with authenticated photo preview, pause/archive and operational history. Six OnPush components use generated DTOs, gateway/mappers and scoped SignalStores. Applicant/request/hand-over UI is now delivered in the separate adoption requests feature. See [Backoffice Adoptions](backoffice-adoptions.md).

Adoptions publications verification: 175 Angular units, 72 API units and 15 isolated browser scenarios passed. All 93 components explicitly use OnPush; generated contracts cover 195 operations. The refuge/moderator workflow, photo eligibility/privacy, rejection/renewed approval, pause/archive, stale versions and permission boundaries passed. Axe found no violations in tested views and moderation fits 390px without horizontal overflow. Request/hand-over UI is delivered in the adoption requests feature.

## Shelter adoption requests

Publication-scoped request management and explicit handover are implemented. See [Backoffice adoption requests](backoffice-adoption-requests.md) for permissions, privacy, consent/version checks, atomic completion and manual checks. Customer application screens remain planned.

Current request delivery verification: 194 Angular unit tests, 16 isolated browser scenarios, types/lint/build/architecture passed; all 96 components explicitly OnPush. See the module verification notes for privacy, consent, handover and runtime details.

## Company product management UI

Business product operations are available in `/productos`: scoped lists, profile, COP variants, private photos, publication submission, pause/archive and audit. Independent moderation remains in `/catalogo`; inventory keeps stock ownership. See [Backoffice products](backoffice-products.md) for permissions, architecture, currency constraints and manual checks.

## Operational closure

Own account/security and actual email action routes, own team/profile/history access, private veterinary preparation and named eligible selection, COP commercial conditions, administrative user anonymization and organization archival are now included. The earlier historical delivery counts above describe those deliveries; use the current [readiness checklist](backoffice-readiness.md), [account](backoffice-account.md) and [commercial policy](backoffice-commercial.md) documents for the final scope and boundaries.

## Shared browser HTTP-body capture

`tests/helpers/responses.ts` preserves actual API responses independently of Chromium navigation. `signIn` enables it on each authenticated test page; the direct login-body scenario enables it explicitly. Body-reading assertions resolve the retained response by the original Playwright Request identity. Only relevant command responses, login and explicit availability reads are buffered; background reads and session refresh keep the original browser transport. The helper forwards actual status, headers and body, with original authentication/payload/version and no transport retries or redirects. Test-specific lost-response routes retain precedence. This addresses the same CDP body-discard race observed in both Bookings and Catalog without fabricating business responses or changing application code.

Shared-capture verification: all 19 real browser scenarios passed on disposable PostgreSQL/Redis/Mailpit; Angular typecheck and test lint passed with no errors. Lighthouse remained 98/100/100.
