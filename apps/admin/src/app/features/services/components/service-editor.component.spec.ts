import { TestBed } from '@angular/core/testing';
import { ServiceEditorComponent } from './service-editor.component';
import { service, resource, profile } from '../testing/service.fixture';
describe('Service editor', () => {
  it('clears incompatible assignments on mode change and excludes hidden invalid appointment controls from lodging validation', () => {
    const f = TestBed.createComponent(ServiceEditorComponent);
    f.componentRef.setInput('resources', [resource]);
    f.componentRef.setInput('service', service);
    f.detectChanges();
    const c = f.componentInstance;
    c.form.controls.durationMinutes.setValue(16);
    expect(c.form.controls.durationMinutes.invalid).toBe(true);
    c.form.controls.category.setValue('lodging');
    expect(c.form.controls.durationMinutes.disabled).toBe(true);
    expect(c.form.controls.resourceIds.value).toEqual([]);
    c.form.controls.category.setValue('grooming');
    expect(c.form.controls.durationMinutes.enabled).toBe(true);
    expect(c.form.controls.durationMinutes.invalid).toBe(true);
  });
  it('keeps decimal COP and complete policy, prevents invalid veterinary assignment, and ignores blocked submissions', () => {
    const f = TestBed.createComponent(ServiceEditorComponent);
    f.componentRef.setInput('resources', [resource]);
    f.componentRef.setInput('service', service);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.form.patchValue({
      priceCop: '19999,95',
      reason: 'Revision profesional de condiciones',
    });
    c.submit();
    expect(emit).toHaveBeenCalledWith({
      profile: { ...profile, priceMinor: 1999995 },
      reason: 'Revision profesional de condiciones',
    });
    emit.mockClear();
    c.form.patchValue({
      category: 'veterinary',
      veterinaryCredentialId: service.id,
    });
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    expect(c.form.hasError('profile')).toBe(true);
    c.form.patchValue({ category: 'grooming' });
    f.componentRef.setInput('blocked', true);
    f.detectChanges();
    c.submit();
    expect(emit).not.toHaveBeenCalled();
  });
  it('requires species, preserves signed-off scheduling rules and validates lodging departure before arrival', () => {
    const f = TestBed.createComponent(ServiceEditorComponent);
    f.componentRef.setInput('resources', [
      {
        ...resource,
        kind: 'lodging',
        windows: [{ day: 1, startMinute: 0, endMinute: 1440 }],
      },
    ]);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.form.patchValue({
      name: 'Hotel felino',
      description: 'Alojamiento con cuidado diario.',
      category: 'lodging',
      priceCop: '80000',
      requirements: 'Vacunas vigentes',
      terms: 'El alojamiento incluye cuidado diario.',
      reason: 'Alta de alojamiento profesional',
      resourceIds: [resource.id],
      checkIn: '15:00',
      checkOut: '16:00',
      minNights: 1,
      maxNights: 7,
    });
    c.form.controls.acceptedSpecies.at(1).setValue(true);
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    c.form.controls.checkOut.setValue('12:00');
    c.submit();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          kind: 'lodging',
          priceMinor: 8000000,
          durationMinutes: null,
          checkOutMinute: 720,
          checkInMinute: 900,
          bufferAfterMinutes: 0,
        }),
      }),
    );
  });
  it('binds a selected eligible professional to its sole dedicated agenda and rejects expiration', () => {
    const f = TestBed.createComponent(ServiceEditorComponent);
    const dedicated = { ...resource, capacity: 1 };
    f.componentRef.setInput('resources', [dedicated]);
    f.componentRef.setInput('service', service);
    f.componentRef.setInput('professionals', {
      items: [
        {
          id: service.id,
          organizationId: service.organizationId,
          professionalId: service.createdBy,
          professionalName: 'Profesional acreditado',
          resourceId: resource.id,
          verifiedUntil: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
      candidateTotal: 1,
      page: 1,
      limit: 20,
    });
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.form.patchValue({
      category: 'veterinary',
      veterinaryCredentialId: service.id,
      reason: 'Servicio con revisión profesional',
    });
    expect(c.form.controls.resourceIds.value).toEqual([resource.id]);
    c.submit();
    expect(emit).toHaveBeenCalledTimes(1);
    f.componentRef.setInput('professionals', {
      items: [
        {
          id: service.id,
          organizationId: service.organizationId,
          professionalId: service.createdBy,
          professionalName: 'Profesional acreditado',
          resourceId: resource.id,
          verifiedUntil: '2000-01-01T00:00:00.000Z',
        },
      ],
      candidateTotal: 1,
      page: 1,
      limit: 20,
    });
    f.detectChanges();
    emit.mockClear();
    c.submit();
    expect(emit).not.toHaveBeenCalled();
  });
});
