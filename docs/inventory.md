# Inventory module

Updated: 2026-10-08. Durable variant balances, immutable movements and expiring business stock reservations. See [Catalog](catalog.md), [Authorization](authorization.md) and [DESIGN](../DESIGN.md).

## Purpose and architecture

Inventory owns physical/reserved balances, holds and their append-only ledger. Catalog owns variant identity, product currency/price and publication. Inventory consumes only CatalogAccess minimal eligibility identities; it never queries Catalog tables directly. Pure Stock and Hold aggregates protect quantities and lifecycle. Explicit input/output ports, commands, queries, clock/UUID entropy and handlers are framework-free. Nest composes Prisma, HTTP and a scheduling inbound adapter. Strict separate request/response Zod schemas generate English Swagger. PostgreSQL is the source of truth; no Redis key is a stock guarantee.

`onHand` is physical stock. `reserved` is the balance assigned to active persisted holds, including deadlines awaiting processing. Available stock is physical minus unexpired active holds; private stock reads first release due holds and then return physical-minus-reserved. A newly created variant has virtual zero stock/version one until the first real movement persists its balance. The balance primary UUID is the variant UUID, a one-to-one identity rather than an autoincrement ID.

Receipts add physical units. Issues subtract only unreserved units. Adjustments are signed deltas, never overwrite an absolute balance. Holds increase reserved units only; release/expiry decrease reserved only; consumption reduces both physical and reserved. Domain/PostgreSQL prevent negative quantities, reserved>physical and physical balances above one billion units. Single manual commands are bounded to one million units. Every real change writes a movement with resulting balances and stock version in the same transaction. A failed ledger write rolls back balances/holds.

## Scope, reservations and idempotency

Private operations require inventory.manage in the owning active business, including for superadmin. No customer or unrelated organization may read internal balances, ledger or business reference UUIDs. Receipts/issues/adjustments require active variants and unarchived products; initial stocking of a draft is allowed. A new hold or consumption additionally requires currently published product, active category/business and active variant. Release remains possible after product/variant archival while the business is active. System expiry runs irrespective of suspension/archive so stock is never permanently locked by lost operational access.

Operational HTTP holds have orderId=null and an opaque referenceId. [Orders](orders.md) now uses the trusted OrderStock port to reserve every accepted order line in the same transaction as order/audit/cart clear. These holds have orderId FK and referenceId equal to the order UUID; manual Inventory release/consume rejects them. Only cancellation/expiry or trusted verified payment processing closes them. A hold itself never asserts that a purchase is paid.

A hold has 1–1000000 units, UTC expiry after now and at most thirty minutes ahead, and immutable variant/company/reference/quantity/deadline. Maximum 1000 active holds per variant. Active → released/consumed/expired is terminal; no renewal/reactivation exists. Consumption at or after its deadline is forbidden. Retry a successful command with its original idempotency UUID/body: it cannot deduct or reserve twice. Keys are unique within the business across all variants and movements; reuse with different payload returns 409. ExpectedVersion, reason and intent are part of the persisted canonical fingerprint. Successful retry returns the original movement/current stock or original reservation/current stock; it does not replay a historical balance as current truth. Public availability is advisory and must be rechecked transactionally for a reservation.

## Expiration and concurrency

The inbound scheduler runs immediately at application initialization and every fifteen seconds, scanning at most 100 distinct due variants, earliest deadline first. PostgreSQL retains deadlines across process restarts. Multiple API instances serialize each variant through database locks; execution can be repeated safely. The scheduler uses no network side effect, so it does not require a notification outbox. Failed processing is logged without sensitive payload and retried. It currently runs in the API, not in the email worker. A future dedicated job runner can invoke the same application port.

Private stock reads/mutations also process due holds under the same locks. Expiry updates holds and creates movements in batches, preserving every resulting stock revision without a database roundtrip per expired hold. Public reads aggregate only unexpired quantities and physical balances in a single PostgreSQL statement (one consistent snapshot), so deadlines affect availability even before scheduler cleanup. Under load cleanup latency can exceed fifteen seconds; availability and transactional reservation checks remain correct. Read endpoints may therefore create system expiry ledger entries. A failed later command rolls back its whole transaction, including lazy expiry, and the next scheduler/read retries it.

Lock order is actor user → organization → product → taxonomy visibility → variant stock. System cleanup uses organization → product → variant stock and does not grant itself a user permission. Locking the product serializes variant archival/price publication changes with hold consumption. Stock versions change per movement; expiry can make a supplied expectedVersion stale, requiring a read/retry. Existing user/organization administration locks serialize role/status changes. Idempotency is durable in PostgreSQL, not Redis. Different variants concurrently using one key have at most one committing movement due to a unique index.

## Tables, fields and PostgreSQL guards

Migration `202610080008_catalog_inventory` is additive; every identity/reference is UUID and timestamps are UTC.

| Table/fields                                       | Meaning and updates                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| inventory_stock: variantId                         | Immutable primary/foreign UUID; one balance per Catalog variant.                                                                                    |
| onHand, reserved                                   | Physical and active held integer balances; mutations occur only with ledger writes.                                                                 |
| version, updatedAt                                 | Optimistic revision after each movement, and UTC change time.                                                                                       |
| inventory_holds: id, variantId, organizationId     | Immutable hold and exact variant/company UUID context.                                                                                              |
| referenceId, quantity                              | Business operation reference and held units; fixed at creation.                                                                                     |
| status, expiresAt                                  | active/released/consumed/expired and immutable UTC deadline.                                                                                        |
| createdAt, updatedAt                               | UTC creation and transition time.                                                                                                                   |
| inventory_movements: id, variantId, organizationId | Immutable event UUID and exact stock/company context.                                                                                               |
| actorId                                            | Current operator UUID for manual actions; null only for system expiry.                                                                              |
| holdId                                             | Exact reservation UUID for hold/release/consume/expire; null for physical-only changes.                                                             |
| kind                                               | receipt/issue/adjustment/hold/release/consume/expire.                                                                                               |
| onHandDelta, reservedDelta                         | Signed changes with database rules per movement kind.                                                                                               |
| onHandAfter, reservedAfter, versionAfter           | Resulting balances/revision, protected by sequential ledger guards.                                                                                 |
| idempotencyKey, fingerprint                        | Durable company-scoped command key and canonical intent. System expiry uses a separate prefixed namespace. Fingerprints are not returned over HTTP. |
| reason, requestId, createdAt                       | Audited justification, UUID request/system correlation and UTC event time.                                                                          |

Composite foreign keys enforce Catalog variant/company identity. Unique company/key and variant/version indexes protect deduplication and revision ordering. Movement append-only trigger prevents UPDATE/DELETE. A BEFORE INSERT guard verifies continuity from the latest indexed event and matching reservation context/quantity. Deferred constraint triggers compare final stock with the latest ledger balances/version and the sum of active holds, rejecting unaudited stock or inconsistent reservations at commit. Holds cannot change immutable fields or leave terminal state, consume at/after expiry or record expiry before the persisted deadline. A zero physical balance with movement history cannot be deleted/reset to a virtual version-one record. Indexes support variant pagination and bounded deadline scans; the reconciliation guard reads the latest indexed ledger event rather than rescanning all historic movements.

## HTTP contracts

All routes have `/api` prefix. Private routes require active verified bearer authentication and current company membership/permission. Reasons are 10–500 characters without control characters; expectedVersion and idempotencyKey are mandatory for writes.

| Route                                            | Contract                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /inventory/availability?variantIds=uuid,uuid | Anonymous, at most fifty variants. Returns only `{items:[{variantId,available}]}` for currently eligible published variants; unavailable IDs are omitted. No-store. |
| GET /inventory/variants/{variantId}              | Private `{variantId,onHand,reserved,available,version,updatedAt}` after due expiry.                                                                                 |
| POST /inventory/variants/{variantId}/movements   | `{kind:"receipt"\|"issue"\|"adjustment",quantity,expectedVersion,idempotencyKey,reason}` → 201 `{stock,movement}`.                                                  |
| GET /inventory/variants/{variantId}/movements    | Private immutable ledger, page default 1/max 10000, limit default 20/max 100.                                                                                       |
| POST /inventory/variants/{variantId}/holds       | `{quantity,expiresAt,referenceId,expectedVersion,idempotencyKey,reason}` → 201 `{stock,hold}`.                                                                      |
| GET /inventory/holds/{holdId}                    | Private reservation; due expiry processed first.                                                                                                                    |
| POST /inventory/holds/{holdId}/release           | `{expectedVersion,idempotencyKey,reason}`; expectedVersion is stock revision, not hold revision.                                                                    |
| POST /inventory/holds/{holdId}/consume           | Same body; explicit stock consumption, not payment confirmation.                                                                                                    |

GET returns 200; POST returns 201, including successful exact retries. No API sets stock absolutely, deletes ledger history, renews a terminal hold or gives customers direct warehouse operations. 400 invalid UUID/integer/dates/fields; 401 absent/revoked identity; 403 missing company scope; 404 resource absent; 409 stale version, insufficient available units, unpublished/archived variant, deadline/terminal/idempotency conflict; 429 rate limit; safe 500 ledger failure; 503 dependency outage. Swagger: http://localhost:3100/api/docs.

## Manual verification and remaining work

1. Complete Catalog publication. Read its private balance: zero physical/reserved, version one.
2. Receive ten units with a fresh key and expectedVersion one. Retry the exact body: physical stock must remain ten; changing quantity under that key must fail.
3. Reserve seven units using the new stock version. Available becomes three; another simultaneous reservation/issue exceeding three must fail.
4. Consume the hold with its current stock revision: physical becomes three, reserved zero. A new command cannot consume it again; an exact successful retry is safe.
5. Create a short hold, wait for its deadline and read availability/private balance. It must release once and refuse late consumption.
6. Suspend business/disable category/archive product and check public availability disappears and new reservations stop. Review the private movement ledger and archived history.

Tests cover domain balance/deadline/terminal invariants, strict DTOs, receipt/consume retries, simultaneous holds, issue against reserved stock, expiry exactly once, cross-user scope, category/business suspension, ledger-failure rollback, immutable events and deferred rejection of direct unaudited balances. Infrastructure fixtures are temporary and isolated. Warehouse locations/transfers, supplier purchasing, returns, physical counts imported in bulk and paid-order returns/refunds are future feature work, not silently inferred from current holds.

Delivery verification (2026-10-08): 32 unit tests and 40 isolated HTTP scenarios (41 test results including the suite) passed, with API/worker lint, typecheck/build, hexagonal dependency checks and OpenAPI export (110 operations, including 24 Catalog and 8 Inventory). Coverage includes several expiry movements in one batch and rejection of deletion/reset of a zero stock balance with history. Fixtures run against temporary PostgreSQL/Redis/Mailpit and do not create real business records.

Local deployment verification: migration 008 is applied only to pettly_db on shared-network. Eight tables, ten guards/constraint triggers and unique idempotency/version indexes were checked. The rebuilt API is healthy, worker updated, and live Swagger exposes 110 operations. Anonymous category/product/availability reads return 200 with no-store; private catalog/inventory reads without credentials return 401. Deployment verification used read-only requests and created no real products, movements or reservations.

Cart/Orders delivery (2026-10-09): Hold responses now include nullable orderId. Migration 009 adds the Order FK and indexed order lookup, immutable order binding and deferred complete order-line/status checks. Null actors are permitted for order-linked automatic release/consume; unbound operational system consume/release is rejected by PostgreSQL. OrderStock honors historical accepted reservations on payment even when the catalog is withdrawn; new holds still require current publication. Order-specific deadlines/recovery and transactional contracts are described in Orders.
