import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RequestDecisionComponent } from './request-decision.component';
import { AUTH_SESSION } from '../../../core/auth';
import { requestDetail, requestContext } from '../testing/request.fixture';
import { id } from '../testing/publication.fixture';
function setup() {
  TestBed.configureTestingModule({
    imports: [RequestDecisionComponent],
    providers: [
      { provide: AUTH_SESSION, useValue: { identity: signal({ id: id(7) }) } },
    ],
  });
  const fixture = TestBed.createComponent(RequestDecisionComponent);
  fixture.componentRef.setInput('detail', {
    ...requestDetail,
    request: { ...requestDetail.request, status: 'approved' },
  });
  fixture.componentRef.setInput('context', requestContext);
  fixture.detectChanges();
  return fixture;
}
describe('Explicit irreversible handover confirmation', () => {
  it('requires fresh confirmation when action changes and resets after context changes', () => {
    const f = setup(),
      c = f.componentInstance;
    c.form.controls.confirm.setValue(true);
    c.form.controls.action.setValue('complete');
    expect(c.form.controls.confirm.value).toBe(false);
    c.form.controls.confirm.setValue(true);
    f.componentRef.setInput('detail', {
      ...requestDetail,
      request: { ...requestDetail.request, id: id(20), status: 'approved' },
    });
    f.detectChanges();
    expect(c.form.controls.confirm.value).toBe(false);
    expect(c.form.controls.reason.value).toBe('');
  });
  it('emits completion only with validated reason and declaration', () => {
    const f = setup(),
      c = f.componentInstance,
      emit = vi.spyOn(c.submitted, 'emit');
    c.form.patchValue({
      action: 'complete',
      reason: 'Actual handover verified by shelter',
      confirm: false,
    });
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    c.form.controls.confirm.setValue(true);
    c.submit();
    expect(emit).toHaveBeenCalledWith({
      context: requestContext,
      action: 'complete',
      body: {
        reason: 'Actual handover verified by shelter',
        expectedVersion: 1,
      },
    });
  });
});
