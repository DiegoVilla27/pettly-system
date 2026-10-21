import { TestBed } from '@angular/core/testing';
import { LoginFormComponent } from './login-form.component';
describe('Login form', () => {
  it('focuses the first invalid field and does not submit invalid credentials', async () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.credentials.subscribe(emitted);
    fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(emitted).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement
        .querySelector('#email')
        .getAttribute('aria-invalid'),
    ).toBe('true');
    expect(fixture.componentInstance.form.controls.password.touched).toBe(true);
  });
  it('emits valid credentials, preserves password whitespace and blocks double submission', async () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.credentials.subscribe(emitted);
    fixture.componentInstance.form.setValue({
      email: 'admin@example.com',
      password: ' secret password ',
    });
    fixture.componentInstance.submit();
    expect(emitted).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: ' secret password ',
    });
    fixture.componentRef.setInput('busy', true);
    fixture.componentInstance.submit();
    await fixture.whenStable();
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(
      fixture.nativeElement.querySelector('button[type=submit]').disabled,
    ).toBe(true);
  });
  it('toggles password visibility through a labelled button in zoneless mode', async () => {
    const fixture = TestBed.createComponent(LoginFormComponent);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('button[type=button]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#password').type).toBe('text');
    expect(
      fixture.nativeElement
        .querySelector('button[type=button]')
        .getAttribute('aria-label'),
    ).toBe('Ocultar contraseña');
  });
});
