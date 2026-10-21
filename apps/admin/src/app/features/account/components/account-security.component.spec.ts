import { TestBed } from '@angular/core/testing';
import { AccountSecurityComponent } from './account-security.component';
describe('Own security confirmation', () => {
  it('does not reuse confirmation or password when changing action', () => {
    const f = TestBed.createComponent(AccountSecurityComponent);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.form.patchValue({
      action: 'password',
      password: 'original password',
      newPassword: 'A sufficient replacement!',
      repeat: 'A sufficient replacement!',
      confirm: true,
    });
    c.form.controls.action.setValue('email');
    expect(c.form.controls.confirm.value).toBe(false);
    expect(c.form.controls.password.value).toBe('');
    c.submit();
    expect(emit).not.toHaveBeenCalled();
  });
  it('requires a nonempty email and preserves exact passwords while clearing secrets after submit', () => {
    const f = TestBed.createComponent(AccountSecurityComponent);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.form.patchValue({
      action: 'email',
      password: ' exact password ',
      confirm: true,
      email: '',
    });
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    c.form.controls.email.setValue('new@example.com');
    c.submit();
    expect(emit).toHaveBeenCalledWith({
      kind: 'email',
      body: { password: ' exact password ', email: 'new@example.com' },
    });
    expect(c.form.controls.password.value).toBe('');
    expect(c.form.controls.confirm.value).toBe(false);
  });
});
