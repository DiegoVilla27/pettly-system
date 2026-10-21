import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  type ValidatorFn,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { uuid } from 'zod/mini';
import { VeterinaryListStore } from '../state/veterinary-list.store';
import { statuses, defaultFilters } from '../models/credential';
import { parseFilters } from '../mappers/veterinary.mapper';
import { CredentialBadgeComponent } from '../components/credential-badge.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { DatePipe } from '@angular/common';
const idValidator: ValidatorFn = (c) =>
  !c.value || uuid().safeParse(c.value).success ? null : { uuid: true };
@Component({
  selector: 'app-veterinary-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CredentialBadgeComponent,
    ProblemComponent,
    PaginationComponent,
    DatePipe,
  ],
  providers: [VeterinaryListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './veterinary-list.page.html',
})
export class VeterinaryListPage {
  readonly store = inject(VeterinaryListStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly statuses = statuses;
  readonly filters = toSignal(
    this.route.queryParamMap.pipe(map(parseFilters)),
    { initialValue: defaultFilters },
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    status: [''],
    organizationId: ['', idValidator],
    limit: ['20'],
  });
  readonly lookup = inject(FormBuilder).nonNullable.group({
    credentialId: [
      '',
      (c: Parameters<ValidatorFn>[0]) =>
        uuid().safeParse(c.value).success ? null : { uuid: true },
    ],
  });
  constructor() {
    this.store.load(this.filters);
    effect(() => {
      const f = this.filters();
      this.form.patchValue(
        {
          status: f.status ?? '',
          organizationId: f.organizationId ?? '',
          limit: String(f.limit),
        },
        { emitEvent: false },
      );
    });
  }
  search() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('#veterinary-organization')
        ?.focus();
      return;
    }
    const v = this.form.getRawValue();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: v.status || null,
        organizationId: v.organizationId || null,
        limit: v.limit,
        page: 1,
      },
    });
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...this.filters(), page },
    });
  }
  clear() {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }
  open() {
    this.lookup.markAllAsTouched();
    if (this.lookup.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('#credential-lookup')
        ?.focus();
      return;
    }
    void this.router.navigate([
      '/veterinaria',
      this.lookup.getRawValue().credentialId,
    ]);
  }
}
