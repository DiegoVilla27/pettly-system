import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from './icon.component';
@Component({
  selector: 'app-brand',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex items-center gap-3"
    ><span
      class="inline-flex size-10 items-center justify-center rounded-2xl bg-primary text-white"
      ><app-icon name="paw" /></span
    ><span class="text-2xl font-bold tracking-tight text-ink"
      >pettly<span class="text-primary">.</span></span
    ></span
  >`,
})
export class BrandComponent {}
