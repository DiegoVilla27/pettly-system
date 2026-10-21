import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ApiProblem } from '../../core/api';
@Component({
  selector: 'app-problem',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (problem(); as error) {
    <div
      role="alert"
      class="rounded-2xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger"
    >
      <p class="font-medium">{{ error.message }}</p>
      @if (error.requestId) {
        <p class="mt-2 text-xs">Referencia de soporte: {{ error.requestId }}</p>
      }
    </div>
  }`,
})
export class ProblemComponent {
  readonly problem = input<ApiProblem | null>(null);
}
