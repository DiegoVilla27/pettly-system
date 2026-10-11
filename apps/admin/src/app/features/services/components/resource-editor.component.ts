import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
  type AbstractControl,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import type { Resource } from '../models/service';
import { weekdays, type ResourceProfile } from '../models/resource';
import {
  calendarMinute,
  calendarTime,
  resourceProfileSchema,
} from '../mappers/resource.mapper';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
@Component({
  selector: 'app-resource-editor',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-editor.component.html',
})
export class ResourceEditorComponent {
  readonly resource = input<Resource | null>(null);
  readonly blocked = input(false);
  readonly submitted = output<{ profile: ResourceProfile; reason: string }>();
  readonly weekdays = weekdays;
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = this.fb.group(
    {
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[^\p{Cc}]+$/u),
          (control: AbstractControl<unknown>): ValidationErrors | null =>
            typeof control.value === 'string' &&
            control.value.trim().length >= 2
              ? null
              : { name: true },
        ],
      ],
      kind: ['appointment' as Resource['kind'], Validators.required],
      capacity: [
        1,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(100),
          Validators.pattern(/^\d+$/),
        ],
      ],
      status: ['active' as Resource['status'], Validators.required],
      windows: this.fb.array([this.window()]),
      reason: ['', auditReasonValidator],
    },
    {
      validators: (): ValidationErrors | null =>
        this.form &&
        !resourceProfileSchema.safeParse({
          ...this.profile(),
          name: 'Resource calendar',
          capacity: 1,
          status: 'active',
        }).success
          ? { calendar: true }
          : null,
    },
  );
  readonly kind = toSignal(this.form.controls.kind.valueChanges, {
    initialValue: 'appointment' as Resource['kind'],
  });
  constructor() {
    effect(() => {
      const r = this.resource();
      this.form.controls.windows.clear();
      for (const w of r?.windows ?? [
        { day: 1, startMinute: 480, endMinute: 1080 },
      ])
        this.form.controls.windows.push(
          this.window(
            w.day,
            calendarTime(w.startMinute),
            calendarTime(w.endMinute),
          ),
        );
      this.form.patchValue({
        name: r?.name ?? '',
        kind: r?.kind ?? 'appointment',
        capacity: r?.capacity ?? 1,
        status: r?.status ?? 'active',
        reason: '',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    });
  }
  private window(day = 1, start = '08:00', end = '18:00') {
    return this.fb.group({
      day: [day, Validators.required],
      start: [start, Validators.required],
      end: [end, Validators.required],
    });
  }
  addWindow() {
    if (!this.blocked() && this.form.controls.windows.length < 21)
      this.form.controls.windows.push(this.window());
  }
  removeWindow(i: number) {
    if (!this.blocked() && this.form.controls.windows.length > 1)
      this.form.controls.windows.removeAt(i);
  }
  private profile(): ResourceProfile {
    const v = this.form.getRawValue();
    return {
      name: v.name.trim(),
      kind: v.kind,
      capacity: v.capacity,
      status: v.status,
      windows: v.windows.map((w) => ({
        day: Number(w.day),
        startMinute: v.kind === 'lodging' ? 0 : (calendarMinute(w.start) ?? -1),
        endMinute:
          v.kind === 'lodging' ? 1440 : (calendarMinute(w.end, true) ?? -1),
      })),
    };
  }
  submit() {
    if (this.blocked()) return;
    this.form.updateValueAndValidity();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, c]) => c.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(
          key ? `[formcontrolname="${key}"]` : '[data-calendar-error]',
        )
        ?.focus();
      return;
    }
    const p = this.profile();
    if (this.resource() && this.resource()?.kind !== p.kind) return;
    this.submitted.emit({
      profile: p,
      reason: this.form.controls.reason.value.trim(),
    });
  }
}
