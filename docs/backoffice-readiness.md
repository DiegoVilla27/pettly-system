# Backoffice scope and readiness

This document is the closure checklist for the implemented administrative scope, not a claim that every future Pettly business capability is delivered. The backoffice is Angular standalone, explicitly OnPush in every component, Signals/NgRx SignalStore, zoneless, Tailwind 4, lazy routes and feature-specific generated DTO/gateway/mapper boundaries. Authorization always remains in NestJS.

## Operational coverage

| Area                        | Delivered administrative workflow                                                                                                                       | Main authority                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Access/account              | Login, refresh, logout, invitation, verification/recovery/email links, own profile, password/email changes, own sessions and account deletion           | Own account; current staff access required for shell                                   |
| Users                       | Search/paging, invitations/resend, detail/edit, status, global role, organization memberships, audit and anonymization                                  | Superadministrator                                                                     |
| Organizations               | Creation/profile, submission/review, responsible account, suspension/reactivation, team and audit, archive; own team/profile/history access             | Global administration; own organization administrators                                 |
| Veterinary                  | Owner preparation/profile/private evidence/submit, private detail and audit, independent approval/rejection/revocation, eligible professional selection | Owner or superadministrator for evidence; independent superadministrator for decisions |
| Catalog/products            | Categories, own products/variants/photos/submit/pause/archive, independent publication review and history                                               | Business staff; independent moderation                                                 |
| Inventory                   | Stock balances and audited movements by company/variant                                                                                                 | Scoped business staff                                                                  |
| Resources/services/bookings | Resource schedules/blocks, availability, service policy/publication, reservation decisions and history                                                  | Scoped business staff; independent publication moderation                              |
| Commercial policy           | COP pickup/shipping/explicit tax/terms and immutable history                                                                                            | Business administrator or superadministrator                                           |
| Orders/payments             | Accepted order policy/split, delivery decisions/history, verified payment evidence/distribution and provider reconciliation where enabled               | Scoped business staff; platform oversight for superadministrator                       |
| Animals/adoptions           | Private shelter records/photos, publication preparation/review, requests and explicit handover/history                                                  | Shelter staff; independent publication moderation                                      |
| Notifications               | Personal inbox/preferences and global failed-delivery recovery                                                                                          | Own account; superadministrator for recovery                                           |

Global roles remain `user`, `moderator` and `super_admin`; organization roles remain `business_admin`, `business_operator`, `adoption_admin` and `adoption_operator`. Only the superadministrator assigns roles. A person can have several independent memberships. Current status, membership and permission govern each action; historical records never grant new access.

## Closure safeguards

Writes use explicit reasons, confirmation and version checks where the API supports them. Duplicate submissions are excluded. Conflict, transport failure or unknown server outcome requires checking current data before another mutation. Administrative user, organization, category and veterinary stores were brought into the same reconciliation behavior as the newer features. Private responses from an earlier context/refresh cannot overwrite current state. Deleted records and revoked credentials are not reactivated by UI shortcuts.

Email actions now have working backoffice routes. Local Docker's `WEB_PUBLIC_URL` targets port 4300; configure the same public origin in API and worker. The local PostgreSQL/Redis shared infrastructure is never used for browser fixtures: tests provision disposable project-scoped PostgreSQL, Redis and Mailpit.

Organization history now authorizes current administrators of that organization, with archived history still restricted to superadministrators. Operators and foreign memberships are denied.

The API gained two narrow veterinary reads: own credential listing, deriving ownership server-side, and a minimal eligible-professional projection. The latter returns no documents, registration number, university or verification reference, and rechecks the account, current membership, Colombian business, approval/expiry and dedicated agenda.

## Boundaries outside this closure

- Real ePayco split activation, credentials, seller onboarding and settlement agreement still require the provider. The UI exposes no fabricated capture, bank balance, refund or payout.
- Customer storefront, cart, checkout and customer adoption/reservation screens belong to Next.js/Flutter. Existing customer API operations are not missing backoffice actions.
- A future reports permission is not a delivered reporting API. Custom reports, bulk financial exports, legal document review and any further business operations require defined contracts and separate implementation.
- Production deployment, official professional-register verification, delivery provider configuration and operational recovery depend on the actual environment. The backoffice records an authorized review; it does not certify a professional automatically.

## Verification

The automated suite covers the existing operational features plus the new own account/clinical/commercial/team closure. Run:

```sh
pnpm nx run-many -t typecheck lint architecture -p admin api
pnpm nx test admin
pnpm nx test api
pnpm api-client:check
pnpm nx run admin:test:integration
```

Browser verification uses real HTTP, SQL, worker and email; Axe checks WCAG A/AA views and explicit 390px overflow checks cover the new account/team flows. Production bundle budgets and login Lighthouse are checked by the integration harness. Detailed manual scenarios are in the corresponding module documents.

Latest closure verification (2026-10-10): 252 Angular unit tests, 80 API unit tests and 19 real browser scenarios passed. Typecheck, lint (no errors), architecture and formatting passed; all 114 Angular components explicitly use OnPush. OpenAPI/client contains 197 operations. Login Lighthouse scored 98 performance, 100 accessibility and 100 best practices. Own account/team mobile screenshots were visually reviewed, and the clinical/commercial/team scenario verifies real persisted policy, private evidence, eligible selection, own audit and irreversible archive.

Local delivery: API, worker and admin images were rebuilt and all three containers are healthy. Account, commercial conditions, own veterinary and recovery routes return HTTP 200 on port 4300; proxy readiness and Swagger return 200. Anonymous own/eligible veterinary reads return 401. Shared PostgreSQL uses the existing schema; `RUN_DATABASE_MIGRATIONS=false` was verified for this restart.
