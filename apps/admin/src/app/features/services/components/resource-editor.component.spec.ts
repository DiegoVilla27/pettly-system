import { TestBed } from '@angular/core/testing';
import { ResourceEditorComponent } from './resource-editor.component';
import { resource } from '../testing/service.fixture';
describe('Resource editor', () => {
  it('blocks overlapping form windows and emits canonical lodging full days', () => {
    TestBed.configureTestingModule({ imports: [ResourceEditorComponent] });
    const fixture = TestBed.createComponent(ResourceEditorComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance,
      submitted = vi.fn();
    c.submitted.subscribe(submitted);
    c.form.patchValue({
      name: 'Estaciones de cuidado',
      reason: 'Resource calendar configuration',
    });
    c.addWindow();
    c.submit();
    expect(submitted).not.toHaveBeenCalled();
    c.form.controls.windows.at(1).controls.day.setValue(2);
    c.form.controls.kind.setValue('lodging');
    c.submit();
    expect(submitted).toHaveBeenCalledWith({
      profile: {
        name: 'Estaciones de cuidado',
        kind: 'lodging',
        status: 'active',
        capacity: 1,
        windows: [
          { day: 1, startMinute: 0, endMinute: 1440 },
          { day: 2, startMinute: 0, endMinute: 1440 },
        ],
      },
      reason: 'Resource calendar configuration',
    });
  });
  it('resets dirty input after a confirmed resource refresh and blocks submission when frozen', () => {
    TestBed.configureTestingModule({ imports: [ResourceEditorComponent] });
    const fixture = TestBed.createComponent(ResourceEditorComponent);
    fixture.componentRef.setInput('resource', resource);
    fixture.detectChanges();
    const c = fixture.componentInstance,
      submitted = vi.fn();
    c.submitted.subscribe(submitted);
    c.form.controls.capacity.setValue(1);
    fixture.componentRef.setInput('resource', {
      ...resource,
      version: 2,
      capacity: 3,
    });
    fixture.detectChanges();
    expect(c.form.controls.capacity.value).toBe(3);
    fixture.componentRef.setInput('blocked', true);
    fixture.detectChanges();
    c.form.controls.reason.setValue('Resource calendar configuration');
    c.submit();
    expect(submitted).not.toHaveBeenCalled();
  });
});
