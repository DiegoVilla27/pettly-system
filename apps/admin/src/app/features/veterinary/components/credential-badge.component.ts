import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { Credential } from '../models/credential';
@Component({
  selector: 'app-credential-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
    [class.bg-sage]="credential().status === 'approved'"
    [class.text-primary]="credential().status === 'approved'"
    [class.bg-danger-soft]="
      credential().status === 'revoked' || credential().status === 'rejected'
    "
    [class.text-danger]="
      credential().status === 'revoked' || credential().status === 'rejected'
    "
    [class.bg-paper]="
      credential().status === 'pending' || credential().status === 'draft'
    "
    >{{ credential().statusLabel }}</span
  >`,
})
export class CredentialBadgeComponent {
  readonly credential = input.required<Credential>();
}
