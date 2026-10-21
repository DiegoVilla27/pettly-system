import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  effect,
  computed,
  signal,
  ElementRef,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditReasonValidator } from '../../../shared/forms/audit-reason';
import {
  editable,
  type ProductDetail,
  type Context,
  type Command,
} from '../models/product';
@Component({
  selector: 'app-product-action',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-action.component.html',
})
export class ProductActionComponent {
  readonly detail = input.required<ProductDetail>();
  readonly context = input.required<Context>();
  readonly busy = input(false);
  readonly blocked = input(false);
  readonly submitted = output<Command>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly file = signal<File | null>(null);
  readonly error = signal('');
  readonly actions = computed(() => {
    const d = this.detail(),
      p = d.product;
    if (p.currency !== 'COP' || p.status === 'archived') return [];
    return [
      ...(['draft', 'rejected', 'paused'].includes(p.status)
        ? [{ value: 'submit', label: 'Enviar producto a revisión' }]
        : []),
      ...(p.status === 'published'
        ? [{ value: 'pause', label: 'Pausar producto' }]
        : []),
      ...(editable(p) && d.photos.length < 10
        ? [{ value: 'upload', label: 'Añadir fotografía' }]
        : []),
      ...(editable(p) && d.photos.length
        ? [{ value: 'remove', label: 'Eliminar fotografía' }]
        : []),
      ...(editable(p) && d.variants.some((v) => v.status === 'active')
        ? [{ value: 'variant-archive', label: 'Archivar variante' }]
        : []),
      { value: 'archive', label: 'Archivar producto' },
    ];
  });
  readonly form = inject(FormBuilder).nonNullable.group({
    action: ['', Validators.required],
    mediaId: [''],
    variantId: [''],
    reason: ['', auditReasonValidator],
    confirm: [false, Validators.requiredTrue],
  });
  readonly action = toSignal(this.form.controls.action.valueChanges, {
    initialValue: '',
  });
  constructor() {
    this.form.controls.action.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.form.controls.confirm.reset(false);
        this.file.set(null);
      });
    effect(() => {
      this.detail();
      this.form.reset({
        action: this.actions()[0]?.value ?? '',
        mediaId: '',
        variantId: '',
        reason: '',
        confirm: false,
      });
      this.file.set(null);
      this.error.set('');
      const f =
        this.element.nativeElement.querySelector<HTMLInputElement>(
          'input[type="file"]',
        );
      if (f) f.value = '';
    });
  }
  choose(e: Event) {
    const t = e.target;
    if (t instanceof HTMLInputElement) this.file.set(t.files?.item(0) ?? null);
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
    const v = this.form.getRawValue(),
      d = this.detail(),
      body = { reason: v.reason.trim(), expectedVersion: d.product.version },
      context = this.context();
    if (!this.actions().some((a) => a.value === v.action)) return;
    switch (v.action) {
      case 'submit':
      case 'pause':
      case 'archive':
        this.submitted.emit({ context, action: v.action, body });
        break;
      case 'variant-archive':
        if (
          !d.variants.some((x) => x.id === v.variantId && x.status === 'active')
        ) {
          this.error.set('Selecciona una variante activa de este producto.');
          return;
        }
        this.submitted.emit({
          context,
          action: 'variant-archive',
          variantId: v.variantId,
          body,
        });
        break;
      case 'remove':
        if (!d.photos.some((x) => x.mediaId === v.mediaId)) {
          this.error.set('Selecciona una fotografía de este producto.');
          return;
        }
        this.submitted.emit({
          context,
          action: 'remove',
          mediaId: v.mediaId,
          body,
        });
        break;
      case 'upload': {
        const file = this.file();
        if (
          !file ||
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size < 1 ||
          file.size > 5242880
        ) {
          this.error.set(
            'Selecciona una imagen JPEG, PNG o WebP de hasta 5 MiB.',
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
    }
  }
}
