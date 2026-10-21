import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import type { Notice } from '../models/notification';
import { categoryLabel } from '../models/notification';
import { colombiaDateTime } from '../../../shared/formatting/colombia';
@Component({
  selector: 'app-notice-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<article class="rounded-2xl border border-line bg-white p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs font-semibold text-primary">
        {{ categoryLabel(notice().category) }} ·
        {{ notice().readAt ? 'Leída' : 'Sin leer' }}
      </p>
      <time [attr.datetime]="notice().createdAt" class="text-xs text-muted">{{
        date(notice().createdAt)
      }}</time>
    </div>
    <h2 class="mt-3 text-lg font-semibold break-words">{{ notice().title }}</h2>
    <p class="mt-3 text-sm leading-relaxed break-words text-muted">
      {{ notice().body }}
    </p>
    <p class="mt-4 text-xs text-muted">
      Es un evento histórico. Consulta el estado actual en el módulo
      correspondiente.
    </p>
    <details class="mt-4">
      <summary
        class="min-h-11 cursor-pointer text-sm font-semibold text-primary"
      >
        Referencia del evento
      </summary>
      <p class="mt-2 text-xs break-all text-muted">
        {{ notice().subjectType }} {{ notice().subjectId }} · versión
        {{ notice().subjectVersion }} · {{ notice().status }}
      </p>
    </details>
    @if (notice().readAt; as readAt) {
      <p class="mt-3 text-xs text-muted">Leída el {{ date(readAt) }}</p>
    } @else {
      <button
        type="button"
        [disabled]="blocked()"
        (click)="read.emit(notice().id)"
        class="mt-3 min-h-11 rounded-xl border border-line px-4 text-sm font-semibold text-primary disabled:opacity-50"
      >
        Marcar como leída
      </button>
    }
  </article>`,
})
export class NoticeCardComponent {
  readonly notice = input.required<Notice>();
  readonly blocked = input(false);
  readonly read = output<string>();
  readonly categoryLabel = categoryLabel;
  readonly date = colombiaDateTime;
}
