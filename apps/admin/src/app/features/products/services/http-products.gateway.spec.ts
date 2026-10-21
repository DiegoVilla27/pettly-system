import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { HttpProductsGateway } from './http-products.gateway';
import { detail, context, id } from '../testing/product.fixture';
function setup(
  value = detail,
  role = 'user',
  permissions = ['catalog.manage'],
) {
  const request = vi.fn((op: string) =>
    of(op === 'createCatalogProduct' ? value.product : value),
  );
  TestBed.configureTestingModule({
    providers: [
      HttpProductsGateway,
      { provide: ApiClient, useValue: { request } },
      {
        provide: AUTH_SESSION,
        useValue: {
          identity: signal({
            role,
            organizations:
              role === 'moderator'
                ? []
                : [
                    {
                      organizationId: context.organizationId,
                      type: 'business',
                      status: 'active',
                      permissions,
                    },
                  ],
          }),
        },
      },
    ],
  });
  return { gateway: TestBed.inject(HttpProductsGateway), request };
}
const command = {
  context,
  action: 'archive' as const,
  body: { reason: 'Verified catalog maintenance', expectedVersion: 1 },
};
describe('Product authorization and preflight', () => {
  it('denies global moderation without company membership', async () => {
    const { gateway, request } = setup(detail, 'moderator');
    await expect(firstValueFrom(gateway.get(context))).rejects.toMatchObject({
      status: 403,
    });
    expect(request).not.toHaveBeenCalled();
  });
  it('denies wrong company before transport', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(gateway.get({ ...context, organizationId: id(9) })),
    ).rejects.toMatchObject({ status: 403 });
    expect(request).not.toHaveBeenCalled();
  });
  it('denies membership without catalog permission', async () => {
    const { gateway, request } = setup(detail, 'user', []);
    await expect(firstValueFrom(gateway.get(context))).rejects.toMatchObject({
      status: 403,
    });
    expect(request).not.toHaveBeenCalled();
  });
  it('denies stale revision before mutation', async () => {
    const { gateway, request } = setup({
      ...detail,
      product: { ...detail.product, version: 2 },
    });
    await expect(
      firstValueFrom(gateway.execute(command)),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('blocks historical non-COP mutations', async () => {
    const { gateway, request } = setup({
      ...detail,
      product: { ...detail.product, currency: 'USD' },
    });
    await expect(
      firstValueFrom(gateway.execute(command)),
    ).rejects.toMatchObject({ status: 409 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('blocks foreign variant IDs', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(
        gateway.execute({
          ...command,
          action: 'variant-archive',
          variantId: id(9),
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('forces COP for creation', async () => {
    const { gateway, request } = setup();
    const profile = {
      name: detail.product.name,
      description: detail.product.description,
      brand: null,
      categoryId: detail.product.categoryId,
    };
    await firstValueFrom(
      gateway.create(context.organizationId, profile, command.body.reason),
    );
    expect(request).toHaveBeenCalledWith('createCatalogProduct', {
      body: {
        organizationId: context.organizationId,
        profile,
        currency: 'COP',
        reason: command.body.reason,
      },
    });
  });
});
