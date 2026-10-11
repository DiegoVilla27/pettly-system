# Backoffice Payments

## Purpose and boundaries

The lazy Angular Payments feature investigates payment attempts, accepted commission allocation, provider distribution and immutable history. It calls the Payments API through a feature-owned gateway. Payment confirmation and provider integration remain server responsibilities; the backoffice has no mark-paid, transfer, refund or checkout creation action.

All four components explicitly use OnPush. The application remains zoneless, with Signals, page-scoped NgRx SignalStores, typed reactive filters and Tailwind styles. Models derive from the generated OpenAPI client; Zod Mini validates inputs and projects bounded responses into view models. Features do not import backend code or other feature internals. Private information stays in memory.

## Navigation and authorization

- `/pagos`: status filters, page/limit in the URL, explicit platform or company scope, and UUID lookup inside the applied scope.
- `/pagos/plataforma/:paymentId`: superadministrator oversight, including suspended sellers.
- `/pagos/empresa/:organizationId/:paymentId`: company-context detail, checked against the returned organization identifier.

`payments.business.read` in an active business permits company listing/detail/history. Company discovery is limited to authorized memberships for staff; superadministrators search active businesses, with at most 20 results. The platform list sends `scope=platform` without organizationId. Company lists send `scope=own` **with** an explicit organizationId; there is no accidental buyer-only fallback. A platform URL combined with organizationId is rejected locally.

Platform oversight, financial evidence and reconciliation require `payments.platform.manage` (superadministrator). Lazy guards prevent loading the platform route for other staff. The API remains authoritative: UI permissions cannot grant API access. A suspended business does not remove the independent platform permission; ordinary company administrators lose business financial access, while buyers retain their own-payment rights.

## Contracts

| Operation                      | Use                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `listVisiblePayments`          | Bounded attempt list by explicit scope, payment status and pagination                          |
| `getVisiblePayment`            | Attempt and immutable accepted allocation                                                      |
| `listVisiblePaymentHistory`    | Audit, page size 20, system/user actor and request correlation                                 |
| `getPaymentPolicy`             | Current provider availability; current commission is not historical allocation                 |
| `getPaymentFinancialEvidence`  | On-demand superadministrator evidence, up to 100 events and 100 capture records                |
| `requestPaymentReconciliation` | Strict empty body `{}`; requests an authoritative lookup through durable background processing |

The financial scheduler currently runs inside the API; the separate worker handles notifications. Moving financial execution to that worker is future operational work. The reconciliation request can return the same version and status. Its receipt says a query was requested, not that funds were confirmed. There is no invented reason, expectedVersion or client money/status field in that command. A disabled or incompatible provider returns 503; the UI disables the action when the provider is unavailable, incompatible or its policy cannot be validated. Unknown policy never enables reconciliation.

## Money and evidence

Pettly currently operates in Colombia and COP. Integer minor units use two decimal places: 100 units represent COP 1. Accepted commission basis points, product subtotal, platform allocation and seller allocation are shown from the attempt snapshot, not recalculated using today's configuration. Validation checks safe integers, total conservation and exact BigInt half-up rounding. `PETTLY_COMMISSION_PERCENT` remains the configuration for future accepted quotes/orders.

Buyer approval and seller distribution are independent. `feeMinor=null` means the charge is not yet reported; zero is displayed as zero. Seller allocation is shown **before processing charges**, without promising a net payout or bank balance. Capture evidence does not prove distribution, bank credit or order delivery. Arbitrary checkout links are omitted from the view model.

Normalized provider observations may legitimately have the wrong amount, currency, reference or payment identifier. The evidence view preserves and highlights these discrepancies instead of replacing accepted amounts or rejecting the evidence as a malformed accepted payment. Observed amounts and fees are displayed in their original minor units/currency. Ledger splits must conserve total. The bounded last-100 view is not a complete accounting statement; audit pagination can contain repeated versions for reconciliation requests.

## Concurrency, errors and accessibility

Read streams cancel obsolete requests and clear old private values. Writes use exhaustMap to exclude duplicate clicks; a late response cannot populate a different route. Conflicts, uncertain transport/server failures and queued-request receipts require explicit refresh/history review before another request. There is no automatic mutation replay or periodic provider polling from the browser. Authentication, authorization or not-found failures clear detail/history/evidence. Provider policy failures leave reconciliation disabled.

Filters have visible labels, invalid UUID/company feedback and keyboard focus for invalid company selection. Loading and command outcomes use live regions; controls use at least 44px touch targets, clear focus styles and responsive, wrapping identifiers. History uses Colombia time. Evidence loads only when a superadministrator opens it and is cleared when hidden or access is lost.

## Provider prerequisite

The actual ePayco integration/onboarding, credentials, authoritative webhooks and real split/refund handling remain pending, as described in [Payments](payments.md). Production runtime still uses the disabled provider. Automated provider observations use a restricted test port against disposable `pettly_test` infrastructure; they do not enable a simulated production gateway or move real money.

## Verification

Unit coverage checks contract projection, accepted allocations, safe-integer boundary rounding, context/status/pagination mismatches, provider discrepancies, repeated audit versions, nullable fees, strict empty reconciliation body, duplicate command exclusion, same-version receipts, conflicts, uncertain outcomes, cancelled reads, late writes and revoked access. API tests cover suspended-seller platform oversight and rejection of non-platform staff, without bypassing dependency/authentication failures. Browser coverage uses isolated PostgreSQL/Redis/Mailpit and public commerce APIs to prepare real attempts, then tests list/detail/history/evidence/permissions and disabled-provider behavior. See the latest verification entry in [DESIGN.md](../DESIGN.md) for executed results.

Executed results (2026-10-10): 131 Angular unit tests, 71 API unit tests and all 13 real browser scenarios passed on disposable infrastructure. All 82 application components explicitly use OnPush. Types, lint, builds, format, both architecture checks and OpenAPI drift checks (194 operations) passed. Axe reported no violations in tested financial views, mobile detail has no overflow at 390px and desktop/mobile captures were reviewed. Login Lighthouse: performance 98, accessibility 100, best practices 100. Successful reconciliation receipts and uncertain failures are covered by unit doubles because the actual runtime provider is disabled; the browser verifies the disabled action and real API 503.

Local runtime: [Payments backoffice](http://localhost:4300/pagos), [Swagger](http://localhost:3100/api/docs), JSON at `/api/openapi.json`. Rebuilt API/admin containers are healthy; SPA/readiness/Swagger return 200, anonymous Payments returns 401. This update explicitly disables startup migrations with RUN_DATABASE_MIGRATIONS=false and confirms the running container flag; there are no schema changes or shared database fixtures. The independent financial scheduler retains its existing runtime responsibilities.
