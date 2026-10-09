# Cart module

Status: implemented. Updated: 2026-10-09. Architecture: [DESIGN](../DESIGN.md). Related modules: [Catalog](catalog.md), [Inventory](inventory.md), [Orders](orders.md).

## Purpose and boundaries

Cart owns the authenticated customer's persistent shopping selection, independent of browser/mobile storage. It stores variant UUIDs and absolute quantities; current prices and publication eligibility come through CatalogAccess. Adding an item never reserves inventory or fixes a sale price. Orders owns quotations, commercial consent, inventory reservations and order snapshots.

Hexagonal feature layout: pure Cart aggregate; commands/queries and handlers; CartUseCases and CartCheckout input ports; CartRepository output port; Prisma repository/persistence mapper; HTTP request/response Zod DTOs, mapper and controller; Nest composition root. No feature reads another feature's tables directly. Orders calls the trusted CartCheckout port within its shared PostgreSQL transaction.

## Invariants, authorization and storage

- Active, verified current account with `cart.self.manage`. All global roles retain customer capabilities. Endpoints operate on the principal; request bodies cannot choose buyer/user IDs.
- One persistent UUID cart per user, created on first read, version one. One business and currency at a time. Changing seller/currency requires explicitly clearing/removing the previous selection.
- Maximum 50 distinct variants and integer quantity 1–99 each. Set quantity is absolute; repeated identical quantity or removing an absent item is a no-op.
- Mutations require expectedVersion. Actual changes increment version; stale commands return 409. Removing the final line/clearing resets business and currency to null.
- Adding requires current published product, active variant, business and category. Existing lines remain when a publication disappears; `current` omits their unavailable product details. Customers may still remove these lines. Checkout rejects any unavailable line.
- PostgreSQL `carts`: id, userId (unique FK), nullable organizationId/currency, JSON items, version, createdAt, updatedAt. UUIDs, foreign keys, bounded array/context checks, duplicate/quantity validation, immutable identity and sequential version trigger.
- User/cart advisory locks serialize commands and account administration. PostgreSQL supplies durability; no cart cache or Redis-only selection is introduced. HTTP responses use no-store and strict whitelisted projections.

## HTTP contracts

Swagger: http://localhost:3100/api/docs. Routes below include `/api`. Bearer access JWT required.

| Method and path                    | Request and behavior                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| GET /api/cart                      | Own cart, persisted selection, version and current purchasable variant details. |
| PUT /api/cart/items/{variantId}    | `{expectedVersion,quantity}`; replace that line's quantity.                     |
| DELETE /api/cart/items/{variantId} | JSON `{expectedVersion}`; remove line.                                          |
| DELETE /api/cart                   | JSON `{expectedVersion}`; clear own selection.                                  |

Responses include id, userId, organizationId, currency, items, version, createdAt, updatedAt and `current` (variant/product/business IDs, currency, name, SKU, priceMinor, attributes and productVersion). Current prices are advisory, not a payable quote. Unknown fields and invalid UUIDs/quantities return 400; missing/revoked auth 401, unverified/inactive permission 403, stale version/unavailable selection/context/line limit 409. Dependencies and unexpected persistence failures use existing safe API error handling.

## Manual walkthrough and verification

1. Publish a business product and sign in with a verified customer.
2. GET own cart, then PUT a variant using the returned version and quantity.
3. Confirm stock is unchanged, a second account has a separate cart and the same stale version fails.
4. Try another business/currency without clearing; then clear explicitly and retry.
5. Withdraw a publication: stored selection remains, current details disappear and checkout fails until the selection is updated.
6. Continue with the accepted quote/order walkthrough in Orders; successful confirmation empties this cart atomically.

Unit tests cover seller/currency scope, quantity/line bounds, optimistic versions and snapshot isolation. Isolated HTTP tests cover ownership, strict DTOs, stale versions, no reservation on add, checkout eligibility and atomic clear/rollback. Guest carts, multiple simultaneous carts, saved lists and discounts are future product decisions.

Delivery verification (2026-10-09): 38 unit tests and 48 isolated HTTP/internal-port scenarios passed (49 results including the suite). API/worker lint, typecheck, build, architecture and OpenAPI checks passed. Swagger exposes 125 operations: four Cart and eleven Orders. Migration 009 is applied only to the dedicated pettly_db on shared-network; six new tables, fourteen guards and five critical indexes were verified. API is healthy and worker updated. Local verification used read-only requests and created no enabled commercial policies or real orders.
