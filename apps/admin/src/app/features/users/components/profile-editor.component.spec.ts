import { TestBed } from '@angular/core/testing';
import { ProfileEditorComponent } from './profile-editor.component';
describe('Administrative invitation form', () => {
  it('requires audited valid profile data and emits no password or role', async () => {
    const fixture = TestBed.createComponent(ProfileEditorComponent);
    await fixture.whenStable();
    const emit = vi.fn();
    fixture.componentInstance.invitation.subscribe(emit);
    fixture.componentInstance.submit();
    expect(emit).not.toHaveBeenCalled();
    fixture.componentInstance.form.patchValue({
      email: 'CAMILA@example.com',
      name: 'Camila',
      lastName: 'Rivera',
      phone: '+573001234567',
      countryCode: 'CO',
      reason: 'Account requested by platform administration.',
    });
    fixture.componentInstance.submit();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'camila@example.com',
        name: 'Camila',
        lastName: 'Rivera',
        phone: '+573001234567',
        countryCode: 'CO',
      }),
    );
    expect(emit.mock.calls[0]?.[0]).not.toHaveProperty('password');
    expect(emit.mock.calls[0]?.[0]).not.toHaveProperty('role');
  });
});
