import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, debounceTime, distinctUntilChanged } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { InventoryListStore } from '../state/inventory-list.store';
import { parseFilters } from '../mappers/inventory.mapper';
import { productLabels } from '../models/inventory';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-inventory-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [InventoryListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventory-list.page.html',
})
export class InventoryListPage {
  readonly store = inject(InventoryListStore);
  readonly session = inject(AUTH_SESSION);
  readonly productLabels = productLabels;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly query = toSignal(this.route.queryParamMap.pipe(map(parseFilters)), {
    initialValue: null,
  });
  readonly form = inject(FormBuilder).nonNullable.group({
    organizationId: ['', Validators.required],
    search: [
      '',
      [Validators.maxLength(100), Validators.pattern(/^[^\p{Cc}]*$/u)],
    ],
    status: [''],
    limit: ['20'],
  });
  readonly companySearch = inject(FormBuilder).nonNullable.control('', [
    Validators.maxLength(100),
    Validators.pattern(/^[^\p{Cc}]*$/u),
  ]);
  private readonly search = toSignal(
    this.companySearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  readonly companyRequest = computed(() => ({
    search: this.search(),
    currentId: this.query()?.organizationId,
  }));
  constructor() {
    this.store.load(this.query);
    this.store.findCompanies(this.companyRequest);
    effect(() => {
      const q = this.query();
      this.form.patchValue(
        {
          organizationId: q?.organizationId ?? '',
          search: q?.search ?? '',
          status: q?.status ?? '',
          limit: String(q?.limit ?? 20),
        },
        { emitEvent: false },
      );
    });
  }
  searchInventory() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, c]) => c.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(`[formcontrolname="${key}"]`)
        ?.focus();
      return;
    }
    const v = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        organizationId: v.organizationId,
        search: v.search.trim() || null,
        status: v.status || null,
        limit: v.limit,
        page: 1,
      },
    });
  }
  page(page: number) {
    const q = this.query();
    if (q)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...q, page },
      });
  }
}
