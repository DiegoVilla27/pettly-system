import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SERVICES_GATEWAY } from '../models/services-gateway';
import { RESOURCE_GATEWAY } from '../models/resource-gateway';
import { ResourceDetailStore } from './resource-detail.store';
import { resource, service } from '../testing/service.fixture';
import type { ResourceResult } from '../models/resource';
import { ApiProblem } from '../../../core/api';
const context = {
  organizationId: resource.organizationId,
  resourceId: resource.id,
};
const command = {
  kind: 'release' as const,
  context,
  blockId: service.id,
  body: { reason: 'Administrative schedule verification', expectedVersion: 1 },
};
describe('Resource write concurrency', () => {
  it('excludes duplicate writes and requires refresh after a stale version', () => {
    const pending = new Subject<ResourceResult>(),
      execute = vi.fn(() => pending);
    TestBed.configureTestingModule({
      providers: [
        ResourceDetailStore,
        {
          provide: SERVICES_GATEWAY,
          useValue: { resources: () => of([resource]) },
        },
        { provide: RESOURCE_GATEWAY, useValue: { execute } },
      ],
    });
    const store = TestBed.inject(ResourceDetailStore);
    store.load(context);
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Changed'));
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.refreshRequired()).toBe(true);
    store.load(context);
    expect(store.refreshRequired()).toBe(false);
  });
  it('does not apply a late mutation to another resource route', () => {
    const pending = new Subject<ResourceResult>();
    TestBed.configureTestingModule({
      providers: [
        ResourceDetailStore,
        {
          provide: SERVICES_GATEWAY,
          useValue: { resources: () => of([resource]) },
        },
        { provide: RESOURCE_GATEWAY, useValue: { execute: () => pending } },
      ],
    });
    const store = TestBed.inject(ResourceDetailStore);
    store.load(context);
    store.execute(command);
    store.load({ ...context, resourceId: service.id });
    pending.next({ kind: 'resource', resource: { ...resource, version: 2 } });
    pending.complete();
    expect(store.resource()).toBeNull();
    expect(store.result()).toBeNull();
  });
  it('blocks replay if a successful block cannot be followed by a confirmed resource version', () => {
    const resources = vi
      .fn()
      .mockReturnValueOnce(of([resource]))
      .mockReturnValue(throwError(() => new ApiProblem(0, 'NETWORK', 'Lost')));
    const execute = vi.fn(() =>
      of<ResourceResult>({
        kind: 'block',
        block: {
          id: service.id,
          organizationId: resource.organizationId,
          resourceId: resource.id,
          startsAt: '2026-10-12T13:00:00.000Z',
          endsAt: '2026-10-12T14:00:00.000Z',
          createdAt: '2026-10-10T00:00:00.000Z',
          createdBy: service.createdBy,
          reason: command.body.reason,
          releasedAt: '2026-10-10T00:00:00.000Z',
        },
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        ResourceDetailStore,
        { provide: SERVICES_GATEWAY, useValue: { resources } },
        { provide: RESOURCE_GATEWAY, useValue: { execute } },
      ],
    });
    const store = TestBed.inject(ResourceDetailStore);
    store.load(context);
    store.execute(command);
    expect(store.refreshRequired()).toBe(true);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
