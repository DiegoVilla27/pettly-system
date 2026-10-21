import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ServiceAvailabilityComponent } from './service-availability.component';
import { RESOURCE_GATEWAY } from '../models/resource-gateway';
import { resource, service } from '../testing/service.fixture';
import { colombiaToday } from '../mappers/resource.mapper';
describe('Availability view', () => {
  it('renders after required inputs, queries only on explicit submission and clears results when filters change', async () => {
    const availability = vi.fn(() =>
      of({
        serviceVersion: 1,
        resourceVersion: 1,
        timeZone: 'America/Bogota',
        slots: [],
        truncated: false,
      }),
    );
    TestBed.configureTestingModule({
      imports: [ServiceAvailabilityComponent],
      providers: [{ provide: RESOURCE_GATEWAY, useValue: { availability } }],
    });
    const fixture = TestBed.createComponent(ServiceAvailabilityComponent);
    fixture.componentRef.setInput('service', {
      ...service,
      status: 'published',
    });
    fixture.componentRef.setInput('resources', [resource]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Consultar disponibilidad',
    );
    expect(availability).not.toHaveBeenCalled();
    const c = fixture.componentInstance;
    c.form.patchValue({
      resourceId: resource.id,
      from: colombiaToday(),
      to: colombiaToday(),
    });
    c.search();
    expect(availability).toHaveBeenCalledTimes(1);
    expect(c.state().value).not.toBeNull();
    c.form.controls.resourceId.setValue('');
    expect(c.state().value).toBeNull();
  });
});
