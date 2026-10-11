import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal, rxResource } from '@angular/core/rxjs-interop';
import { ProductDetailStore } from '../state/product-detail.store';
import { PRODUCTS_GATEWAY } from '../models/products-gateway';
import { contextSchema } from '../mappers/products.mapper';
import { ProductFormComponent } from '../components/product-form.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { VariantFormComponent } from '../components/variant-form.component';
import { ProductActionComponent } from '../components/product-action.component';
import { PrivateImageComponent } from '../../../shared/ui/private-image.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
import { toApiProblem } from '../../../core/api';
import {
  statusLabel,
  auditLabels,
  editable,
  type VariantProfile,
  type Profile,
  type Command,
  type Context,
} from '../models/product';
@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    ProductFormComponent,
    ProductActionComponent,
    VariantFormComponent,
    ReactiveFormsModule,
    PrivateImageComponent,
    ProblemComponent,
    PaginationComponent,
  ],
  providers: [ProductDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.page.html',
})
export class ProductDetailPage {
  readonly store = inject(ProductDetailStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gateway = inject(PRODUCTS_GATEWAY);
  readonly date = colombiaDateTime;
  readonly editable = editable;
  readonly variantId = inject(FormBuilder).nonNullable.control('');
  readonly selectedVariantId = toSignal(this.variantId.valueChanges, {
    initialValue: '',
  });
  readonly selectedVariant = computed(
    () =>
      this.store
        .detail()
        ?.variants.find(
          (v) => v.id === this.selectedVariantId() && v.status === 'active',
        ) ?? null,
  );
  readonly categories = rxResource({ stream: () => this.gateway.categories() });
  readonly money = (amount: number, currency: string) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  readonly categoryName = (id: string) =>
    this.categories.value()?.find((c) => c.id === id)?.name ?? id;
  readonly attrs = (v: Record<string, string>) => Object.entries(v);
  readonly statusLabel = statusLabel;
  readonly auditLabels = auditLabels;
  readonly toProblem = toApiProblem;
  readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  readonly context = computed<Context | null>(() => {
    const p = this.params();
    const c = contextSchema.safeParse({
      organizationId: p.get('organizationId'),
      productId: p.get('productId'),
    });
    return c.success ? c.data : null;
  });
  readonly qp = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly auditPage = computed(() => {
    const n = Number(this.qp().get('page') ?? 1);
    return Number.isInteger(n) && n > 0 && n <= 10000 ? n : 1;
  });
  readonly auditRequest = computed(() => {
    const c = this.context(),
      a = this.store.detail();
    return c && a
      ? { context: c, page: this.auditPage(), revision: a.product.version }
      : null;
  });
  readonly selectedPhoto = signal<string | null>(null);
  readonly photo = rxResource({
    params: () => {
      const c = this.context(),
        a = this.store.detail(),
        id = this.selectedPhoto();
      return c && a && id && a.photos.some((p) => p.mediaId === id)
        ? { context: c, mediaId: id, version: a.product.version }
        : undefined;
    },
    stream: ({ params }) => this.gateway.photo(params.context, params.mediaId),
  });
  constructor() {
    this.store.load(this.context);
    this.store.loadAudit(this.auditRequest);
    effect(() => {
      const error = this.photo.error();
      if (error) this.store.accessFailed(toApiProblem(error));
    });
    effect(() => {
      this.store.detail();
      this.context();
      this.selectedPhoto.set(null);
      this.variantId.reset('');
    });
  }
  refresh() {
    const c = this.context();
    if (c && !this.store.busy()) {
      this.selectedPhoto.set(null);
      this.store.load(c);
    }
  }
  update(v: { profile: Profile; reason: string }) {
    const c = this.context(),
      a = this.store.detail();
    if (c && a)
      this.execute({
        context: c,
        action: 'update',
        body: { ...v, expectedVersion: a.product.version },
      });
  }
  execute(c: Command) {
    if (!this.store.busy() && !this.store.refreshRequired()) {
      this.selectedPhoto.set(null);
      this.store.execute(c);
    }
  }
  saveVariant(v: {
    profile: VariantProfile;
    reason: string;
    variantId?: string;
  }) {
    const context = this.context(),
      d = this.store.detail();
    if (!context || !d) return;
    const body = {
      profile: v.profile,
      reason: v.reason,
      expectedVersion: d.product.version,
    };
    this.execute(
      v.variantId
        ? { context, action: 'variant-update', variantId: v.variantId, body }
        : { context, action: 'variant-create', body },
    );
  }
  page(page: number) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
    });
  }
}
