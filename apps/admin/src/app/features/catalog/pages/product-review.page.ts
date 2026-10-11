import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { AUTH_SESSION } from '../../../core/auth';
import { ProductReviewStore } from '../state/product-review.store';
import { moneyLabel } from '../mappers/catalog.mapper';
import { ProductDecisionComponent } from '../components/product-decision.component';
import { PrivateImageComponent } from '../../../shared/ui/private-image.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import type { ProductReview } from '../models/catalog';
@Component({
  selector: 'app-product-review',
  imports: [
    RouterLink,
    DatePipe,
    ProductDecisionComponent,
    PrivateImageComponent,
    ProblemComponent,
  ],
  providers: [ProductReviewStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-review.page.html',
})
export class ProductReviewPage {
  readonly store = inject(ProductReviewStore);
  readonly session = inject(AUTH_SESSION);
  readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('productId') ?? '')),
    { initialValue: '' },
  );
  readonly variants = computed(() => {
    const d = this.store.detail();
    return (
      d?.variants.map((v) => ({
        ...v,
        priceLabel: moneyLabel(v.priceMinor, d.product.currency),
        options: Object.entries(v.attributes)
          .map(([key, value]) => key + ': ' + value)
          .join(' · '),
      })) ?? []
    );
  });
  readonly blocked = computed(() => {
    const p = this.store.detail()?.product,
      u = this.session.identity();
    return (
      !!p &&
      !!u &&
      (p.createdBy === u.id ||
        u.organizations.some((o) => o.organizationId === p.organizationId))
    );
  });
  constructor() {
    this.store.load(this.id);
  }
  review(body: ProductReview) {
    const p = this.store.detail()?.product;
    if (p && !this.store.busy() && !this.blocked())
      this.store.review({ id: p.id, body });
  }
}
