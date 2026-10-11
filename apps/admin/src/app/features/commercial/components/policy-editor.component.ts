import { toSignal } from '@angular/core/rxjs-interop';
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { minorToInput } from '../../../shared/forms/minor-money';
import {
  decimalAmount,
  percentToBasis,
  validateRequest,
} from '../mappers/commercial.mapper';
import type {
  Policy,
  PolicyRequest,
  VariantOption,
} from '../models/commercial';
@Component({
  selector: 'app-policy-editor',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<form [formGroup]="form" (ngSubmit)="submit()">
    <fieldset [disabled]="blocked()">
      <legend class="text-lg font-semibold">Condiciones comerciales</legend>
      <p class="mt-3 text-sm text-muted">
        Colombia y COP. Los cambios afectan futuras cotizaciones; las compras
        aceptadas conservan sus condiciones originales. El cobro y reparto se
        realizan por la pasarela cuando esté habilitada.
      </p>
      <label class="mt-4 flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="enabled"
          class="size-5 accent-primary"
        />Habilitar compras con estas condiciones</label
      ><label class="mt-3 flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="pickup"
          class="size-5 accent-primary"
        />Permitir recogida en la empresa</label
      >
      @if (pickup()) {
        <label for="policy-recipient" class="mt-4 block text-sm font-semibold"
          >Nombre del contacto de recogida</label
        ><input
          id="policy-recipient"
          formControlName="recipient"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label for="policy-phone" class="mt-4 block text-sm font-semibold"
          >Teléfono de recogida</label
        ><input
          id="policy-phone"
          formControlName="phone"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label for="policy-city" class="mt-4 block text-sm font-semibold"
          >Ciudad de recogida</label
        ><input
          id="policy-city"
          formControlName="city"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label for="policy-address" class="mt-4 block text-sm font-semibold"
          >Dirección de recogida</label
        ><input
          id="policy-address"
          formControlName="address"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label
          for="policy-addressLine2"
          class="mt-4 block text-sm font-semibold"
          >Complemento de recogida</label
        ><input
          id="policy-addressLine2"
          formControlName="addressLine2"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        /><label
          for="policy-postalCode"
          class="mt-4 block text-sm font-semibold"
          >Código postal de recogida</label
        ><input
          id="policy-postalCode"
          formControlName="postalCode"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        />
      }
      <h3 class="mt-6 font-semibold">Ciudades y tarifas de envío</h3>
      <div formArrayName="shipping">
        @for (row of shippingRows(); track row; let i = $index) {
          <div [formGroupName]="i" class="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label
                [for]="'policy-shipping-city-' + i"
                class="block text-sm font-semibold"
                >Ciudad de envío {{ i + 1 }}</label
              ><input
                [id]="'policy-shipping-city-' + i"
                formControlName="city"
                maxlength="100"
                class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
              />
            </div>
            <div>
              <label
                [for]="'policy-shipping-fee-' + i"
                class="block text-sm font-semibold"
                >Tarifa de envío COP {{ i + 1 }}</label
              ><input
                [id]="'policy-shipping-fee-' + i"
                formControlName="fee"
                inputmode="decimal"
                class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
              />
            </div>
            <button
              type="button"
              (click)="removeShipping(i)"
              class="min-h-11 rounded-xl border border-line px-3"
            >
              Quitar ciudad {{ i + 1 }}
            </button>
          </div>
        }
      </div>
      <button
        type="button"
        (click)="addShipping()"
        [disabled]="shippingRows().length >= 30"
        class="mt-4 min-h-11 rounded-xl border border-line px-3"
      >
        Añadir ciudad de envío
      </button>
      <label for="policy-tax-mode" class="mt-6 block text-sm font-semibold"
        >Tratamiento de impuestos</label
      ><select
        id="policy-tax-mode"
        formControlName="taxMode"
        class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
      >
        <option value="included">Incluidos en el precio</option>
        <option value="added">Adicionales con tasas explícitas</option>
      </select>
      <p class="mt-2 text-xs text-muted">
        Pettly no calcula la tasa legal aplicable. Si son adicionales, configura
        cada variante que se venderá; las cotizaciones sin tasa se bloquean.
      </p>
      @if (taxMode() === 'added') {
        <label
          for="policy-shipping-tax"
          class="mt-4 block text-sm font-semibold"
          >Impuesto adicional de envío (%)</label
        ><input
          id="policy-shipping-tax"
          formControlName="shippingTax"
          inputmode="decimal"
          class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
        />
        <div formArrayName="taxes">
          @for (row of taxRows(); track row; let i = $index) {
            <div [formGroupName]="i" class="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  [for]="'policy-tax-variant-' + i"
                  class="block text-sm font-semibold"
                  >Variante con impuesto {{ i + 1 }}</label
                ><select
                  [id]="'policy-tax-variant-' + i"
                  formControlName="variantId"
                  class="mt-2 min-h-11 w-full rounded-xl border border-line bg-white px-3"
                >
                  <option value="">Selecciona una variante</option>
                  @if (
                    row.controls.variantId.value &&
                    !hasVariant(row.controls.variantId.value)
                  ) {
                    <option [value]="row.controls.variantId.value">
                      Variante configurada fuera de esta página
                    </option>
                  }
                  @for (v of variants(); track v.id) {
                    <option [value]="v.id">{{ v.name }}</option>
                  }
                </select>
              </div>
              <div>
                <label
                  [for]="'policy-tax-rate-' + i"
                  class="block text-sm font-semibold"
                  >Tasa de variante {{ i + 1 }} (%)</label
                ><input
                  [id]="'policy-tax-rate-' + i"
                  formControlName="rate"
                  inputmode="decimal"
                  class="mt-2 min-h-11 w-full rounded-xl border border-line px-3"
                />
              </div>
              <button
                type="button"
                (click)="removeTax(i)"
                class="min-h-11 rounded-xl border border-line px-3"
              >
                Quitar impuesto {{ i + 1 }}
              </button>
            </div>
          }
        </div>
        <button
          type="button"
          (click)="addTax()"
          [disabled]="taxRows().length >= 50"
          class="mt-4 min-h-11 rounded-xl border border-line px-3"
        >
          Añadir impuesto de variante
        </button>
      }
      <label for="policy-terms" class="mt-6 block text-sm font-semibold"
        >Condiciones de compra</label
      ><textarea
        id="policy-terms"
        formControlName="terms"
        maxlength="2000"
        rows="4"
        class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
      ></textarea
      ><label for="policy-reason" class="mt-4 block text-sm font-semibold"
        >Motivo de cambio comercial</label
      ><textarea
        id="policy-reason"
        formControlName="reason"
        maxlength="500"
        class="mt-2 min-h-11 w-full rounded-xl border border-line p-3"
      ></textarea
      ><label class="mt-4 flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="confirm"
          class="size-5 accent-primary"
        />Confirmo las condiciones para futuras compras en COP y el reparto
        mediante pasarela</label
      >
      @if (error()) {
        <p role="alert" class="mt-4 text-danger">{{ error() }}</p>
      }
      <button
        type="submit"
        class="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
      >
        Guardar condiciones comerciales
      </button>
    </fieldset>
  </form>`,
})
export class PolicyEditorComponent {
  readonly policy = input<Policy | null>(null);
  readonly context = input.required<string>();
  readonly blocked = input(false);
  readonly variants = input<VariantOption[]>([]);
  readonly submitted = output<PolicyRequest>();
  readonly needsVariants = output<boolean>();
  readonly error = signal('');
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    enabled: [false],
    pickup: [false],
    recipient: [''],
    phone: [''],
    city: [''],
    address: [''],
    addressLine2: [''],
    postalCode: [''],
    shipping: this.fb.array([this.shippingRow()]),
    taxMode: ['included'],
    shippingTax: ['0'],
    taxes: this.fb.array([this.taxRow()]),
    terms: ['', [Validators.minLength(10), Validators.maxLength(2000)]],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  readonly pickup = toSignal(this.form.controls.pickup.valueChanges, {
    initialValue: false,
  });
  readonly taxMode = toSignal(this.form.controls.taxMode.valueChanges, {
    initialValue: 'included',
  });
  readonly shippingRows = signal(this.form.controls.shipping.controls.slice());
  readonly taxRows = signal(this.form.controls.taxes.controls.slice());
  private shippingRow(city = '', fee = '') {
    return this.fb.group({ city: [city], fee: [fee] });
  }
  private taxRow(variantId = '', rate = '') {
    return this.fb.group({ variantId: [variantId], rate: [rate] });
  }
  hasVariant(id: string) {
    return this.variants().some((v) => v.id === id);
  }
  constructor() {
    effect(() => this.needsVariants.emit(this.taxMode() === 'added'));
    effect(() => {
      this.context();
      const p = this.policy(),
        a = p?.pickupAddress;
      this.form.reset({
        enabled: p?.enabled ?? false,
        pickup: !!a,
        recipient: a?.recipient ?? '',
        phone: a?.phone ?? '',
        city: a?.city ?? '',
        address: a?.address ?? '',
        addressLine2: a?.addressLine2 ?? '',
        postalCode: a?.postalCode ?? '',
        taxMode: p?.taxMode ?? 'included',
        shippingTax: minorToInput(p?.shippingTaxBasisPoints ?? 0),
        terms: p?.terms ?? '',
        reason: '',
        confirm: false,
      });
      this.form.controls.shipping.clear();
      for (const r of p?.shippingRules ?? [])
        this.form.controls.shipping.push(
          this.shippingRow(r.city, minorToInput(r.feeMinor)),
        );
      this.form.controls.taxes.clear();
      for (const [id, rate] of Object.entries(p?.taxRates ?? {}))
        this.form.controls.taxes.push(this.taxRow(id, minorToInput(rate)));
      this.shippingRows.set(this.form.controls.shipping.controls.slice());
      this.taxRows.set(this.form.controls.taxes.controls.slice());
      this.error.set('');
    });
  }
  addShipping() {
    if (this.blocked() || this.shippingRows().length >= 30) return;
    this.form.controls.shipping.push(this.shippingRow());
    this.shippingRows.set(this.form.controls.shipping.controls.slice());
  }
  removeShipping(i: number) {
    if (this.blocked()) return;
    this.form.controls.shipping.removeAt(i);
    this.shippingRows.set(this.form.controls.shipping.controls.slice());
  }
  addTax() {
    if (this.blocked() || this.taxRows().length >= 50) return;
    this.form.controls.taxes.push(this.taxRow());
    this.taxRows.set(this.form.controls.taxes.controls.slice());
  }
  removeTax(i: number) {
    if (this.blocked()) return;
    this.form.controls.taxes.removeAt(i);
    this.taxRows.set(this.form.controls.taxes.controls.slice());
  }
  submit() {
    if (this.blocked()) return;
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    const taxes = v.taxMode === 'added' ? v.taxes : [];
    const fees = v.shipping.map((r) => decimalAmount(r.fee)),
      rates = taxes.map((r) => percentToBasis(r.rate)),
      shippingTax = v.taxMode === 'added' ? percentToBasis(v.shippingTax) : 0;
    if (
      this.form.invalid ||
      fees.some((f) => f === null) ||
      rates.some((r) => r === null) ||
      shippingTax === null ||
      new Set(taxes.map((r) => r.variantId)).size !== taxes.length
    ) {
      this.error.set(
        'Revisa tarifas, tasas sin duplicados, condiciones, motivo y confirmación.',
      );
      return;
    }
    const body: PolicyRequest = {
      expectedVersion: this.policy()?.version ?? 0,
      reason: v.reason.trim(),
      currency: 'COP',
      enabled: v.enabled,
      pickupAddress: v.pickup
        ? {
            recipient: v.recipient.trim(),
            phone: v.phone.trim(),
            countryCode: 'CO',
            city: v.city.trim(),
            address: v.address.trim(),
            addressLine2: v.addressLine2.trim() || null,
            postalCode: v.postalCode.trim() || null,
          }
        : null,
      shippingRules: v.shipping.map((r, i) => ({
        countryCode: 'CO',
        city: r.city.trim(),
        feeMinor: fees[i] ?? 0,
      })),
      taxMode: v.taxMode === 'added' ? 'added' : 'included',
      taxRates: Object.fromEntries(
        taxes.map((r, i) => [r.variantId, rates[i] ?? 0]),
      ),
      shippingTaxBasisPoints: shippingTax,
      collector: 'platform',
      terms: v.terms.trim(),
    };
    try {
      validateRequest(body);
    } catch {
      this.error.set(
        'Revisa los datos de recogida, ciudades, impuestos y condiciones.',
      );
      return;
    }
    this.error.set('');
    this.submitted.emit(body);
  }
}
