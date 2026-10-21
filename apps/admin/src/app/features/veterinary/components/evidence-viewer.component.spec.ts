import { TestBed } from '@angular/core/testing';
import { EvidenceViewerComponent } from './evidence-viewer.component';
describe('Private evidence lifetime', () => {
  it('revokes private object URLs on replacement and destruction', async () => {
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:private-one')
      .mockReturnValueOnce('blob:private-two');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined);
    const fixture = TestBed.createComponent(EvidenceViewerComponent);
    const evidence = {
      credentialId: 'private',
      mediaId: 'one',
      kindLabel: 'Tarjeta profesional',
      blob: new Blob(['private'], { type: 'image/jpeg' }),
    };
    fixture.componentRef.setInput('evidence', evidence);
    await fixture.whenStable();
    expect(create).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('evidence', { ...evidence, mediaId: 'two' });
    await fixture.whenStable();
    expect(revoke).toHaveBeenCalledWith('blob:private-one');
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:private-two');
    create.mockRestore();
    revoke.mockRestore();
  });
});
