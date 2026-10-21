import { TestBed } from '@angular/core/testing';
import { VariantFormComponent } from './variant-form.component';
import { detail } from '../testing/product.fixture';
describe('Variant form', () => {
  it('resets confirmation when product revision changes', () => {
    const f = TestBed.createComponent(VariantFormComponent);
    f.componentRef.setInput('contextKey', 'one');
    f.detectChanges();
    f.componentInstance.form.controls.confirm.setValue(true);
    f.componentRef.setInput('contextKey', 'two');
    f.detectChanges();
    expect(f.componentInstance.form.controls.confirm.value).toBe(false);
  });
  it('preserves exact prices and emits only profile and reason', () => {
    const f = TestBed.createComponent(VariantFormComponent);
    f.componentRef.setInput('contextKey', 'product:1');
    f.componentRef.setInput('variant', detail.variants[0]);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.spyOn(c.submitted, 'emit');
    c.form.patchValue({
      reason: 'Verified catalog maintenance',
      confirm: true,
    });
    c.submit();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: {
          sku: 'ARNES-M',
          priceMinor: 1999995,
          attributes: { talla: 'M' },
        },
      }),
    );
  });
  it('rejects repeated attribute keys rather than silently overwriting', () => {
    const f = TestBed.createComponent(VariantFormComponent);
    f.componentRef.setInput('contextKey', 'product:1');
    f.componentRef.setInput('variant', detail.variants[0]);
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.spyOn(c.submitted, 'emit');
    c.add();
    c.form.controls.attributes.at(1).patchValue({ key: 'talla', value: 'L' });
    c.form.patchValue({
      reason: 'Verified catalog maintenance',
      confirm: true,
    });
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    expect(c.error()).not.toBe('');
  });
});
