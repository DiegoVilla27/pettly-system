import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '../../../shared/ui/icon.component';
import { ProblemComponent } from '../../../shared/ui/problem.component';
import type { ApiProblem } from '../../../core/api';
export interface LoginCredentials {
  email: string;
  password: string;
}
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, IconComponent, ProblemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly busy = input(false);
  readonly problem = input<ApiProblem | null>(null);
  readonly credentials = output<LoginCredentials>();
  readonly visible = signal(false);
  private readonly builder = inject(FormBuilder).nonNullable;
  readonly form = this.builder.group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  submit() {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.valid) this.credentials.emit(this.form.getRawValue());
    else
      this.element.nativeElement
        .querySelector<HTMLInputElement>('input.ng-invalid')
        ?.focus();
  }
}
