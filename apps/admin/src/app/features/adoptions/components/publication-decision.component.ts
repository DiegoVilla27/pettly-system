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
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import type { Publication, Context, Command } from '../models/publication';
@Component({
  selector: 'app-publication-decision',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './publication-decision.component.html',
})
export class PublicationDecisionComponent {
  readonly publication = input.required<Publication>();
  readonly context = input.required<Context>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<Command>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly actions = computed(() =>
    this.context().review
      ? this.publication().status === 'pending'
        ? [
            { value: 'approve', label: 'Aprobar publicación' },
            { value: 'reject', label: 'Rechazar publicación' },
          ]
        : []
      : [
          ...(['draft', 'rejected', 'paused'].includes(
            this.publication().status,
          )
            ? [{ value: 'submit', label: 'Enviar a revisión' }]
            : []),
          ...(this.publication().status === 'published'
            ? [{ value: 'pause', label: 'Pausar publicación' }]
            : []),
          ...(!['closed', 'deleted'].includes(this.publication().status)
            ? [{ value: 'archive', label: 'Archivar publicación' }]
            : []),
        ],
  );
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      this.publication();
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
        expectedVersion: this.publication().version,
      },
      context = this.context();
    if (v.action === 'approve' || v.action === 'reject')
      this.submitted.emit({
        context,
        action: 'review',
        body: { ...body, approved: v.action === 'approve' },
      });
    else if (
      v.action === 'submit' ||
      v.action === 'pause' ||
      v.action === 'archive'
    )
      this.submitted.emit({ context, action: v.action, body });
  }
}
