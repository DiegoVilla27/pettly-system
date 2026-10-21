import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { User } from '../models/user';
@Component({
  selector: 'app-user-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold"
    [class.bg-sage]="user().status === 'active'"
    [class.text-primary]="user().status === 'active'"
    [class.bg-danger-soft]="user().status === 'disabled'"
    [class.text-danger]="user().status === 'disabled'"
    [class.bg-paper]="user().status === 'deleted'"
    >{{ user().statusLabel }}</span
  >`,
})
export class UserBadgeComponent {
  readonly user = input.required<User>();
}
