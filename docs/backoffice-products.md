# Backoffice company products

Updated: 2026-10-10. Read [DESIGN](../DESIGN.md), [Catalog](catalog.md), [Backoffice catalog](backoffice-catalog.md) and [Inventory](inventory.md).

## Purpose and access

The `/productos` feature lets active businesses maintain their products before independent publication review. Global taxonomy and moderation remain in `/catalogo`. Superadministrators and active business members with `catalog.manage` can use company operations. Global moderation alone does not grant these operations. The API independently authorizes every read and write, including media and audit.

Select an explicit company; there is no automatic company fallback. Search companies, products, status and active category with URL-backed bounded pagination. Direct UUID lookup preserves company scope. Routes:

- `/productos`: scoped list and filters.
- `/productos/:organizationId/nuevo`: create a draft.
- `/productos/:organizationId/:productId`: profile, variants, photos, lifecycle and audit.

## Product profile and variants

Create and edit name, description, optional brand and active category. Clearing brand sends `null`. New products always use COP. Historical USD/EUR records show their actual currency and are read-only in this feature; currency is immutable.

Variants have company-unique uppercase SKU, a positive price and up to ten attribute key/value pairs. Keys use lowercase letters, numbers and underscores; repeated keys are rejected before constructing the attributes record. At most fifty variants exist per product, including archived ones. Archived variants cannot be edited and retain their SKU. A published product returns to draft after content changes and needs another independent review.

The editor accepts decimal COP without grouping, using comma or period and at most two decimals. It converts to minor units with integer arithmetic: `19999,95` becomes `1999995`. Bounds are `1..2147483647` minor units. Scientific notation, grouping, negatives, zero and excessive precision are rejected. Services and Products use the same shared money conversion utility.

Stock remains in Inventory. Each variant links to the company's inventory filtered by SKU. Product updates and archival do not reset stock or reservations.

## Photos and publication

Upload JPEG, PNG or WebP up to 5 MiB; the API enforces decoding/pixel limits and stores a sanitized JPEG without original metadata. Up to ten photos may be attached. Private previews fetch authenticated blobs, validate JPEG/size and revoke object URLs on closure/context change. Photo removal requires an attached media ID, reason and current product version.

Submit draft/rejected/paused products only with an active category, active variant and photo. An independent reviewer must approve publication; the creator and organization members cannot approve their own products. Pending products lock content editing. Pause a published product; resubmission requires review. Archive permanently while retaining variants, history and references. Every mutation requires an explicit confirmation and a reason of 10–500 characters.

## Architecture and concurrency

Feature-first models, mappers, gateway, SignalStores, components, pages and lazy routes. All six new components explicitly use OnPush, with zoneless Signals, typed Reactive Forms and Tailwind. Generated OpenAPI types define requests and responses. Zod validates responses, scope, related IDs, array limits, duplicate records and query metadata before rendering. No imports from another feature or API implementation.

Writes preflight the current scoped detail and send `expectedVersion` of the product, including variant/media operations. Reload the full validated detail after a successful mutation. Same-version profile no-ops remain valid. Concurrent submissions are suppressed; late results from a previous route cannot overwrite the new context. Conflicts and uncertain responses (network/5xx, including failed reload after a commit) freeze editing until explicit refresh. Access loss clears private detail and audit. Creation uncertainty instructs users to inspect the list before creating another draft; the API does not supply a create idempotency key.

Audit displays bounded pages of twenty immutable events with actor, reason, timestamp and request ID. It validates product identity and excludes category-only events.

## Existing API operations

Uses existing Catalog endpoints: public categories, managed product list/detail/create/update/archive/submit/pause, variant create/update/archive, photo upload/read/delete, and product audit. No endpoint, database migration or new package is needed. Independent decisions use the existing moderation feature.

## Manual verification

1. Open `/productos`, choose an active company, search/filter and create a COP draft.
2. Edit its profile; create a variant with `19999,95`, SKU and attributes. Check the displayed price and inventory link.
3. Reject invalid prices and repeated attribute keys. Confirm context/version changes reset confirmation.
4. Upload and preview a photograph; submit for review. Verify content fields lock while pending.
5. Approve with an independent reviewer in `/catalogo`; edit published content and verify return to draft.
6. Refresh a stale version before another mutation. Inspect history after an uncertain response before retrying.
7. Pause/resubmit or archive variants/product; verify history and archived SKUs remain visible.
8. Verify unauthorized companies/media are inaccessible and historical non-COP records remain read-only.

Validation: 235 Angular unit tests and all 17 browser scenarios passed, with typecheck, lint, production build and architecture checks. The six new components bring the total to 102 explicit OnPush components. The browser scenario verifies company creation, exact COP/attributes, authenticated photos, independent review, return to draft, permanent archive and actual audit entries without alerts. Axe reported no violations in the tested view; a 390 px screenshot was inspected and overflow was checked. Unit tests additionally cover scope, permissions, stale versions, uncertain responses and late-write privacy. Seven pre-existing lint warnings remain in Resources tests. Browser fixtures run only against disposable integration infrastructure.

Local runtime verified: [Products](http://localhost:4300/productos) and proxy readiness respond 200; managed products require authentication (401 anonymously). Admin Docker was rebuilt and is healthy. Existing API OpenAPI retains 195 operations.
