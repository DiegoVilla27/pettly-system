import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  effect,
  signal,
} from '@angular/core';
@Component({
  selector: 'app-private-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section
    aria-label="Vista de imagen privada"
    class="mt-5 rounded-2xl border border-line bg-paper p-4"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 class="font-semibold">{{ title() }}</h3>
      <button
        type="button"
        (click)="closed.emit()"
        class="min-h-11 rounded-xl border border-line bg-white px-4 text-sm font-medium"
      >
        {{ closeLabel() }}
      </button>
    </div>
    @if (url()) {
      <img
        [src]="url()"
        width="1600"
        height="1600"
        [alt]="alt()"
        class="aspect-square h-auto max-h-144 w-full rounded-xl bg-white object-contain"
        (error)="failed.set(true)"
      />
    }
    @if (failed()) {
      <p role="alert" class="mt-3 text-sm text-danger">
        No pudimos mostrar la imagen. Cierra la vista y vuelve a abrirla.
      </p>
    }
  </section>`,
})
export class PrivateImageComponent {
  readonly blob = input.required<Blob>();
  readonly context = input('');
  readonly title = input.required<string>();
  readonly alt = input.required<string>();
  readonly closeLabel = input('Cerrar fotografía');
  readonly closed = output<void>();
  readonly url = signal('');
  readonly failed = signal(false);
  constructor() {
    effect((onCleanup) => {
      this.context();
      const url = URL.createObjectURL(this.blob());
      this.failed.set(false);
      this.url.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }
}
