import type { RequestDetail, RequestContext } from '../models/adoption-request';
import { publication, id } from './publication.fixture';
export const requestContext: RequestContext = {
  organizationId: id(3),
  publicationId: id(1),
  adoptionRequestId: id(8),
};
export const requestDetail: RequestDetail = {
  publication: { ...publication, status: 'published' },
  request: {
    id: id(8),
    publicationId: id(1),
    applicantId: id(9),
    message: 'Quiero ofrecer un hogar seguro.',
    consentedAt: publication.createdAt,
    publicationVersion: 1,
    conditionsAccepted: publication.conditions,
    status: 'submitted',
    version: 1,
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
    completedAt: null,
    createdAt: publication.createdAt,
    updatedAt: publication.updatedAt,
    contact: {
      name: 'Andrea',
      lastName: 'López',
      email: 'andrea@example.com',
      phone: '+573001234567',
      city: 'Bogotá',
      countryCode: 'CO',
    },
  },
};
