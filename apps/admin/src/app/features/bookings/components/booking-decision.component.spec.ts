import { TestBed } from '@angular/core/testing';
import { BookingDecisionComponent } from './booking-decision.component';
import { booking } from '../testing/booking.fixture';
describe('Explicit provider confirmation', () => {
  it('requires a reason and fresh confirmation when the booking version changes', () => {
    TestBed.configureTestingModule({ imports: [BookingDecisionComponent] });
    const fixture = TestBed.createComponent(BookingDecisionComponent);
    fixture.componentRef.setInput('booking', booking);
    fixture.componentRef.setInput('now', Date.parse(booking.createdAt));
    fixture.detectChanges();
    const c = fixture.componentInstance,
      decided = vi.fn();
    c.decided.subscribe(decided);
    c.form.patchValue({
      action: 'confirm',
      reason: 'Provider verification completed',
      confirmed: false,
    });
    c.submit();
    expect(decided).not.toHaveBeenCalled();
    c.form.controls.confirmed.setValue(true);
    c.submit();
    expect(decided).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('booking', { ...booking, version: 2 });
    fixture.detectChanges();
    expect(c.form.controls.confirmed.value).toBe(false);
    expect(c.form.controls.action.value).toBe('');
  });
  it('clears a selected action when its deadline elapses', () => {
    TestBed.configureTestingModule({ imports: [BookingDecisionComponent] });
    const fixture = TestBed.createComponent(BookingDecisionComponent);
    fixture.componentRef.setInput('booking', booking);
    fixture.componentRef.setInput('now', Date.parse(booking.createdAt));
    fixture.detectChanges();
    const c = fixture.componentInstance,
      decided = vi.fn();
    c.decided.subscribe(decided);
    c.form.patchValue({
      action: 'confirm',
      reason: 'Provider verification completed',
      confirmed: true,
    });
    fixture.componentRef.setInput('now', Date.parse(booking.expiresAt ?? ''));
    fixture.detectChanges();
    c.submit();
    expect(decided).not.toHaveBeenCalled();
    expect(c.actions()).toEqual([]);
    expect(c.form.controls.confirmed.value).toBe(false);
  });
});
