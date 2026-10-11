import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, firstValueFrom } from 'rxjs';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { HttpAnimalsGateway } from './http-animals.gateway';
import { animal, context, profile, id } from '../testing/animal.fixture';
function setup(value = animal, role = 'super_admin') {
  const request = vi.fn(() => of(value)),
    upload = vi.fn(() => of(value)),
    image = vi.fn(() => of(new Blob(['jpeg'], { type: 'image/jpeg' })));
  TestBed.configureTestingModule({
    providers: [
      HttpAnimalsGateway,
      { provide: ApiClient, useValue: { request, upload, image } },
      {
        provide: AUTH_SESSION,
        useValue: { identity: signal({ role, organizations: [] }) },
      },
    ],
  });
  return {
    gateway: TestBed.inject(HttpAnimalsGateway),
    request,
    upload,
    image,
  };
}
describe('Animal scoped writes and media', () => {
  it('preflights identity before any mutation to prevent superadmin personal-record bypass', async () => {
    const { gateway, request } = setup({ ...animal, organizationId: id(8) });
    await expect(
      firstValueFrom(
        gateway.execute({
          context,
          action: 'archive',
          body: { reason: 'Archive verified record', expectedVersion: 1 },
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('getAnimal', {
      path: { animalId: animal.id },
    });
  });
  it('rejects stale preflight version before mutation', async () => {
    const { gateway, request } = setup({ ...animal, version: 2 });
    await expect(
      firstValueFrom(
        gateway.execute({
          context,
          action: 'archive',
          body: { reason: 'Archive verified record', expectedVersion: 1 },
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('denies business/moderator access and never defaults to personal scope', async () => {
    const { gateway, request } = setup(animal, 'moderator');
    await expect(
      firstValueFrom(
        gateway.list({
          organizationId: context.organizationId,
          page: 1,
          limit: 20,
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects oversized or unsupported uploads before transport', async () => {
    const { gateway, request, upload } = setup();
    await expect(
      firstValueFrom(
        gateway.execute({
          context,
          action: 'upload',
          body: {
            reason: 'Photograph verified record',
            expectedVersion: 1,
            file: new File(['x'], 'x.svg', { type: 'image/svg+xml' }),
          },
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(request).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
  it('creates only in an explicit organization with validated profile', async () => {
    const { gateway, request } = setup();
    await firstValueFrom(
      gateway.create(
        context.organizationId,
        profile,
        'Animal registration verified',
      ),
    );
    expect(request).toHaveBeenCalledWith('createAnimal', {
      body: {
        organizationId: context.organizationId,
        profile,
        reason: 'Animal registration verified',
      },
    });
  });
});
