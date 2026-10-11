# Backoffice Orders

Status: implemented. Updated: 2026-10-10. Related: [Design](../DESIGN.md), [Orders API](orders.md), [Payments](payments.md), [Backoffice](backoffice.md).

## Purpose and scope

The lazy `/pedidos` feature lets superadministrators and current active-business fulfillment staff find, inspect and fulfill accepted orders. An explicit business is required; there is no default global or customer-order listing in the backoffice. Superadmins search active companies (up to twenty results); members choose only their current `orders.fulfillment.manage` companies. API authorization remains authoritative. Moderators and shelter-only staff do not gain commerce access.

List URL preserves company, literal recipient/city search or exact order UUID, status, page and size (10/20/50). Search uses the immutable accepted contact rather than the buyer's current profile. Escaped SQL pattern characters are literal. Every query retains its buyer/business authorization scope; totals and rows share filters. This search does not search product names. Direct order UUID lookup is available within the selected company. Missing/invalid filters never fall back to customer scope. Manual refresh and cancelable reads avoid background polling.

## Architecture and contracts

Feature owns generated transport DTO aliases, named Zod Mini request/response projection schemas, mappers, gateway token/HTTP adapter, page-scoped NgRx SignalStores, presentational components and lazy pages. Core exposes session and typed ApiClient; shared supplies audit reason validation, pagination, safe problems and Colombia date formatting. No cross-feature internal or backend imports. Every component explicitly uses OnPush; application remains zoneless with Signals and typed reactive forms, Tailwind semantic styles and accessible labels/live messages.

HTTP uses existing generated operations: listVisibleOrders, getVisibleOrder, listVisibleOrderAudits, cancelUnpaidOrder and advanceOrderFulfillment; organization discovery uses existing management contracts. No public payment-confirmation endpoint is added. The existing Orders list gains optional bounded search through its query and Prisma adapter; no migration is needed. English Swagger documents the search.

Mappers verify requested company/order identity, page/size/status, unique bounded rows, safe integer minor amounts, line extensions/subtotal, accepted split rounding/conservation, payment evidence and fulfillment consistency. Projections omit quote identity, reservation IDs and legacy collector metadata. Historical orders without commission remain readable; historical COP/USD/EUR are formatted in their actual currency, while all new commerce remains COP/Colombia. Contact information is private and cleared on denied reads or writes.

## Accepted purchase and payment evidence

Detail displays accepted product names/SKUs/attributes/quantities/prices, subtotal, shipping, explicit additional tax or included-tax limitation, exact total, delivery/pickup contact and immutable terms. Commission shows accepted rate and gross Pettly/seller allocations before processing fees; seller pays processing costs. This does not claim net bank settlement. Changing PETTLY_COMMISSION_PERCENT never changes accepted orders.

The payment section derives verified/unverified status from the authoritative Order paymentId/paidAt consistency. It does not represent distribution status, gateway attempt details or a bank report. Full payment-attempt/financial investigation screens remain separate work. The actual provider remains disabled pending activation; no manual paid action, simulated checkout, refund or tracking API is introduced.

## Decisions and history

Legal next actions only:

- Unexpired awaiting_payment → cancel; inventory reservations release transactionally.
- paid → preparing.
- preparing → dispatched for delivery, or ready_for_pickup for pickup.
- dispatched/ready_for_pickup → delivered.

Unpaid preparation, state skipping and paid cancellation are rejected by the API. Terminal orders retain read-only history. UI deadline checks are advisory; server is authoritative. The fifteen-second local clock updates available actions without HTTP polling.

Each action requires valid reason (10–500 characters without control characters), explicit confirmation and current expectedVersion. Version changes reset confirmation. In-flight duplicate submissions are excluded. Conflicts, transport loss and invalid/failed server responses require explicit refresh and history review; writes are never replayed automatically. Late write responses are ignored after route scope changes. Private data clears on denied requests.

History uses real paginated immutable order audit entries: action/version, date in America/Bogota, reason, actor UUID or System, correlation UUID. It does not fabricate responsible names or revision snapshots absent from the API.

## Manual verification

1. Open http://localhost:4300/pedidos with an authorized active verified account. Select a business; filter accepted contact/status and change page/size. Reload retains filters. `%_` is literal search.
2. Open an actual order; inspect accepted products, money, split, contact and terms. Unpaid orders offer only cancel before their deadline.
3. Cancel with reason and confirmation; inspect status/history and inventory release. In another session change the version, then submit stale data: explicit refresh is required.
4. Orders paid through a configured real provider can be prepared, dispatched/readied and delivered in order. Paid cancellation is unavailable. Real manual payment verification awaits provider activation.
5. Check unrelated company/moderator denial, keyboard validation/focus, narrow viewport and historical commission absence.

## Verification

Unit tests cover financial projection/invariants, scope/page/audit mismatches, legacy money, legal actions, reason/confirmation reset, deadline expiry, duplicate writes, stale results and uncertain outcome freeze. API tests cover strict bounded query/search contracts. Browser tests use real HTTP and temporary PostgreSQL/Redis/Mailpit with production Angular; payment approval uses the existing trusted Payments test adapter exclusively on loopback pettly_test, not a public route or shared development database. Tests include literal search/pagination, exact immutable allocation, verified capture/stock, delivery/pickup, cancellation, conflicts, response loss after commit, permissions, axe and mobile overflow.

Verification result (2026-10-10): 107 Angular unit tests, 69 API unit tests and all twelve real browser scenarios passed on disposable infrastructure. Orders covers scoped literal search/paging, accepted allocation and verified capture, sequential delivery/pickup, unpaid cancellation, immutable audit, stale versions, committed-response loss and company/moderator denial. Axe found no violations in tested order views; the detail has no horizontal overflow at 390px. Login Lighthouse is 98/100/100. All 78 components explicitly declare OnPush; types, lint, architecture, builds, formatting and 194-operation contract drift checks passed. The UI-login test helper buffers the real response before browser navigation, avoiding Chrome response-body races without changing application login. Docker API/admin are healthy; orders SPA, proxied readiness and Swagger return 200, anonymous orders return 401. No shared development fixtures or real gateway operations were created.
