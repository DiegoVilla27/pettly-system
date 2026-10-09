import type {
  CreatePublicationCommand,
  PublicationDecisionCommand,
  UpdatePublicationCommand,
  ReviewPublicationCommand,
  SubmitAdoptionRequestCommand,
  AdoptionRequestDecisionCommand,
} from '../../commands/adoption.commands';
import type {
  PublicPublicationsQuery,
  OrganizationPublicationsQuery,
  AdoptionRequestsQuery,
} from '../../queries/adoption.queries';
import type {
  PublicationResult,
  AdoptionRequestResult,
} from '../../results/adoption';
import type { AdoptionsWork } from '../out/adoptions-repository';
export type PublicPublication = Pick<
  PublicationResult,
  | 'id'
  | 'version'
  | 'animalId'
  | 'organizationId'
  | 'title'
  | 'description'
  | 'conditions'
  | 'countryCode'
  | 'city'
  | 'publishedAt'
  | 'snapshot'
>;
export interface ApplicantContact {
  name: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  countryCode: string | null;
  city: string | null;
}
export interface AdoptionsUseCases {
  moderation(
    actorId: string,
    page: number,
    limit: number,
  ): ReturnType<AdoptionsWork['pendingPublications']>;
  create(command: CreatePublicationCommand): Promise<PublicationResult>;
  get(actorId: string, id: string): Promise<PublicationResult>;
  list(
    query: OrganizationPublicationsQuery,
  ): ReturnType<AdoptionsWork['publications']>;
  update(command: UpdatePublicationCommand): Promise<PublicationResult>;
  submit(command: PublicationDecisionCommand): Promise<PublicationResult>;
  review(command: ReviewPublicationCommand): Promise<PublicationResult>;
  pause(command: PublicationDecisionCommand): Promise<PublicationResult>;
  archive(command: PublicationDecisionCommand): Promise<void>;
  publicList(
    query: PublicPublicationsQuery,
  ): Promise<{ items: PublicPublication[]; nextCursor: string | null }>;
  publicGet(id: string): Promise<PublicPublication>;
  publicPhoto(id: string, mediaId: string): Promise<Uint8Array>;
  apply(command: SubmitAdoptionRequestCommand): Promise<AdoptionRequestResult>;
  requests(query: AdoptionRequestsQuery): ReturnType<AdoptionsWork['requests']>;
  request(
    actorId: string,
    id: string,
  ): Promise<AdoptionRequestResult & { contact: ApplicantContact | null }>;
  reviewRequest(
    command: AdoptionRequestDecisionCommand,
  ): Promise<AdoptionRequestResult>;
  withdraw(
    command: AdoptionRequestDecisionCommand,
  ): Promise<AdoptionRequestResult>;
  complete(
    command: AdoptionRequestDecisionCommand,
  ): Promise<AdoptionRequestResult>;
  audits(
    actorId: string,
    id: string,
    page: number,
    limit: number,
  ): ReturnType<AdoptionsWork['audits']>;
}
export const ADOPTIONS_USE_CASES = Symbol('ADOPTIONS_USE_CASES');
