import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
  computed,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import type {
  Credential,
  ReviewRequest,
  RevokeRequest,
} from '../models/credential';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import {
  localDeadline,
  validDeadline,
  textSchema,
  reviewSchema,
} from '../mappers/veterinary.mapper';
const referenceValidator: ValidatorFn = (control) =>
  textSchema(500, 10).safeParse(String(control.value).trim()).success
    ? null
    : { reference: true };
const deadlineValidator: ValidatorFn = (control) => {
  const value = localDeadline(String(control.value));
  return value && validDeadline(value) ? null : { deadline: true };
};
@Component({
  selector: 'app-credential-review-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-review-form.component.html',
})
export class CredentialReviewFormComponent {
  readonly credential = input.required<Credential>();
  readonly busy = input(false);
  readonly blockedReason = input('');
  readonly reviewRequested = output<ReviewRequest>();
  readonly revokeRequested = output<RevokeRequest>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    decision: [
      '',
      [Validators.required, Validators.pattern(/^(approve|reject)$/)],
    ],
    officialRegisterChecked: [false, Validators.requiredTrue],
    verificationReference: [''],
    verifiedUntil: [''],
    reason: ['', auditReasonValidator],
  });
  readonly revokeForm = inject(FormBuilder).nonNullable.group({
    reason: ['', auditReasonValidator],
  });
  readonly approved = toSignal(
    this.form.controls.decision.valueChanges.pipe(map((v) => v === 'approve')),
    { initialValue: false },
  );
  readonly failure = signal('');
  readonly canReview = computed(() => this.credential().status === 'pending');
  constructor() {
    effect(() => {
      this.credential();
      this.form.reset();
      this.revokeForm.reset();
      this.failure.set('');
    });
    effect(() => {
      const approved = this.approved();
      this.form.controls.verificationReference.setValidators(
        approved ? [referenceValidator] : [],
      );
      this.form.controls.verifiedUntil.setValidators(
        approved ? [deadlineValidator] : [],
      );
      this.form.controls.verificationReference.updateValueAndValidity({
        emitEvent: false,
      });
      this.form.controls.verifiedUntil.updateValueAndValidity({
        emitEvent: false,
      });
    });
  }
  review() {
    if (this.busy() || this.blockedReason() || !this.canReview()) return;
    this.failure.set('');
    this.form.markAllAsTouched();
    this.form.controls.verifiedUntil.updateValueAndValidity();
    if (this.form.invalid) {
      this.failure.set(
        'Revisa los campos obligatorios y sus indicaciones antes de registrar la decisión.',
      );
      const invalid = Object.entries(this.form.controls).find(
        ([, control]) => control.invalid,
      );
      if (invalid)
        this.element.nativeElement
          .querySelector<HTMLElement>(
            `#credential-review [formcontrolname="${invalid[0]}"]`,
          )
          ?.focus();
      return;
    }
    const value = this.form.getRawValue();
    const approved = value.decision === 'approve';
    const body: ReviewRequest = {
      approved,
      officialRegisterChecked: true,
      reason: value.reason.trim(),
      expectedVersion: this.credential().version,
      verifiedUntil: approved ? localDeadline(value.verifiedUntil) : null,
      verificationReference: approved
        ? value.verificationReference.trim()
        : null,
    };
    if (!reviewSchema.safeParse(body).success) {
      this.failure.set('Revisa la fecha, la referencia oficial y el motivo.');
      return;
    }
    this.reviewRequested.emit(body);
  }
  revoke() {
    if (this.busy() || this.credential().status === 'revoked') return;
    this.revokeForm.markAllAsTouched();
    if (this.revokeForm.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('#credential-revoke-reason')
        ?.focus();
      return;
    }
    this.revokeRequested.emit({
      reason: this.revokeForm.getRawValue().reason.trim(),
      expectedVersion: this.credential().version,
    });
  }
}
