import { TestBed } from '@angular/core/testing';
import { OrderDecisionComponent } from './order-decision.component';
import { order } from '../testing/order.fixture';
describe('Explicit provider confirmation', () => {
  it('requires a reason and fresh confirmation when the order version changes', () => {
    TestBed.configureTestingModule({ imports: [OrderDecisionComponent] });
    const fixture = TestBed.createComponent(OrderDecisionComponent);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('now', Date.parse(order.createdAt));
    fixture.detectChanges();
    const c = fixture.componentInstance,
      decided = vi.fn();
    c.decided.subscribe(decided);
    c.form.patchValue({
      action: 'cancel',
      reason: 'Provider verification completed',
      confirmed: false,
    });
    c.submit();
    expect(decided).not.toHaveBeenCalled();
    c.form.controls.confirmed.setValue(true);
    c.submit();
    expect(decided).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('order', { ...order, version: 2 });
    fixture.detectChanges();
    expect(c.form.controls.confirmed.value).toBe(false);
    expect(c.form.controls.action.value).toBe('');
  });
  it('clears a selected action when its deadline elapses', () => {
    TestBed.configureTestingModule({ imports: [OrderDecisionComponent] });
    const fixture = TestBed.createComponent(OrderDecisionComponent);
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('now', Date.parse(order.createdAt));
    fixture.detectChanges();
    const c = fixture.componentInstance,
      decided = vi.fn();
    c.decided.subscribe(decided);
    c.form.patchValue({
      action: 'cancel',
      reason: 'Provider verification completed',
      confirmed: true,
    });
    fixture.componentRef.setInput('now', Date.parse(order.expiresAt ?? ''));
    fixture.detectChanges();
    c.submit();
    expect(decided).not.toHaveBeenCalled();
    expect(c.actions()).toEqual([]);
    expect(c.form.controls.confirmed.value).toBe(false);
  });
});
