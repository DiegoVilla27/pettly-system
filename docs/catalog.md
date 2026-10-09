# Catalog module

Updated: 2026-10-08. Business product taxonomy, variants, sanitized photographs and reviewed public browsing. See [Inventory](inventory.md), [Media](media.md), [Organizations](organizations.md) and [DESIGN](../DESIGN.md).

## Purpose, architecture and ownership

Catalog owns categories, products, variants, product attachments and its immutable administration audit. Product is the consistency root for its profile, variants, photos, moderation and version. Category is a separate platform taxonomy aggregate. SKU, integer money and bounded option attributes are validated independently of HTTP. Currency is immutable per product: COP, USD or EUR, all using 100 minor units per currency unit. Prices do not represent final checkout/shipping/tax amounts; no discounts, money conversion or payment processing are implemented.

Framework-free aggregates and handlers use explicit input/output ports, commands, queries and results. Nest composes Prisma/HTTP/Media adapters; request and response DTOs are separate strict Zod contracts and Swagger is English. Inventory consumes CatalogAccess only, receiving minimal variant eligibility identities, never raw catalog tables or private product review metadata. Catalog does not read Inventory tables or depend on its persistence adapter.

Categories use a flat taxonomy (maximum 1000), rather than an unimplemented parent hierarchy. Only superadmin with platform.settings.manage may create/update/disable/archive categories. Slugs are unique lowercase identifiers and archived categories are terminal. Existing products retain category references for history; inactive or archived categories hide them from public access immediately. Reactivation of an inactive category restores otherwise eligible reviewed products.

Product management requires catalog.manage in its owning **active business**, including for superadmin. Business admin/operator grants already exist; no automatic new roles are assigned. Adoption memberships, customers and other businesses have no management access. Organization/currency ownership cannot be replaced through profile endpoints.

## Publication and variant lifecycle

Products start draft. At least one active category, active variant and sanitized photo is required to submit for review. Draft/rejected/paused → pending → published or rejected. A global moderator or superadmin outside that organization must decide; product creator and every organization member are excluded from moderation. Pending products cannot be edited. The pending queue is an administrative read; review rechecks current eligibility and optimistic product version.

Published content/price/variant/photo changes return the product to draft and clear review metadata. Pause immediately hides a published product; resuming requires submission and review. Archive is terminal, preserves variants, stock, holds and audit references, and is not physical deletion. Variants start active and can be archived permanently; at most fifty variants per product, including historical variants. SKU is normalized uppercase and unique across the entire company, including archived variants/products. A currently assigned SKU cannot also identify a different variant in that company; archived SKU values remain assigned. Editing an active SKU is an audited product change and withdraws publication. Attributes are up to ten lowercase keys (30 characters) with values of up to 80 characters. Prices are positive integer minor units up to 2147483647; floating-point values are rejected.

A product version advances for mutations to its profile, variants, photos and lifecycle. All modifying routes require a current expectedVersion and a 10–500 character reason. Real profile no-ops keep the version; variant/photo/lifecycle commands are explicit audited changes. Concurrent stale operations return 409. At most ten photographs use the existing JPEG sanitization pipeline and private Media port. Upload/purge, attachment, product change and audit share one transaction. Filenames and original bytes are never retained; no generic public media directory is introduced.

## Data and update timing

Migration `202610080008_catalog_inventory` is additive and uses UUID identifiers throughout.

| Table/fields                                                | Purpose and changes                                                                                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| catalog_categories: id                                      | Immutable category UUID.                                                                                                                |
| name, slug, description                                     | Display taxonomy and optional description; updated by platform administration. Slug is globally unique.                                 |
| status, version                                             | active/inactive/archived and optimistic revision; category changes increment version.                                                   |
| createdAt, updatedAt                                        | UTC creation/last change timestamps.                                                                                                    |
| catalog_products: id, organizationId                        | Product UUID and immutable owning business UUID.                                                                                        |
| categoryId, name, description, brand                        | Categorization, 2–150 character name, 10–4000 description and optional 100-character brand; real edits withdraw publication.            |
| currency                                                    | Immutable COP/USD/EUR; variant priceMinor uses its minor units.                                                                         |
| status, version                                             | draft/pending/published/rejected/paused/archived and product revision.                                                                  |
| createdBy                                                   | Creator account UUID; retained for audit and self-review prevention.                                                                    |
| reviewedBy, reviewedAt, reviewReason                        | Last reviewer, UTC review time and audited justification; nullable until review/after renewed editing.                                  |
| createdAt, updatedAt                                        | UTC lifecycle timestamps.                                                                                                               |
| catalog_variants: id, productId, organizationId             | Immutable variant and context UUIDs; composite foreign key prevents crossing product/company identity.                                  |
| sku, priceMinor, attributes                                 | Unique normalized company SKU, bounded integer price and validated JSON option map. Changes require product version and renewed review. |
| status, createdAt, updatedAt                                | active/archived and UTC timestamps; no reactivation endpoint.                                                                           |
| catalog_photos: id, productId, mediaId, position, createdAt | Attachment UUID, exact product/image UUIDs, ordering and UTC attachment time. Removal purges Media bytes transactionally.               |
| catalog_audit_entries: id, actorId, productId, categoryId   | UUID event/actor and exactly one target: product or category.                                                                           |
| action, reason, requestId, createdAt                        | Action, 10–500 character justification, UUID request correlation and UTC time. Append-only; no secrets/profile copies/image bytes.      |

PostgreSQL also protects company/SKU uniqueness, context foreign keys, compatible business type, variant/photo limits, media resource binding, lifecycle/reviewer checks, positive integer prices and immutable audit. Indexes support scoped/status/category listings and trigram product-name search. Category administration audit is paginated for superadmin; product audit is paginated for its owning business.

## HTTP contracts

Private routes require current active verified bearer identity. Prefixes below include `/api`:

| Route                                                           | Contract                                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| GET /catalog/categories                                         | Active taxonomy; anonymous, maximum 1000.                                                                      |
| GET /catalog/products                                           | Public search and pagination.                                                                                  |
| GET /catalog/products/{productId}                               | Available reviewed detail with safe product fields, active variants and photos.                                |
| GET /catalog/products/{productId}/photos/{mediaId}              | Currently authorized public sanitized JPEG.                                                                    |
| GET, POST /catalog/admin/categories                             | Superadmin full taxonomy or `{name,slug,description?,reason}` creation.                                        |
| PATCH /catalog/admin/categories/{categoryId}                    | `{profile:{name?,slug?,description?,status?},reason,expectedVersion}`.                                         |
| GET /catalog/admin/categories/{categoryId}/audit                | Superadmin paginated immutable taxonomy administration history.                                                |
| GET, POST /catalog/admin/products                               | Scoped private list or `{organizationId,profile:{name,description,brand?,categoryId},currency?,reason}` draft. |
| GET, PATCH /catalog/admin/products/{productId}                  | Private detail or `{profile,reason,expectedVersion}`.                                                          |
| DELETE /catalog/admin/products/{productId}                      | `{reason,expectedVersion}` terminal archive; product response.                                                 |
| POST /catalog/admin/products/{productId}/submit                 | `{reason,expectedVersion}` pending review.                                                                     |
| POST /catalog/admin/products/{productId}/review                 | Global outside moderator `{approved,reason,expectedVersion}`.                                                  |
| POST /catalog/admin/products/{productId}/pause                  | `{reason,expectedVersion}` published → paused.                                                                 |
| GET /catalog/admin/moderation/products                          | Global moderation queue.                                                                                       |
| POST /catalog/admin/products/{productId}/variants               | `{profile:{sku,priceMinor,attributes?},reason,expectedVersion}`.                                               |
| PATCH /catalog/admin/products/{productId}/variants/{variantId}  | `{profile:{sku?,priceMinor?,attributes?},reason,expectedVersion}`.                                             |
| DELETE /catalog/admin/products/{productId}/variants/{variantId} | `{reason,expectedVersion}`; permanent variant archive.                                                         |
| POST /catalog/admin/products/{productId}/photos                 | Multipart file, reason and expectedVersion; 5 MiB input limit.                                                 |
| GET /catalog/admin/products/{productId}/photos/{mediaId}        | Owning active-business permission and exact resource binding.                                                  |
| DELETE /catalog/admin/products/{productId}/photos/{mediaId}     | `{reason,expectedVersion}` detach/purge and withdraw publication.                                              |
| GET /catalog/admin/products/{productId}/audit                   | Scoped immutable audit list.                                                                                   |

POST returns 201; GET/PATCH/DELETE return 200. Detail/variant/photo changes return documented strict response objects. Pagination defaults page=1/limit=20, maximum page=10000/limit=50. Product filters: name search, categoryId, organizationId, brand, currency, minPriceMinor/maxPriceMinor. Price filters require currency and min≤max; private list additionally requires organizationId and allows status. Public list checks current organizations in a bounded batch, returns no misleading eligible total and supplies nextPage; filtered pages can be short/empty and clients continue until null. Private lists expose total. Public product reads never expose creator/reviewer IDs/reasons, company private profile, stock ledger or customer data.

All public/photo responses use no-store. Current business/category/product state is read from PostgreSQL on each access; Redis supplies existing distributed route limits, not cached authorization. No business cache is added without measurements establishing need. Product uploads use a route-specific Redis limit of 20/minute per IP; content processing and storage limits are described in Media.

Errors: 400 strict input/UUID/filter/money/attribute validation; 401 missing/revoked identity; 403 missing scope/moderation conflict; 404 resource/unavailable public product; 409 stale version, duplicate SKU/slug, lifecycle or relation conflict; 413 excessive multipart size; 429 traffic limit; safe 500 audit failure; 503 dependency failure. Swagger: http://localhost:3100/api/docs.

## Manual walkthrough and verification

1. Approve a business and appoint its verified responsible user using Organizations.
2. As superadmin create an active category; as business staff create a product draft with that category.
3. Create a SKU variant and upload a photo, using the returned product version each time.
4. Submit; as a global reviewer outside the business approve. Browse publicly and retrieve its photo.
5. Add stock through Inventory. Read anonymous availability separately; public product listing does not claim stock reservation.
6. Edit a price and confirm public detail disappears until renewed submission/review. Test another business/customer denial, duplicate SKU and stale versions.
7. Disable category or suspend business and confirm product/photo/availability access stops immediately; archive permanently to preserve history.

Tests cover domain money/attributes, category terminal states, moderation/review boundaries, strict DTOs, public/private projections, company authorization, scoped SKU uniqueness, photo audit rollback, price re-review, visibility during category/business suspension and preserved archive history. Infrastructure tests are isolated. Cart/Orders now consume CatalogAccess.saleVariants for current safe prices and product revisions, then store immutable accepted snapshots. Payments, discounts, product-content malware checks, category hierarchy and object-storage/CDN expansion remain separate work.

Delivery verification (2026-10-08): 32 unit tests and 40 isolated HTTP scenarios (41 test results including the suite) passed, with API/worker lint, typecheck/build, hexagonal dependency checks and OpenAPI export (110 operations, including 24 Catalog and 8 Inventory). Coverage includes several expiry movements in one batch and rejection of deletion/reset of a zero stock balance with history. Fixtures run against temporary PostgreSQL/Redis/Mailpit and do not create real business records.

Local deployment verification: migration 008 is applied only to pettly_db on shared-network. Eight tables, ten guards/constraint triggers and unique idempotency/version indexes were checked. The rebuilt API is healthy, worker updated, and live Swagger exposes 110 operations. Anonymous category/product/availability reads return 200 with no-store; private catalog/inventory reads without credentials return 401. Deployment verification used read-only requests and created no real products, movements or reservations.
