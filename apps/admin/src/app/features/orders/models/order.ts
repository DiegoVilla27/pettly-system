import type { ApiRequest, ApiResponse, ApiQuery } from '@pettly/api-client';
export type OrderDto = ApiResponse<'getVisibleOrder'>;
export type Order = Omit<OrderDto, 'quoteId' | 'snapshot'> & {
  snapshot: Omit<OrderDto['snapshot'], 'collector' | 'lines'> & {
    lines: Omit<OrderDto['snapshot']['lines'][number], 'holdId'>[];
  };
};
export type OrderQuery = ApiQuery<'listVisibleOrders'> & {
  organizationId: string;
  page: number;
  limit: number;
};
export type OrderPage = Omit<ApiResponse<'listVisibleOrders'>, 'items'> & {
  items: Order[];
};
export type DecisionBody = ApiRequest<'cancelUnpaidOrder'>;
export type OrderAudit = ApiResponse<'listVisibleOrderAudits'>['items'][number];
export interface OrderContext {
  organizationId: string;
  orderId: string;
}
export interface Company {
  id: string;
  name: string;
}
export type OrderAction =
  'cancel' | ApiRequest<'advanceOrderFulfillment'>['status'];
export interface OrderCommand {
  context: OrderContext;
  action: OrderAction;
  body: DecisionBody;
}
export const statuses = [
  { value: 'awaiting_payment', label: 'Pendiente de pago' },
  { value: 'paid', label: 'Pago verificado' },
  { value: 'preparing', label: 'En preparación' },
  { value: 'dispatched', label: 'Despachado' },
  { value: 'ready_for_pickup', label: 'Listo para recoger' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'expired', label: 'Vencido' },
] as const;
export const actionLabels: Record<OrderAction, string> = {
  cancel: 'Cancelar pedido sin pago',
  preparing: 'Iniciar preparación',
  dispatched: 'Registrar despacho',
  ready_for_pickup: 'Listo para recoger',
  delivered: 'Confirmar entrega',
};
export const historyLabels: Record<string, string> = {
  created: 'Pedido creado',
  paid: 'Pago verificado',
  expired: 'Vencimiento',
  cancelled: 'Cancelación',
  ...actionLabels,
};
export function statusLabel(s: Order['status']) {
  return statuses.find((v) => v.value === s)?.label ?? s;
}
export function availableActions(o: Order, now: number): OrderAction[] {
  switch (o.status) {
    case 'awaiting_payment':
      return Date.parse(o.expiresAt) > now ? ['cancel'] : [];
    case 'paid':
      return ['preparing'];
    case 'preparing':
      return [
        o.snapshot.fulfillment === 'pickup' ? 'ready_for_pickup' : 'dispatched',
      ];
    case 'ready_for_pickup':
    case 'dispatched':
      return ['delivered'];
    default:
      return [];
  }
}
const formatter = (currency: Order['currency']) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const formats: Record<Order['currency'], Intl.NumberFormat> = {
  COP: formatter('COP'),
  USD: formatter('USD'),
  EUR: formatter('EUR'),
};
export function orderMoney(minor: number, currency: Order['currency']) {
  return formats[currency].format(minor / 100);
}
