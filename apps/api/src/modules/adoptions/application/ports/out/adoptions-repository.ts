import type {
  PublicationResult,
  AdoptionRequestResult,
  AdoptionAudit,
} from '../../results/adoption';
import type {
  PublicPublicationsQuery,
  OrganizationPublicationsQuery,
  AdoptionRequestsQuery,
} from '../../queries/adoption.queries';
export interface AdoptionsWork {
  pendingPublications(
    page: number,
    limit: number,
  ): Promise<{
    items: PublicationResult[];
    total: number;
    page: number;
    limit: number;
  }>;
  lock(key: string): Promise<void>;
  findPublication(id: string): Promise<PublicationResult | null>;
  createPublication(state: PublicationResult): Promise<void>;
  savePublication(state: PublicationResult): Promise<void>;
  publicCandidates(
    query: PublicPublicationsQuery,
  ): Promise<{ items: PublicationResult[]; nextCursor: string | null }>;
  publications(query: OrganizationPublicationsQuery): Promise<{
    items: PublicationResult[];
    total: number;
    page: number;
    limit: number;
  }>;
  findRequest(id: string): Promise<AdoptionRequestResult | null>;
  createRequest(state: AdoptionRequestResult): Promise<void>;
  saveRequest(state: AdoptionRequestResult): Promise<void>;
  requests(query: AdoptionRequestsQuery): Promise<{
    items: AdoptionRequestResult[];
    total: number;
    page: number;
    limit: number;
  }>;
  openRequests(publicationId: string): Promise<AdoptionRequestResult[]>;
  audit(entry: AdoptionAudit): Promise<void>;
  audits(
    id: string,
    page: number,
    limit: number,
  ): Promise<{
    items: AdoptionAudit[];
    total: number;
    page: number;
    limit: number;
  }>;
}
export interface AdoptionsRepository {
  run<T>(work: (context: AdoptionsWork) => Promise<T>): Promise<T>;
}
export const ADOPTIONS_REPOSITORY = Symbol('ADOPTIONS_REPOSITORY');
