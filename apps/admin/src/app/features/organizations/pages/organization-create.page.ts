import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import type { CreateOrganization } from '../models/organization';
import { OrganizationEditorComponent } from '../components/organization-editor.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { toApiProblem, type ApiProblem } from '../../../core/api';
@Component({
  selector: 'app-organization-create',
  imports: [RouterLink, OrganizationEditorComponent, ProblemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<a
      routerLink="/organizaciones"
      class="inline-flex min-h-11 items-center text-sm text-primary"
      >← Volver a organizaciones</a
    >
    <h1 class="mt-4 text-3xl font-semibold">Crear organización</h1>
    <p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
      Crea un borrador de empresa o refugio. Completa su perfil, envíalo a
      revisión y selecciona un responsable al aprobarlo. Crear el borrador no
      asigna permisos.
    </p>
    <section class="mt-7 rounded-3xl border border-line bg-white p-6 sm:p-8">
      <app-problem [problem]="problem()" /><app-organization-editor
        [busy]="busy()"
        (creation)="create($event)"
      />
    </section>`,
})
export class OrganizationCreatePage {
  private readonly gateway = inject(ORGANIZATIONS_GATEWAY);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly problem = signal<ApiProblem | null>(null);
  async create(body: CreateOrganization) {
    if (this.busy()) return;
    this.busy.set(true);
    this.problem.set(null);
    try {
      const org = await firstValueFrom(this.gateway.create(body));
      await this.router.navigate(['/organizaciones', org.id]);
    } catch (error) {
      this.problem.set(toApiProblem(error));
    } finally {
      this.busy.set(false);
    }
  }
}
