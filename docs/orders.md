# Orders module

Status: implemented checkout and unpaid order lifecycle, with a trusted payment confirmation port. Updated: 2026-10-09. Architecture: [DESIGN](../DESIGN.md). Related modules: [Cart](cart.md), [Catalog](catalog.md), [Inventory](inventory.md), [Authorization](authorization.md).

## Purpose, scope and architecture

Orders owns business commercial configuration, server-calculated checkout quotes, accepted immutable purchases, fulfillment state and audit history. It consumes CartCheckout, CatalogAccess, InventoryUseCases (advisory availability), OrderStock (transactional reservations) and Authorization public application ports. It exposes OrdersUseCases to HTTP and OrderPayments exclusively to trusted Payments infrastructure. No provider, charge, browser payment confirmation or public mark-paid endpoint is implemented.

Pure Order aggregate and checkout address/money/policy value contracts sit in Domain. Application contains explicit commands, queries, handlers, results and repository/input ports. Inbound adapters contain controllers, separate strict request/response Zod DTOs, HTTP mappers and a recoverable expiration scheduler. Outbound Prisma repository and persistence mapper own these tables. Nest composes ports; no Domain/Application imports Nest, Prisma or another module's internals.

## Approved payment direction

The approved initial market is Colombia, with COP-only commercial operations and provider-managed split payments between the seller and Pettly. [Payments](payments.md) describes this approved design and pending integration. New checkout now enforces Colombia/COP and snapshots commission allocations. Generic historical currency/collector contracts remain readable; Payments routes the new flow by explicit allocation rather than the legacy collector metadata. Historical order snapshots remain immutable.

## Commercial configuration and quote

An active business administrator or superadministrator with `orders.settings.manage` explicitly configures currency (COP/USD/EUR), enabled flag, pickup contact/address and/or up to 30 fixed country/city shipping rules, tax policy, collector and accepted terms. Business operators can fulfill orders but cannot change commercial settings. There is no automatically enabled policy, guessed shipping rate or inferred jurisdiction tax.

`expectedVersion=0` creates the first configuration. Updates require its current version, audited justification, immutable revision snapshot and version increment. Duplicate cities within one country (case-insensitive) and negative/fractional fees are rejected. Delivery requires exact configured country/city coverage; pickup requires a configured address. Contact uses recipient, E.164 phone, ISO country, city, street address and optional addressLine2/postalCode. For pickup the contact still includes the customer's contact address; pickupAddress is separately snapshotted.

- `taxMode=included`: listed prices already include applicable taxes; no additional tax rates or shipping tax are accepted. Quote `taxMinor=null` avoids claiming the included tax breakdown is zero.
- `taxMode=added`: explicit integer basis points (0–10000, where 100 is 1%) for every purchased variant; explicit zero is permitted. Shipping has its own basis points. Up to 50 own-business variant rates per configuration. Missing rates block checkout.
- Additional tax rounds half-up per extended line and shipping charge using integer arithmetic. Price/amounts are safe integer minor currency units. Currency precision remains 100 minor units for currently supported currencies.
- `collector=seller|platform` records the chosen future payment beneficiary. It neither provisions merchant accounts nor enables charges, settlement, commissions or fiscal invoicing.

Quote creation requires a current nonempty own cart. It rechecks current business/category/product publication, variants, prices, available inventory, policy currency, delivery coverage and taxes. It stores immutable products/SKUs/attributes/product versions, quantities, amounts, customer contact, pickup address, shipping, tax policy, collector, terms and policy version. A UUID quote expires after five minutes. It holds no stock and reading it never extends validity.

The customer must explicitly accept its exact total and terms. A changed cart version, price/product revision, commercial policy or delivery conditions requires a new quote; the system never silently charges a replacement total. Snapshot comparison is structural, independent of PostgreSQL JSON key ordering.

## Confirmation, idempotency and inventory

POST order accepts quoteId, expectedTotalMinor, literal consent=true and a buyer-scoped idempotency UUID. One PostgreSQL transaction writes the unpaid Order and its snapshot, reserves every line with order-linked hold UUIDs, clears that exact cart version and appends the creation audit. Any failed line or audit rolls everything back.

Buyer/key and quote uniqueness prevent duplicate purchases. Identical concurrent/repeated requests return the same order, even after cart clear or closure. Reusing a key with different quote/total/consent returns 409. Replaying creation does not charge or re-reserve stock. Prices, product names/SKUs, quantities, delivery, taxes, terms and accepted total remain immutable after catalog/policy changes.

Order holds are foreign-key bound to their Order, with exact variant, business, quantity and deadline matching each snapshot line. Operational Inventory release/consume endpoints reject these holds. Reserved units cannot be physically issued. Stock ledger and order status agree through deferred PostgreSQL guards. Hold expiry persists in PostgreSQL; no Redis TTL is required for correctness.

Locks serialize actor/user changes, own cart, owning business, order, sorted products, taxonomy and sorted variant stock. Nested repository calls share the existing AsyncLocalStorage transaction. Current implementation serializes mutations within a business using its organization lock; reducing this contention requires measured load and preserving authorization/publication consistency.

## Lifecycle and trusted payment boundary

`awaiting_payment` expires thirty minutes after confirmation. Buyer or owning active-business fulfillment staff can cancel only this unpaid state with current version and reason. All reservations release atomically. Buyer retains own history and can cancel unpaid orders even when a seller is suspended; business operations require current active organization scope.

A bounded expiration scheduler runs at startup and every fifteen seconds, scans up to 100 due orders and processes each transactionally. Individual authorized order reads and creation replays also recover deadline expiry. Inventory may independently expire the holds first; Orders recognizes already expired reservations, closes the order and records one immutable expiry audit. Persisted state recovers after restarts and concurrent schedulers; public availability excludes holds after their deadline. A list can briefly show awaiting_payment until recovery completes; expiresAt is authoritative.

`OrderPayments.settleVerified(orderId,paymentId,amountMinor,currency,requestId)` is a trusted application port for Payments authoritative provider reconciliation. It requires an exact amount/currency, unique durable internal payment UUID, unpaid unexpired order and live reservations. One transaction consumes held physical/reserved units, sets paid/paymentId/paidAt and appends a system audit. Exact verified-event replay has no duplicate effects and returns the current order; contradictory replay or payment of a closed/expired order returns 409 for reconciliation. Payment consumption honors an already accepted order snapshot even if the catalog is subsequently withdrawn. A seller's suspension blocks fulfillment; payment reconciliation/refunds will belong to Payments.

Business fulfillment requires `orders.fulfillment.manage`: `paid → preparing → dispatched → delivered` for delivery, or `paid → preparing → ready_for_pickup → delivered` for pickup. No state skipping or unpaid preparation. Paid cancellation returns 409 because a real refund workflow is not yet implemented. No external shipping tracking/integration is implemented; Notifications publishes actual audited fulfilment transitions.

## Storage and guarantees

Migration `202610090009_cart_orders` introduces:

| Table                      | Main fields and updates                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| carts                      | Own persistent selection; documented in Cart.                                                                                                                                                                                                          |
| checkout_quotes            | UUID, buyerId/cartId FKs, cartVersion, immutable JSON snapshot, createdAt/expiresAt. Insert on quote; no update.                                                                                                                                       |
| orders                     | UUID, buyer/business/unique quote FKs, buyer-scoped unique idempotencyKey, private fingerprint, immutable snapshot/totalMinor bigint/currency, status/version, unique nullable paymentId, deadline/paidAt/createdAt/updatedAt. Lifecycle updates only. |
| order_policies             | Business FK primary key, version, JSON commercial settings and updatedAt. Explicit audited create/update.                                                                                                                                              |
| order_audit_entries        | UUID, orderId, revision version, nullable system actorId, action, reason, requestId, timestamp. Unique order/revision; append-only.                                                                                                                    |
| order_policy_audit_entries | UUID, business/actor IDs, revision version, full private configuration snapshot, reason, requestId and timestamp. Unique business/revision; append-only.                                                                                               |

Inventory holds gain nullable orderId FK. Old operational holds retain null. Database guards enforce money/line consistency, bounded quantities, immutable identity/quotes/order snapshots, legal fulfillment transitions, payment/deadline state, complete matching reservations, audited order/policy revisions and append-only histories. Historical orders cannot be deleted through SQL or API. Cross-module writes go through ports sharing the transaction.

Customer contact/order snapshots are private financial/fulfillment records retained when a customer account is anonymized. A jurisdiction-specific retention/redaction policy, quote pruning and invoices are future decisions, not an implemented GDPR retention schedule. Quote expiry does not currently delete stored quotes. No extra Redis business cache is introduced; existing distributed API rate limits remain in force.

## HTTP contracts

Swagger: http://localhost:3100/api/docs; OpenAPI JSON: http://localhost:3100/api/openapi.json. All routes below require an active verified account and access JWT; responses use no-store. Unknown request/response fields are rejected; private fingerprints/idempotency internals are omitted.

| Method and path                                             | Contract/scope                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET /api/organizations/{organizationId}/order-policy        | Owning settings permission; `{policy:null}` until configured.                                                               |
| PUT /api/organizations/{organizationId}/order-policy        | Settings permission; explicit configuration, reason and expectedVersion. Returns `{policy}`.                                |
| GET /api/organizations/{organizationId}/order-policy/audits | Settings permission; bounded historical configuration snapshots.                                                            |
| POST /api/checkout/quotes                                   | Own cart: `{expectedCartVersion,fulfillment,contact}`.                                                                      |
| GET /api/checkout/quotes/{quoteId}                          | Only the buyer; expired quote still readable.                                                                               |
| POST /api/orders                                            | Own accepted quote: `{quoteId,expectedTotalMinor,consent:true,idempotencyKey}`. Returns awaiting_payment, without charging. |
| GET /api/orders                                             | Defaults to own orders; organizationId requires owning fulfillment permission. Optional status, page and limit.             |
| GET /api/orders/{orderId}                                   | Buyer or owning fulfillment permission; lazy deadline recovery.                                                             |
| POST /api/orders/{orderId}/cancel                           | Unpaid only: `{expectedVersion,reason}`.                                                                                    |
| PATCH /api/orders/{orderId}/fulfillment                     | Staff only: `{expectedVersion,reason,status}` for the documented transitions.                                               |
| GET /api/orders/{orderId}/audits                            | Buyer or fulfillment permission; page/limit.                                                                                |

POST returns 201; GET/PUT/PATCH return 200. List/audits default page=1/limit=20, max page=10000/limit=50. Order response includes UUIDs, status/version, immutable snapshot, total/currency, nullable paymentId/paidAt and timestamps. System paid/expired audits have actorId=null; every revision has version and correlation UUID.

400: validation; 401: auth; 403: missing current resource permission; 404: missing order or non-owned quote; 409: stale version, missing policy/coverage/rate, changed quote, insufficient stock, idempotency/lifecycle conflict; 429: rate limit; safe 500/503: persistence/dependencies. There is no public paid transition.

## Manual walkthrough and verification

1. Approve a business, publish a product/variants and receive stock using Catalog/Inventory.
2. As its business admin explicitly configure policy (expectedVersion zero), actual agreed delivery fees, tax treatment, collector and terms.
3. As a verified customer GET cart, add lines, POST a quote and inspect exact totals, conditions and deadline.
4. Try uncovered city, missing tax rate, stale cart, changed price/terms and unknown fields; checkout/confirmation rejects them.
5. POST order with explicit consent, exact total and fresh idempotency UUID; inspect awaiting_payment, empty cart and reserved stock. Retry the identical body: same order, no duplicated ledger.
6. Verify other-customer/company denial and rejection of manual consumption of its inventory holds.
7. Cancel unpaid with version/reason or wait thirty minutes; stock releases and the audit records closure. Preparation before verified payment returns 409.
8. Successful paid fulfillment is tested through the isolated internal-port integration helper. Real manual payment testing awaits provider integration; no development mark-paid shortcut exists.

Verification covers domain seller/currency/quantity bounds, taxes, immutable snapshots, strict contracts, unpaid/paid lifecycle, HTTP ownership/current permissions, coverage, consent, structural JSON snapshot equality, concurrent creation replay, SQL guards, transactional audit failure, trusted exact payment consumption/replay, fulfillment and recoverable expiry. Tests use temporary isolated PostgreSQL/Redis/Mailpit; helper refuses other databases and never exposes an HTTP route.

Payments now implements attempts, immutable commission, capture evidence and reconciliation/outbox ports; actual provider integration, seller onboarding, signed webhooks, and refunds remain pending. Tracking, discounts/promotions, fiscal documents and multi-seller checkout are separate work.

Delivery verification (2026-10-09): 38 unit tests and 48 isolated HTTP/internal-port scenarios passed (49 results including the suite). API/worker lint, typecheck, build, architecture and OpenAPI checks passed. Swagger exposes 125 operations: four Cart and eleven Orders. Migration 009 is applied only to the dedicated pettly_db on shared-network; six new tables, fourteen guards and five critical indexes were verified. API is healthy and worker updated. Local verification used read-only requests and created no enabled commercial policies or real orders.

## Payments integration update (2026-10-09)

New quotes include a server-calculated commission allocation from PETTLY_COMMISSION_PERCENT (default 10). Base is product subtotal, excluding shipping and added taxes but retaining embedded included-price taxes. Accepted orders retain this snapshot; configuration changes invalidate unconfirmed quotes. New checkout requires COP and Colombia; historical currency schemas remain readable. New orders reserve thirty minutes; migration 010 increases the database upper window without changing old deadlines. OrderPayments also exposes buyer-only forPayment and trusted inspect contracts, preserving organization/order lock ordering. Payments submits exact authoritative approvals through settleVerified inside its own shared transaction; capture/audit failure rolls back Order and inventory too. The collector field remains legacy metadata; Payments routes by the explicit split allocation. Real checkout, seller onboarding, webhooks, refunds and paid cancellation remain pending. See [Payments](payments.md).

## Notifications integration — 2026-10-09

Cada transición auditada publica un evento mínimo en Notifications para comprador y responsable actual de la empresa; incluye creación/cancelación/vencimiento, pago verificado y preparación/entrega. Snapshot/inbox/outbox/auditoría comparten transacción. Solo el puerto de liquidación verificada produce paid; la pasarela continúa deshabilitada. Preferencia ordersEmail controla correo, no la bandeja. Ver [Notifications](notifications.md).
