import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import type { Evidence } from '../models/credential';
import { PrivateImageComponent } from '../../../shared/ui/private-image.component';
@Component({
  selector: 'app-evidence-viewer',
  imports: [PrivateImageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-private-image
      [blob]="evidence().blob"
      [context]="evidence().credentialId + ':' + evidence().mediaId"
      [title]="evidence().kindLabel"
      [alt]="evidence().kindLabel + ' de la acreditación'"
      closeLabel="Cerrar evidencia"
      (closed)="closed.emit()"
    />
    <p class="mt-3 text-xs text-muted">
      Evidencia privada saneada. Su contenido debe compararse con la identidad y
      el registro oficial.
    </p>`,
})
export class EvidenceViewerComponent {
  readonly evidence = input.required<Evidence>();
  readonly closed = output<void>();
}
