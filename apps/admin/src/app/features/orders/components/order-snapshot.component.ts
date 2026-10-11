import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import type { Order } from '../models/order';
import { orderMoney } from '../models/order';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-order-snapshot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul aria-label="Productos aceptados" class="mt-5 space-y-3">
      @for (l of lines(); track l.variantId) {
        <li class="rounded-xl bg-paper p-4">
          <h3 class="font-semibold break-words">{{ l.name }}</h3>
          <p class="mt-2 text-sm break-words">
            {{ l.sku }} · {{ l.quantity }} unidades ·
            {{ money(l.unitPriceMinor, order().currency) }} por unidad
          </p>
          <p class="mt-2 text-sm">
            Subtotal {{ money(l.subtotalMinor, order().currency) }} · Impuesto
            adicional {{ money(l.taxMinor, order().currency) }}
          </p>
          @for (a of l.details; track a.key) {
            <p class="mt-1 text-xs break-words">{{ a.key }}: {{ a.value }}</p>
          }
        </li>
      }
    </ul>
    <dl class="mt-5 grid gap-4 sm:grid-cols-2">
      <div>
        <dt class="text-sm text-muted">Subtotal de productos</dt>
        <dd class="mt-1 font-semibold">
          {{ money(order().snapshot.subtotalMinor, order().currency) }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted">Envío</dt>
        <dd class="mt-1 font-semibold">
          {{ money(order().snapshot.shippingMinor, order().currency) }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted">Impuestos</dt>
        <dd class="mt-1">
          {{
            order().snapshot.taxMinor === null
              ? 'Incluidos en precios; desglose no disponible'
              : money(order().snapshot.taxMinor!, order().currency)
          }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted">Total aceptado</dt>
        <dd class="mt-1 text-xl font-semibold">
          {{ money(order().totalMinor, order().currency) }}
        </dd>
      </div>
    </dl>
    @if (order().snapshot.commission; as c) {
      <section
        class="mt-5 rounded-xl bg-sage p-4"
        aria-labelledby="order-split"
      >
        <h3 id="order-split" class="font-semibold">
          Reparto aceptado · {{ c.rateBasisPoints / 100 }}%
        </h3>
        <p class="mt-2 text-sm">
          Pettly {{ money(c.platformMinor, order().currency) }} · Empresa
          {{ money(c.sellerMinor, order().currency) }}
        </p>
        <p class="mt-2 text-xs text-muted">
          Importes brutos antes de costes de pasarela a cargo del vendedor. Este
          acuerdo no demuestra desembolso bancario.
        </p>
      </section>
    } @else {
      <p class="mt-4 text-sm text-muted">
        Pedido histórico sin reparto de comisión aceptado.
      </p>
    }
    <section
      class="mt-5 border-t border-line pt-5"
      aria-labelledby="order-payment"
    >
      <h3 id="order-payment" class="font-semibold">Estado real del pago</h3>
      @if (order().paidAt; as date) {
        <p class="mt-2 text-sm">Pago verificado el {{ dateTime(date) }}.</p>
        <p class="mt-2 text-xs break-all text-muted">
          Referencia interna {{ order().paymentId }}
        </p>
      } @else {
        <p class="mt-2 text-sm">
          Sin pago verificado. La preparación permanece bloqueada hasta la
          confirmación de la pasarela.
        </p>
      }
      <p class="mt-2 text-xs text-muted">
        La integración de pasarela está pendiente de activación. No se registran
        pagos manualmente.
      </p>
    </section>
    <section
      class="mt-5 border-t border-line pt-5"
      aria-labelledby="order-contact"
    >
      <h3 id="order-contact" class="font-semibold">
        {{
          order().snapshot.fulfillment === 'pickup'
            ? 'Recogida en establecimiento'
            : 'Entrega a domicilio'
        }}
      </h3>
      <p class="mt-3 text-sm break-words">
        {{ order().snapshot.contact.recipient }} ·
        {{ order().snapshot.contact.phone }}
      </p>
      @if (order().snapshot.fulfillment === 'delivery') {
        <p class="mt-2 text-sm break-words">
          {{ order().snapshot.contact.address }}
          {{ order().snapshot.contact.addressLine2 }} ·
          {{ order().snapshot.contact.city }},
          {{ order().snapshot.contact.countryCode }}
          {{ order().snapshot.contact.postalCode }}
        </p>
      }
      @if (
        order().snapshot.fulfillment === 'pickup' &&
          order().snapshot.pickupAddress;
        as a
      ) {
        <p class="mt-2 text-sm break-words">
          {{ a.recipient }} · {{ a.phone }}
        </p>
        <p class="mt-2 text-sm break-words">
          {{ a.address }} {{ a.addressLine2 }} · {{ a.city }},
          {{ a.countryCode }} {{ a.postalCode }}
        </p>
      }
    </section>
    <details class="mt-5">
      <summary
        class="min-h-11 cursor-pointer text-sm font-semibold text-primary"
      >
        Condiciones comerciales aceptadas
      </summary>
      <p class="mt-3 text-sm break-words">{{ order().snapshot.terms }}</p>
    </details>
  `,
})
export class OrderSnapshotComponent {
  readonly order = input.required<Order>();
  readonly money = orderMoney;
  readonly dateTime = colombiaDateTime;
  readonly lines = computed(() =>
    this.order().snapshot.lines.map((line) => ({
      ...line,
      details: Object.entries(line.attributes).map(([key, value]) => ({
        key,
        value,
      })),
    })),
  );
}
