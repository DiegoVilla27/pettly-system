import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  computed,
} from '@angular/core';
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<nav
    class="mt-6 flex flex-wrap items-center justify-between gap-4"
    aria-label="Paginación"
  >
    <p class="text-sm text-muted">
      {{ total() }} resultados · Página {{ page() }} de {{ pages() }}
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        [disabled]="busy() || page() <= 1"
        (click)="pageChange.emit(page() - 1)"
        class="min-h-11 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-40"
      >
        Anterior</button
      ><button
        type="button"
        [disabled]="busy() || page() >= pages()"
        (click)="pageChange.emit(page() + 1)"
        class="min-h-11 rounded-xl border border-line px-4 text-sm font-medium disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  </nav>`,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly limit = input(20);
  readonly busy = input(false);
  readonly pageChange = output<number>();
  readonly pages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.limit())),
  );
}
