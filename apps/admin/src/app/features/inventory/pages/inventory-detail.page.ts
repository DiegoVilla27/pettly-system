import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  HostListener,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { InventoryDetailStore } from '../state/inventory-detail.store';
import { MovementFormComponent } from '../components/movement-form.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import {
  movementLabels,
  productLabels,
  type MovementInput,
} from '../models/inventory';
@Component({
  selector: 'app-inventory-detail',
  imports: [
    RouterLink,
    DatePipe,
    MovementFormComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [InventoryDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-detail.page.html',
})
export class InventoryDetailPage {
  readonly store = inject(InventoryDetailStore);
  readonly movementLabels = movementLabels;
  readonly productLabels = productLabels;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly context = toSignal(
    this.route.paramMap.pipe(
      map((params) => ({
        organizationId: params.get('organizationId') ?? '',
        variantId: params.get('variantId') ?? '',
      })),
    ),
    { initialValue: { organizationId: '', variantId: '' } },
  );
  readonly pageQuery = toSignal(
    this.route.queryParamMap.pipe(
      map((p) => {
        const page = Number(p.get('page') ?? 1),
          limit = Number(p.get('limit') ?? 20);
        return {
          page: Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1,
          limit: [10, 20, 50].includes(limit) ? limit : 20,
        };
      }),
    ),
    { initialValue: { page: 1, limit: 20 } },
  );
  readonly ledgerQuery = computed(() =>
    this.store.row()
      ? {
          ...this.context(),
          ...this.pageQuery(),
          revision: this.store.row()?.stock.version,
        }
      : null,
  );
  readonly writable = computed(
    () =>
      this.store.row()?.variantStatus === 'active' &&
      this.store.row()?.productStatus !== 'archived',
  );
  constructor() {
    this.store.load(this.context);
    this.store.loadLedger(this.ledgerQuery);
  }
  refresh() {
    if (!this.store.intent() && !this.store.busy())
      this.store.load(this.context());
  }
  record(body: MovementInput) {
    this.store.record(body);
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.pageQuery(), page },
    });
  }
  canLeave() {
    return (
      !this.store.intent() ||
      window.confirm(
        'Hay un movimiento sin confirmar. Al salir perderás la opción de reintentar con su misma clave. Consulta el historial antes de registrar otro movimiento. ¿Quieres salir?',
      )
    );
  }
  @HostListener('window:beforeunload', ['$event']) protectPending(
    event: BeforeUnloadEvent,
  ) {
    if (this.store.intent()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
