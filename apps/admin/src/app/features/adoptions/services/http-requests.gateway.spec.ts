import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { PUBLICATIONS_GATEWAY } from '../models/publications-gateway';
import { HttpRequestsGateway } from './http-requests.gateway';
import { requestDetail, requestContext } from '../testing/request.fixture';
import { id } from '../testing/publication.fixture';
function setup(
  role = 'super_admin',
  applicantId = id(9),
  conditions = requestDetail.publication.conditions,
) {
  const request = vi.fn(() => of({ ...requestDetail.request, applicantId }));
  TestBed.configureTestingModule({
    providers: [
      HttpRequestsGateway,
      { provide: ApiClient, useValue: { request } },
      {
        provide: AUTH_SESSION,
        useValue: { identity: signal({ id: id(7), role, organizations: [] }) },
      },
      {
        provide: PUBLICATIONS_GATEWAY,
        useValue: {
          get: () => of({ ...requestDetail.publication, conditions }),
        },
      },
    ],
  });
  return { gateway: TestBed.inject(HttpRequestsGateway), request };
}
afterEach(() => TestBed.resetTestingModule());
const command = {
  context: requestContext,
  action: 'review' as const,
  body: {
    status: 'approved' as const,
    expectedVersion: 1,
    reason: 'Reviewed by shelter operator',
  },
};
describe('Shelter request gateway authorization', () => {
  it('rejects global moderation-only access before fetching private contact', async () => {
    const { gateway, request } = setup('moderator');
    await expect(
      firstValueFrom(gateway.get(requestContext)),
    ).rejects.toMatchObject({ status: 403 });
    expect(request).not.toHaveBeenCalled();
  });
  it('refuses self decisions', async () => {
    const { gateway, request } = setup('super_admin', id(7));
    await expect(
      firstValueFrom(gateway.execute(command)),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('refuses approval with superseded conditions', async () => {
    const { gateway, request } = setup(
      'super_admin',
      id(9),
      'Updated shelter requirements',
    );
    await expect(
      firstValueFrom(gateway.execute(command)),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('refuses stale request before write', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(
        gateway.execute({
          ...command,
          body: { ...command.body, expectedVersion: 2 },
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('never confirms handover from submitted status', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(
        gateway.execute({
          context: requestContext,
          action: 'complete',
          body: { reason: command.body.reason, expectedVersion: 1 },
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
