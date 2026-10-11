import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { HttpPublicationsGateway } from './http-publications.gateway';
import { publication, id } from '../testing/publication.fixture';
function setup(createdBy = id(4), organizations: unknown[] = []) {
  const request = vi.fn(() => of({ ...publication, createdBy }));
  TestBed.configureTestingModule({
    providers: [
      HttpPublicationsGateway,
      { provide: ApiClient, useValue: { request } },
      {
        provide: AUTH_SESSION,
        useValue: {
          identity: signal({ id: id(7), role: 'moderator', organizations }),
          hasPermission: () => true,
        },
      },
    ],
  });
  return { gateway: TestBed.inject(HttpPublicationsGateway), request };
}
afterEach(() => TestBed.resetTestingModule());
describe('Publication write authorization', () => {
  it.each(['creator', 'member'])(
    'prevents independent moderation bypass by %s',
    async (kind) => {
      const { gateway, request } = setup(
        kind === 'creator' ? id(7) : id(4),
        kind === 'member' ? [{ organizationId: id(3) }] : [],
      );
      await expect(
        firstValueFrom(
          gateway.execute({
            context: { publicationId: id(1), review: true },
            action: 'review',
            body: {
              approved: true,
              reason: 'Independent publication review',
              expectedVersion: 1,
            },
          }),
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(request).toHaveBeenCalledTimes(1);
    },
  );
  it('blocks stale decisions before mutation', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(
        gateway.execute({
          context: { publicationId: id(1), review: true },
          action: 'review',
          body: {
            approved: true,
            reason: 'Independent publication review',
            expectedVersion: 2,
          },
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('does not grant operational writes through a moderation URL', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(
        gateway.execute({
          context: { publicationId: id(1), review: true },
          action: 'archive',
          body: {
            reason: 'Archive publication in context',
            expectedVersion: 1,
          },
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('never defaults an operational list to a personal/global scope', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(gateway.list({ review: false, page: 1, limit: 20 })),
    ).rejects.toMatchObject({ status: 400 });
    expect(request).not.toHaveBeenCalled();
  });
});
