import { TestBed } from '@angular/core/testing';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { PublicationFormComponent } from './publication-form.component';
import { profile } from '../testing/publication.fixture';
afterEach(() => TestBed.resetTestingModule());
describe('Public publication form', () => {
  it('requires explicit confirmation and excludes ownership/clinical fields', () => {
    const f = TestBed.createComponent(PublicationFormComponent);
    f.detectChanges();
    const spy = vi.fn();
    f.componentInstance.submitted.subscribe(spy);
    f.componentInstance.form.patchValue({
      ...profile,
      reason: 'Publication profile verification',
    });
    f.componentInstance.submit();
    expect(spy).not.toHaveBeenCalled();
    f.componentInstance.form.controls.confirm.setValue(true);
    f.componentInstance.submit();
    expect(spy).toHaveBeenCalledWith({
      profile,
      reason: 'Publication profile verification',
    });
  });
  it('clears confirmation and public text when switching selected animal', () => {
    const f = TestBed.createComponent(PublicationFormComponent);
    f.detectChanges();
    f.componentInstance.form.patchValue({
      title: 'Other animal title',
      confirm: true,
      reason: 'Confirmed previous animal',
    });
    f.componentRef.setInput('contextKey', 'different-animal');
    f.detectChanges();
    expect(f.componentInstance.form.controls.confirm.value).toBe(false);
    expect(f.componentInstance.form.controls.title.value).toBe('');
  });
});
