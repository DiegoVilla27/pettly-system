import { describe, it, expect } from 'vitest';
import {
  mapRequest,
  mapRequestPage,
  requestFiltersSchema,
} from './requests.mapper';
import { requestDetail, requestContext } from '../testing/request.fixture';
import { requestActions } from '../models/adoption-request';
import { id } from '../testing/publication.fixture';
const filters = {
  organizationId: id(3),
  publicationId: id(1),
  page: 1,
  limit: 20,
};
describe('Shelter request contracts, privacy and decisions', () => {
  it('strips contact from list and additional private detail properties', () => {
    const page = mapRequestPage(
      { items: [requestDetail.request], total: 1, page: 1, limit: 20 },
      filters,
    );
    expect(page.items[0]).not.toHaveProperty('contact');
    const dto = {
      ...requestDetail.request,
      contact: {
        ...requestDetail.request.contact,
        address: 'PRIVATE',
        dateOfBirth: '2000-01-01',
        passwordHash: 'SECRET',
      },
    };
    expect(mapRequest(dto, requestContext).contact).not.toHaveProperty(
      'address',
    );
    expect(mapRequest(dto, requestContext).contact).not.toHaveProperty(
      'passwordHash',
    );
  });
  it('handles anonymized contact without inventing contact', () =>
    expect(
      mapRequest({ ...requestDetail.request, contact: null }, requestContext)
        .contact,
    ).toBeNull());
  it('rejects foreign publication or request identities', () => {
    expect(() =>
      mapRequest(
        { ...requestDetail.request, publicationId: id(20) },
        requestContext,
      ),
    ).toThrow();
    expect(() =>
      mapRequest({ ...requestDetail.request, id: id(20) }, requestContext),
    ).toThrow();
  });
  it('rejects incorrect totals, statuses, pagination and duplicate identities', () => {
    const dto = {
      items: [requestDetail.request],
      total: 1,
      page: 1,
      limit: 20,
    };
    expect(() => mapRequestPage({ ...dto, total: 0 }, filters)).toThrow();
    expect(() =>
      mapRequestPage(dto, { ...filters, status: 'approved' }),
    ).toThrow();
    expect(() => mapRequestPage({ ...dto, page: 2 }, filters)).toThrow();
    expect(() =>
      mapRequestPage(
        {
          ...dto,
          items: [requestDetail.request, requestDetail.request],
          total: 2,
        },
        filters,
      ),
    ).toThrow();
    expect(
      requestFiltersSchema.safeParse({ ...filters, organizationId: undefined })
        .success,
    ).toBe(false);
  });
  it('reserves completion for approved selection and never offers self decisions', () => {
    expect(requestActions(requestDetail, id(7)).map((x) => x.value)).toEqual([
      'in_review',
      'approved',
      'rejected',
    ]);
    expect(
      requestActions(
        {
          ...requestDetail,
          request: { ...requestDetail.request, status: 'approved' },
        },
        id(7),
      ).map((x) => x.value),
    ).toEqual(['rejected', 'complete']);
    expect(
      requestActions(requestDetail, requestDetail.request.applicantId),
    ).toEqual([]);
  });
  it('changed conditions permit only rejection; terminal or unpublished context has no action', () => {
    expect(
      requestActions(
        {
          ...requestDetail,
          publication: {
            ...requestDetail.publication,
            conditions: 'Nuevas condiciones',
          },
        },
        id(7),
      ).map((x) => x.value),
    ).toEqual(['rejected']);
    expect(
      requestActions(
        {
          ...requestDetail,
          request: { ...requestDetail.request, status: 'completed' },
        },
        id(7),
      ),
    ).toEqual([]);
    expect(
      requestActions(
        {
          ...requestDetail,
          publication: { ...requestDetail.publication, status: 'paused' },
        },
        id(7),
      ),
    ).toEqual([]);
  });
});
