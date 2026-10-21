import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Organization } from '../models/organization';
@Component({
  selector: 'app-organization-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold"
    [class.bg-sage]="organization().status === 'active'"
    [class.text-primary]="organization().status === 'active'"
    [class.bg-danger-soft]="
      organization().status === 'suspended' ||
      organization().status === 'rejected'
    "
    [class.text-danger]="
      organization().status === 'suspended' ||
      organization().status === 'rejected'
    "
    [class.bg-paper]="
      !['active', 'suspended', 'rejected'].includes(organization().status)
    "
    [class.text-muted]="
      !['active', 'suspended', 'rejected'].includes(organization().status)
    "
    >{{ organization().statusLabel }}</span
  >`,
})
export class OrganizationBadgeComponent {
  readonly organization = input.required<Organization>();
}
