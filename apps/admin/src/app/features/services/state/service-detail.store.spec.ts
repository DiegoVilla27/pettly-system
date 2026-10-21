import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { SERVICES_GATEWAY } from '../models/services-gateway';
import { ServiceDetailStore } from './service-detail.store';
import { ApiProblem } from '../../../core/api';
import { service } from '../testing/service.fixture';
import type { Service } from '../models/service';
const context = {
  id: service.id,
  organizationId: service.organizationId,
  review: false,
};
const command = {
  kind: 'submit' as const,
  id: service.id,
  organizationId: service.organizationId,
  body: { reason: 'Revision de condiciones de servicio', expectedVersion: 1 },
};
describe('Service mutation concurrency', () => {
  it('excludes duplicate submissions, requires explicit refresh after a conflict and does not auto-retry', () => {
    const pending = new Subject<Service>(),
      execute = vi.fn(() => pending),
      get = vi.fn(() => of(service));
    TestBed.configureTestingModule({
      providers: [
        ServiceDetailStore,
        { provide: SERVICES_GATEWAY, useValue: { get, execute } },
      ],
    });
    const store = TestBed.inject(ServiceDetailStore);
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Private version'));
    expect(store.refreshRequired()).toBe(true);
    expect(store.service()?.version).toBe(1);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledTimes(1);
    store.load(context);
    expect(store.refreshRequired()).toBe(false);
  });
  it('blocks repeated writes after an uncertain outcome', () => {
    const pending = new Subject<Service>(),
      execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        ServiceDetailStore,
        {
          provide: SERVICES_GATEWAY,
          useValue: { get: () => of(service), execute },
        },
      ],
    });
    const store = TestBed.inject(ServiceDetailStore);
    store.execute(command);
    pending.error(new ApiProblem(0, 'NETWORK', 'Unknown'));
    expect(store.refreshRequired()).toBe(true);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
  });
  it('never applies a late successful write to a changed route', () => {
    const pending = new Subject<Service>();
    TestBed.configureTestingModule({
      providers: [
        ServiceDetailStore,
        {
          provide: SERVICES_GATEWAY,
          useValue: { get: () => of(service), execute: () => pending },
        },
      ],
    });
    const store = TestBed.inject(ServiceDetailStore);
    store.load(context);
    store.execute(command);
    store.load({ ...context, id: service.createdBy });
    pending.next({ ...service, status: 'pending', version: 2 });
    pending.complete();
    expect(store.success()).toBeNull();
    expect(store.service()?.version).toBe(1);
  });
});
