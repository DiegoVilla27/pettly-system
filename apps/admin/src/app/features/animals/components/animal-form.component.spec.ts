import { TestBed } from '@angular/core/testing';
import { kgToGrams, AnimalFormComponent } from './animal-form.component';
import { animal } from '../testing/animal.fixture';
describe('Animal editor', () => {
  it('converts decimal kilograms exactly, preserving unknown values', () => {
    expect(kgToGrams('12,345')).toBe(12345);
    expect(kgToGrams('0.001')).toBe(1);
    expect(kgToGrams('2000')).toBe(2000000);
    expect(kgToGrams('')).toBeNull();
    for (const v of ['0', '2000.001', '1.0001', '1e3', '-1'])
      expect(() => kgToGrams(v)).toThrow();
  });
  it('edits complete profile with null clearing and no ownership/status injection', () => {
    const f = TestBed.createComponent(AnimalFormComponent);
    f.componentRef.setInput('animal', animal);
    f.detectChanges();
    const c = f.componentInstance;
    const emit = vi.spyOn(c.submitted, 'emit');
    c.form.patchValue({
      breed: '',
      weight: '',
      healthNotes: '',
      reason: 'Animal profile verified',
      confirm: true,
    });
    c.submit();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          weightGrams: null,
          healthNotes: null,
          vaccinated: null,
          neutered: false,
        }),
      }),
    );
    expect(emit.mock.calls[0]?.[0].profile).not.toHaveProperty(
      'organizationId',
    );
  });
  it('rejects future dates and requires explicit confirmation', () => {
    const f = TestBed.createComponent(AnimalFormComponent);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.spyOn(c.submitted, 'emit');
    c.form.patchValue({
      name: 'Luna',
      dateOfBirth: '2999-01-01',
      reason: 'Animal profile verified',
      confirm: true,
    });
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    expect(c.error()).not.toBe('');
  });
});
