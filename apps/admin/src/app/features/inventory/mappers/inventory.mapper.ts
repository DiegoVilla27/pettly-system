import {
  object,
  strictObject,
  string,
  uuid,
  number,
  int,
  nonnegative,
  positive,
  nullable,
  array,
  iso,
  enum as enumeration,
  refine,
  maxLength,
  minLength,
  regex,
  optional,
} from 'zod/mini';
import type { ParamMap } from '@angular/router';
import { ApiProblem } from '../../../core/api';
import { reasonSchema } from '../../../shared/forms/audit-reason';
import type { ApiResponse } from '@pettly/api-client';
import type {
  Stock,
  Ledger,
  InventoryPage,
  InventoryRow,
  MovementBody,
  MovementInput,
  MovementResult,
  Company,
  InventoryQuery,
} from '../models/inventory';
export const boundedInteger = (max = 1000000000) =>
  number().check(
    int(),
    nonnegative(),
    refine((n) => n <= max),
  );
export const version = number().check(
  int(),
  positive(),
  refine((n) => n <= 2147483647),
);
export const stockSchema = object({
  variantId: uuid(),
  onHand: boundedInteger(),
  reserved: boundedInteger(),
  available: boundedInteger(),
  version,
  updatedAt: iso.datetime(),
}).check(
  refine(
    (s) => s.reserved <= s.onHand && s.available === s.onHand - s.reserved,
  ),
);
const inputSchema = strictObject({
  kind: enumeration(['receipt', 'issue', 'adjustment']),
  quantity: number().check(
    int(),
    refine((n) => n !== 0 && Math.abs(n) <= 1000000),
  ),
  reason: reasonSchema,
}).check(refine((m) => m.kind === 'adjustment' || m.quantity > 0));
export const movementBodySchema = strictObject({
  kind: enumeration(['receipt', 'issue', 'adjustment']),
  quantity: number().check(
    int(),
    refine((n) => n !== 0 && Math.abs(n) <= 1000000),
  ),
  reason: reasonSchema,
  expectedVersion: version,
  idempotencyKey: uuid(),
}).check(refine((m) => m.kind === 'adjustment' || m.quantity > 0));
const movementSchema = object({
  id: uuid(),
  variantId: uuid(),
  organizationId: uuid(),
  actorId: nullable(uuid()),
  holdId: nullable(uuid()),
  kind: enumeration([
    'receipt',
    'issue',
    'adjustment',
    'hold',
    'release',
    'consume',
    'expire',
  ]),
  onHandDelta: number().check(int()),
  reservedDelta: number().check(int()),
  onHandAfter: boundedInteger(),
  reservedAfter: boundedInteger(),
  versionAfter: version,
  idempotencyKey: string().check(minLength(1), maxLength(100)),
  reason: reasonSchema,
  requestId: uuid(),
  createdAt: iso.datetime(),
}).check(refine((m) => m.reservedAfter <= m.onHandAfter));
const rowSchema = object({
  id: uuid(),
  organizationId: uuid(),
  productId: uuid(),
  productName: string().check(
    minLength(2),
    maxLength(150),
    regex(/^[^\p{Cc}]+$/u),
  ),
  sku: string().check(
    minLength(1),
    maxLength(64),
    regex(/^[A-Z0-9][A-Z0-9._-]*$/),
  ),
  productStatus: enumeration([
    'draft',
    'pending',
    'published',
    'rejected',
    'paused',
    'archived',
  ]),
  variantStatus: enumeration(['active', 'archived']),
  stock: stockSchema,
}).check(refine((row) => row.id === row.stock.variantId));
export function inputProblem() {
  return new ApiProblem(
    400,
    'INVALID_INPUT',
    'Revisa la empresa, la variante y los datos del movimiento.',
  );
}
export function contractProblem() {
  return new ApiProblem(
    502,
    'INVALID_RESPONSE',
    'No pudimos confirmar los datos del inventario. Consulta los datos actuales antes de continuar.',
  );
}
export function validId(value: string) {
  if (!uuid().safeParse(value).success) throw inputProblem();
}
export function mapStock(dto: Stock, id: string): Stock {
  const parsed = stockSchema.safeParse(dto);
  if (!parsed.success || parsed.data.variantId !== id) throw contractProblem();
  return parsed.data;
}
export function mapPage(
  dto: InventoryPage,
  query: InventoryQuery,
): InventoryPage {
  const parsed = object({
    items: array(rowSchema).check(maxLength(50)),
    total: boundedInteger(2147483647),
    page: version,
    limit: boundedInteger(50),
  }).safeParse(dto);
  if (
    !parsed.success ||
    parsed.data.page !== (query.page ?? 1) ||
    parsed.data.limit !== (query.limit ?? 20) ||
    parsed.data.items.length > parsed.data.limit ||
    parsed.data.items.length > parsed.data.total ||
    new Set(parsed.data.items.map((r) => r.id)).size !==
      parsed.data.items.length ||
    parsed.data.items.some(
      (r) =>
        r.organizationId !== query.organizationId ||
        (query.variantId && r.id !== query.variantId),
    )
  )
    throw contractProblem();
  return parsed.data;
}
export function mapRow(
  dto: InventoryRow,
  org: string,
  id: string,
): InventoryRow {
  const parsed = rowSchema.safeParse(dto);
  if (
    !parsed.success ||
    parsed.data.organizationId !== org ||
    parsed.data.id !== id
  )
    throw contractProblem();
  return parsed.data;
}
export function mapLedger(
  dto: Ledger,
  org: string,
  id: string,
  page: number,
  limit: number,
): Ledger {
  const parsed = object({
    items: array(movementSchema).check(maxLength(100)),
    total: boundedInteger(2147483647),
    page: version,
    limit: boundedInteger(100),
  }).safeParse(dto);
  if (
    !parsed.success ||
    parsed.data.page !== page ||
    parsed.data.limit !== limit ||
    parsed.data.items.length > limit ||
    parsed.data.items.length > parsed.data.total ||
    new Set(parsed.data.items.map((m) => m.id)).size !==
      parsed.data.items.length ||
    parsed.data.items.some(
      (m) => m.variantId !== id || m.organizationId !== org,
    )
  )
    throw contractProblem();
  return parsed.data;
}
export function validInput(body: MovementInput) {
  return inputSchema.safeParse(body).success;
}
export function mapResult(
  dto: MovementResult,
  org: string,
  id: string,
  body: MovementBody,
): MovementResult {
  const parsed = object({
    stock: stockSchema,
    movement: movementSchema,
  }).safeParse(dto);
  if (!parsed.success) throw contractProblem();
  const { stock, movement: m } = parsed.data;
  const delta = body.kind === 'issue' ? -body.quantity : body.quantity;
  if (
    stock.variantId !== id ||
    m.variantId !== id ||
    m.organizationId !== org ||
    m.idempotencyKey !== body.idempotencyKey ||
    m.kind !== body.kind ||
    m.onHandDelta !== delta ||
    m.reservedDelta !== 0 ||
    m.versionAfter !== body.expectedVersion + 1 ||
    stock.version < m.versionAfter ||
    (stock.version === m.versionAfter &&
      (stock.onHand !== m.onHandAfter || stock.reserved !== m.reservedAfter)) ||
    m.reason !== body.reason ||
    m.actorId === null ||
    m.holdId !== null
  )
    throw contractProblem();
  return parsed.data;
}
export function company(
  dto: Pick<
    ApiResponse<'getOrganizationProfile'>,
    'id' | 'name' | 'status' | 'type'
  >,
): Company {
  const p = object({
    id: uuid(),
    name: string().check(minLength(2), maxLength(150)),
    status: enumeration(['active']),
    type: enumeration(['business']),
  }).safeParse(dto);
  if (!p.success) throw contractProblem();
  return { id: p.data.id, name: p.data.name };
}
export function parseFilters(params: ParamMap): InventoryQuery | null {
  const organizationId = params.get('organizationId');
  if (!organizationId || !uuid().safeParse(organizationId).success) return null;
  const search = params.get('search')?.trim(),
    status = params.get('status'),
    page = Number(params.get('page') ?? 1),
    limit = Number(params.get('limit') ?? 20);
  return {
    organizationId,
    page: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
    limit: [10, 20, 50].includes(limit) ? limit : 20,
    ...(search && search.length <= 100 && !/\p{Cc}/u.test(search)
      ? { search }
      : {}),
    ...(status === 'active' || status === 'archived' ? { status } : {}),
  };
}
export const querySchema = object({
  organizationId: uuid(),
  page: optional(
    number().check(
      int(),
      positive(),
      refine((n) => n <= 10000),
    ),
  ),
  limit: optional(
    number().check(
      int(),
      positive(),
      refine((n) => n <= 50),
    ),
  ),
  search: optional(string().check(maxLength(100), regex(/^[^\p{Cc}]*$/u))),
  status: optional(enumeration(['active', 'archived'])),
  variantId: optional(uuid()),
});
