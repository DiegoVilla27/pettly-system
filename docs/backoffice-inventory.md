# Backoffice inventory

Updated: 2026-10-10. Private company inventory in `apps/admin`. Read [DESIGN](../DESIGN.md), [Inventory](inventory.md), [Catalog](catalog.md) and [Backoffice](backoffice.md).

## Purpose and implemented scope

Business administrators/operators manage their company's physical units. Superadministrators can select any active business. The interface lists product names, SKUs, variant/product states and physical/reserved/available balances, and provides physical movements and the immutable ledger. It does not create, release or consume operational holds, process payments, overwrite absolute balances or edit supplier products. Orders continues to own its checkout/payment stock holds; warehouse locations/transfers and purchasing/returns are future work.

| Route                                              | Purpose                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/inventario?organizationId=UUID`                  | Company inventory, product/SKU search, variant-state filter and pagination     |
| `/inventario/:organizationId/variantes/:variantId` | Exact scoped balance, receipts/issues/signed adjustments and paginated history |

Company, search, state, page and page size survive list reload. Pages contain 10/20/50 variants. Changing filters resets page one. Detail history defaults to 20 records, supports 10/20/50 via validated URL `limit` and retains `page` in the URL. Archived variants and products remain visible for stock/history, with physical commands disabled.

## Architecture and API contracts

`features/inventory` owns generated DTO aliases, models/port, Zod Mini validators/mappers, HTTP gateway, page-scoped NgRx SignalStores, typed forms, pages and lazy routes. `INVENTORY_GATEWAY` is the browser port. List state uses Entities; detail state separates balance, ledger, command intent and confirmed result. Reads cancel obsolete requests, and writes exclude duplicates. The pending-navigation guard imports the page type only, preserving lazy component loading.

Every component explicitly uses OnPush, Signals, zoneless change detection and Tailwind semantic tokens. Forms use non-nullable typed Reactive Forms, associated labels/help, invalid-state attributes and focus on the first invalid input. Safe problems do not reveal raw server errors. Shared responsive pagination and problems are reused; features do not import each other's internals.

The additive `listManagedInventory` operation (`GET /api/inventory/variants`) provides the paginated company view. It requires organizationId and supports optional search, active/archived variant status, page (1–10000), limit (1–50) and exact variantId. Detail uses the same operation with company/variant UUIDs and limit one, so an unrelated variant cannot be displayed as belonging to the requested company. Existing `recordInventoryMovement` and `listInventoryMovements` implement commands/history. Generated request/response/path/query types select each operation; no API entities or Prisma models enter Angular.

Catalog exposes the minimal framework-free `InventoryCatalog` application port for variant discovery. Its adapter queries only Catalog tables and returns company/product/variant IDs, name, SKU and states; no photos/prices or private business profile. Inventory composes these identities with its own balances. It never accesses Catalog's persistence internals. The authenticated read locks actor → company → sorted products → taxonomy → sorted stocks, authorizes the exact active business and reads balances/due holds in batches. A single cutoff is used for due-hold cleanup across the page. Only expired holds are fetched, avoiding an active-hold scan per variant. Batch expiry writes the same immutable ledger as existing stock reads. Reads can therefore create system-expiry movements; they are not side-effect-free historical queries.

There is one inventory HTTP read per list page, rather than one per row. The Catalog query fetches a bounded page and count; Inventory fetches balances and due holds in two batches. Actual expiry mutations remain transactional and preserve each stock revision. Virtual zero stock/version one is returned for new variants without creating rows. No database migration or additional Redis cache is required. PostgreSQL remains authoritative, with existing locks, constraints and durable idempotency. Swagger and its new operation descriptions are in English; the generated contract has 193 operations.

## Access and isolation

Shell/home and the functional guard expose inventory to superadmin or an active business membership with inventory.manage. A global moderator has no inventory access without a separate eligible business membership. Customers/adoption-only teams cannot access internal stock. Backend authorization runs on every read/write and rejects suspended/inactive businesses even for superadmin.

Superadmin company lookup uses the existing organization list, capped at 20 results and filtered by active business; search finds additional companies. A selected company outside that page is resolved by its profile endpoint so a reload retains its name. Business teams use their own active inventory memberships and cannot query the global organization directory. No automatic permission/role is assigned. Expired or removed access clears protected stock/history on subsequent failed reads or commands.

Zod Mini checks UUID scope, exact variant ownership, unique list/event IDs, page metadata, enums, bounded integer quantities, stock arithmetic and command-result identity. Available must equal physical minus reserved; reserved cannot exceed physical. Malformed/cross-company responses fail closed. Names and ledger actors use only the data supplied by these contracts: the ledger shows actor UUID, with System for automatic events, rather than fetching protected user profiles or fabricating display names.

## Physical movements and concurrency

No operation is preselected. Receipt and issue quantities are positive integers. Adjustments are nonzero signed deltas; their magnitude is at most one million. The form prevents obvious withdrawal of reserved units; the API remains authoritative when another operator or order changes stock. Each write includes mandatory 10–500 character reason, current stock expectedVersion and a newly generated UUID idempotency key. It never overwrites an absolute stock balance, clears holds or marks an order paid.

A confirmed result displays operation and actual returned balances. An exact retry may return the original immutable movement with a newer current balance; the mapper accepts that newer revision while still checking the original key/body/delta/expected movement version. If current stock and movement share a revision, resulting balances must match.

A definitive 409 keeps the viewed stock and requests an explicit refresh and a reviewed new command. No failed write is automatically repeated. Expiry itself may advance the version and cause this conflict. Unauthorized responses clear stock/history.

## Uncertain results and durable retry

A network/timeout failure or 5xx does not prove whether the transaction committed. The page retains the entire original intent in memory: company, variant, kind, signed quantity, reason, expectedVersion and idempotency UUID. It disables editing/refresh and offers **Retry the same movement**, sending that identical body/key. PostgreSQL deduplicates it, including after an earlier successful commit whose response was lost. Duplicate clicks cannot create another mutation while one is running.

The intent is not persisted in browser storage and cannot survive a reload/browser shutdown. The navigation guard warns before leaving an unresolved operation; beforeunload requests the browser's native warning, whose display depends on browser policy. Keep the page open to resolve the original intent. If it was lost, inspect the actual balance and immutable history before consciously creating another movement. This is a documented limit, not a guarantee of recovery across browser restarts.

## Manual verification

1. Open `http://localhost:4300/inventario` as superadmin. Search/select an active business, search a SKU, filter variant state, paginate and reload.
2. Open a new variant: physical/reserved/available are zero at version one. Submit an empty form; confirm focus and validation. Register a receipt with a reason.
3. Register an issue and a positive/negative adjustment; compare balance and immutable ledger, actor UUID, deltas, resulting balance/version, request reference and time.
4. Use an order or the operational API to reserve stock. Refresh and verify reserved/available. Attempts to subtract reserved units must fail, including when concurrent activity makes the viewed version stale.
5. Let an operational hold expire; the next private inventory read releases it and adds a System expiry movement once.
6. Change stock from another session and submit the stale form. Verify 409, explicit refresh and new decision.
7. If transport loses a write response, use the preserved same-movement retry. Verify one ledger movement and no duplicate stock effect. Do not reload during that unresolved intent.
8. Use a business operator: only eligible own-company options appear. Another company is forbidden. A moderator without a business membership is redirected and its API calls return 403. Suspension removes operational access; archived variants retain history but cannot receive physical movements.

Tests run only in temporary PostgreSQL/Redis/Mailpit. The browser scenario provisions its own businesses/product/variants and drives real API operations; it uses the moderator account from the prior Users scenario. A transport-fault check forwards a write to the real server, then aborts delivery of its successful response to verify durable recovery without fabricated server data. Unit tests verify schema arithmetic/ownership, input rules, original-intent retry, duplicate exclusion, late-response isolation and batched expiry. Shared development accounts, balances and Redis keys are untouched.

## Verified delivery (2026-10-10)

54 Angular unit tests, 68 API unit tests and all seven browser scenarios passed. The new scenario verifies company/SKU selection, query persistence and paging with one stock HTTP read per page, physical movements, concurrent hold/version conflicts, reserved-unit protection, explicit idempotent recovery after the real server commits but its response is aborted, once-only expiry/System ledger, own-company access, unrelated-company/moderator denial, archived stock/history and suspension even for superadmin. The tested catalog/users/organizations/veterinary/session scenarios also pass. Axe found no violations in tested inventory views; detail has no horizontal overflow at 390px. Visual review covers list/detail/mobile; login Lighthouse is 97/100/100. All 54 application components are explicitly OnPush. Type/lint/hexagonal/feature architecture and generated OpenAPI drift checks pass with 193 operations. These checks are bounded to the tested flows, not a guarantee of all accessibility criteria or production capacity. All mutable fixtures and rate resets use disposable infrastructure.

## Local deployment verification

API and admin Docker images were rebuilt and their containers are healthy. `http://localhost:4300/inventario`, proxied `/api/health/ready`, and `http://localhost:3100/api/docs` return 200. The live `/api/openapi.json` exposes 193 operations including `listManagedInventory`; anonymous inventory access returns 401. Shared-network checks were read-only. No database migration or additional manual configuration is required for this delivery.
