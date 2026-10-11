import { TestBed } from '@angular/core/testing';
import { PolicyEditorComponent } from './policy-editor.component';
describe('Commercial editor consent and exact policy', () => {
  it('requires explicit consent, emits exact COP and drops extra taxes in included mode', () => {
    const f = TestBed.createComponent(PolicyEditorComponent);
    f.componentRef.setInput('context', 'company');
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.addShipping();
    c.form.controls.shipping
      .at(0)
      .patchValue({ city: 'Bogotá', fee: '12500,50' });
    c.form.patchValue({
      enabled: true,
      terms: 'Condiciones de compra verificadas.',
      reason: 'Configuración revisada de condiciones',
      shippingTax: '19',
    });
    c.submit();
    expect(emit).not.toHaveBeenCalled();
    c.form.controls.confirm.setValue(true);
    c.submit();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'COP',
        collector: 'platform',
        expectedVersion: 0,
        shippingRules: [
          { countryCode: 'CO', city: 'Bogotá', feeMinor: 1250050 },
        ],
        shippingTaxBasisPoints: 0,
        taxRates: {},
      }),
    );
  });
  it('resets irreversible confirmation and fees when changing company, and blocks duplicate writes', () => {
    const f = TestBed.createComponent(PolicyEditorComponent);
    f.componentRef.setInput('context', 'company');
    f.detectChanges();
    const c = f.componentInstance,
      emit = vi.fn();
    c.submitted.subscribe(emit);
    c.form.patchValue({
      terms: 'Valid purchase conditions.',
      reason: 'Verified commercial change',
      confirm: true,
    });
    f.componentRef.setInput('context', 'another-company');
    f.detectChanges();
    expect(c.form.controls.confirm.value).toBe(false);
    expect(c.shippingRows()).toHaveLength(0);
    f.componentRef.setInput('blocked', true);
    f.detectChanges();
    c.submit();
    expect(emit).not.toHaveBeenCalled();
  });
});
