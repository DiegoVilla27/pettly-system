export type {
  PublicationState as PublicationResult,
  PublicationProfile,
} from '../../domain/aggregates/publication';
export type { AdoptionRequestState as AdoptionRequestResult } from '../../domain/aggregates/adoption-request';
export interface AdoptionAudit {
  id: string;
  actorId: string;
  publicationId: string;
  requestId: string | null;
  action: string;
  reason: string;
  correlationId: string;
  createdAt: Date;
}
