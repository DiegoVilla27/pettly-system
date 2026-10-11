import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ORGANIZATIONS_GATEWAY } from '../models/organizations-gateway';
import { OrganizationDetailStore } from './organization-detail.store';
import { mapProfile } from '../mappers/organizations.mapper';
import { organizationFixture } from '../testing/organization.fixture';
import type { OrganizationProfile } from '../models/organization';
import { ApiProblem } from '../../../core/api';
describe('Organization decision state', () => {
  it('does not retry stale decisions and allows an explicit refresh and new decision', () => {
    const pending = new Subject<OrganizationProfile>();
    const execute = vi.fn(() => pending);
    const get = vi.fn(() =>
      of(mapProfile(organizationFixture, organizationFixture.id)),
    );
    TestBed.configureTestingModule({
      providers: [
        OrganizationDetailStore,
        { provide: ORGANIZATIONS_GATEWAY, useValue: { get, execute } },
      ],
    });
    const store = TestBed.inject(OrganizationDetailStore);
    store.load(organizationFixture.id);
    const command = {
      kind: 'submit' as const,
      organizationId: organizationFixture.id,
      body: { reason: 'Administrative review complete', expectedVersion: 1 },
    };
    store.execute(command);
    store.execute(command);
    expect(execute).toHaveBeenCalledTimes(1);
    pending.error(new ApiProblem(409, 'CONFLICT', 'Private database details'));
    expect(store.problem()?.message).toContain('Actualiza los datos');
    expect(store.organization()?.version).toBe(1);
    expect(store.busy()).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    store.load(organizationFixture.id);
    expect(get).toHaveBeenCalledTimes(2);
    expect(store.problem()).toBeNull();
  });
  it('ignores a late decision when a different organization is already displayed', () => {
    const pending = new Subject<OrganizationProfile>();
    const get = vi.fn((id: string) =>
      of(mapProfile({ ...organizationFixture, id }, id)),
    );
    TestBed.configureTestingModule({
      providers: [
        OrganizationDetailStore,
        {
          provide: ORGANIZATIONS_GATEWAY,
          useValue: { get, execute: () => pending },
        },
      ],
    });
    const store = TestBed.inject(OrganizationDetailStore);
    store.load(organizationFixture.id);
    store.execute({
      kind: 'submit',
      organizationId: organizationFixture.id,
      body: { reason: 'Administrative review complete', expectedVersion: 1 },
    });
    const id = '6ee2a5af-85e0-4109-b778-1d2eb73aad1c';
    store.load(id);
    pending.next(
      mapProfile(
        { ...organizationFixture, status: 'pending', version: 2 },
        organizationFixture.id,
      ),
    );
    pending.complete();
    expect(store.organization()?.id).toBe(id);
    expect(store.success()).toBe('');
    expect(store.busy()).toBe(false);
  });
});
