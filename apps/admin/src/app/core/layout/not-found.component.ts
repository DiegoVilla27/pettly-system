import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main
    id="main-content"
    tabindex="-1"
    class="flex min-h-dvh items-center justify-center bg-paper p-6"
  >
    <div class="max-w-md text-center">
      <p class="text-sm font-semibold text-primary">404</p>
      <h1 class="mt-4 text-3xl font-semibold">
        Este camino no lleva a ningún lado.
      </h1>
      <p class="mt-4 text-muted">
        La página que buscas no existe o cambió de dirección.
      </p>
      <a
        routerLink="/inicio"
        class="mt-8 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-semibold text-white hover:bg-primary-strong"
        >Volver al inicio</a
      >
    </div>
  </main>`,
})
export class NotFoundComponent {}
