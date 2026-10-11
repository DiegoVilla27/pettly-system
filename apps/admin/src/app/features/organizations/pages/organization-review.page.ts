import { DestructiveActionComponent } from '../../../shared/ui/destructive-action.component';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  computed,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { OrganizationDetailStore } from '../state/organization-detail.store';
import { OrganizationHeadingComponent } from '../components/organization-heading.component';
import { DecisionActionComponent } from '../components/decision-action.component';
import { AccountPickerComponent } from '../components/account-picker.component';
import type { AccountOption } from '../models/organization';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
@Component({
  selector: 'app-organization-review',
  imports: [
    DestructiveActionComponent,
    ReactiveFormsModule,
    RouterLink,
    OrganizationHeadingComponent,
    DecisionActionComponent,
    AccountPickerComponent,
    ProblemComponent,
  ],
  providers: [OrganizationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-review.page.html',
})
export class OrganizationReviewPage {
  readonly store = inject(OrganizationDetailStore);
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly selected = signal<AccountOption | null>(null);
  readonly context = computed(() => {
    const org = this.store.organization();
    return org ? org.id + ':' + org.version : '';
  });
  readonly responsibleForm = inject(FormBuilder).nonNullable.group({
    responsibleUserId: ['', Validators.required],
    reason: ['', auditReasonValidator],
  });
  constructor() {
    this.store.load(this.organizationId);
    effect(() => {
      const org = this.store.organization();
      this.selected.set(null);
      this.responsibleForm.reset({ responsibleUserId: '', reason: '' });
      if (org && ['pending', 'active', 'suspended'].includes(org.status))
        untracked(() => this.store.findAccounts({ search: '', page: 1 }));
    });
  }
  select(account: AccountOption) {
    this.selected.set(account);
    this.responsibleForm.controls.responsibleUserId.setValue(account.id);
  }
  decide(kind: 'submit' | 'reject', reason: string) {
    const org = this.store.organization();
    if (
      !org ||
      this.store.busy() ||
      !(kind === 'reject'
        ? org.status === 'pending'
        : ['draft', 'rejected'].includes(org.status)) ||
      (kind === 'submit' && this.store.missing().length)
    )
      return;
    this.store.execute({
      kind,
      organizationId: org.id,
      body: { reason, expectedVersion: org.version },
    });
  }
  status(reason: string) {
    const org = this.store.organization();
    if (
      !org ||
      this.store.busy() ||
      !['active', 'suspended'].includes(org.status)
    )
      return;
    this.store.execute({
      kind: 'status',
      organizationId: org.id,
      body: {
        reason,
        expectedVersion: org.version,
        status: org.status === 'active' ? 'suspended' : 'active',
      },
    });
  }
  responsible() {
    const org = this.store.organization();
    if (
      !org ||
      this.store.busy() ||
      !['pending', 'active', 'suspended'].includes(org.status)
    )
      return;
    this.responsibleForm.markAllAsTouched();
    if (this.responsibleForm.invalid || !this.selected()) {
      const selector = this.selected()
        ? '#org-responsible-reason'
        : '#responsible-search';
      this.element.nativeElement.querySelector<HTMLElement>(selector)?.focus();
      return;
    }
    const value = this.responsibleForm.getRawValue();
    if (
      value.responsibleUserId !== this.selected()?.id ||
      (org.status !== 'pending' &&
        value.responsibleUserId === org.responsibleUserId)
    )
      return;
    this.store.execute({
      kind: org.status === 'pending' ? 'approve' : 'responsible',
      organizationId: org.id,
      body: {
        responsibleUserId: value.responsibleUserId,
        reason: value.reason.trim(),
        expectedVersion: org.version,
      },
    });
  }
}
