import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { ApiClient } from '../../../core/api';
import { AUTH_SESSION } from '../../../core/auth';
import { HttpPaymentsGateway } from './http-payments.gateway';
import { paymentDto, id } from '../testing/payment.fixture';
const context = { scope: 'platform' as const, paymentId: paymentDto.id };
function setup(role: 'user' | 'super_admin' = 'super_admin') {
  const request = vi.fn(() => of(paymentDto));
  TestBed.configureTestingModule({
    providers: [
      HttpPaymentsGateway,
      { provide: ApiClient, useValue: { request } },
      {
        provide: AUTH_SESSION,
        useValue: { identity: signal({ role, organizations: [] }) },
      },
    ],
  });
  return { gateway: TestBed.inject(HttpPaymentsGateway), request };
}
describe('Payment HTTP scope and commands', () => {
  it('sends only the strict empty reconciliation body and permits same-version acknowledgement', async () => {
    const { gateway, request } = setup();
    expect((await firstValueFrom(gateway.reconcile(context))).version).toBe(1);
    expect(request).toHaveBeenCalledWith('requestPaymentReconciliation', {
      path: { paymentId: paymentDto.id },
      body: {},
    });
  });
  it('denies staff platform evidence and wrong-company reads before transport', async () => {
    const { gateway, request } = setup('user');
    await expect(
      firstValueFrom(gateway.financials(context)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      firstValueFrom(
        gateway.get({
          scope: 'business',
          organizationId: id(8),
          paymentId: paymentDto.id,
        }),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(request).not.toHaveBeenCalled();
  });
  it('validates UUID and excludes foreign returned detail even for superadministrator', async () => {
    const { gateway, request } = setup();
    await expect(
      firstValueFrom(gateway.get({ ...context, paymentId: 'invalid' })),
    ).rejects.toMatchObject({ status: 400 });
    expect(request).not.toHaveBeenCalled();
    await expect(
      firstValueFrom(
        gateway.get({
          scope: 'business',
          organizationId: id(8),
          paymentId: paymentDto.id,
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
