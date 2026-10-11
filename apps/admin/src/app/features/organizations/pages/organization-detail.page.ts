import {
  ChangeDetectionStrategy,
  Component,
  inject,
  computed,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { OrganizationDetailStore } from '../state/organization-detail.store';
import { OrganizationHeadingComponent } from '../components/organization-heading.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import { countryOptions } from '../mappers/organizations.mapper';
@Component({
  selector: 'app-organization-detail',
  imports: [
    DatePipe,
    RouterLink,
    OrganizationHeadingComponent,
    ProblemComponent,
  ],
  providers: [OrganizationDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization-detail.page.html',
})
export class OrganizationDetailPage {
  readonly store = inject(OrganizationDetailStore);
  readonly organizationId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((p) => p.get('organizationId') ?? ''),
    ),
    { initialValue: '' },
  );
  readonly profile = computed(() => {
    const org = this.store.organization();
    return org
      ? [
          { label: 'Razón social', value: org.legalName },
          { label: 'Número de registro', value: org.registrationNumber },
          { label: 'Descripción', value: org.description },
          { label: 'Correo de contacto', value: org.email },
          { label: 'Teléfono', value: org.phone },
          { label: 'Sitio web', value: org.website },
          {
            label: 'País',
            value:
              countryOptions.find((c) => c.value === org.countryCode)?.label ??
              org.countryCode,
          },
          { label: 'Departamento o región', value: org.region },
          { label: 'Ciudad', value: org.city },
          { label: 'Dirección', value: org.address },
          { label: 'Complemento', value: org.addressLine2 },
          { label: 'Código postal', value: org.postalCode },
        ]
      : [];
  });
  constructor() {
    this.store.load(this.organizationId);
  }
}
