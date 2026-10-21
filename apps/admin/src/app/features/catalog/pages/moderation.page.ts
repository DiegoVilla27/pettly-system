import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  ElementRef,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
  convertToParamMap,
} from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { uuid } from 'zod/mini';
import { AUTH_SESSION } from '../../../core/auth';
import { ModerationStore } from '../state/moderation.store';
import { parseQueue } from '../mappers/catalog.mapper';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
const idValidator: ValidatorFn = (c) =>
  !c.value || uuid().safeParse(c.value).success ? null : { uuid: true };
@Component({
  selector: 'app-catalog-moderation',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [ModerationStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './moderation.page.html',
})
export class ModerationPage {
  readonly store = inject(ModerationStore);
  readonly session = inject(AUTH_SESSION);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly filters = toSignal(this.route.queryParamMap.pipe(map(parseQueue)), {
    initialValue: parseQueue(convertToParamMap({})),
  });
  readonly form = inject(FormBuilder).nonNullable.group({
    search: [
      '',
      [Validators.maxLength(100), Validators.pattern(/^[^\p{Cc}]*$/u)],
    ],
    organizationId: ['', idValidator],
    categoryId: ['', idValidator],
    limit: ['20'],
  });
  constructor() {
    this.store.load(this.filters);
    effect(() => {
      const f = this.filters();
      this.form.patchValue(
        {
          search: f.search ?? '',
          organizationId: f.organizationId ?? '',
          categoryId: f.categoryId ?? '',
          limit: String(f.limit),
        },
        { emitEvent: false },
      );
    });
  }
  search() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, control]) => control.invalid,
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
        search: v.search.trim() || null,
        organizationId: v.organizationId || null,
        categoryId: v.categoryId || null,
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
}
