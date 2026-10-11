import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AnimalsListStore } from '../state/animals-list.store';
import { parseFilters, contextSchema } from '../mappers/animals.mapper';
import { statuses, statusLabel, species, speciesLabel } from '../models/animal';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
@Component({
  selector: 'app-animals-list',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [AnimalsListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './animals-list.page.html',
})
export class AnimalsListPage {
  readonly store = inject(AnimalsListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly statuses = statuses;
  readonly statusLabel = statusLabel;
  readonly colombiaDateTime = colombiaDateTime;
  readonly species = species;
  readonly speciesLabel = speciesLabel;
  readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly query = computed(() => parseFilters(this.params()));
  readonly invalidFilters = computed(
    () => this.params().has('organizationId') && !this.query(),
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    organizationId: ['', Validators.required],
    search: [
      '',
      [
        Validators.maxLength(100),
        Validators.pattern(/^(?:[^\p{Cc}]{1,100})?$/u),
      ],
    ],
    status: [''],
    species: [''],
    limit: ['20'],
  });
  readonly animalId = inject(FormBuilder).nonNullable.control('', [
    Validators.required,
    Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  ]);
  readonly lookupForm = inject(FormBuilder).nonNullable.group({
    animalId: this.animalId,
  });
  readonly shelterSearch = inject(FormBuilder).nonNullable.control('', [
    Validators.maxLength(100),
    Validators.pattern(/^[^\p{Cc}]*$/u),
  ]);
  private readonly search = toSignal(
    this.shelterSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );
  readonly shelterRequest = computed(() => ({
    search: this.search(),
    currentId: this.query()?.organizationId,
  }));
  constructor() {
    this.store.load(this.query);
    this.store.findShelters(this.shelterRequest);
    effect(() => {
      const q = this.query();
      this.form.patchValue(
        {
          organizationId: q?.organizationId ?? '',
          search: q?.search ?? '',
          status: q?.status ?? '',
          species: q?.species ?? '',
          limit: String(q?.limit ?? 20),
        },
        { emitEvent: false },
      );
    });
  }
  searchAnimals() {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        organizationId: v.organizationId,
        search: v.search.trim() || null,
        status: v.status || null,
        species: v.species || null,
        limit: v.limit,
        page: 1,
      },
    });
  }
  refresh() {
    const q = this.query();
    if (q && !this.store.loading()) this.store.load(q);
  }
  page(page: number) {
    const q = this.query();
    if (q)
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...q, page },
      });
  }
  open() {
    this.animalId.markAsTouched();
    const c = contextSchema.safeParse({
      organizationId: this.query()?.organizationId,
      animalId: this.animalId.value.trim(),
    });
    if (c.success)
      void this.router.navigate([
        '/animales',
        c.data.organizationId,
        c.data.animalId,
      ]);
  }
}
