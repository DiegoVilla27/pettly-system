# Payments module

Status: core implemented; real provider checkout, seller onboarding, webhook adapter and external refunds are pending. Updated: 2026-10-09. Architecture: [DESIGN](../DESIGN.md). Related modules: [Orders](orders.md), [Inventory](inventory.md), [Authorization](authorization.md), [provider onboarding](payments-provider-onboarding.md).

## Purpose and business model

Pettly initially serves Colombia and accepts commercial payments in COP. A provider will collect and split funds between the seller and Pettly. The preferred integration is ePayco aggregator with Smart Checkout, subject to marketplace activation and commercial confirmation. No ePayco account, credential, real charge, transfer or refund has been created by this implementation.

Payments owns payment attempts, accepted allocations, authoritative provider observations, capture evidence, distribution status, audit and a transactional job outbox. Orders owns buyer consent, deadlines, inventory consumption and fulfillment. Modules collaborate through OrderPayments; Payments never writes Orders/Inventory tables directly. All identifiers are UUIDs.

## Commission configuration

The approved initial rate is **10%**. Set the single variable in the root `.env`:

```dotenv
PETTLY_COMMISSION_PERCENT=10
```

Change to e.g. `12.5` to charge 12.5%, then restart the API; for Compose, recreate it with `docker compose up -d api`. The same variable is in `.env.example` and forwarded by Compose. Missing variable defaults to 10. Only 0–100, with at most two decimals, is accepted; invalid values stop startup. Credentials remain separate and secret. No percentage-editing HTTP endpoint, database policy editor or arbitrary seller override is introduced.

New quotes snapshot policyId, rateBasisPoints, calculation base, baseMinor, platformMinor, sellerMinor, totalMinor and processingFeeBearer. The policy identifier includes the calculation rule revision and rate. Order confirmation revalidates this snapshot; a rate change requires obtaining and accepting a new quote. Once an order is accepted, subsequent configuration changes do not alter its allocation or payment attempts.

**Calculation rule:** commission applies to product subtotal, excluding shipping and separately added taxes. When product prices already include taxes, those embedded taxes remain in the base. This is the implemented simple rule and replaces the earlier proposed exclusion of all product taxes, which would require an unavailable fiscal breakdown. Current commerce has no discount engine; future discounts must define their effect on this base explicitly.

Amounts use integer minor units, currently 100 minor units = COP 1. The commission is rounded half-up once on the entire product subtotal using BigInt intermediate arithmetic; seller share is the exact total remainder. Rate basis points use 100 = 1%. Processing fees are borne by the seller separately under the proposed commercial agreement. No gateway price is guessed or deducted locally: feeMinor remains null until authoritatively reported. sellerMinor is the gross allocation before those deductions, not a guaranteed net bank credit. Tax on Pettly's commission, withholding, invoicing and contractual fee disclosure still require confirmation before actual charging.

Example: product subtotal COP 100,000, shipping COP 10,000, additional product tax COP 19,000 → customer total COP 129,000, Pettly gross allocation COP 10,000, seller gross allocation COP 119,000 before provider deductions. Embedded-tax products use their listed subtotal instead of inventing a tax subtraction.

## Hexagonal architecture and ports

- Domain: Payment aggregate, payment/distribution transitions, immutable allocation, exact integer validation; no Nest/Prisma/Zod imports.
- Application: explicit commands, queries, handlers, results and repository/provider/policy ports.
- Inbound adapters: authenticated HTTP controllers, separate strict Zod request/response DTOs, HTTP mappers and English Swagger; recoverable scheduler.
- Outbound adapters: Prisma repositories and persistence mappers, environment commission policy and DisabledPaymentProvider.
- Composition: PaymentPolicyModule exports the policy independently; Orders depends on that small module, while Payments depends on Orders' public port. No circular Nest dependency.

PaymentProvider.createCheckout must validate approved recipient onboarding, use payment UUID as durable provider idempotency identity, use server-calculated allocations and never create a new charge/session after expiresAt. PaymentProvider.lookup must query authoritative provider state by reference or durable identity after an ambiguous response. Its eventId identifies a stable provider observation/revision, not a fresh random UUID on every poll. Raw browser redirects or webhook payloads cannot confirm payment.

The only runtime provider is disabled (`provider=unconfigured`, `providerEnabled=false`). Attempts can be prepared and inspected but checkoutUrl stays null and no external call occurs. There is no environment switch that enables a fake successful payment. The test provider exists only in isolated tests; the helper requires NODE_ENV=test and loopback pettly_test and is excluded from application builds. A real provider adapter and credentials will be added separately after account activation.

## Payment lifecycle and safety

- created: accepted order allocation plus audit and checkout job persisted atomically; nothing submitted externally.
- processing: persisted before contacting the provider; a timeout may mean an external operation succeeded, so a replacement attempt is blocked.
- pending: provider checkout/session exists or authoritative state is pending.
- approved: exact provider-approved amount/currency/identity, capture evidence, matching paid Order and inventory consumption committed in one PostgreSQL transaction.
- declined/cancelled: authoritative negative outcome; the existing unpaid order may receive another attempt before its deadline.
- expired: only a never-submitted created attempt may expire locally. Already submitted attempts require authoritative reconciliation.
- reconciliation_required: mismatch, late collection, a conflicting active attempt or closed order; records financial evidence without restoring an expired order, reserving new stock or pretending a refund succeeded.

One unresolved/approved attempt blocks new attempts at the application boundary; a partial unique index also protects live created/processing/pending/approved attempts. Reconciliation records may coexist with a newer attempt to preserve evidence of late/double collections. Buyer/key uniqueness and order-scoped locks protect concurrent creation; same key/order replays the same attempt even after closure, a different order conflicts.

Provider event IDs are unique per provider. Reusing one with changed payment/fingerprint is a conflict; exact replay has no duplicate capture or inventory movement. Old pending/negative observations do not erase an approved payment. Distribution remains independently unconfirmed/pending/distributed/failed; once confirmed distributed it cannot be silently downgraded. Approval is not delivery, bank settlement or proof that Pettly may hold funds until delivery.

New order reservations now last thirty minutes, within Inventory's existing maximum. Existing order deadlines/snapshots are not modified. New checkout requires COP, Colombian contact and Colombian pickup location where applicable; the Catalog and historical response schemas retain generic currencies. Legacy orders lacking accepted commission cannot be retrofitted into a new payment; obtain a new checkout. The old collector field remains legacy commercial metadata and is not consulted to route Payments funds: the immutable allocation defines the split.

PSE can remain pending for twenty minutes according to provider documentation. Thirty minutes is an initial stock window, not a guarantee that all final events arrive within it. Pending/uncertain attempts continue to reconcile after expiry. A late exact approval creates capture evidence and reconciliation_required, leaving the expired/cancelled order closed. Cash methods remain deferred until an appropriate reservation policy exists. Actual refunds are not yet implemented; reconciliation-required collections must be resolved with the provider before enabling live commerce.

## Durable processing and concurrency

Every prepared attempt creates its checkout outbox job in the same transaction as its audit. A scheduler runs in the API at startup and every fifteen seconds, scanning at most twenty due jobs. PostgreSQL is the source of truth: per-job leases, durable attempts/nextAt/error category, one-minute lease recovery and exponential backoff capped at five minutes. Multiple API instances can recover jobs after restart; advisory locks and lease identity prevent stale completion. Redis availability does not control payment balances, event uniqueness or outbox recovery.

External calls happen outside database transactions. Persist processing intent first; after a timeout, retry through authoritative lookup rather than creating another checkout. A real adapter must enforce bounded request timeouts shorter than the lease and provide lookup by durable identity. Persist session/result only under the current lease. Reconciliation polls every thirty seconds until a negative terminal outcome, an issue requiring intervention, or approval plus confirmed distribution. Distributed/closed jobs remain recorded and can be explicitly reconciled by superadmin.

Disabled-provider created attempts schedule their local expiry without polling an external service. They must be recreated through a new valid checkout after a real provider is configured; provider identity is immutable. Job failures store safe categories, never exception bodies/credentials. This is at-least-once processing, not a claim of exactly-once external delivery. Moving financial execution to the separate worker is future operational work; that worker currently handles notifications only.

## Database tables and fields

Migration `202610090010_payments_core` creates five tables, plus allocation/payment guards and the thirty-minute upper order window:

| Table                   | Fields and update behavior                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| payment_attempts        | id UUID; orderId/buyerId/organizationId FKs; buyer idempotencyKey; immutable provider, allocation JSON, amountMinor bigint, COP currency, expiresAt and createdAt. reference binds the provider operation once known; checkoutUrl appears after session creation. status, separate distributionStatus, nullable actual feeMinor, version and updatedAt change through audited transitions. Never deleted. |
| payment_provider_events | id UUID; paymentId FK, provider/eventId unique identity, private fingerprint, normalized observation JSON, outcome and createdAt. Insert after authoritative lookup inside reconciliation transaction; append-only, no raw provider/card payload.                                                                                                                                                         |
| payment_ledger_entries  | id UUID; paymentId/eventId FKs, kind=capture, amountMinor/platformMinor/sellerMinor bigint and createdAt. One capture per attempt, exact accepted allocation and provider evidence; append-only. Not a full accounting general ledger, refund ledger or bank statement.                                                                                                                                   |
| payment_audit_entries   | id UUID; paymentId, version, action, nullable actorId FK, requestId and createdAt. Each revision requires a matching immutable audit. System reconciliation/scheduler actions use null actor; manual reconciliation requests retain the administrator.                                                                                                                                                    |
| payment_outbox_jobs     | id UUID; paymentId FK, checkout/reconcile kind unique per attempt, queued/retry/done status, attempts, nextAt, nullable leaseId/leaseUntil, safe lastError and timestamps. Created atomically, leased before work, rescheduled on pending/failure, completed after terminal handling. Identity remains immutable.                                                                                         |

Database guards enforce accepted order identity/allocation, integer money conservation, immutable commercial terms/reference, legal revisions, audited state, approved-payment/paid-order consistency, authoritative capture evidence, append-only financial histories and unique provider/idempotency identities. Lock order is user (when applicable) → organization → order → payment/order → job; provider-event locks serialize duplicate observations. No unrelated shared database or Redis keys are touched.

## HTTP contracts and permissions

Swagger: http://localhost:3100/api/docs; JSON: http://localhost:3100/api/openapi.json. All endpoints require an active verified account with access JWT and use no-store. Unknown fields are rejected on requests and responses; idempotency internals/fingerprints are omitted.

| Method and path                             | Contract and scope                                                                                                                                  |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /api/payments/policy                    | Current commission and provider availability; every verified customer.                                                                              |
| POST /api/orders/{orderId}/payment-attempts | Own live order only; `{idempotencyKey: UUID}`. Returns prepared attempt, HTTP 201 also on replay; amount/recipients/status are never client inputs. |
| GET /api/payments                           | Own by default; optional status/page/limit. organizationId requires owning business financial access; scope=platform requires superadmin.           |
| GET /api/payments/{paymentId}               | Buyer or owning active business financial administrator.                                                                                            |
| GET /api/payments/{paymentId}/history       | Same visibility; bounded audit pagination.                                                                                                          |
| GET /api/payments/{paymentId}/financials    | Superadmin only; latest hundred normalized observations and capture entries.                                                                        |
| POST /api/payments/{paymentId}/reconcile    | Superadmin; strict empty body `{}`. Schedules authoritative lookup, returns 201; provider disabled/incompatible returns 503.                        |

payments.self.manage belongs to all global customer roles. payments.business.read belongs to business_admin within its active business and superadmin with compatible active business scope; business_operator, adoption roles and moderator receive no business financial access. payments.platform.manage belongs only to superadmin. None authorizes arbitrary mark-paid, refunds or payouts. Platform-scoped queries/evidence allow superadmin to investigate financial issues even after a seller is suspended.

GET returns 200. Lists/history default page=1/limit=20, max page=10000/limit=50. 400 invalid/extra fields, 401 auth, 403 current permission, 404 missing/non-owned order, 409 stale/closed/duplicate attempt or conflicting idempotency, 429 rate limit, safe 500/503 dependency failures. No public webhook, test checkout, mark-paid, refund or manual distribution endpoint exists.

## Manual checks

1. Verify GET payments/policy shows percent=10 and providerEnabled=false.
2. Configure an eligible business, publish/stock products, quote and confirm a COP/Colombia order through Cart/Orders. Inspect snapshot.commission and thirty-minute expiresAt.
3. POST an own payment attempt with a UUID retry key. Verify exact allocation, status=created, checkoutUrl=null and feeMinor=null; this does not move money.
4. Retry the same key, including simultaneous requests: one attempt/outbox. A new key while unresolved returns 409. Inject amount/status/recipients: 400.
5. Check own history, business-admin own-business list, unrelated-customer/operator denial, and superadmin platform search/financial evidence.
6. As superadmin, reconciliation while provider disabled returns 503. Wait until the unpaid deadline: local attempt/order expire and stock releases; no gateway operation occurred.
7. Change PETTLY_COMMISSION_PERCENT, restart API, read current policy and create a new quote. Existing orders retain their original commission; an old unconfirmed quote needs renewal.

## Remaining provider work and sources

Account activation, verified seller recipients, ePayco adapter, checkout UI, signed webhook intake with authoritative lookup, sandbox verification, actual full/partial refunds and split reversals, chargebacks, seller settlement reports, fiscal invoices and commission-tax treatment remain pending. Refunds must reverse appropriate allocation and consider already distributed funds; do not invent method availability or refundable provider fees. See the [prepared inquiry](payments-provider-onboarding.md).

Research references: [ePayco split activation](https://docs.epayco.com/docs/split-descripcion), [Smart Checkout](https://docs.epayco.com/docs/checkout-implementacion), [confirmation and PSE pending states](https://docs.epayco.com/docs/url-de-confirmacion). General [public rates](https://epayco.com/tarifas/) are not a marketplace quote. Provider-managed split is not certification of Colombian legal/tax compliance; the [reviewed DIAN concept](https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_10815_2024.htm) must be applied to Pettly's actual intermediary contracts with professional advice.

## Verification

Domain/application tests cover percentage parsing, BigInt rounding, immutable accepted rate, idempotency, late collections, separate distribution, stale observations and ambiguous provider recovery outside transactions. Isolated HTTP/PostgreSQL tests cover concurrent creation, permissions, strict contracts, outbox rollback, ledger/audit failure rollback including paid Order/stock, duplicate capture, immutable SQL evidence, mismatch, late success and local expiry. The test adapter is never registered in the application.

Verification result (2026-10-09): all 49 unit tests and 52 isolated integration scenarios passed (53 results including the suite). API/worker lint, typecheck and build, architecture boundaries, Prisma validation and formatting passed. OpenAPI contains 132 operations, seven in Payments. Migration 010 was tested from scratch in temporary infrastructure.

Local deployment verification: Docker image built; migration 010 applied only to dedicated pettly_db on shared-network. Five payment tables and nine payment/quote triggers verified; attempts/events/capture counts remained zero. API and notification worker are healthy. Swagger returned 200 with seven Payments operations; unauthenticated policy access returned 401. PETTLY_COMMISSION_PERCENT is configured as 10 in the ignored local .env. No real orders, charges, transfers or refunds were created by verification.
