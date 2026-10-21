import { TestBed } from '@angular/core/testing';
import { CredentialReviewFormComponent } from './credential-review-form.component';
import { credentialFixture } from '../testing/credential.fixture';
import { mapCredential, toLocalDate } from '../mappers/veterinary.mapper';
describe('Independent manual review form', () => {
  it('requires explicit decision, official attestation and a valid future deadline', async () => {
    const fixture = TestBed.createComponent(CredentialReviewFormComponent);
    fixture.componentRef.setInput(
      'credential',
      mapCredential(credentialFixture),
    );
    await fixture.whenStable();
    const component = fixture.componentInstance,
      emit = vi.fn();
    component.reviewRequested.subscribe(emit);
    component.review();
    expect(emit).not.toHaveBeenCalled();
    component.form.patchValue({
      decision: 'approve',
      officialRegisterChecked: true,
      verificationReference: 'Official test verification reference',
      verifiedUntil: toLocalDate(new Date(Date.now() + 86400000)),
      reason: 'Test independent review complete',
    });
    await fixture.whenStable();
    component.review();
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        approved: true,
        expectedVersion: 5,
        officialRegisterChecked: true,
      }),
    );
    emit.mockClear();
    component.form.controls.verifiedUntil.setValue(
      toLocalDate(new Date(Date.now() + 91 * 86400000)),
    );
    component.review();
    expect(emit).not.toHaveBeenCalled();
  });
  it('does not review a conflicted owner and resets reasons after a confirmed revision', async () => {
    const fixture = TestBed.createComponent(CredentialReviewFormComponent);
    fixture.componentRef.setInput(
      'credential',
      mapCredential(credentialFixture),
    );
    fixture.componentRef.setInput(
      'blockedReason',
      'Independent reviewer required',
    );
    await fixture.whenStable();
    const emit = vi.fn();
    fixture.componentInstance.reviewRequested.subscribe(emit);
    fixture.componentInstance.form.patchValue({
      decision: 'reject',
      officialRegisterChecked: true,
      reason: 'Test independent rejection reason',
    });
    fixture.componentInstance.review();
    expect(emit).not.toHaveBeenCalled();
    fixture.componentRef.setInput(
      'credential',
      mapCredential({ ...credentialFixture, version: 6 }),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.form.controls.reason.value).toBe('');
    expect(
      fixture.componentInstance.form.controls.officialRegisterChecked.value,
    ).toBe(false);
  });
});
