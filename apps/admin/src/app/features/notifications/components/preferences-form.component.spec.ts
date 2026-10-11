import { TestBed } from '@angular/core/testing';
import { PreferencesFormComponent } from './preferences-form.component';
import { DeliveryRetryComponent } from './delivery-retry.component';
import { preferences, delivery } from '../testing/notification.fixture';
describe('Typed notification confirmations', () => {
  it('uses the server version and resets values after explicit refresh', () => {
    const f = TestBed.createComponent(PreferencesFormComponent);
    f.componentRef.setInput('preferences', preferences);
    f.detectChanges();
    const saved = vi.fn();
    f.componentInstance.saved.subscribe(saved);
    f.componentInstance.form.controls.ordersEmail.setValue(false);
    f.componentInstance.submit();
    expect(saved).toHaveBeenCalledWith({
      expectedVersion: 0,
      ordersEmail: false,
      adoptionsEmail: true,
      bookingsEmail: true,
    });
    f.componentRef.setInput('preferences', { ...preferences, version: 1 });
    f.detectChanges();
    expect(f.componentInstance.form.controls.ordersEmail.value).toBe(true);
  });
  it('requires a reason and explicit confirmation, and refuses expired recovery', () => {
    const f = TestBed.createComponent(DeliveryRetryComponent);
    f.componentRef.setInput('delivery', delivery);
    f.componentRef.setInput('now', Date.parse(delivery.expiresAt) - 1);
    f.detectChanges();
    const emitted = vi.fn();
    f.componentInstance.retried.subscribe(emitted);
    f.componentInstance.form.controls.reason.setValue(
      'Resolved mail transport outage',
    );
    f.componentInstance.submit();
    expect(emitted).not.toHaveBeenCalled();
    f.componentInstance.form.controls.confirmed.setValue(true);
    f.componentInstance.submit();
    expect(emitted).toHaveBeenCalledTimes(1);
    f.componentRef.setInput('now', Date.parse(delivery.expiresAt));
    f.detectChanges();
    f.componentInstance.submit();
    expect(emitted).toHaveBeenCalledTimes(1);
  });
});
