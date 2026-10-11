import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  inject,
  Injectable,
  Injector,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class NavigationFocus {
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  constructor() {
    let initialNavigation = true;
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        if (initialNavigation) {
          initialNavigation = false;
          return;
        }
        afterNextRender(
          () => {
            const target =
              this.document.querySelector<HTMLElement>('main h1') ??
              this.document.querySelector<HTMLElement>('#main-content');
            if (target) {
              target.tabIndex = -1;
              target.focus({ preventScroll: true });
            }
          },
          { injector: this.injector },
        );
      });
  }
}
