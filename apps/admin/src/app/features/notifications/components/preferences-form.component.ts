import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import type { Preferences, PreferencesCommand } from '../models/notification';
import { preferenceCommandSchema } from '../mappers/notifications.mapper';
@Component({
  selector: 'app-notification-preferences-form',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<form [formGroup]="form" (ngSubmit)="submit()" class="mt-5">
    <fieldset [disabled]="blocked()" class="space-y-5">
      <legend class="sr-only">Correos opcionales</legend>
      <label class="flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="ordersEmail"
          class="size-5"
        />Correos de pedidos</label
      ><label class="flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="adoptionsEmail"
          class="size-5"
        />Correos de adopciones</label
      ><label class="flex min-h-11 items-center gap-3 text-sm"
        ><input
          type="checkbox"
          formControlName="bookingsEmail"
          class="size-5"
        />Correos de reservas y recordatorios</label
      >
      <p class="text-sm leading-relaxed text-muted">
        Desactivar cancela correos pendientes de esa categoría. Al activar, solo
        recibirás nuevos eventos. Un envío en curso puede llegar.
      </p>
      <button
        type="submit"
        class="min-h-12 rounded-xl bg-primary px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Guardar preferencias
      </button>
    </fieldset>
  </form>`,
})
export class PreferencesFormComponent {
  readonly preferences = input.required<Preferences>();
  readonly blocked = input(false);
  readonly saved = output<PreferencesCommand>();
  readonly form = inject(FormBuilder).nonNullable.group({
    ordersEmail: true,
    adoptionsEmail: true,
    bookingsEmail: true,
  });
  constructor() {
    effect(() => {
      const p = this.preferences();
      this.form.reset({
        ordersEmail: p.ordersEmail,
        adoptionsEmail: p.adoptionsEmail,
        bookingsEmail: p.bookingsEmail,
      });
    });
  }
  submit() {
    if (this.blocked()) return;
    const p = preferenceCommandSchema.safeParse({
      ...this.form.getRawValue(),
      expectedVersion: this.preferences().version,
    });
    if (p.success) this.saved.emit(p.data);
  }
}
