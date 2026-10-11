import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Animal,
  AnimalRecord,
  AnimalPage,
  AnimalQuery,
  AnimalContext,
  AnimalCommand,
  AnimalProfile,
  AnimalAudit,
  Shelter,
} from './animal';
export interface AnimalsGateway {
  shelters(search: string, currentId?: string): Observable<Shelter[]>;
  list(q: AnimalQuery): Observable<AnimalPage>;
  get(c: AnimalContext): Observable<Animal>;
  audit(c: AnimalContext, page: number): Observable<AnimalAudit>;
  create(
    organizationId: string,
    profile: AnimalProfile,
    reason: string,
  ): Observable<AnimalRecord>;
  execute(c: AnimalCommand): Observable<Animal>;
  photo(c: AnimalContext, mediaId: string): Observable<Blob>;
}
export const ANIMALS_GATEWAY = new InjectionToken<AnimalsGateway>(
  'ANIMALS_GATEWAY',
);
