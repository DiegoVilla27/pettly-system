import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import type { Booking } from '../models/booking';
import {
  colombiaDateTime,
  moneyLabel,
} from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-booking-acceptance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="mt-5 grid gap-5 sm:grid-cols-2">
      <div>
        <dt class="text-xs text-muted">Servicio y empresa aceptados</dt>
        <dd class="mt-2 text-sm font-semibold break-words">
          {{ accepted().service.name }} · {{ accepted().organizationName }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Recurso aceptado</dt>
        <dd class="mt-2 text-sm break-words">{{ accepted().resource.name }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Mascota</dt>
        <dd class="mt-2 text-sm break-words">
          {{ accepted().pet.name }} · {{ speciesLabel() }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Contacto autorizado</dt>
        <dd class="mt-2 text-sm break-words">
          {{ accepted().contact.name }} ·
          <a
            [href]="'tel:' + accepted().contact.phone"
            class="font-semibold text-primary"
            >{{ accepted().contact.phone }}</a
          >
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Inicio · Colombia</dt>
        <dd class="mt-2 text-sm">{{ colombiaDateTime(booking().startsAt) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Fin · Colombia</dt>
        <dd class="mt-2 text-sm">{{ colombiaDateTime(booking().endsAt) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Total aceptado, impuestos incluidos</dt>
        <dd class="mt-2 text-lg font-semibold">
          {{ moneyLabel(accepted().totalMinor) }}
        </dd>
        <dd class="mt-2 text-xs text-muted">
          {{ accepted().nights ? accepted().nights + ' noches' : 'Una cita' }} ·
          Cobro en el establecimiento
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Cancelación del cliente</dt>
        <dd class="mt-2 text-sm">
          Hasta {{ accepted().service.cancellationCutoffMinutes }} minutos antes
          del inicio
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Preparación / limpieza</dt>
        <dd class="mt-2 text-sm">
          {{ accepted().service.bufferBeforeMinutes }} /
          {{ accepted().service.bufferAfterMinutes }} minutos
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">Política aceptada</dt>
        <dd class="mt-2 text-sm">
          Servicio versión {{ accepted().service.version }} · recurso versión
          {{ accepted().resource.version }}
        </dd>
      </div>
    </dl>
    <h3 class="mt-6 font-semibold">Requisitos aceptados</h3>
    <p class="mt-2 text-sm leading-relaxed break-words text-muted">
      {{ accepted().service.requirements }}
    </p>
    <h3 class="mt-5 font-semibold">Condiciones aceptadas</h3>
    <p class="mt-2 text-sm leading-relaxed break-words text-muted">
      {{ accepted().service.terms }}
    </p>
    <p class="mt-5 rounded-xl bg-sage p-4 text-sm text-primary">
      Consentimiento registrado el
      {{ colombiaDateTime(accepted().acceptedAt) }}: condiciones, precio y
      contacto/identidad de la mascota compartidos con la empresa.
    </p>
  `,
})
export class BookingAcceptanceComponent {
  readonly booking = input.required<Booking>();
  readonly accepted = computed(() => this.booking().acceptance);
  readonly colombiaDateTime = colombiaDateTime;
  readonly moneyLabel = moneyLabel;
  readonly speciesLabel = computed(
    () =>
      ({
        dog: 'Perro',
        cat: 'Gato',
        bird: 'Ave',
        rabbit: 'Conejo',
        reptile: 'Reptil',
        rodent: 'Roedor',
        equine: 'Equino',
        other: 'Otra especie',
      })[this.accepted().pet.species] ?? this.accepted().pet.species,
  );
}
