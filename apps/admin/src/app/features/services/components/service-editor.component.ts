import type { ProfessionalPage } from '../models/service';
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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidatorFn,
  type AbstractControl,
} from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  categories,
  species,
  type Service,
  type ServiceProfile,
  type Resource,
} from '../models/service';
import {
  copToMinor,
  minuteFromTime,
  timeFromMinute,
  profileSchema,
} from '../mappers/services.mapper';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
const bounded =
  (min: number, max: number, step = 1): ValidatorFn =>
  (c) =>
    Number.isInteger(c.value) &&
    c.value >= min &&
    c.value <= max &&
    c.value % step === 0
      ? null
      : { range: true };
const text = (min: number, max: number) => [
  Validators.required,
  Validators.minLength(min),
  Validators.maxLength(max),
  Validators.pattern(/^[^\p{Cc}]+$/u),
];
@Component({
  selector: 'app-service-editor',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-editor.component.html',
})
export class ServiceEditorComponent {
  readonly service = input<Service | null>(null);
  readonly resources = input.required<Resource[]>();
  readonly professionals = input<ProfessionalPage | null>(null);
  readonly professionalBusy = input(false);
  readonly professionalPageChanged = output<number>();

  readonly blocked = input(false);
  readonly submitted = output<{ profile: ServiceProfile; reason: string }>();
  readonly categories = categories;
  readonly species = species;
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = this.fb.group(
    {
      name: ['', text(2, 150)],
      description: ['', text(10, 2000)],
      category: ['grooming' as Service['category'], Validators.required],
      priceCop: [
        '',
        (c: AbstractControl) =>
          copToMinor(String(c.value)) !== null ? null : { price: true },
      ],
      acceptedSpecies: this.fb.array(species.map(() => this.fb.control(false))),
      requirements: ['', text(2, 2000)],
      terms: ['', text(10, 2000)],
      confirmationMode: [
        'manual' as Service['confirmationMode'],
        Validators.required,
      ],
      durationMinutes: [60, bounded(15, 480, 15)],
      bufferBeforeMinutes: [0, bounded(0, 120, 15)],
      bufferAfterMinutes: [0, bounded(0, 120, 15)],
      checkIn: ['15:00'],
      checkOut: ['12:00'],
      minNights: [1, bounded(1, 30)],
      maxNights: [1, bounded(1, 30)],
      minimumNoticeMinutes: [60, bounded(15, 43200)],
      cancellationCutoffMinutes: [1440, bounded(0, 43200)],
      requestTtlMinutes: [60, bounded(15, 1440)],
      resourceIds: this.fb.control<string[]>([]),
      veterinaryCredentialId: [''],
      reason: ['', auditReasonValidator],
    },
    { validators: () => (this.validForm() ? null : { profile: true }) },
  );
  readonly category = toSignal(this.form.controls.category.valueChanges, {
    initialValue: 'grooming' as Service['category'],
  });
  readonly availableResources = computed(() =>
    this.resources().filter(
      (r) =>
        r.status === 'active' &&
        r.kind ===
          (this.category() === 'lodging' ? 'lodging' : 'appointment') &&
        (this.category() !== 'veterinary' || r.capacity === 1),
    ),
  );
  constructor() {
    let previousCategory = this.form.controls.category.value;
    const configureMode = (category: Service['category']) => {
      const lodging = category === 'lodging';
      for (const control of [
        this.form.controls.durationMinutes,
        this.form.controls.bufferBeforeMinutes,
        this.form.controls.bufferAfterMinutes,
      ])
        if (lodging) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      for (const control of [
        this.form.controls.checkIn,
        this.form.controls.checkOut,
        this.form.controls.minNights,
        this.form.controls.maxNights,
      ])
        if (lodging) control.enable({ emitEvent: false });
        else control.disable({ emitEvent: false });
    };
    configureMode(previousCategory);
    this.form.controls.veterinaryCredentialId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        if (this.form.controls.category.value !== 'veterinary') return;
        const selected = this.professionals()?.items.find((p) => p.id === id);
        if (selected || !id)
          this.form.controls.resourceIds.setValue(
            selected ? [selected.resourceId] : [],
            { emitEvent: false },
          );
        this.form.updateValueAndValidity({ emitEvent: false });
      });
    this.form.controls.category.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((category) => {
        if (category !== previousCategory) {
          this.form.controls.resourceIds.setValue([], { emitEvent: false });
          this.form.controls.veterinaryCredentialId.setValue('', {
            emitEvent: false,
          });
          previousCategory = category;
        }
        configureMode(category);
      });
    effect(() => {
      const s = this.service();
      this.form.reset({
        name: s?.name ?? '',
        description: s?.description ?? '',
        category: s?.category ?? 'grooming',
        priceCop: s ? String(s.priceMinor / 100) : '',
        requirements: s?.requirements ?? '',
        terms: s?.terms ?? '',
        confirmationMode: s?.confirmationMode ?? 'manual',
        durationMinutes: s?.durationMinutes ?? 60,
        bufferBeforeMinutes: s?.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: s?.bufferAfterMinutes ?? 0,
        checkIn: timeFromMinute(s?.checkInMinute ?? 900),
        checkOut: timeFromMinute(s?.checkOutMinute ?? 720),
        minNights: s?.minNights ?? 1,
        maxNights: s?.maxNights ?? 1,
        minimumNoticeMinutes: s?.minimumNoticeMinutes ?? 60,
        cancellationCutoffMinutes: s?.cancellationCutoffMinutes ?? 1440,
        requestTtlMinutes: s?.requestTtlMinutes ?? 60,
        resourceIds: s ? [...s.resourceIds] : [],
        veterinaryCredentialId: s?.veterinaryCredentialId ?? '',
        reason: '',
        acceptedSpecies: species.map(
          (p) => s?.acceptedSpecies.includes(p.value) ?? false,
        ),
      });
    });
  }
  private profile(): ServiceProfile {
    const v = this.form.getRawValue();
    const lodging = v.category === 'lodging';
    return {
      name: v.name.trim(),
      description: v.description.trim(),
      category: v.category,
      kind: lodging ? 'lodging' : 'appointment',
      priceMinor: copToMinor(v.priceCop) ?? 0,
      currency: 'COP',
      acceptedSpecies: species
        .filter((_, i) => v.acceptedSpecies[i])
        .map((s) => s.value),
      requirements: v.requirements.trim(),
      terms: v.terms.trim(),
      collectionMode: 'pay_at_business',
      confirmationMode: v.confirmationMode,
      durationMinutes: lodging ? null : v.durationMinutes,
      bufferBeforeMinutes: lodging ? 0 : v.bufferBeforeMinutes,
      bufferAfterMinutes: lodging ? 0 : v.bufferAfterMinutes,
      checkInMinute: lodging ? minuteFromTime(v.checkIn) : null,
      checkOutMinute: lodging ? minuteFromTime(v.checkOut) : null,
      minNights: lodging ? v.minNights : 1,
      maxNights: lodging ? v.maxNights : 1,
      minimumNoticeMinutes: v.minimumNoticeMinutes,
      cancellationCutoffMinutes: v.cancellationCutoffMinutes,
      requestTtlMinutes: v.requestTtlMinutes,
      resourceIds: [...v.resourceIds],
      veterinaryCredentialId:
        v.category === 'veterinary'
          ? v.veterinaryCredentialId.trim() || null
          : null,
    };
  }
  private validForm(): boolean {
    if (!this.form) return true;
    const p = this.profile();
    return (
      profileSchema.safeParse(p).success &&
      (p.category !== 'veterinary' ||
        !!this.professionals()?.items.some(
          (v) =>
            v.id === p.veterinaryCredentialId &&
            Date.parse(v.verifiedUntil) > Date.now() &&
            p.resourceIds.length === 1 &&
            p.resourceIds[0] === v.resourceId,
        )) &&
      p.resourceIds.every((id) =>
        this.resources().some(
          (r) =>
            r.id === id &&
            r.status === 'active' &&
            r.kind === p.kind &&
            (p.category !== 'veterinary' || r.capacity === 1),
        ),
      )
    );
  }
  invalid(key: keyof typeof this.form.controls) {
    const c = this.form.controls[key];
    return c.invalid && c.touched;
  }
  submit() {
    if (
      this.blocked() ||
      (this.service() &&
        ['pending', 'archived'].includes(this.service()?.status ?? ''))
    )
      return;
    this.form.updateValueAndValidity();
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      const key = Object.entries(this.form.controls).find(
        ([, c]) => c.invalid,
      )?.[0];
      this.element.nativeElement
        .querySelector<HTMLElement>(
          key ? `[formcontrolname="${key}"]` : '[data-profile-error]',
        )
        ?.focus();
      return;
    }
    this.submitted.emit({
      profile: this.profile(),
      reason: this.form.controls.reason.value.trim(),
    });
  }
}
