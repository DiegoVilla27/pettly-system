import type { Routes } from '@angular/router';
import { ANIMALS_GATEWAY } from './models/animals-gateway';
import { HttpAnimalsGateway } from './services/http-animals.gateway';
export const ANIMALS_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: ANIMALS_GATEWAY, useClass: HttpAnimalsGateway }],
    children: [
      {
        path: '',
        title: 'Animales · Pettly',
        loadComponent: () =>
          import('./pages/animals-list.page').then((m) => m.AnimalsListPage),
      },
      {
        path: ':organizationId/nuevo',
        title: 'Registrar animal · Pettly',
        loadComponent: () =>
          import('./pages/animal-create.page').then((m) => m.AnimalCreatePage),
      },
      {
        path: ':organizationId/:animalId',
        title: 'Animal del refugio · Pettly',
        loadComponent: () =>
          import('./pages/animal-detail.page').then((m) => m.AnimalDetailPage),
      },
    ],
  },
];
