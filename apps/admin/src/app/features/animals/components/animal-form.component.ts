import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  ElementRef,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import { profileSchema } from '../mappers/animals.mapper';
import {
  species,
  sexes,
  sizes,
  type Animal,
  type AnimalProfile,
} from '../models/animal';
export function kgToGrams(value: string): number | null {
  if (!value.trim()) return null;
  const text = value.trim().replace(',', '.');
  if (!/^\d{1,4}(?:\.\d{1,3})?$/.test(text)) throw Error('Invalid weight');
  const [whole, fraction = ''] = text.split('.');
  const grams = Number(
    BigInt(whole ?? '0') * 1000n + BigInt(fraction.padEnd(3, '0')),
  );
  if (grams < 1 || grams > 2000000) throw Error('Invalid weight');
  return grams;
}
const optionalText = (max: number) => [
  Validators.maxLength(max),
  Validators.pattern(/^[^\p{Cc}]*$/u),
];
@Component({
  selector: 'app-animal-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './animal-form.component.html',
})
export class AnimalFormComponent {
  readonly animal = input<Animal | null>(null);
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<{ profile: AnimalProfile; reason: string }>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly error = signal('');
  readonly species = species;
  readonly sexes = sexes;
  readonly sizes = sizes;
  readonly fb = inject(FormBuilder).nonNullable;
  readonly form = this.fb.group({
    name: ['', [Validators.required, ...optionalText(100)]],
    species: ['dog', Validators.required],
    breed: ['', optionalText(100)],
    sex: ['unknown'],
    size: ['unknown'],
    dateOfBirth: [''],
    birthDateEstimated: [false],
    weight: [''],
    color: ['', optionalText(100)],
    description: ['', optionalText(2000)],
    specialNeeds: ['', optionalText(2000)],
    healthNotes: ['', optionalText(4000)],
    microchip: ['', optionalText(30)],
    vaccinated: ['unknown'],
    neutered: ['unknown'],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  readonly textFields = [
    { key: 'breed', label: 'Raza', max: 100 },
    { key: 'color', label: 'Color', max: 100 },
    { key: 'microchip', label: 'Microchip (privado)', max: 30 },
  ] as const;
  readonly notes = [
    { key: 'description', label: 'Descripción para publicación', max: 2000 },
    {
      key: 'specialNeeds',
      label: 'Cuidados especiales para publicación',
      max: 2000,
    },
    { key: 'healthNotes', label: 'Notas clínicas (privadas)', max: 4000 },
  ] as const;
  readonly healthFields = [
    { key: 'vaccinated', label: 'Vacunación declarada' },
    { key: 'neutered', label: 'Esterilización declarada' },
  ] as const;
  constructor() {
    effect(() => {
      const a = this.animal();
      if (!a) return;
      this.form.patchValue({
        name: a.name,
        species: a.species,
        breed: a.breed ?? '',
        sex: a.sex,
        size: a.size,
        dateOfBirth: a.dateOfBirth ?? '',
        birthDateEstimated: a.birthDateEstimated,
        weight: a.weightGrams === null ? '' : String(a.weightGrams / 1000),
        color: a.color ?? '',
        description: a.description ?? '',
        specialNeeds: a.specialNeeds ?? '',
        healthNotes: a.healthNotes ?? '',
        microchip: a.microchip ?? '',
        vaccinated: a.vaccinated === null ? 'unknown' : String(a.vaccinated),
        neutered: a.neutered === null ? 'unknown' : String(a.neutered),
        reason: '',
        confirm: false,
      });
      this.error.set('');
    });
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.error.set('');
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    let weight: number | null;
    try {
      weight = kgToGrams(v.weight);
    } catch {
      this.form.controls.weight.setErrors({ weight: true });
      this.error.set(
        'El peso debe estar entre 0,001 y 2000 kg, con hasta tres decimales.',
      );
      this.focus();
      return;
    }
    const p = profileSchema.safeParse({
      name: v.name.trim(),
      species: v.species,
      breed: v.breed.trim() || null,
      sex: v.sex,
      size: v.size,
      dateOfBirth: v.dateOfBirth || null,
      birthDateEstimated: v.birthDateEstimated,
      weightGrams: weight,
      color: v.color.trim() || null,
      description: v.description.trim() || null,
      specialNeeds: v.specialNeeds.trim() || null,
      healthNotes: v.healthNotes.trim() || null,
      microchip: v.microchip.trim() || null,
      vaccinated: v.vaccinated === 'unknown' ? null : v.vaccinated === 'true',
      neutered: v.neutered === 'unknown' ? null : v.neutered === 'true',
    });
    if (!p.success) {
      for (const issue of p.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && key in this.form.controls)
          this.form.get(key)?.setErrors({ profile: true });
      }
      this.error.set(
        'Revisa los datos. La fecha debe ser real y no estar en el futuro; los textos no admiten saltos de línea ni caracteres de control.',
      );
    }
    if (this.form.invalid || !p.success) {
      this.focus();
      return;
    }
    this.submitted.emit({ profile: p.data, reason: v.reason.trim() });
  }
  invalid(key: string) {
    const c = this.form.get(key);
    return !!c?.touched && !!c.invalid;
  }
  private focus() {
    this.element.nativeElement
      .querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }
}
