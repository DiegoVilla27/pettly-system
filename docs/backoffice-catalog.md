# Backoffice catalog

Updated: 2026-10-10. Categories and independent publication review in `apps/admin`. Read [DESIGN](../DESIGN.md), [Catalog](catalog.md), [Backoffice](backoffice.md) and [Inventory](inventory.md).

## Purpose and scope

Superadministrators maintain the shared product taxonomy. Superadministrators and global moderators review pending business products with their profile, variants, prices and sanitized photographs. Supplier product creation/editing is implemented in the separate `/productos` feature. Stock operations are implemented in `/inventario`; moderation keeps its own permissions and feature boundary.

| Route                                        | Responsibility                                                           | Access                                  |
| -------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `/catalogo`                                  | Pending queue, search, organization/category UUID filters and pagination | Global `moderation.publications.review` |
| `/catalogo/productos/:productId`             | Private preview and explicit approve/reject decision                     | Independent global reviewer             |
| `/catalogo/categorias`                       | Taxonomy and local name/slug/status filters                              | Superadmin                              |
| `/catalogo/categorias/crear`                 | Create an active category                                                | Superadmin                              |
| `/catalogo/categorias/:categoryId`           | Edit profile, activate/deactivate                                        | Superadmin                              |
| `/catalogo/categorias/:categoryId/auditoria` | Paginated immutable change history                                       | Superadmin                              |

The shell and home expose Catalog to authorized global reviewers. Categories additionally use a superadmin route guard. Backend permissions remain authoritative; navigation visibility never grants a capability. Creator and every owning-business member are excluded from review, including global superadministrators. Private preview rechecks pending state and active business on each request. A preview is no longer available once a decision moves the product out of pending.

## Architecture and contracts

`features/catalog` owns models/ports, generated DTO aliases, Zod Mini mappers, the HTTP gateway, page-scoped NgRx SignalStores, forms and lazy routes. `CATALOG_GATEWAY` is the browser port. Views do not perform HTTP calls or access API/database internals. Every component explicitly uses OnPush; Signals, typed non-nullable Reactive Forms, zoneless detection and Tailwind follow the existing backoffice architecture.

`CategoriesStore` uses Entities for the bounded taxonomy. `ModerationStore` uses Entities for the current server page. `ProductReviewStore` owns one preview, one decision and one private photo. Obsolete reads are cancelled; duplicate mutations are excluded. Late responses cannot restore a closed image or apply a decision to a different routed product. UUIDs, status enums, versions, field lengths, related product/company IDs, unique variant/media identities and photo/variant bounds are validated before rendering. Invalid responses fail with a safe problem.

The OpenAPI-generated `ApiRequest`, `ApiResponse`, `ApiPath` and `ApiQuery` select each operation. No Prisma/entity types cross into Angular. Two additive API input-port methods and HTTP reads permit moderation without granting `catalog.manage`: preview and exact attached JPEG. Nullable category description, product brand and review reason now reflect their existing bounded string/null contracts correctly in Swagger. No database migration is needed. English Swagger documents these permissions, states, filters and binary responses.

## API operations

| Operation                    | Method and path                                                         |
| ---------------------------- | ----------------------------------------------------------------------- |
| `listManagedCategories`      | `GET /api/catalog/admin/categories`                                     |
| `createProductCategory`      | `POST /api/catalog/admin/categories`                                    |
| `updateProductCategory`      | `PATCH /api/catalog/admin/categories/:categoryId`                       |
| `listCategoryAudit`          | `GET /api/catalog/admin/categories/:categoryId/audit`                   |
| `listProductModerationQueue` | `GET /api/catalog/admin/moderation/products`                            |
| `getProductReviewPreview`    | `GET /api/catalog/admin/moderation/products/:productId`                 |
| `getProductReviewPhoto`      | `GET /api/catalog/admin/moderation/products/:productId/photos/:mediaId` |
| `reviewCatalogProduct`       | `POST /api/catalog/admin/products/:productId/review`                    |

Queue search, organization, category, page and limit remain in the URL and survive reload. Page sizes are 10/20/50; changing filters starts page one. Malformed URL parameters are discarded. The API also supports its existing bounded brand/currency/price filters; this UI exposes only search and organization/category filters. Categories are a flat bounded list (maximum 1000); their name/slug/status filtering is local and resets on reload. There is no simulated category hierarchy or server pagination.

## Categories and decisions

Names contain 2–100 characters. Slugs are unique lowercase letters/numbers separated by single hyphens, up to 100 characters. Description is optional, 2–1000 characters; clearing it explicitly sends null. New categories are active. Editing sends only changed profile fields, current `expectedVersion` and mandatory reason (10–500 characters, no control characters). Archive remains an API-only terminal operation; archived categories are read-only in the UI.

Deactivating a category immediately hides its products from public reads. Reactivating it restores only products that still satisfy publication, company, variant and other eligibility checks. Approval does not guarantee stock availability.

Product decisions have no preselected choice. The reviewer explicitly selects approve/reject and supplies an audit reason and current product version. A 409 preserves the viewed version and asks for an explicit refresh and new decision. The client never automatically retries a failed decision. Confirmed decisions show the returned state/version and return to the queue. Category history is visible here; product decision history remains in the owning company's existing product audit API and is not exposed as a global review audit screen.

## Prices and photographs

Prices are integer minor units; 100 minor units equal one currency unit, including COP in the current API contract. For example, `priceMinor=1250000` renders COP 12,500.00 with Colombian formatting. Pettly's business market is Colombia/COP. Historical USD/EUR products supported by the API keep their actual currency label and show an explanatory message; this UI performs no conversion or checkout/shipping/tax calculation.

Photos are loaded individually on demand, through authenticated `ApiClient.image` and exact product/media paths. Requests include the existing bearer/cookie/CSRF handling, a deadline and `Cache-Control: no-store` responses. JPEG type, positive size and the 2 MiB bound are checked. The API returns sanitized images up to 1600×1600, never originals or storage paths.

The shared OnPush `PrivateImageComponent` creates an ephemeral object URL and revokes it on replacement/destruction; closing clears the store blob. Native `img` is deliberate because Angular's optimized image directive rejects blob URLs. It has an accessible alternative and fixed intrinsic dimensions. No photo/token/profile is persisted in browser storage or routed through an external optimizer. Veterinary uses the same image component while retaining its evidence labels.

## Manual checks

1. Sign in as superadmin at `http://localhost:4300`; open Catalog → Manage categories. Submit an empty form, then create a valid category with a reason. Edit, clear its description, deactivate/reactivate and read audit history.
2. Prepare an active business, product, variant and sanitized photo using the existing supplier API; submit it for review. Use an independent reviewer account.
3. Search the queue by name/company/category, change page size and reload. Open a product, check SKU/options and correctly scaled COP prices, open/close its photograph.
4. Approve/reject with a reason. Verify the published product's public availability. Category deactivation hides it; reactivation restores it only while otherwise eligible.
5. Change the category/product version in another session while keeping the form open. Submit the stale form, verify 409, refresh explicitly and decide again.
6. Use a moderator: Catalog review works; category administration and private supplier-management endpoints remain forbidden. Creators/team members cannot access review preview/decision. Unrelated photo IDs return 404; photos of products that leave pending return 409.

Automated verification uses isolated PostgreSQL, Redis and Mailpit through `pnpm exec nx run admin:test:integration`, with real API/worker/browser requests. The catalog scenario runs after the users scenario that provisions its moderator account. Runtime schema and store tests verify filters, audit reasons, minor-unit formatting, duplicate decisions, late responses and closed images. Backend handler tests verify moderation-only permissions, state/team exclusions, transaction locks and exact media ownership. Accessibility checks cover forms, audit, queue and preview; responsive checks include a narrow viewport. Test fixtures never enter the shared development database or Redis.

## Verified delivery (2026-10-10)

46 Angular unit tests, 66 API unit tests and all six browser scenarios passed. The catalog scenario verifies real category creation/editing/audit, stale category and product versions, query persistence and server pagination, creator/company-member denial, reviewer-only previews and exact private JPEG, moderator approval/rejection access boundaries, correctly scaled COP amounts and category eligibility changes. Axe reports no violations in tested catalog views; the product view has no horizontal overflow at 390px. Visual review covers taxonomy audit, queue and product preview. All 51 application components explicitly use OnPush. Types, lint, feature/hexagonal architecture and generated-contract drift pass; OpenAPI has 192 operations. Login Lighthouse is 98 performance, 100 accessibility and 100 best practices. These results cover the tested flows and do not guarantee all accessibility criteria or production load capacity. No test fixtures or rate-key changes enter shared development infrastructure.

Docker API and admin were rebuilt and are healthy. Catalog/category SPA routes and proxied readiness return 200 at `http://localhost:4300`; Swagger at `http://localhost:3100/api/docs` serves the current 192-operation document (`/api/openapi.json`). Anonymous review preview returns 401. These shared-environment checks are read-only. No manual configuration or database migration is required for this delivery.

## Company product management UI

Business product operations are available in `/productos`: scoped lists, profile, COP variants, private photos, publication submission, pause/archive and audit. Independent moderation remains in `/catalogo`; inventory keeps stock ownership. See [Backoffice products](backoffice-products.md) for permissions, architecture, currency constraints and manual checks.
