import { TestBed } from '@angular/core/testing';
import { OrganizationEditorComponent } from './organization-editor.component';
import { organizationFixture } from '../testing/organization.fixture';
import { mapProfile } from '../mappers/organizations.mapper';
describe('Organization profile form', () => {
  it('normalizes draft creation without assigning a role, status or responsible account', async () => {
    const fixture = TestBed.createComponent(OrganizationEditorComponent);
    await fixture.whenStable();
    const emit = vi.fn();
    fixture.componentInstance.creation.subscribe(emit);
    fixture.componentInstance.form.patchValue({
      name: 'Empresa Sendero',
      legalName: 'Sendero SAS',
      registrationNumber: '900.123-456',
      email: 'CONTACT@example.com',
      reason: 'Administrative review complete',
    });
    fixture.componentInstance.submit();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Empresa Sendero',
        type: 'business',
        profile: expect.objectContaining({
          registrationNumber: '900123456',
          email: 'contact@example.com',
        }),
      }),
    );
    expect(emit.mock.calls[0]?.[0]).not.toHaveProperty('responsibleUserId');
    expect(emit.mock.calls[0]?.[0]).not.toHaveProperty('status');
  });
  it('does not clear required operational fields or silently drop the version', async () => {
    const fixture = TestBed.createComponent(OrganizationEditorComponent);
    const org = mapProfile(
      {
        ...organizationFixture,
        status: 'active',
        version: 4,
        legalName: 'Sendero SAS',
        registrationNumber: '900123456',
        email: 'contact@example.com',
        phone: '+573001234567',
        countryCode: 'CO',
        city: 'Medellín',
        address: 'Calle de prueba',
      },
      organizationFixture.id,
    );
    fixture.componentRef.setInput('organization', org);
    await fixture.whenStable();
    const emit = vi.fn();
    fixture.componentInstance.update.subscribe(emit);
    fixture.componentInstance.form.patchValue({
      city: '',
      reason: 'Administrative review complete',
    });
    fixture.componentInstance.submit();
    expect(emit).not.toHaveBeenCalled();
    fixture.componentInstance.form.controls.city.setValue('Bogotá');
    fixture.componentInstance.submit();
    expect(emit).toHaveBeenCalledWith({
      profile: { city: 'Bogotá' },
      expectedVersion: 4,
      reason: 'Administrative review complete',
    });
  });
});
