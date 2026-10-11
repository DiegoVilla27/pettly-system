import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  signal,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import type { Animal, AnimalContext, AnimalCommand } from '../models/animal';
@Component({
  selector: 'app-animal-action',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './animal-action.component.html',
})
export class AnimalActionComponent {
  readonly animal = input.required<Animal>();
  readonly context = input.required<AnimalContext>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<AnimalCommand>();
  readonly file = signal<File | null>(null);
  readonly error = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['upload'],
    mediaId: [''],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  constructor() {
    effect(() => {
      const a = this.animal();
      this.form.reset({
        action: a.photos.length < 10 ? 'upload' : 'remove',
        mediaId: '',
        reason: '',
        confirm: false,
      });
      this.file.set(null);
      this.error.set('');
      const input =
        this.element.nativeElement.querySelector<HTMLInputElement>(
          'input[type="file"]',
        );
      if (input) input.value = '';
    });
  }
  choose(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.file.set(target.files?.item(0) ?? null);
    this.error.set('');
  }
  submit() {
    if (this.busy() || this.blocked()) return;
    this.form.markAllAsTouched();
    this.error.set('');
    if (this.form.invalid) {
      this.element.nativeElement
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    const a = this.animal(),
      v = this.form.getRawValue(),
      body = { reason: v.reason.trim(), expectedVersion: a.version },
      context = this.context();
    switch (v.action) {
      case 'upload': {
        const file = this.file();
        if (
          !file ||
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size < 1 ||
          file.size > 5242880 ||
          a.photos.length >= 10
        ) {
          this.error.set(
            'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MiB. Se permiten diez fotografías por animal.',
          );
          return;
        }
        this.submitted.emit({
          context,
          action: 'upload',
          body: { ...body, file },
        });
        break;
      }
      case 'remove':
        if (!a.photos.some((p) => p.mediaId === v.mediaId)) {
          this.error.set('Selecciona una fotografía de este animal.');
          return;
        }
        this.submitted.emit({
          context,
          action: 'remove',
          mediaId: v.mediaId,
          body,
        });
        break;
      case 'deceased':
        if (a.status !== 'active') return;
        this.submitted.emit({
          context,
          action: 'deceased',
          body: { ...body, status: 'deceased' },
        });
        break;
      case 'archive':
        this.submitted.emit({ context, action: 'archive', body });
        break;
      default:
        this.error.set('Selecciona una acción válida.');
    }
  }
}
