import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Publication,
  Profile,
  PublicationPage,
  Context,
  Filters,
  Audit,
  Command,
  Shelter,
  Candidate,
} from './publication';
export interface PublicationsGateway {
  shelters(search: string, currentId?: string): Observable<Shelter[]>;
  candidate(organizationId: string, animalId: string): Observable<Candidate>;
  list(filters: Filters): Observable<PublicationPage>;
  get(context: Context): Observable<Publication>;
  create(
    organizationId: string,
    animalId: string,
    profile: Profile,
    reason: string,
  ): Observable<Publication>;
  execute(command: Command): Observable<Publication>;
  audit(context: Context, page: number): Observable<Audit>;
  photo(context: Context, mediaId: string): Observable<Blob>;
}
export const PUBLICATIONS_GATEWAY = new InjectionToken<PublicationsGateway>(
  'PUBLICATIONS_GATEWAY',
);
