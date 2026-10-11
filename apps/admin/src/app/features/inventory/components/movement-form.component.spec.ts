import { TestBed } from '@angular/core/testing';
import { MovementFormComponent } from './movement-form.component';
import { rowFixture } from '../testing/inventory.fixture';
describe('Inventory movement form', () => {
  it('prevents taking reserved units and preserves the signed adjustment intent', () => {
    const fixture = TestBed.createComponent(MovementFormComponent);
    fixture.componentRef.setInput('row', rowFixture);
    fixture.detectChanges();
    const component = fixture.componentInstance,
      emit = vi.fn();
    component.submitted.subscribe(emit);
    component.form.setValue({
      kind: 'issue',
      quantity: 8,
      reason: 'Warehouse count verification',
    });
    component.submit();
    expect(emit).not.toHaveBeenCalled();
    expect(component.form.controls.quantity.hasError('available')).toBe(true);
    component.form.controls.kind.setValue('receipt');
    component.submit();
    expect(emit).toHaveBeenCalledWith({
      kind: 'receipt',
      quantity: 8,
      reason: 'Warehouse count verification',
    });
    emit.mockClear();
    component.form.setValue({
      kind: 'adjustment',
      quantity: -2,
      reason: ' Warehouse count verification ',
    });
    component.submit();
    expect(emit).toHaveBeenCalledWith({
      kind: 'adjustment',
      quantity: -2,
      reason: 'Warehouse count verification',
    });
  });
  it('has no preselected operation and refuses archived variant writes', () => {
    const fixture = TestBed.createComponent(MovementFormComponent);
    fixture.componentRef.setInput('row', rowFixture);
    fixture.detectChanges();
    const component = fixture.componentInstance,
      emit = vi.fn();
    component.submitted.subscribe(emit);
    expect(component.form.controls.kind.value).toBe('');
    fixture.componentRef.setInput('row', {
      ...rowFixture,
      variantStatus: 'archived',
    });
    fixture.detectChanges();
    component.form.setValue({
      kind: 'receipt',
      quantity: 1,
      reason: 'Warehouse count verification',
    });
    component.submit();
    expect(emit).not.toHaveBeenCalled();
  });
});
