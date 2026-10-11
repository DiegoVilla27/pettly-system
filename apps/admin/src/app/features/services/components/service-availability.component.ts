import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  computed,
  signal,
  effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, switchMap, of, catchError, map, startWith } from 'rxjs';
import { RESOURCE_GATEWAY } from '../models/resource-gateway';
import type { Resource, Service } from '../models/service';
import { moneyLabel } from '../models/service';
import {
  colombiaDateTime,
  type Availability,
  type AvailabilityQuery,
} from '../models/resource';
import {
  colombiaToday,
  validAvailabilityRange,
} from '../mappers/resource.mapper';
import { ApiProblem, toApiProblem } from '../../../core/api';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
interface AvailabilityRequest {
  service: Service;
  resource: Resource;
  query: AvailabilityQuery;
}
type AvailabilityState = {
  loading: boolean;
  problem: ApiProblem | null;
  value: Availability | null;
};
@Component({
  selector: 'app-service-availability',
  imports: [ReactiveFormsModule, ProblemComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <section
    class="mt-6 rounded-3xl border border-line bg-white p-5 sm:p-7"
    aria-labelledby="availability-heading"
  >
    <h2 id="availability-heading" class="text-xl font-semibold">
      Consultar disponibilidad
    </h2>
    <p class="mt-3 text-sm text-muted">
      Horarios en Colombia. La consulta es orientativa y no reserva cupos. Hasta
      31 fechas consecutivas dentro de los próximos 180 días.
    </p>
    @if (!eligible().length) {
      <p class="mt-4 text-sm text-muted">
        Este servicio no tiene recursos activos. Revisa sus agendas antes de
        consultar.
      </p>
    }
    <form
      [formGroup]="form"
      (ngSubmit)="search()"
      class="mt-5 grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label for="availability-resource" class="text-sm font-semibold"
          >Recurso disponible</label
        ><select
          id="availability-resource"
          formControlName="resourceId"
          class="mt-2 block min-h-11 w-full rounded-xl border border-line px-3"
        >
          <option value="">Selecciona un recurso</option>
          @for (r of eligible(); track r.id) {
            <option [value]="r.id">{{ r.name }}</option>
          }
        </select>
      </div>
      <label class="text-sm font-semibold"
        >Desde la fecha<input
          type="date"
          formControlName="from"
          class="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-line px-3" /></label
      ><label class="text-sm font-semibold"
        >Hasta la fecha<input
          type="date"
          formControlName="to"
          class="mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-line px-3"
      /></label>
      @if (service().kind === 'lodging') {
        <label class="text-sm font-semibold"
          >Noches<input
            type="number"
            formControlName="nights"
            [min]="service().minNights"
            [max]="service().maxNights"
            class="mt-2 block min-h-11 w-full rounded-xl border border-line px-3"
        /></label>
      }
      <button
        type="submit"
        [disabled]="state().loading || form.invalid"
        class="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        Consultar disponibilidad
      </button>
    </form>
    @if (error()) {
      <p role="alert" class="mt-4 text-sm">{{ error() }}</p>
    }
    <app-problem [problem]="state().problem" />
    @if (state().loading) {
      <p role="status" class="mt-4 text-sm text-muted">Consultando cupos…</p>
    } @else if (state().value; as a) {
      <p class="mt-4 text-xs text-muted">
        Servicio versión {{ a.serviceVersion }} · recurso versión
        {{ a.resourceVersion }} · {{ a.slots.length }} horarios
      </p>
      @if (a.truncated) {
        <p role="status" class="mt-3 text-sm">
          La respuesta alcanzó 1.000 horarios. Reduce el intervalo para
          consultar todos.
        </p>
      }
      <ul aria-label="Horarios disponibles" class="mt-5 space-y-3">
        @for (s of slots(); track s.startsAt) {
          <li class="rounded-xl border border-line p-4">
            <p class="text-sm font-semibold">
              {{ colombiaDateTime(s.startsAt) }} →
              {{ colombiaDateTime(s.endsAt) }}
            </p>
            <p class="mt-2 text-sm text-muted">
              {{ s.remaining }} cupos · {{ moneyLabel(s.totalMinor) }}
            </p>
          </li>
        } @empty {
          <li class="text-sm text-muted">
            No hay cupos disponibles para esta consulta.
          </li>
        }
      </ul>
      <app-pagination
        [page]="page()"
        [limit]="50"
        [total]="a.slots.length"
        (pageChange)="page.set($event)"
      />
    }
  </section>`,
})
export class ServiceAvailabilityComponent {
  readonly service = input.required<Service>();
  readonly resources = input.required<Resource[]>();
  private readonly gateway = inject(RESOURCE_GATEWAY);
  private readonly requests = new Subject<AvailabilityRequest | null>();
  readonly form = inject(FormBuilder).nonNullable.group({
    resourceId: ['', Validators.required],
    from: [colombiaToday(), Validators.required],
    to: [colombiaToday(), Validators.required],
    nights: [1, [Validators.required, Validators.min(1), Validators.max(30)]],
  });
  readonly eligible = computed(() =>
    this.resources().filter(
      (r) =>
        r.status === 'active' &&
        r.organizationId === this.service().organizationId &&
        this.service().resourceIds.includes(r.id),
    ),
  );
  readonly page = signal(1);
  readonly error = signal('');
  readonly moneyLabel = moneyLabel;
  readonly colombiaDateTime = colombiaDateTime;
  readonly state = toSignal<AvailabilityState, AvailabilityState>(
    this.requests.pipe(
      switchMap((q) =>
        q
          ? this.gateway.availability(q.service, q.resource, q.query).pipe(
              map(
                (value) =>
                  ({
                    loading: false,
                    problem: null,
                    value,
                  }) satisfies AvailabilityState,
              ),
              catchError((e) =>
                of({
                  loading: false,
                  problem: toApiProblem(e),
                  value: null,
                } satisfies AvailabilityState),
              ),
              startWith({
                loading: true,
                problem: null,
                value: null,
              } satisfies AvailabilityState),
            )
          : of({
              loading: false,
              problem: null,
              value: null,
            } satisfies AvailabilityState),
      ),
    ),
    {
      initialValue: {
        loading: false,
        problem: null,
        value: null,
      } as AvailabilityState,
    },
  );
  readonly slots = computed(
    () =>
      this.state().value?.slots.slice(
        (this.page() - 1) * 50,
        this.page() * 50,
      ) ?? [],
  );
  constructor() {
    effect(() => {
      this.service();
      this.resources();
      this.requests.next(null);
      this.page.set(1);
      this.form.reset({
        resourceId: '',
        from: colombiaToday(),
        to: colombiaToday(),
        nights: this.service().minNights,
      });
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.requests.next(null);
      this.error.set('');
      this.page.set(1);
    });
  }
  search() {
    const v = this.form.getRawValue(),
      s = this.service(),
      r = this.eligible().find((r) => r.id === v.resourceId);
    this.form.markAllAsTouched();
    if (this.form.invalid || !r) return;
    if (
      !validAvailabilityRange(v.from, v.to) ||
      (s.kind === 'lodging' &&
        (!Number.isInteger(v.nights) ||
          v.nights < s.minNights ||
          v.nights > s.maxNights))
    ) {
      this.error.set(
        'Revisa las fechas y el número de noches permitido por el servicio.',
      );
      return;
    }
    this.error.set('');
    this.page.set(1);
    this.requests.next({
      service: s,
      resource: r,
      query: {
        resourceId: r.id,
        from: v.from,
        to: v.to,
        ...(s.kind === 'lodging' ? { nights: v.nights } : {}),
      },
    });
  }
}
