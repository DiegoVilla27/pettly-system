import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  computed,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { AUTH_SESSION } from '../../../core/auth';
import {
  requestActions,
  type RequestDetail,
  type RequestContext,
  type RequestCommand,
} from '../models/adoption-request';
@Component({
  selector: 'app-request-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-decision.component.html',
})
export class RequestDecisionComponent {
  readonly detail = input.required<RequestDetail>();
  readonly context = input.required<RequestContext>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<RequestCommand>();
  private readonly session = inject(AUTH_SESSION);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly actions = computed(() =>
    requestActions(this.detail(), this.session.identity()?.id),
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  readonly selectedAction = toSignal(this.form.controls.action.valueChanges, {
    initialValue: '',
  });
  constructor() {
    this.form.controls.action.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.confirm.reset(false));
    effect(() => {
      this.detail();
      this.form.reset({
        action: this.actions()[0]?.value ?? '',
        reason: '',
        confirm: false,
      });
    });
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    const v = this.form.getRawValue();
    if (!this.actions().some((a) => a.value === v.action)) return;
    const body = {
        reason: v.reason.trim(),
        expectedVersion: this.detail().request.version,
      },
      context = this.context();
    if (v.action === 'complete')
      this.submitted.emit({ context, action: 'complete', body });
    else if (
      v.action === 'in_review' ||
      v.action === 'approved' ||
      v.action === 'rejected'
    )
      this.submitted.emit({
        context,
        action: 'review',
        body: { ...body, status: v.action },
      });
  }
}
